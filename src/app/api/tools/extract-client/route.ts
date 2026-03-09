import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServicesFromSheets, saveMultipleServicesToSheets, checkExtractionCooldown, logExtraction } from "@/lib/google-sheets";
import { Service } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { CATEGORY_SEARCH_CONFIG } from "@/lib/google-places";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAX_CLIENT_RECORDS = 400; // Strict cap for client-specific extraction

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.role || !["ADMIN", "EDITOR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { lat, lng, city, clientId, categories } = await request.json();
        if (!lat || !lng) {
            return NextResponse.json({ error: "Latitude and Longitude required" }, { status: 400 });
        }

        // 1. Check Cooldown
        const identifier = clientId || `${lat},${lng}`;
        const cooldown = await checkExtractionCooldown(identifier);
        if (cooldown.isLocked) {
            return NextResponse.json({
                error: `Client/Location is on cooldown. Available in ${cooldown.remainingDays} days (Last: ${cooldown.lastDate}).`
            }, { status: 403 });
        }

        // 2. Validate categories
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return NextResponse.json({ error: "At least one category required" }, { status: 400 });
        }
        if (categories.length > 4) {
            return NextResponse.json({ error: "Maximum 4 categories allowed at a time" }, { status: 400 });
        }

        // Map selected names to their search config
        const selectedCategories = categories
            .filter(name => CATEGORY_SEARCH_CONFIG[name])
            .map(name => ({
                name,
                query: CATEGORY_SEARCH_CONFIG[name].keyword || name
            }));

        if (selectedCategories.length === 0) {
            return NextResponse.json({ error: "Invalid categories selected" }, { status: 400 });
        }

        if (!GMAPS_API_KEY) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        // 3. Fetch existing for deduplication
        const existingServices = await getServicesFromSheets();
        const existingIds = new Set(existingServices.map((s: any) => s.source_id));

        let totalExtracted = 0;
        let skippedCount = 0;
        const newServices: Service[] = [];

        // 4. Extract using New Places API
        for (const cat of selectedCategories) {
            if (totalExtracted >= MAX_CLIENT_RECORDS) break;

            let nextPageToken: string | undefined = undefined;
            let pageCount = 0;

            while (totalExtracted < MAX_CLIENT_RECORDS && pageCount < 10) { // max 10 pages per cat
                const payload: any = {
                    textQuery: cat.query,
                    languageCode: "en",
                    maxResultCount: 20,
                    locationBias: {
                        circle: {
                            center: { latitude: lat, longitude: lng },
                            radius: 5000.0 // 5km strict radius
                        }
                    }
                };

                if (nextPageToken) {
                    payload.pageToken = nextPageToken;
                }

                try {
                    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Goog-Api-Key": GMAPS_API_KEY,
                            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.regularOpeningHours,places.businessStatus,nextPageToken",
                        },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    const places = data.places || [];

                    for (const place of places) {
                        if (totalExtracted >= MAX_CLIENT_RECORDS) break;

                        if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;

                        const placeId = place.id;

                        if (existingIds.has(placeId)) {
                            skippedCount++;
                            continue;
                        }

                        existingIds.add(placeId);

                        const service: Service = {
                            source_id: placeId || uuidv4(),
                            entity_name: place.displayName?.text || "Unknown",
                            category: cat.name,
                            city: city || "Unknown",
                            address: place.formattedAddress || "",
                            latitude: place.location?.latitude || 0,
                            longitude: place.location?.longitude || 0,
                            primary_contact: place.nationalPhoneNumber || "",
                            secondary_contact: "",
                            opening_hours: place.regularOpeningHours?.weekdayDescriptions?.join(" | ") || "",
                            image_url: "",
                            data_source: "Google Maps"
                        };

                        newServices.push(service);
                        totalExtracted++;
                    }

                    nextPageToken = data.nextPageToken;
                    pageCount++;

                    if (!nextPageToken) break;
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (err: any) {
                    console.error(`[Client Extract] Error fetching page ${pageCount} for ${cat.name}:`, err.message);
                    break;
                }
            }
        }

        // 5. Save to Google Sheets
        if (newServices.length > 0) {
            await saveMultipleServicesToSheets(newServices);
        }

        // 6. Log Extraction
        await logExtraction('CLIENT', identifier, categories);

        return NextResponse.json({
            savedCount: newServices.length,
            skippedCount: skippedCount,
            message: "Extraction complete"
        });

    } catch (error: any) {
        console.error("Client extraction error:", error);
        return NextResponse.json({ error: error.message || "Extraction failed" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServicesFromSheets, saveMultipleServicesToSheets, getLockedCategories, logExtraction } from "@/lib/google-sheets";
import { Service } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { CATEGORY_SEARCH_CONFIG } from "@/lib/google-places";

export const dynamic = "force-dynamic";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAX_CLIENT_RECORDS = 400; // Strict cap for client-specific extraction

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.role || !["ADMIN", "EDITOR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { lat, lng, city, clientId, categories, radius } = await request.json();
        if (!lat || !lng) {
            return NextResponse.json({ error: "Latitude and Longitude required" }, { status: 400 });
        }

        // Search radius in meters (default 10km)
        const searchRadius = radius || 10000.0;

        // 1. Check Granular Cooldowns
        const identifier = clientId || `${lat},${lng}`;
        const locked = await getLockedCategories(identifier);
        const lockedNames = new Set(locked.map(l => l.category.toLowerCase()));

        // 2. Validate categories
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return NextResponse.json({ error: "At least one category required" }, { status: 400 });
        }

        const requestedLocked = categories.filter(c => lockedNames.has(c.toLowerCase()));
        if (requestedLocked.length > 0) {
            return NextResponse.json({
                error: `Categories on cooldown for this location: ${requestedLocked.join(", ")}. Please wait 30 days.`
            }, { status: 403 });
        }
        if (categories.length > 5) {
            return NextResponse.json({ error: "Maximum 5 categories allowed at a time" }, { status: 400 });
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
        const foundCategories: string[] = [];
        const emptyCategories: string[] = [];

        // 4. Extract using New Places API
        for (const cat of selectedCategories) {
            let catFoundAny = false;
            if (totalExtracted >= MAX_CLIENT_RECORDS) break;

            let nextPageToken: string | undefined = undefined;
            let pageCount = 0;

            while (totalExtracted < MAX_CLIENT_RECORDS && pageCount < 10) { // max 10 pages per cat
                const payload: any = {
                    textQuery: cat.query,
                    languageCode: "en",
                    maxResultCount: 20,
                    locationRestriction: {
                        circle: {
                            center: { latitude: lat, longitude: lng },
                            radius: searchRadius
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

                    if (places.length > 0) {
                        catFoundAny = true;
                    }

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

                    console.log(`[Client Extract] Category: ${cat.name}, Found: ${places.length}, Total New: ${newServices.length}, Total Skipped: ${skippedCount}`);
                    nextPageToken = data.nextPageToken;
                    pageCount++;

                    if (!nextPageToken) break;
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (err: any) {
                    console.error(`[Client Extract] Error fetching page ${pageCount} for ${cat.name}:`, err.message);
                    break;
                }
            }
            if (catFoundAny) {
                foundCategories.push(cat.name);
            } else {
                emptyCategories.push(cat.name);
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
            foundCategories,
            emptyCategories,
            message: "Extraction complete"
        });

    } catch (error: any) {
        console.error("Client extraction error:", error);
        return NextResponse.json({ error: error.message || "Extraction failed" }, { status: 500 });
    }
}

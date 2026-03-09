import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServicesFromSheets, saveMultipleServicesToSheets, getLockedCategories, logExtraction } from "@/lib/google-sheets";
import { Service } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { CATEGORY_SEARCH_CONFIG } from "@/lib/google-places";

export const dynamic = "force-dynamic";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAX_CITY_RECORDS = 2000;

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.role || !["ADMIN", "EDITOR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { city, categories } = await request.json();
        if (!city) {
            return NextResponse.json({ error: "City name required" }, { status: 400 });
        }

        // 1. Check Granular Cooldowns
        const locked = await getLockedCategories(city);
        const lockedNames = new Set(locked.map(l => l.category.toLowerCase()));

        // Validate categories
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return NextResponse.json({ error: "At least one category required" }, { status: 400 });
        }

        const requestedLocked = categories.filter(c => lockedNames.has(c.toLowerCase()));
        if (requestedLocked.length > 0) {
            return NextResponse.json({
                error: `Categories on cooldown: ${requestedLocked.join(", ")}. Please wait 30 days.`
            }, { status: 403 });
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

        // 1. Fetch existing services for deduplication
        const existingServices = await getServicesFromSheets();
        const existingIds = new Set(existingServices.map((s: any) => s.source_id));

        let totalExtracted = 0;
        let skippedCount = 0;
        const newServices: Service[] = [];

        // 4. Extract per category using New Places API
        for (const cat of selectedCategories) {
            if (totalExtracted >= MAX_CITY_RECORDS) break;

            const searchQuery = `${cat.query} in ${city}`;
            console.log(`[City Extract] Searching: ${searchQuery}`);

            let nextPageToken: string | undefined = undefined;
            let pageCount = 0;

            while (totalExtracted < MAX_CITY_RECORDS && pageCount < 15) { // max 15 pages per category
                const payload: any = {
                    textQuery: searchQuery,
                    languageCode: "en",
                    maxResultCount: 20
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
                        if (totalExtracted >= MAX_CITY_RECORDS) break;

                        if (place.businessStatus && place.businessStatus !== "OPERATIONAL") continue;

                        const placeId = place.id;

                        if (existingIds.has(placeId)) {
                            skippedCount++;
                            continue;
                        }

                        const addressLower = (place.formattedAddress || "").toLowerCase();
                        const targetCityLower = city.toLowerCase();

                        if (!addressLower.includes(targetCityLower) && addressLower.length > 5) {
                            console.log(`[City Extract] Skipped ${place.displayName?.text} - Address (${place.formattedAddress}) doesn't match target city (${city})`);
                            continue;
                        }

                        existingIds.add(placeId);

                        const service: Service = {
                            source_id: placeId || uuidv4(),
                            entity_name: place.displayName?.text || "Unknown",
                            category: cat.name,
                            city: city,
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
                    console.error(`[City Extract] Error fetching page ${pageCount} for ${cat.name}:`, err.message);
                    break;
                }
            }
        }

        if (newServices.length > 0) {
            await saveMultipleServicesToSheets(newServices);
        }

        // 5. Log Extraction - Lock the city for 30 days
        await logExtraction('CITY', city, categories);

        return NextResponse.json({
            savedCount: newServices.length,
            skippedCount: skippedCount,
            message: "Extraction complete"
        });

    } catch (error: any) {
        console.error("City extraction error:", error);
        return NextResponse.json({ error: error.message || "Extraction failed" }, { status: 500 });
    }
}

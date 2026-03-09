import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServicesFromSheets, saveMultipleServicesToSheets } from "@/lib/google-sheets";
import { Service } from "@/types";
import { v4 as uuidv4 } from "uuid";

const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAX_CLIENT_RECORDS = 400; // Strict cap for client-specific extraction

// Essential categories exactly mapped for Text Search
const TARGET_CATEGORIES = [
    { name: "Hospital", query: "Hospital" },
    { name: "Pharmacy", query: "Pharmacy" },
    { name: "Clinic", query: "Clinic" },
    { name: "Ambulance Service", query: "Ambulance Service" },
];

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "EDITOR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { lat, lng, city } = await request.json();
        if (!lat || !lng) {
            return NextResponse.json({ error: "Latitude and Longitude required" }, { status: 400 });
        }

        if (!GMAPS_API_KEY) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        // 1. Fetch existing for deduplication
        const existingServices = await getServicesFromSheets();
        const existingIds = new Set(existingServices.map((s: any) => s.source_id));

        let totalExtracted = 0;
        let skippedCount = 0;
        const newServices: Service[] = [];

        // 2. Extract using New Places API (search Nearby alternative for precise location bias)
        // The new `places:searchText` supports location bias which is actually better and cheaper 
        // than proper `searchNearby` because we can search specific keywords and avoid returning garbage categories.

        for (const cat of TARGET_CATEGORIES) {
            if (totalExtracted >= MAX_CLIENT_RECORDS) break;

            const payload = {
                textQuery: cat.query,
                languageCode: "en",
                maxResultCount: 20,
                locationBias: {
                    circle: {
                        center: {
                            latitude: lat,
                            longitude: lng
                        },
                        radius: 5000.0 // 5km strict radius
                    }
                }
            };

            const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GMAPS_API_KEY,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.regularOpeningHours,places.businessStatus",
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
        }

        // 3. Save to Google Sheets
        if (newServices.length > 0) {
            await saveMultipleServicesToSheets(newServices);
        }

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

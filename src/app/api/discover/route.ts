import { NextResponse } from "next/server";
import { getServicesFromSheets } from "@/lib/google-sheets";
import { CATEGORY_SEARCH_CONFIG, mapGoogleTypeToCategory } from "@/lib/google-places";

export async function POST(request: Request) {
    try {
        const { lat, lng, radius, categories, city } = await request.json();
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        // Get existing source_ids to filter duplicates
        const existingServices = await getServicesFromSheets();
        const existingSourceIds = new Set(existingServices.map((s: any) => s.source_id));

        const allDiscoveredPlaces: any[] = [];
        const seenPlaceIds = new Set<string>();

        // We search each category individually to use its specific keyword/types
        for (const catName of categories) {
            const config = CATEGORY_SEARCH_CONFIG[catName];
            if (!config) continue;

            const types = config.types || [];
            const keyword = config.keyword || "";

            // Google Nearby Search: we can use 'type' OR 'keyword'. 
            // Often 'keyword' is more accurate for things like "Ambulance".
            // We'll iterate through types if no keyword, or use keyword + primary type.
            const searchTypes = types.length > 0 ? [types[0]] : [""];

            for (const type of searchTypes) {
                let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius * 1000}&key=${apiKey}`;
                if (type) url += `&type=${type}`;
                if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.results) {
                    data.results.forEach((place: any) => {
                        if (!existingSourceIds.has(place.place_id) && !seenPlaceIds.has(place.place_id)) {
                            // Map it back to the category that triggered this specific search
                            allDiscoveredPlaces.push({
                                ...place,
                                internalCategory: catName
                            });
                            seenPlaceIds.add(place.place_id);
                        }
                    });
                }
            }
        }


        return NextResponse.json({ results: allDiscoveredPlaces });
    } catch (error) {
        console.error("Discovery error:", error);
        return NextResponse.json({ error: "Failed to discover services" }, { status: 500 });
    }
}

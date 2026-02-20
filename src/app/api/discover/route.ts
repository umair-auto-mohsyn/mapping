import { NextResponse } from "next/server";
import { getServices } from "@/lib/csv";
import { CATEGORY_TO_GOOGLE_TYPES } from "@/lib/google-places";

export async function POST(request: Request) {
    try {
        const { lat, lng, radius, categories, city } = await request.json();
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        // Get existing source_ids to filter duplicates
        const existingServices = getServices();
        const existingSourceIds = new Set(existingServices.map(s => s.source_id));

        const allDiscoveredPlaces: any[] = [];
        const seenPlaceIds = new Set<string>();

        // Map internal categories to Google types
        let googleTypes: string[] = [];
        categories.forEach((cat: string) => {
            const types = CATEGORY_TO_GOOGLE_TYPES[cat] || [];
            googleTypes = [...googleTypes, ...types];
        });

        // Use unique types
        const uniqueGoogleTypes = Array.from(new Set(googleTypes));

        // If no categories selected, we might not want to search everything 
        // but the prompt says "When officer searches: City + Category + Radius"
        if (uniqueGoogleTypes.length === 0) {
            return NextResponse.json({ results: [] });
        }

        // Call Google Nearby Search for each type (Google Nearby Search supports only one type per request normally, 
        // or a keyword. Using keyword might be better for multiple searches)
        // Actually, nearbysearch 'type' parameter only supports one type.
        // We can use 'keyword' or make multiple requests.

        for (const type of uniqueGoogleTypes) {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius * 1000}&type=${type}&key=${apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.results) {
                data.results.forEach((place: any) => {
                    if (!existingSourceIds.has(place.place_id) && !seenPlaceIds.has(place.place_id)) {
                        allDiscoveredPlaces.push({
                            ...place,
                            internalCategory: categories[0] // Assign the first matching category for now
                        });
                        seenPlaceIds.add(place.place_id);
                    }
                });
            }
        }

        return NextResponse.json({ results: allDiscoveredPlaces });
    } catch (error) {
        console.error("Discovery error:", error);
        return NextResponse.json({ error: "Failed to discover services" }, { status: 500 });
    }
}

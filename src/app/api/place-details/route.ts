import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const placeId = searchParams.get("place_id");
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!placeId) {
            return NextResponse.json({ error: "place_id is required" }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=place_id,name,formatted_address,geometry,types,opening_hours,formatted_phone_number,address_components&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "OK") {
            return NextResponse.json({ error: data.error_message || "Failed to fetch place details" }, { status: 500 });
        }

        return NextResponse.json({ result: data.result });
    } catch (error) {
        console.error("Place details error:", error);
        return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
    }
}

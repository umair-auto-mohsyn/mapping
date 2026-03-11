import { NextResponse } from "next/server";
import { getClientsFromSheets, getServicesFromSheets, getLockedCategories } from "@/lib/google-sheets";
import { calculateDistance } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STANDARD_CATEGORIES = [
    "AC Technition", "Ambulance Service", "Bakery", "Car Repair", "Child day care", "Clinic",
    "Electrician", "Electricity Provider Office", "Female Salon", "Fire Station", "Flower Shops",
    "Gas Provider", "Gas cylinder Services", "Hardware Store", "Home Chef", "Hospital",
    "Internet Service Provider", "Laboratory", "Male Salon", "Mason Service",
    "Medical Equipment Supplier", "Medical Store", "Mineral Water home delivery",
    "Old age houses", "Pharmacy", "Plumber", "Police Station", "Burn Emergency Hospital"
];

export async function GET() {
    try {
        const clients = await getClientsFromSheets();
        const services = await getServicesFromSheets();

        const unenrichedClients = clients.map(client => {
            const clientCity = (client.city || "").toLowerCase().trim();

            // Find services near this client using distance OR city-name fallback.
            // Services with lat=0/lng=0 have missing GPS coordinates — fall back to city name match.
            const nearbyServices = services.filter(service => {
                const hasValidCoords = service.latitude !== 0 && service.longitude !== 0
                    && client.latitude !== 0 && client.longitude !== 0;

                if (hasValidCoords) {
                    const dist = calculateDistance(
                        client.latitude,
                        client.longitude,
                        service.latitude,
                        service.longitude
                    );
                    return dist <= 10;
                } else {
                    // Fallback: match by city name if no GPS coords available
                    const sCity = (service.city || "").toLowerCase().trim();
                    return sCity === clientCity
                        || sCity.includes(clientCity)
                        || clientCity.includes(sCity);
                }
            });

            const coveredCategories = new Set(nearbyServices.map(s => s.category));
            const missingCategories = STANDARD_CATEGORIES.filter(cat => !coveredCategories.has(cat));

            const identifier = client.email.toLowerCase(); // Unified ID: Email

            // Fuzzy city matching for "New City" detection
            const isNewCity = !services.some(s => {
                const sCity = (s.city || "").toLowerCase().trim();
                return sCity === clientCity
                    || sCity.includes(clientCity)
                    || clientCity.includes(sCity);
            });

            return {
                id: client.id,
                client,
                missingCount: missingCategories.length,
                missingCategories,
                isNewCity,
                identifier
            };
        });

        // Resolve locked categories in parallel
        const enrichedWithLocks = await Promise.all(unenrichedClients.map(async (item) => {
            const locked = await getLockedCategories(item.identifier);
            return {
                ...item,
                lockedCategories: locked.map(l => l.category)
            };
        }));

        const finalUnenriched = enrichedWithLocks.filter(item => item.missingCount > 0);

        // Sort: new cities first, then by most missing
        finalUnenriched.sort((a, b) => {
            if (a.isNewCity && !b.isNewCity) return -1;
            if (!a.isNewCity && b.isNewCity) return 1;
            return a.missingCount - b.missingCount;
        });

        return NextResponse.json({
            unenrichedClients: finalUnenriched,
            totalGaps: finalUnenriched.length
        });
    } catch (error) {
        console.error("Analyze coverage error:", error);
        return NextResponse.json({ error: "Failed to analyze coverage" }, { status: 500 });
    }
}

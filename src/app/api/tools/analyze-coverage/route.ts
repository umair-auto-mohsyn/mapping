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
            // Find services near this client (within 10km)
            const nearbyServices = services.filter(service => {
                const dist = calculateDistance(
                    client.latitude,
                    client.longitude,
                    service.latitude,
                    service.longitude
                );
                return dist <= 10; // Expanded radius for broader coverage
            });

            const coveredCategories = new Set(nearbyServices.map(s => s.category));
            const missingCategories = STANDARD_CATEGORIES.filter(cat => !coveredCategories.has(cat));

            const identifier = `${client.firstName} ${client.lastName} (${client.city})`; // Match extraction identifier
            return {
                id: `${client.firstName}-${client.lastName}-${client.city}`,
                client,
                missingCount: missingCategories.length,
                missingCategories: missingCategories,
                isNewCity: !services.some(s => s.city.toLowerCase() === client.city.toLowerCase()),
                identifier // Pass the identifier for lock checking
            };
        });

        // 2. Resolve Locks (Parallel for efficiency)
        const enrichedWithLocks = await Promise.all(unenrichedClients.map(async (item) => {
            const locked = await getLockedCategories(item.identifier);
            return {
                ...item,
                lockedCategories: locked.map(l => l.category)
            };
        }));

        const finalUnenriched = enrichedWithLocks.filter(item => item.missingCount > 0);

        // Sort by clients with most missing data first, prioritize new cities
        finalUnenriched.sort((a, b) => {
            if (a.isNewCity && !b.isNewCity) return -1;
            if (!a.isNewCity && b.isNewCity) return 1;
            return b.missingCount - a.missingCount;
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

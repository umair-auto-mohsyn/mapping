import { NextResponse } from "next/server";
import { getClientsFromSheets, getServicesFromSheets, getLockedCategories } from "@/lib/google-sheets";
import { calculateDistance } from "@/lib/utils";
import { STANDARD_CATEGORIES } from "@/lib/google-places";

export const dynamic = "force-dynamic";

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
            const foundCount = STANDARD_CATEGORIES.length - missingCategories.length;

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
                foundCount,
                missingCount: missingCategories.length,
                missingCategories,
                isNewCity,
                identifier
            };
        });

        // Resolve locked categories in parallel
        const enrichedWithLocks = await Promise.all(unenrichedClients.map(async (item) => {
            const locked = await getLockedCategories(item.identifier);
            const lockedNames = locked.map(l => l.category);
            
            // "Attempted" = Found in sheet OR searched recently (locked)
            const coveredSet = new Set(item.missingCategories.filter(cat => 
                !lockedNames.map(ln => ln.toLowerCase()).includes(cat.toLowerCase())
            ));
            
            // Progress is anything that is NOT unattempted missing
            const unattemptedMissing = item.missingCategories.filter(cat => 
                !lockedNames.map(ln => ln.toLowerCase()).includes(cat.toLowerCase())
            );

            return {
                ...item,
                lockedCategories: lockedNames,
                unattemptedCount: unattemptedMissing.length,
                isInProgress: lockedNames.length > 0
            };
        }));

        const finalUnenriched = enrichedWithLocks.filter(item => item.missingCount > 0);

        // STICKY SORTING LOGIC:
        finalUnenriched.sort((a, b) => {
            // Priority 1: In Progress vs Unstarted
            if (a.isInProgress && !b.isInProgress) return -1;
            if (!a.isInProgress && b.isInProgress) return 1;

            // Priority 2: Least Gaps First (Focus on finishing if you started)
            // This ensures that as you progress a client, they stay Rank #1.
            if (a.missingCount !== b.missingCount) {
                return a.missingCount - b.missingCount;
            }

            // Priority 3: New City (Tie breaker within same gap count)
            if (a.isNewCity && !b.isNewCity) return -1;
            if (!a.isNewCity && b.isNewCity) return 1;

            return 0;
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

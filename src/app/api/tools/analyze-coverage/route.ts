import { NextResponse } from "next/server";
import { getClientsFromSheets, getServicesFromSheets, getLockedCategories } from "@/lib/google-sheets";
import { calculateDistance } from "@/lib/utils";
import { STANDARD_CATEGORIES, normalizeCityName } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const clients = await getClientsFromSheets();
        const services = await getServicesFromSheets();

        const unenrichedClients = clients.map(client => {
            const rawClientCity = (client.city || "").trim();
            const clientCity = normalizeCityName(rawClientCity).toLowerCase();

            // Find services near this client using distance OR city-name fallback.
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
                    const sCity = normalizeCityName(service.city || "").toLowerCase();
                    return sCity === clientCity
                        || (sCity && clientCity && (sCity.includes(clientCity) || clientCity.includes(sCity)));
                }
            });

            const coveredCategories = new Set(nearbyServices.map(s => s.category));
            const missingCategories = STANDARD_CATEGORIES.filter(cat => !coveredCategories.has(cat));
            const foundCount = STANDARD_CATEGORIES.length - missingCategories.length;

            const identifier = client.email.toLowerCase();

            // Fuzzy city matching for "New City" detection
            const isNewCity = !services.some(s => {
                const sCity = normalizeCityName(s.city || "").toLowerCase();
                return sCity === clientCity
                    || (sCity && clientCity && (sCity.includes(clientCity) || clientCity.includes(sCity)));
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
            
            // "Unattempted" = Missing from sheet AND NOT searched recently (locked)
            const unattemptedMissing = item.missingCategories.filter(cat => 
                !lockedNames.map(ln => ln.toLowerCase()).includes(cat.toLowerCase())
            );

            return {
                ...item,
                lockedCategories: lockedNames,
                unattemptedCount: unattemptedMissing.length,
                isInProgress: lockedNames.length > 0 && lockedNames.length < STANDARD_CATEGORIES.length
            };
        }));

        // CRITICAL FIX: Only show clients who still have UNATTEMPTED categories.
        // If unattemptedCount is 0, we've tried everything for this client. Move on.
        const finalUnenriched = enrichedWithLocks.filter(item => item.unattemptedCount > 0);

        // STICKY SORTING LOGIC:
        finalUnenriched.sort((a, b) => {
            // Priority 1: In Progress vs Unstarted
            if (a.isInProgress && !b.isInProgress) return -1;
            if (!a.isInProgress && b.isInProgress) return 1;

            // Priority 2: Least UNATTEMPTED Gaps First (Focus on finishing if you started)
            if (a.unattemptedCount !== b.unattemptedCount) {
                return a.unattemptedCount - b.unattemptedCount;
            }

            // Priority 3: New City (Tie breaker)
            if (a.isNewCity && !b.isNewCity) return -1;
            if (!a.isNewCity && b.isNewCity) return 1;

            return 0;
        });

        return NextResponse.json({
            unenrichedClients: finalUnenriched,
            totalGaps: finalUnenriched.length,
            standardCategoryCount: STANDARD_CATEGORIES.length
        });
    } catch (error) {
        console.error("Analyze coverage error:", error);
        return NextResponse.json({ error: "Failed to analyze coverage" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getClientsFromSheets, getServicesFromSheets } from "@/lib/google-sheets";
import { normalizeCityName } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const rawClients = await getClientsFromSheets();
        const rawServices = await getServicesFromSheets();

        // Normalize city names within the data objects themselves
        const clients = rawClients.map(c => ({ ...c, city: normalizeCityName(c.city) }));
        const services = rawServices.map(s => ({ ...s, city: normalizeCityName(s.city) }));

        // Standard categories provided by the user
        const STANDARD_CATEGORIES = [
            "AC Technition", "Ambulance Service", "Bakery", "Car Repair", "Child day care", "Clinic",
            "Electrician", "Electricity Provider Office", "Female Salon", "Fire Station", "Flower Shops",
            "Gas Provider", "Gas cylinder Services", "Hardware Store", "Home Chef", "Hospital",
            "Internet Service Provider", "Laboratory", "Male Salon", "Mason Service",
            "Medical Equipment Supplier", "Medical Store", "Mineral Water home delivery",
            "Old age houses", "Pharmacy", "Plumber", "Police Station", "Burn Emergency Hospital",
            "Ambulance" // Added specifically as it was seen in the bug report
        ];

        // Get unique cities and normalize them (e.g., Lodhrān -> Lodhran)
        // Also strip out any values that are actually categories
        const categoriesSet = new Set(STANDARD_CATEGORIES.map(c => c.toLowerCase()));

        const cities = Array.from(new Set([
            ...clients.map(c => c.city),
            ...services.map(s => s.city)
        ]))
            .filter(Boolean)
            .filter(city => !categoriesSet.has(city.toLowerCase()))
            .sort();

        // Merge standard categories with any custom ones in the sheet
        const categories = Array.from(new Set([
            ...STANDARD_CATEGORIES,
            ...(services.map(s => s.category))
        ])).filter(Boolean).sort();

        console.log(`API Data: ${clients.length} clients, ${services.length} services found.`);
        console.log(`Filtered Cities: ${cities.length}, Categories: ${categories.length}`);

        return NextResponse.json({
            clients,
            services,
            cities,
            categories
        });
    } catch (error) {
        console.error("Fetch data error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

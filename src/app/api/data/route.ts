import { NextResponse } from "next/server";
import { getClientsFromSheets, getServicesFromSheets } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const clients = await getClientsFromSheets();
        const services = await getServicesFromSheets();

        const cities = Array.from(new Set([
            ...clients.map(c => c.city),
            ...services.map(s => s.city)
        ])).filter(Boolean).sort();

        // Standard categories provided by the user
        const STANDARD_CATEGORIES = [
            "AC Technition", "Ambulance Service", "Bakery", "Car Repair", "Child day care", "Clinic",
            "Electrician", "Electricity Provider Office", "Female Salon", "Fire Station", "Flower Shops",
            "Gas Provider", "Gas cylinder Services", "Hardware Store", "Home Chef", "Hospital",
            "Internet Service Provider", "Laboratory", "Male Salon", "Mason Service",
            "Medical Equipment Supplier", "Medical Store", "Mineral Water home delivery",
            "Old age houses", "Pharmacy", "Plumber", "Police Station", "Burn Emergency Hospital"
        ];

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

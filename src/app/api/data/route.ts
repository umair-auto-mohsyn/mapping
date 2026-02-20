import { NextResponse } from "next/server";
import { getClientsFromSheets, getServicesFromSheets } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const clients = await getClientsFromSheets();
        const services = await getServicesFromSheets();

        // Get unique cities and categories for filters
        const cities = Array.from(new Set([
            ...clients.map(c => c.city),
            ...services.map(s => s.city)
        ])).filter(Boolean).sort();

        const categories = Array.from(new Set(
            services.map(s => s.category)
        )).filter(Boolean).sort();

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

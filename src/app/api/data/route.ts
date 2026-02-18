import { NextResponse } from "next/server";
import { getClients, getServices } from "@/lib/csv";

export async function GET() {
    try {
        const clients = getClients();
        const services = getServices();

        // Get unique cities and categories for filters
        const cities = Array.from(new Set([
            ...clients.map(c => c.city),
            ...services.map(s => s.city)
        ])).filter(Boolean).sort();

        const categories = Array.from(new Set(
            services.map(s => s.category)
        )).filter(Boolean).sort();

        return NextResponse.json({
            clients,
            services,
            cities,
            categories
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

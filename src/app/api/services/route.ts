import { NextResponse } from "next/server";
import { getServices, saveServices, Service } from "@/lib/csv";

export async function POST(request: Request) {
    try {
        const updatedService: Service = await request.json();
        const services = getServices();

        const index = services.findIndex(s => s.source_id === updatedService.source_id);
        if (index !== -1) {
            services[index] = updatedService; // Update
        } else {
            services.push(updatedService); // Add
        }

        saveServices(services);
        return NextResponse.json({ success: true, service: updatedService });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save service" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { source_id } = await request.json();
        const services = getServices();

        const filteredServices = services.filter(s => s.source_id !== source_id);
        saveServices(filteredServices);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }
}

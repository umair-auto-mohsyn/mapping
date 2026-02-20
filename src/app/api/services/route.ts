import { NextResponse } from "next/server";
import { getServices, saveServices, Service } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const updatedService: Service = await request.json();
        const services = getServices();

        console.log(`Saving service: ${updatedService.entity_name} (${updatedService.source_id})`);

        const index = services.findIndex(s => s.source_id === updatedService.source_id);
        if (index !== -1) {
            services[index] = updatedService; // Update
        } else {
            services.push(updatedService); // Add
        }

        saveServices(services);
        console.log(`Successfully saved services. Count: ${services.length}`);
        return NextResponse.json({ success: true, service: updatedService });
    } catch (error) {
        console.error("Save error:", error);
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

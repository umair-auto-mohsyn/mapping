import { NextResponse } from "next/server";
import { Service } from "@/types";
import { saveServiceToSheets, deleteServiceFromSheets, getServicesFromSheets } from "@/lib/google-sheets";
import { STANDARD_CATEGORIES } from "@/lib/google-places";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const updatedService: Service = await request.json();

        // Validation: Ensure city name is not a category
        const isInvalidCity = STANDARD_CATEGORIES.some(cat =>
            cat.toLowerCase() === updatedService.city.toLowerCase() ||
            updatedService.city.toLowerCase() === "ambulance"
        );

        if (isInvalidCity) {
            console.error(`Validation failed: Attempted to save service with city "${updatedService.city}" which is a category.`);
            return NextResponse.json({ error: "Invalid city name: City cannot be a service category." }, { status: 400 });
        }

        console.log(`Saving service to Sheets: ${updatedService.entity_name} (${updatedService.source_id})`);

        await saveServiceToSheets(updatedService);

        console.log(`Successfully saved service to Sheets.`);
        return NextResponse.json({ success: true, service: updatedService });
    } catch (error) {
        console.error("Save error:", error);
        return NextResponse.json({ error: "Failed to save service" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { source_id } = await request.json();
        await deleteServiceFromSheets(source_id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }
}

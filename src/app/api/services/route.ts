import { NextResponse } from "next/server";
import { Service } from "@/types";
import { saveServiceToSheets, deleteServiceFromSheets } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const updatedService: Service = await request.json();
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

import { NextResponse } from "next/server";
import { Client } from "@/lib/csv";
import { saveClientToSheets } from "@/lib/google-sheets";

export async function POST(request: Request) {
    try {
        const newClient: Client = await request.json();
        console.log(`Saving client to Sheets: ${newClient.email}`);

        await saveClientToSheets(newClient);

        return NextResponse.json({ success: true, client: newClient });
    } catch (error) {
        console.error("Save client error:", error);
        return NextResponse.json({ error: "Failed to save client" }, { status: 500 });
    }
}

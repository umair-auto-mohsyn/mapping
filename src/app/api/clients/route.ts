import { NextResponse } from "next/server";
import { getClients, saveClients, Client } from "@/lib/csv";

export async function POST(request: Request) {
    try {
        const newClient: Client = await request.json();
        const clients = getClients();

        const index = clients.findIndex(c => c.email === newClient.email);
        if (index !== -1) {
            clients[index] = newClient; // Edit
        } else {
            clients.push(newClient); // Add
        }

        saveClients(clients);
        return NextResponse.json({ success: true, client: newClient });
    } catch (error) {
        return NextResponse.json({ error: "Failed to save client" }, { status: 500 });
    }
}

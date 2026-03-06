import { getClientsFromSheets } from "../src/lib/google-sheets";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
    console.log("Starting debug run of getClientsFromSheets...");
    try {
        const clients = await getClientsFromSheets();
        console.log("--- DEBUG RESULTS ---");
        console.log(`Total Clients Returned: ${clients.length}`);
        if (clients.length > 0) {
            console.log("Sample First Client:", JSON.stringify(clients[0], null, 2));
            console.log("Sample Last Client:", JSON.stringify(clients[clients.length - 1], null, 2));
        }
    } catch (err) {
        console.error("Debug Run Failed:", err);
    }
}

main();

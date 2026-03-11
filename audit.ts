import "dotenv/config";
import path from "path";

// Simple fetch-like wrapper using https if node-fetch isn't available
// But on Node 18+ it's built-in. Let's just assume Node 18+ or let the user know.

import { getClientsFromSheets, getServicesFromSheets } from "./src/lib/google-sheets";
import { STANDARD_CATEGORIES } from "./src/lib/google-places";

async function runAudit() {
    try {
        console.log("--- STARTING DATA CONSISTENCY AUDIT ---");
        
        const clients = await getClientsFromSheets();
        const services = await getServicesFromSheets();
        
        console.log(`\nFound ${clients.length} Clients`);
        console.log(`Found ${services.length} Services`);

        // 1. Audit Categories
        console.log("\n--- CATEGORY AUDIT ---");
        const serviceCategories = new Set(services.map(s => s.category));
        const codeCategories = new Set(STANDARD_CATEGORIES);
        
        console.log("Categories in Code but NOT in Sheet:");
        let missingInSheet = [...codeCategories].filter(x => !serviceCategories.has(x));
        console.log(missingInSheet.length > 0 ? missingInSheet : "None (Perfect!)");

        console.log("\nCategories in Sheet but NOT in Code (Spelling issues?):");
        let missingInCode = [...serviceCategories].filter(x => !codeCategories.has(x));
        console.log(missingInCode.length > 0 ? missingInCode : "None (Perfect!)");

        // 2. Audit Cities
        console.log("\n--- CITY AUDIT ---");
        const clientCities = new Set(clients.map(c => c.city));
        const serviceCities = new Set(services.map(s => s.city));
        
        console.log("Client Cities:");
        console.log([...clientCities]);

        console.log("\nService Cities:");
        console.log([...serviceCities]);

        const messyCities = [...serviceCities, ...clientCities].filter((city: any) => 
            city && (city.includes('ā') || city.includes('ū') || city.includes('ē'))
        );
        if (messyCities.length > 0) {
            console.log("\nWARNING: Found cities with special characters:");
            console.log(messyCities);
        }

    } catch (error) {
        console.error("Audit failed:", error);
    }
}

runAudit();

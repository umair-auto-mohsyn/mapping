import { google } from "googleapis";
import { Client, Service } from "@/types";
import { extractCoordinates } from "./coordinate-parser";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// We will use environment variables for credentials
const getAuth = () => {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not defined");
    }

    // Strip surrounding quotes if present (common in .env files)
    keyString = keyString.trim();
    if ((keyString.startsWith("'") && keyString.endsWith("'")) ||
        (keyString.startsWith('"') && keyString.endsWith('"'))) {
        console.error("Stripping surrounding quotes from GOOGLE_SERVICE_ACCOUNT_KEY");
        keyString = keyString.slice(1, -1);
    }

    try {
        const credentials = JSON.parse(keyString);

        if (credentials.private_key) {
            // THE ULTIMATE CLEANER: Reconstruct PEM from bits to bypass mangling
            let key = credentials.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();

            // Extract the actual base64 content between guards
            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";

            if (key.includes(header) && key.includes(footer)) {
                const startIndex = key.indexOf(header) + header.length;
                const endIndex = key.indexOf(footer);

                // Hyper-aggressive: Strip EVERYTHING except valid Base64 characters
                let base64Part = key.substring(startIndex, endIndex).replace(/[^A-Za-z0-9+/=]/g, "");

                // Fix padding: Base64 length MUST be a multiple of 4
                while (base64Part.length % 4 !== 0) {
                    base64Part += "=";
                }

                // Reconstruct with guaranteed good formatting (header, body, footer)
                credentials.private_key = `${header}\n${base64Part}\n${footer}`;

                console.error(`PEM Reconstructed: OriginalLength=${key.length}, CleanBase64Length=${base64Part.length}`);
                console.error(`Safe Metadata: [${base64Part.substring(0, 10)}...] [...${base64Part.substring(base64Part.length - 10)}]`);
            } else {
                console.error("Key guards missing! PEM might be corrupted.");
                // Fallback: just try to fix newlines if guards are missing
                credentials.private_key = key;
            }
        } else {
            console.error("Credentials JSON parsed but 'private_key' field is missing!");
        }

        return new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
    } catch (e: any) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY as JSON:", e.message);

        // Final fallback: if it looks like a PEM key anyway, try to use it
        if (keyString.includes("-----BEGIN PRIVATE KEY-----")) {
            console.error("Found PEM header in non-JSON string, attempting raw auth...");
            const cleanedKey = keyString.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
            return new google.auth.GoogleAuth({
                credentials: {
                    private_key: cleanedKey,
                    client_email: "extraction-bot@entity-directory-scraper.iam.gserviceaccount.com"
                },
                scopes: SCOPES,
            });
        }
        throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_KEY format: ${e.message}`);
    }
};

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "1NyHwjHgkjjicZghQVc6wzzl4uXUUi5dLYiJOkehUtMM";
const EXTERNAL_CLIENT_SHEET_ID = "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84";

export async function getGoogleSheetData(range: string, customSheetId?: string) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const targetId = customSheetId || SHEET_ID;

    console.log(`Fetching data from Sheet ID: ${targetId}, Range: ${range}`);

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: targetId,
            range,
        });
        const rows = response.data.values || [];
        console.log(`Successfully fetched ${rows.length} rows from range: ${range}`);
        return rows;
    } catch (error: any) {
        console.error(`Error fetching data from range ${range}:`, error.message);
        // If it's a 404/400, it might be a tab name mismatch. Let's list tabs to help diagnostics.
        await logSpreadsheetMetadata();
        throw error;
    }
}

async function logSpreadsheetMetadata() {
    try {
        const auth = getAuth();
        const sheets = google.sheets({ version: "v4", auth });
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID,
        });
        const tabs = metadata.data.sheets?.map((s: any) => s.properties?.title) || [];
        console.log("Available tabs in this spreadsheet:", tabs.join(", "));
    } catch (e: any) {
        console.error("Failed to fetch spreadsheet metadata:", e.message);
    }
}

export async function appendGoogleSheetData(range: string, values: any[][]) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values,
        },
    });
}

export async function updateGoogleSheetData(range: string, values: any[][]) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values,
        },
    });
}

// Mapper functions to convert Sheets data to internal types
export async function getServicesFromSheets(): Promise<Service[]> {
    try {
        const rows = await getGoogleSheetData("'Final Merged Sheet(Map Usage)'!A2:L");
        return rows.map((row: any) => ({
            source_id: (row[0] || "").trim(),
            entity_name: (row[1] || "").trim(),
            category: (row[2] || "").trim(),
            city: (row[3] || "").trim(),
            address: (row[4] || "").trim(),
            latitude: parseFloat(row[5]) || 0,
            longitude: parseFloat(row[6]) || 0,
            primary_contact: (row[7] || "").trim(),
            secondary_contact: (row[8] || "").trim(),
            opening_hours: (row[9] || "").trim(),
            image_url: (row[10] || "").trim().replace("REPLACED_BY_CODE", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""),
            data_source: (row[11] || "").trim(),
        }));
    } catch (error) {
        console.error("Error fetching services from Sheets:", error);
        return [];
    }
}

export async function getClientsFromSheets(): Promise<Client[]> {
    try {
        console.log("Fetching clients from both sources...");
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        // 1. Fetch from HubSpot (External)
        const hubspotRows = await getGoogleSheetData("'Contacts Raw'!A2:O", EXTERNAL_CLIENT_SHEET_ID);
        const hubspotClients: Client[] = [];

        for (let i = 0; i < hubspotRows.length; i++) {
            const row = hubspotRows[i];
            const firstName = (row[2] || "").trim();
            const lastName = (row[3] || "").trim();
            const email = (row[4] || "").trim() || `hubspot-${i}@mohsyn.com`;
            const city = (row[12] || "").trim();
            const rawAddress = (row[14] || "").trim();

            if (!firstName && !lastName) continue;

            let coords = extractCoordinates(rawAddress);
            if (!coords && rawAddress && apiKey) {
                const cleanAddress = rawAddress.split('\n')[0].replace(/Address: /g, '');
                try {
                    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress + ", " + city)}&key=${apiKey}`);
                    const geoData = await geoRes.json();
                    if (geoData.status === "OK") coords = geoData.results[0].geometry.location;
                } catch (e) { }
            }

            if (coords) {
                hubspotClients.push({
                    firstName, lastName, email, city,
                    latitude: coords.lat, longitude: coords.lng, id: email
                });
            }
        }

        // 2. Fetch from Local Overrides (Primary Sheet)
        const localRows = await getGoogleSheetData("'Client Coordinates Update'!A2:F");
        const localClients: Client[] = localRows.map((row: any) => ({
            firstName: (row[0] || "").trim(),
            lastName: (row[1] || "").trim(),
            email: (row[2] || "").trim(),
            city: (row[3] || "").trim(),
            latitude: parseFloat(row[4]) || 0,
            longitude: parseFloat(row[5]) || 0,
            id: (row[2] || `${row[0]}-${row[1]}`).trim(),
        })).filter(c => c.latitude !== 0);

        // 3. Merge: Primary sheet overrides HubSpot if email matches
        const clientMap = new Map<string, Client>();
        hubspotClients.forEach((c: Client) => clientMap.set(c.email, c));
        localClients.forEach((c: Client) => clientMap.set(c.email, c));

        const finalClients = Array.from(clientMap.values());
        console.log(`Merged ${hubspotClients.length} HubSpot + ${localClients.length} local -> ${finalClients.length} total clients.`);
        return finalClients;
    } catch (error) {
        console.error("Error fetching/merging clients:", error);
        return [];
    }
}

export async function saveServiceToSheets(service: Service) {
    const services = await getServicesFromSheets();
    const index = services.findIndex(s => s.source_id === service.source_id);

    const row = [
        service.source_id,
        service.entity_name,
        service.category,
        service.city,
        service.address,
        service.latitude,
        service.longitude,
        service.primary_contact,
        service.secondary_contact,
        service.opening_hours,
        service.image_url,
        service.data_source
    ];

    if (index !== -1) {
        // Update existing row (A is column 1, row is index + 2 because of header)
        await updateGoogleSheetData(`'Final Merged Sheet(Map Usage)'!A${index + 2}:L${index + 2}`, [row]);
    } else {
        // Append new row
        await appendGoogleSheetData("'Final Merged Sheet(Map Usage)'!A:L", [row]);
    }
}

export async function deleteServiceFromSheets(sourceId: string) {
    const services = await getServicesFromSheets();
    const index = services.findIndex(s => s.source_id === sourceId);

    if (index !== -1) {
        const auth = getAuth();
        const sheets = google.sheets({ version: "v4", auth });

        // We'll clear the row. In a more advanced implementation, we might want to delete the row dimension.
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: `'Final Merged Sheet(Map Usage)'!A${index + 2}:L${index + 2}`,
        });
    }
}

export async function saveClientToSheets(client: Client) {
    const clients = await getClientsFromSheets();
    const index = clients.findIndex(c => c.email === client.email);

    const row = [
        client.firstName,
        client.lastName,
        client.email,
        client.city,
        client.latitude,
        client.longitude
    ];

    if (index !== -1) {
        await updateGoogleSheetData(`'Client Coordinates Update'!A${index + 2}:F${index + 2}`, [row]);
    } else {
        await appendGoogleSheetData("'Client Coordinates Update'!A:F", [row]);
    }
}

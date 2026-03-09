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
        keyString = keyString.slice(1, -1);
    }

    try {
        const credentials = JSON.parse(keyString);

        if (credentials.private_key) {
            // THE ULTIMATE CLEANER: Reconstruct PEM from bits to bypass mangling
            let key = credentials.private_key.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();

            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";

            if (key.includes(header) && key.includes(footer)) {
                const startIndex = key.indexOf(header) + header.length;
                const endIndex = key.indexOf(footer);
                let base64Part = key.substring(startIndex, endIndex).replace(/[^A-Za-z0-9+/=]/g, "");
                while (base64Part.length % 4 !== 0) {
                    base64Part += "=";
                }
                credentials.private_key = `${header}\n${base64Part}\n${footer}`;
            } else {
                credentials.private_key = key;
            }
        }

        return new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
    } catch (e: any) {
        // Final fallback: if it looks like a PEM key Anyway, try to use it
        if (keyString.includes("-----BEGIN PRIVATE KEY-----")) {
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
const EXTERNAL_CLIENT_SHEET_ID = process.env.HUBSPOT_SHEET_ID || "167tn8tQ_P5tD_BkbLoT6KYqYvMTpaLaukZ8g887vX84";

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
        throw error;
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

// Fetch authorized users and their roles from the "Authorized Users" tab
export async function getAuthorizedUsers(): Promise<Record<string, 'ADMIN' | 'EDITOR'>> {
    const roles: Record<string, 'ADMIN' | 'EDITOR'> = {};
    try {
        const rows = await getGoogleSheetData("'Authorized Users'!A:B", EXTERNAL_CLIENT_SHEET_ID);
        // Assuming Column A is Email, Column B is Role taking rows from row 2 (skipping header)
        if (rows.length > 1) {
            rows.slice(1).forEach(row => {
                const email = (row[0] || "").trim().toLowerCase();
                const role = (row[1] || "").trim().toUpperCase();
                if (email && (role === "ADMIN" || role === "EDITOR")) {
                    roles[email] = role as 'ADMIN' | 'EDITOR';
                }
            });
        }
    } catch (e) {
        console.warn("Could not fetch Authorized Users. They might not be set up yet.");
    }
    return roles;
}

export async function updateGoogleSheetData(range: string, values: any[][], customId?: string) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const targetId = customId || SHEET_ID;

    await sheets.spreadsheets.values.update({
        spreadsheetId: targetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values,
        },
    });
}

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

/**
 * Fetches clients exclusively from the HubSpot-synced "Contacts Raw" sheet.
 * Performs dynamic column mapping based on headers.
 */
export async function getClientsFromSheets(): Promise<Client[]> {
    try {
        console.log("Fetching clients from HubSpot 'Contacts Raw'...");
        const auth = getAuth();
        const sheets = google.sheets({ version: "v4", auth });
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        // Fetch A1:Z to include headers and all potential columns
        const rows = await getGoogleSheetData("'Contacts Raw'!A1:Z", EXTERNAL_CLIENT_SHEET_ID);
        if (rows.length < 2) {
            console.log("No data found in HubSpot sheet (or only headers).");
            return [];
        }

        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim());
        console.log("Dynamic Header Mapping:", headers.join(" | "));

        // Find indices dynamically
        const idxFirst = headers.findIndex(h => h.includes("first"));
        const idxLast = headers.findIndex(h => h.includes("last"));
        const idxEmail = headers.findIndex(h => h.includes("email"));
        const idxCity = headers.findIndex(h => h.includes("serving city") || h.includes("city"));
        // Address often has NO header, so we fallback to index 14 (Column O) if not found
        let idxAddr = headers.findIndex(h => h.includes("address") || h.includes("raw"));
        if (idxAddr === -1) idxAddr = 14;

        console.log(`Indices found: First=${idxFirst}, Last=${idxLast}, Email=${idxEmail}, City=${idxCity}, Addr=${idxAddr}`);

        // If dynamic mapping fails for critical columns, fallback to hardcoded indices
        let dataRows = rows.slice(1);
        let fIdx = idxFirst === -1 ? 2 : idxFirst;
        let lIdx = idxLast === -1 ? 3 : idxLast;
        let eIdx = idxEmail === -1 ? 4 : idxEmail;
        let cIdx = idxCity === -1 ? 12 : idxCity;
        let aIdx = idxAddr === -1 ? 14 : idxAddr;

        const clients: Client[] = [];

        // Fetch Cache Data
        let cacheMap: Map<string, { lat: number, lng: number }> = new Map();
        try {
            const cacheRes = await sheets.spreadsheets.values.get({
                spreadsheetId: EXTERNAL_CLIENT_SHEET_ID,
                range: "'Client Coordinates'!A:F"
            });
            const cacheRows = cacheRes.data.values || [];
            if (cacheRows.length > 1) {
                cacheRows.slice(1).forEach((row: any) => {
                    const email = (row[2] || "").trim().toLowerCase(); // Email in Column C
                    const lat = parseFloat(row[4]); // Column E
                    const lng = parseFloat(row[5]); // Column F
                    if (email && !isNaN(lat) && !isNaN(lng)) {
                        cacheMap.set(email, { lat, lng });
                    }
                });
                console.log(`Loaded ${cacheMap.size} coordinate pairs from cache.`);
            }
        } catch (e: any) {
            console.warn("Could not fetch coordinate cache:", e.message);
        }

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const firstName = (row[fIdx] || "").trim();
            const lastName = (lIdx !== -1 ? (row[lIdx] || "").trim() : "");
            const rawEmail = (row[eIdx] || "").trim();
            const emailKey = rawEmail.toLowerCase();
            const displayEmail = rawEmail || `hubspot-${i}@mohsyn.com`;
            let city = (cIdx !== -1 ? (row[cIdx] || "").trim() : "");
            const rawAddress = (row[aIdx] || "").trim();

            if (!firstName && !lastName) continue;

            // FALLBACK: If city is empty, try to find it in the address
            if (!city && rawAddress) {
                const commonCities = ["karachi", "lahore", "islamabad", "rawalpindi", "faisalabad", "multan", "lodhran"];
                const addrLower = rawAddress.toLowerCase();
                const foundCity = commonCities.find(c => addrLower.includes(c));
                if (foundCity) {
                    city = foundCity.charAt(0).toUpperCase() + foundCity.slice(1);
                    console.log(`Extracted city "${city}" from address for ${firstName} ${lastName}`);
                }
            }

            let coords: { lat: number, lng: number } | null = extractCoordinates(rawAddress);

            // Check Cache if no coordinates in address
            if (!coords && emailKey && cacheMap.has(emailKey)) {
                coords = cacheMap.get(emailKey)!;
                console.log(`Using cached coordinates for ${firstName} ${lastName}`);
            }

            if (!coords && rawAddress && apiKey) {
                const cleanAddress = rawAddress.split('\n')[0].replace(/Address: /g, '');
                try {
                    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress + (city ? ", " + city : ""))}&key=${apiKey}`;
                    const geoRes = await fetch(geoUrl);
                    const geoData = await geoRes.json();

                    if (geoData.status === "OK") {
                        const location = geoData.results[0].geometry.location;
                        coords = location;
                        console.log(`Geocoded [${firstName} ${lastName}]: OK`);
                    } else {
                        console.warn(`Geocode [${firstName} ${lastName}] FAILED: ${geoData.status}. Address: ${cleanAddress}`);
                    }
                } catch (e: any) {
                    console.error(`Geocode [${firstName} ${lastName}] ERROR:`, e.message);
                }
            }

            // CACHING LOGIC: If we have coordinates (from parsing OR geocoding) 
            // and they weren't already in the cache, save them now.
            if (coords && emailKey && !cacheMap.has(emailKey)) {
                try {
                    const cacheRow = [firstName, lastName, emailKey, city, coords.lat, coords.lng];
                    await sheets.spreadsheets.values.append({
                        spreadsheetId: EXTERNAL_CLIENT_SHEET_ID,
                        range: "'Client Coordinates'!A:F",
                        valueInputOption: "USER_ENTERED",
                        requestBody: { values: [cacheRow] }
                    });
                    console.log(`Cached ALL coordinates for ${firstName} ${lastName}`);
                    // Update local map to avoid duplicate appends in the same run if there happen to be dupes
                    cacheMap.set(emailKey, coords);
                } catch (cacheError: any) {
                    console.error(`Failed to cache coordinates for ${firstName}:`, cacheError.message);
                }
            }

            if (coords) {
                clients.push({
                    firstName,
                    lastName,
                    email: displayEmail,
                    city,
                    latitude: coords.lat,
                    longitude: coords.lng,
                    id: displayEmail
                });
            } else {
                console.log(`Skipping [${firstName} ${lastName}]: No coordinates found`);
            }
        }

        console.log(`Successfully processed ${clients.length} clients from HubSpot.`);
        return clients;
    } catch (error) {
        console.error("Error fetching HubSpot clients:", error);
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
        await updateGoogleSheetData(`'Final Merged Sheet(Map Usage)'!A${index + 2}:L${index + 2}`, [row]);
    } else {
        await appendGoogleSheetData("'Final Merged Sheet(Map Usage)'!A:L", [row]);
    }
}

export async function deleteServiceFromSheets(sourceId: string) {
    const services = await getServicesFromSheets();
    const index = services.findIndex(s => s.source_id === sourceId);

    if (index !== -1) {
        const auth = getAuth();
        const sheets = google.sheets({ version: "v4", auth });
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: `'Final Merged Sheet(Map Usage)'!A${index + 2}:L${index + 2}`,
        });
    }
}

export async function saveClientToSheets(client: Client) {
    // Legacy support for manual client entry - saves to primary spreadsheet
    const row = [
        client.firstName,
        client.lastName,
        client.email,
        client.city,
        client.latitude,
        client.longitude
    ];
    await appendGoogleSheetData("'Client Coordinates Update'!A:F", [row]);
}

/**
 * Optimized bulk insert for the Extraction Tools.
 * Bypasses row-by-row checks and just appends the whole batch in one API call.
 */
export async function saveMultipleServicesToSheets(services: Service[]) {
    if (!services || services.length === 0) return;

    const rows = services.map(service => [
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
    ]);

    await appendGoogleSheetData("'Final Merged Sheet(Map Usage)'!A:L", rows);
}

/**
 * EXTRACTION LOGGING & COOLDOWN
 * Sheet: "Extraction Log"
 * Columns: A (Timestamp), B (Type: CITY|CLIENT), C (Identifier: City Name|Client ID), D (Categories)
 */

export async function getExtractionLog(): Promise<any[][]> {
    try {
        // Use a more inclusive range query
        const data = await getGoogleSheetData("'Extraction Log'!A:D");
        if (!data || data.length <= 1) return []; // Just header or empty
        return data.slice(1); // Remove header
    } catch (e: any) {
        console.warn("Extraction Log sheet not found or empty:", e.message);
        return [];
    }
}

export async function checkExtractionCooldown(identifier: string): Promise<{ isLocked: boolean; remainingDays?: number; lastDate?: string }> {
    const logs = await getExtractionLog();
    if (logs.length === 0) return { isLocked: false };

    const targetId = identifier.trim().toLowerCase();

    // Find the latest entry for this identifier
    const relevantLogs = logs.filter(row => (row[2] || "").trim().toLowerCase() === targetId);
    if (relevantLogs.length === 0) return { isLocked: false };

    // Sort by timestamp (Column A is ISO string)
    relevantLogs.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    const latest = relevantLogs[0];
    const lastDate = new Date(latest[0]);
    const now = new Date();

    const diffTime = now.getTime() - lastDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        return {
            isLocked: true,
            remainingDays: 30 - diffDays,
            lastDate: lastDate.toLocaleDateString()
        };
    }

    return { isLocked: false };
}

/**
 * Returns an array of category names that are currently on cooldown for a given identifier.
 * Uses robust case-insensitive comparison.
 */
export async function getLockedCategories(identifier: string): Promise<{ category: string, lockedUntil: string }[]> {
    const logs = await getExtractionLog();
    if (logs.length === 0) return [];

    const now = new Date();
    const lockedMap = new Map<string, Date>();
    const targetId = identifier.trim().toLowerCase();

    // Scan all logs for this identifier
    logs.forEach(row => {
        const rowIdentifier = (row[2] || "").trim().toLowerCase();
        if (rowIdentifier === targetId) {
            const timestamp = new Date(row[0]);
            // Extract categories from column D (row[3])
            const categoriesContent = (row[3] || "");
            const categories = categoriesContent.split(",").map((c: string) => c.trim()).filter(Boolean);

            const diffTime = now.getTime() - timestamp.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays < 30) {
                const lockedUntil = new Date(timestamp.getTime() + (30 * 24 * 60 * 60 * 1000));
                categories.forEach((cat: string) => {
                    const catKey = cat.trim(); // Keep original casing for key but compare smartly
                    const existing = lockedMap.get(catKey);
                    if (!existing || lockedUntil > existing) {
                        lockedMap.set(catKey, lockedUntil);
                    }
                });
            }
        }
    });

    return Array.from(lockedMap.entries()).map(([category, date]) => ({
        category,
        lockedUntil: date.toLocaleDateString()
    }));
}

export async function logExtraction(type: 'CITY' | 'CLIENT', identifier: string, categories: string[]) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const timestamp = new Date().toISOString();
    const row = [timestamp, type, identifier.trim(), categories.join(", ")];

    try {
        // Ensure sheet exists by trying to append to it
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: "'Extraction Log'!A:D",
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [row] }
        });
        console.log(`[Log] Extraction recorded for ${identifier} (${type}): ${categories.join(", ")}`);
    } catch (e: any) {
        if (e.message.includes("Unable to parse range")) {
            // Sheet probably doesn't exist, try to create it
            try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SHEET_ID,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: { title: "Extraction Log" }
                            }
                        }]
                    }
                });
                // Add header
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SHEET_ID,
                    range: "'Extraction Log'!A1:D1",
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [["Timestamp", "Type", "Identifier", "Categories"]] }
                });
                // Append data again
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: "'Extraction Log'!A:D",
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [row] }
                });
                return;
            } catch (err: any) {
                console.error("Failed to auto-create Extraction Log sheet:", err.message);
            }
        }
        console.error("Failed to log extraction:", e.message);
    }
}

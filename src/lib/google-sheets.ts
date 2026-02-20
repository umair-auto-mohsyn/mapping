import { google } from "googleapis";
import { Client, Service } from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// We will use environment variables for credentials
const getAuth = () => {
    let keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not defined");
    }

    // Strip surrounding quotes if present (common in .env files)
    keyString = keyString.trim();
    if (keyString.startsWith("'") && keyString.endsWith("'")) {
        keyString = keyString.slice(1, -1);
    }

    try {
        const credentials = JSON.parse(keyString);
        return new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
    } catch (e) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", e);
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_KEY format");
    }
};

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "1NyHwjHgkjjicZghQVc6wzzl4uXUUi5dLYiJOkehUtMM";

export async function getGoogleSheetData(range: string) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
    });

    return response.data.values || [];
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
        const rows = await getGoogleSheetData("'Specefic Sheet Clean'!A2:L");
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
        // Fallback or specific client tab name
        const rows = await getGoogleSheetData("'Client Coordinates Update'!A2:F");
        return rows.map((row: any) => ({
            firstName: (row[0] || "").trim(),
            lastName: (row[1] || "").trim(),
            email: (row[2] || "").trim(),
            city: (row[3] || "").trim(),
            latitude: parseFloat(row[4]) || 0,
            longitude: parseFloat(row[5]) || 0,
            id: (row[2] || `${row[0]}-${row[1]}`).trim(),
        }));
    } catch (error) {
        console.warn("Client tab not found or inaccessible, returning empty list.");
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
        await updateGoogleSheetData(`'Specefic Sheet Clean'!A${index + 2}:L${index + 2}`, [row]);
    } else {
        // Append new row
        await appendGoogleSheetData("'Specefic Sheet Clean'!A:L", [row]);
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
            range: `'Specefic Sheet Clean'!A${index + 2}:L${index + 2}`,
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

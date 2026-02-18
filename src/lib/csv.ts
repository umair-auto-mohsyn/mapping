import Papa from "papaparse";
import fs from "fs";
import path from "path";

const DATABASE_DIR = path.join(process.cwd(), "Database");
const CLIENTS_FILE = path.join(DATABASE_DIR, "Client Coordinates Updates - Sheet1.csv");
const SERVICES_FILE = path.join(DATABASE_DIR, "Service Delivery Mapping Data - Specefic Sheet Clean.csv");

export interface Client {
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    latitude: number;
    longitude: number;
    id: string; // Combined name or email for unique ID
}

export interface Service {
    source_id: string;
    entity_name: string;
    category: string;
    city: string;
    address: string;
    latitude: number;
    longitude: number;
    primary_contact: string;
    secondary_contact: string;
    opening_hours: string;
    image_url: string;
    data_source: string;
}

export function getClients(): Client[] {
    try {
        const fileContent = fs.readFileSync(CLIENTS_FILE, "utf-8");
        const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

        return result.data.map((row: any) => ({
            firstName: row["[Contacts] First Name"] || "",
            lastName: row["[Contacts] Last Name"] || "",
            email: row["[Contacts] Email"] || "",
            city: row["[Contacts] Serving City"] || "",
            latitude: parseFloat(row["latitude"]),
            longitude: parseFloat(row["longitude"]),
            id: row["[Contacts] Email"] || `${row["[Contacts] First Name"]}-${row["[Contacts] Last Name"]}`,
        }));
    } catch (error) {
        console.error("Error reading clients CSV:", error);
        return [];
    }
}

export function getServices(): Service[] {
    try {
        const fileContent = fs.readFileSync(SERVICES_FILE, "utf-8");
        const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

        return result.data.map((row: any) => ({
            source_id: row["source_id"] || "",
            entity_name: row["entity_name"] || "",
            category: row["category"] || "",
            city: row["city"] || "",
            address: row["address"] || "",
            latitude: parseFloat(row["latitude"]),
            longitude: parseFloat(row["longitude"]),
            primary_contact: row["primary_contact"] || "",
            secondary_contact: row["secondary_contact"] || "",
            opening_hours: row["opening_hours"] || "",
            image_url: row["image_url"] || "",
            data_source: row["data_source"] || "",
        }));
    } catch (error) {
        console.error("Error reading services CSV:", error);
        return [];
    }
}

export function saveClients(clients: Client[]) {
    const csvData = clients.map(c => ({
        "[Contacts] First Name": c.firstName,
        "[Contacts] Last Name": c.lastName,
        "[Contacts] Email": c.email,
        "[Contacts] Serving City": c.city,
        "latitude": c.latitude,
        "longitude": c.longitude
    }));
    const csv = Papa.unparse(csvData);
    fs.writeFileSync(CLIENTS_FILE, csv);
}

export function saveServices(services: Service[]) {
    const csv = Papa.unparse(services);
    fs.writeFileSync(SERVICES_FILE, csv);
}

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

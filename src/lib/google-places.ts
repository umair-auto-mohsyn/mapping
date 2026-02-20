import { Service } from "./csv";

export const CATEGORY_TO_GOOGLE_TYPES: Record<string, string[]> = {
    "Hospital": ["hospital"],
    "Clinic": ["doctor", "health"],
    "Medical Store": ["pharmacy"],
    "Pharmacy": ["pharmacy"],
    "Police Station": ["police"],
    "Fire Station": ["fire_station"],
    "Ambulance Service": ["hospital"],
    "Burn Emergency Hospital": ["hospital"],
    "Laboratory": ["health", "medical_test_site"],
    "Medical Equipment": ["health", "store"],
    "Hardware Store": ["hardware_store"],
    "Restaurant": ["restaurant", "food"],
    "Gas Station": ["gas_station"],
    "Supermarket": ["supermarket", "grocery_or_supermarket"],
    "Electrician": ["electrician"],
    "Plumber": ["plumber"],
    "Female Salon": ["beauty_salon"],
    "Male Salon": ["beauty_salon"],
};

// Map Google types back to internal categories
export function mapGoogleTypeToCategory(types: string[], preferredCategory?: string): string {
    if (preferredCategory && CATEGORY_TO_GOOGLE_TYPES[preferredCategory]) {
        return preferredCategory;
    }

    const typeMap: Record<string, string> = {
        "hospital": "Hospital",
        "doctor": "Clinic",
        "pharmacy": "Medical Store",
        "police": "Police Station",
        "fire_station": "Fire Station",
        "hardware_store": "Hardware Store",
        "restaurant": "Restaurant",
        "gas_station": "Gas Station",
        "supermarket": "Supermarket",
        "grocery_or_supermarket": "Supermarket",
        "electrician": "Electrician",
        "plumber": "Plumber",
        "beauty_salon": "Male Salon", // Default to one, can be adjusted
    };

    for (const type of types) {
        if (typeMap[type]) return typeMap[type];
    }

    return "Other";
}

export interface GooglePlaceResult {
    place_id: string;
    name: string;
    vicinity?: string;
    formatted_address?: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    types: string[];
    opening_hours?: {
        open_now?: boolean;
        weekday_text?: string[];
    };
    formatted_phone_number?: string;
    address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
}

export function normalizeGooglePlace(
    place: GooglePlaceResult,
    internalCategory: string,
    city: string
): Service {
    // Extract city from address_components if available
    let extractedCity = city;
    if (place.address_components) {
        const cityComp = place.address_components.find(comp =>
            comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")
        );
        if (cityComp) {
            extractedCity = cityComp.long_name;
        }
    }

    return {
        source_id: place.place_id,
        entity_name: place.name,
        category: internalCategory,
        city: extractedCity,
        address: place.formatted_address || place.vicinity || "",
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        primary_contact: place.formatted_phone_number || "",
        secondary_contact: "",
        opening_hours: place.opening_hours?.weekday_text?.join(" | ") || "",
        image_url: "",
        data_source: "Google Maps"
    };
}

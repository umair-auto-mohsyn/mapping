import { Service } from "@/types";

// Enhanced configuration: using both 'type' and 'keyword' for better accuracy
export const CATEGORY_SEARCH_CONFIG: Record<string, { types: string[], keyword?: string }> = {
    "Hospital": { types: ["hospital"] },
    "Clinic": { types: ["doctor", "health_center"], keyword: "Clinic" },
    "Medical Store": { types: ["pharmacy"], keyword: "Medical Store" },
    "Pharmacy": { types: ["pharmacy"] },
    "Police Station": { types: ["police"] },
    "Fire Station": { types: ["fire_station"] },
    "Ambulance Service": { types: ["hospital"], keyword: "Ambulance" }, // Key fix: use keyword 'Ambulance'
    "Burn Emergency Hospital": { types: ["hospital"], keyword: "Burn Emergency" },
    "Laboratory": { types: ["health", "medical_test_site"], keyword: "Laboratory" },
    "Medical Equipment": { types: ["health", "store"], keyword: "Medical Equipment" },
    "Hardware Store": { types: ["hardware_store"] },
    "Restaurant": { types: ["restaurant", "food"] },
    "Gas Station": { types: ["gas_station"] },
    "Supermarket": { types: ["supermarket", "grocery_or_supermarket"] },
    "Electrician": { types: ["electrician"], keyword: "Electrician" },
    "Plumber": { types: ["plumber"], keyword: "Plumber" },
    "Female Salon": { types: ["beauty_salon"], keyword: "Female Salon" },
    "Male Salon": { types: ["beauty_salon"], keyword: "Male Salon" },
};

// Legacy support for backward compatibility during migration
export const CATEGORY_TO_GOOGLE_TYPES: Record<string, string[]> = Object.fromEntries(
    Object.entries(CATEGORY_SEARCH_CONFIG).map(([k, v]) => [k, v.types])
);

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
    selectedCity: string
): Service {
    // Determine the best city name: prefer the selected city if the address contains it
    let extractedCity = selectedCity;
    const address = (place.formatted_address || place.vicinity || "").toLowerCase();
    const cityLower = selectedCity.toLowerCase();

    // If the address doesn't contain the selected city, try to extract it from Google
    if (!address.includes(cityLower) && place.address_components) {
        const cityComp = place.address_components.find(comp =>
            comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")
        );
        if (cityComp) {
            extractedCity = cityComp.long_name;
        }
    }

    // Map the internal category (fallback to preference)
    const category = mapGoogleTypeToCategory(place.types || [], internalCategory);

    return {
        source_id: place.place_id,
        entity_name: place.name,
        category: category,
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

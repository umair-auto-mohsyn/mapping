import { Service } from "@/types";

// Enhanced configuration: using both 'type' and 'keyword' for better accuracy
// Enhanced configuration: Keyword-First strategy for high accuracy
export const CATEGORY_SEARCH_CONFIG: Record<string, { types: string[], keyword?: string }> = {
    "AC Technition": { types: [], keyword: "AC Technician Repair" },
    "Ambulance Service": { types: [], keyword: "Ambulance" }, // Removed 'hospital' type to avoid general hospitals
    "Bakery": { types: ["bakery"], keyword: "Bakery" },
    "Car Repair": { types: ["car_repair"], keyword: "Car Repair workshop" },
    "Child day care": { types: [], keyword: "Day care preschool" },
    "Clinic": { types: ["doctor"], keyword: "Clinic" },
    "Electrician": { types: ["electrician"], keyword: "Electrician" },
    "Electricity Provider Office": { types: [], keyword: "Electricity Office WAPDA IESCO" },
    "Female Salon": { types: ["beauty_salon"], keyword: "Female Salon" },
    "Fire Station": { types: ["fire_station"], keyword: "Fire Station" },
    "Flower Shops": { types: ["florist"], keyword: "Flower Shop" },
    "Gas Provider": { types: [], keyword: "Gas Company SNGPL SSGC" },
    "Gas cylinder Services": { types: [], keyword: "Gas cylinder LPG delivery" },
    "Hardware Store": { types: ["hardware_store"], keyword: "Hardware Store" },
    "Home Chef": { types: [], keyword: "Home Chef Tiffin Service" },
    "Hospital": { types: ["hospital"], keyword: "General Hospital" },
    "Internet Service Provider": { types: [], keyword: "Internet Provider ISP" },
    "Laboratory": { types: [], keyword: "Medical Laboratory Diagnostic Center" },
    "Male Salon": { types: ["beauty_salon"], keyword: "Male Salon Barber" },
    "Mason Service": { types: [], keyword: "Mason Construction Masonry" },
    "Medical Equipment Supplier": { types: [], keyword: "Medical Equipment" },
    "Medical Store": { types: ["pharmacy"], keyword: "Medical Store" },
    "Mineral Water home delivery": { types: [], keyword: "Mineral Water delivery" },
    "Old age houses": { types: [], keyword: "Old age home Nursing home" },
    "Pharmacy": { types: ["pharmacy"], keyword: "Pharmacy" },
    "Plumber": { types: ["plumber"], keyword: "Plumber" },
    "Police Station": { types: ["police"], keyword: "Police Station" },
    "Burn Emergency Hospital": { types: ["hospital"], keyword: "Burn Emergency Center" },
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
        "bakery": "Bakery",
        "car_repair": "Car Repair",
        "electrician": "Electrician",
        "plumber": "Plumber",
        "beauty_salon": "Male Salon",
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

/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}

export const CATEGORY_COLORS: Record<string, string> = {
    Hospital: "#ef4444",
    Clinic: "#f97316",
    Pharmacy: "#10b981",
    "Police Station": "#3b82f6",
    "Fire Station": "#dc2626",
    "Ambulance Service": "#fca5a5",
    "Medical Store": "#2dd4bf",
    Hardware: "#71717a",
    Laboratory: "#be185d",
    "Medical Equipment": "#7c3aed",
    "Mineral Water home delivery": "#0284c7",
    "Female Salon": "#db2777",
    Restaurant: "#ea580c",
    "Gas Station": "#4b5563",
    "Home Chef": "#ec4899", // pink-500
    "Hardware Store": "#71717a", // gray-500
    "Internet Service Provider": "#6366f1", // indigo-500
    "Male Salon": "#ec4899", // pink-500
    "Mason Service": "#8b4513", // saddlebrown
    // Default color for others
    default: "#2563eb", // blue-600 (more visible)
};

"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Map as GoogleMap,
    Marker,
    InfoWindow,
    useMap,
} from "@vis.gl/react-google-maps";
import { Client, Service } from "@/lib/csv";
import { CATEGORY_COLORS } from "@/lib/utils";
import { MapPin, RotateCcw, Share2, Copy, CheckCircle2 } from "lucide-react";

interface MapProps {
    selectedCity: string;
    selectedClient: Client | null;
    filteredServices: Service[];
    radius: number | "ALL";
}

interface DisplayService extends Service {
    displayPos: google.maps.LatLngLiteral;
}

// Custom hook to draw circle
function MapCircle({ center, radius }: { center: google.maps.LatLngLiteral; radius: number }) {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        const circle = new google.maps.Circle({
            map,
            center,
            radius: radius * 1000,
            fillColor: "#3b82f6",
            fillOpacity: 0.1,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.8,
            strokeWeight: 2,
        });
        return () => circle.setMap(null);
    }, [map, center, radius]);
    return null;
}

export default function Map({ selectedCity, selectedClient, filteredServices, radius }: MapProps) {
    const map = useMap();
    const [selectedService, setSelectedService] = useState<DisplayService | null>(null);
    const [copied, setCopied] = useState(false);

    // Manual Spiderfy/Jitter logic for overlapping markers
    const processedServices = useMemo<DisplayService[]>(() => {
        const locationMap: { [key: string]: number } = {};

        return filteredServices.map((service) => {
            const posKey = `${service.latitude.toFixed(6)},${service.longitude.toFixed(6)}`;
            locationMap[posKey] = (locationMap[posKey] || 0) + 1;
            const count = locationMap[posKey];

            let lat = service.latitude;
            let lng = service.longitude;

            if (count > 1) {
                // Add jitter to prevent total overlap
                const angle = (count - 1) * (360 / 8) * (Math.PI / 180);
                const spread = 0.0001 * (1 + Math.floor((count - 1) / 8));
                lat += Math.sin(angle) * spread;
                lng += Math.cos(angle) * spread;
            }

            return { ...service, displayPos: { lat, lng } };
        });
    }, [filteredServices]);

    // Center map logic
    useEffect(() => {
        if (!map) return;

        if (selectedClient) {
            const pos = { lat: selectedClient.latitude, lng: selectedClient.longitude };

            if (radius !== "ALL") {
                // Zoom to fit radius
                // Approx mapping of radius to zoom level for Google Maps
                // 5km -> 13, 10km -> 12, 20km -> 11
                const zoomMap: Record<number, number> = {
                    5: 13,
                    10: 12,
                    20: 11
                };
                map.setCenter(pos);
                map.setZoom(zoomMap[radius as number] || 12);
            } else {
                // "ALL" - Show city but zoom out a bit
                map.setCenter(pos);
                map.setZoom(12); // Slightly more zoomed out than a specific client focus (14)
            }
        } else if (selectedCity) {
            // Find services in this city to center
            const cityServices = filteredServices.filter(s => s.city.toLowerCase() === selectedCity.toLowerCase());

            if (cityServices.length > 0) {
                const lats = cityServices.map(s => s.latitude);
                const lngs = cityServices.map(s => s.longitude);
                const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
                const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

                const cityCenter = { lat: avgLat, lng: avgLng };
                map.setCenter(cityCenter);
                map.panTo(cityCenter);
                map.setZoom(11);
            } else {
                map.setZoom(6);
                map.panTo({ lat: 30.3753, lng: 69.3451 });
            }
        }
    }, [map, selectedClient, selectedCity, radius]);

    return (
        <div className="w-full h-full">
            <GoogleMap
                style={{ width: "100%", height: "100%" }}
                defaultCenter={{ lat: 30.3753, lng: 69.3451 }}
                defaultZoom={6}
                maxZoom={19}
                gestureHandling={"greedy"}
                disableDefaultUI={false}
            >
                {/* Client Marker */}
                {selectedClient && (
                    <>
                        <Marker
                            position={{ lat: selectedClient.latitude, lng: selectedClient.longitude }}
                            title={`Client: ${selectedClient.firstName} ${selectedClient.lastName}`}
                            zIndex={2000}
                            icon={{
                                path: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
                                fillColor: "#1e40af",
                                fillOpacity: 1,
                                strokeWeight: 2,
                                strokeColor: "#ffffff",
                                scale: 2,
                                anchor: new google.maps.Point(12, 12),
                            }}
                        />
                        {radius !== "ALL" && (
                            <MapCircle
                                center={{ lat: selectedClient.latitude, lng: selectedClient.longitude }}
                                radius={radius}
                            />
                        )}
                    </>
                )}

                {/* Service Markers */}
                {processedServices.map((service, index) => (
                    <Marker
                        key={`service-${service.source_id || 'no-id'}-${service.latitude}-${service.longitude}-${index}`}
                        position={service.displayPos}
                        title={service.entity_name}
                        onClick={() => setSelectedService(service)}
                        icon={{
                            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                            fillColor: CATEGORY_COLORS[service.category] || CATEGORY_COLORS.default,
                            fillOpacity: 1,
                            strokeWeight: 1.5,
                            strokeColor: "#ffffff",
                            scale: 1.2,
                            anchor: new google.maps.Point(12, 22),
                        }}
                    />
                ))}

                {/* Info Window */}
                {selectedService && (
                    <InfoWindow
                        position={selectedService.displayPos}
                        onCloseClick={() => setSelectedService(null)}
                    >
                        <div className="p-3 max-w-[280px] text-sm">
                            <h3 className="font-bold text-gray-900 border-b pb-1 mb-2 leading-tight">{selectedService.entity_name}</h3>
                            <div className="space-y-2">
                                <p className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md inline-block">
                                    {selectedService.category}
                                </p>
                                <p className="text-[11px] text-gray-600 leading-snug">
                                    <MapPin size={10} className="inline mr-1" /> {selectedService.address}
                                </p>
                                {(selectedService.primary_contact || selectedService.secondary_contact) && (
                                    <div className="space-y-1 bg-gray-50 p-2 rounded border border-gray-100">
                                        {selectedService.primary_contact && (
                                            <p className="text-[11px] text-gray-700 font-mono">📞 {selectedService.primary_contact}</p>
                                        )}
                                        {selectedService.secondary_contact && (
                                            <p className="text-[11px] text-gray-500 font-mono italic">{selectedService.secondary_contact}</p>
                                        )}
                                    </div>
                                )}
                                {selectedService.opening_hours && (
                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <RotateCcw size={10} /> {selectedService.opening_hours}
                                    </p>
                                )}
                                <div className="pt-2 border-t mt-2 flex flex-col gap-2">
                                    {selectedClient && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => {
                                                    const origin = `${selectedClient.latitude},${selectedClient.longitude}`;
                                                    const destination = `${selectedService.latitude},${selectedService.longitude}`;
                                                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving&dir_action=navigate`;
                                                    const contactInfo = selectedService.primary_contact ? `\nContact: ${selectedService.primary_contact}` : "";
                                                    const message = `Hello, here are the directions for ${selectedService.entity_name}${contactInfo} starting from ${selectedClient.firstName} ${selectedClient.lastName}'s location:\n\n${directionsUrl}`;
                                                    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                                                    window.open(whatsappUrl, "_blank");
                                                }}
                                                className="flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                            >
                                                <Share2 size={12} strokeWidth={3} /> WhatsApp
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const origin = `${selectedClient.latitude},${selectedClient.longitude}`;
                                                    const destination = `${selectedService.latitude},${selectedService.longitude}`;
                                                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving&dir_action=navigate`;
                                                    const contactInfo = selectedService.primary_contact ? `\nContact: ${selectedService.primary_contact}` : "";
                                                    const message = `Hello, here are the directions for ${selectedService.entity_name}${contactInfo} starting from ${selectedClient.firstName} ${selectedClient.lastName}'s location:\n\n${directionsUrl}`;

                                                    navigator.clipboard.writeText(message);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${copied ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                                            >
                                                {copied ? (
                                                    <><CheckCircle2 size={12} strokeWidth={3} /> Copied!</>
                                                ) : (
                                                    <><Copy size={12} strokeWidth={3} /> Copy Link</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}

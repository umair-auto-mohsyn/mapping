"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { SessionProvider } from "next-auth/react";
import { MapProvider } from "@/context/MapContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    return (
        <SessionProvider>
            <APIProvider apiKey={apiKey}>
                <MapProvider>
                    {children}
                </MapProvider>
            </APIProvider>
        </SessionProvider>
    );
}


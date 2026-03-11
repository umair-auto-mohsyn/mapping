"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Client } from "@/types";

interface MapViewState {
    center: { lat: number; lng: number };
    zoom: number;
}

interface MapFilters {
    selectedCity: string;
    selectedClient: Client | null;
    selectedCategories: string[];
    selectedRadius: number | "ALL";
    citySearch: string;
    clientSearch: string;
    categorySearch: string;
}

interface MapContextType {
    viewState: MapViewState;
    setViewState: (view: MapViewState) => void;
    filters: MapFilters;
    setFilters: (filters: MapFilters) => void;
    updateFilters: (updates: Partial<MapFilters>) => void;
}

const INITIAL_VIEW_STATE: MapViewState = {
    center: { lat: 30.3753, lng: 69.3451 },
    zoom: 6,
};

const INITIAL_FILTERS: MapFilters = {
    selectedCity: "",
    selectedClient: null,
    selectedCategories: [],
    selectedRadius: "ALL",
    citySearch: "",
    clientSearch: "",
    categorySearch: "",
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: React.ReactNode }) {
    const [viewState, setViewState] = useState<MapViewState>(() => {
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("map_view_state");
            if (saved) try { return JSON.parse(saved); } catch (e) {}
        }
        return INITIAL_VIEW_STATE;
    });

    const [filters, setFilters] = useState<MapFilters>(() => {
        if (typeof window !== "undefined") {
            const saved = sessionStorage.getItem("map_filters");
            if (saved) try { return JSON.parse(saved); } catch (e) {}
        }
        return INITIAL_FILTERS;
    });

    useEffect(() => {
        sessionStorage.setItem("map_view_state", JSON.stringify(viewState));
    }, [viewState]);

    useEffect(() => {
        sessionStorage.setItem("map_filters", JSON.stringify(filters));
    }, [filters]);

    const updateFilters = (updates: Partial<MapFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    };

    return (
        <MapContext.Provider value={{ viewState, setViewState, filters, setFilters, updateFilters }}>
            {children}
        </MapContext.Provider>
    );
}

export function useMapContext() {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error("useMapContext must be used within a MapProvider");
    }
    return context;
}

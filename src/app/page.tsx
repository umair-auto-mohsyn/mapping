"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Client, Service } from "@/lib/csv";
import { calculateDistance } from "@/lib/utils";
import { Search, MapPin, Filter, Settings, Plus, RotateCcw, Menu, X as CloseIcon, Check } from "lucide-react";

// CATEGORY_COLORS for reference in select
const CATEGORY_COLORS: Record<string, string> = {
    "Medical": "#ef4444",    // red-500
    "Utilities": "#3b82f6",  // blue-500
    "Lifestyle": "#10b981",  // emerald-500
    "Education": "#f59e0b",  // amber-500
    "Emergency": "#7c3aed",  // violet-600
    "Other": "#64748b",      // slate-500
};

// Dynamically import map to avoid SSR issues with Leaflet
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

const AdminPanel = dynamic(() => import("@/components/AdminPanel"), { ssr: false });

export default function Home() {
    const [data, setData] = useState<{ clients: Client[]; services: Service[]; cities: string[]; categories: string[] }>({
        clients: [],
        services: [],
        cities: [],
        categories: [],
    });
    const [loading, setLoading] = useState(true);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Field-specific search states
    const [citySearch, setCitySearch] = useState("");
    const [clientSearch, setClientSearch] = useState("");
    const [categorySearch, setCategorySearch] = useState("");

    const fetchData = async () => {
        const res = await fetch("/api/data");
        const d = await res.json();
        setData(d);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter state
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedRadius, setSelectedRadius] = useState<number | "ALL">("ALL");

    // Filter sequences
    const filteredCitiesList = useMemo(() => {
        return data.cities.filter(city =>
            city.toLowerCase().includes(citySearch.toLowerCase())
        );
    }, [data.cities, citySearch]);

    const filteredClients = useMemo(() => {
        let clients = data.clients;

        // Filter by selected city if any
        if (selectedCity) {
            clients = clients.filter(c => c.city === selectedCity);
        }

        // Apply client search term
        if (clientSearch.trim()) {
            clients = clients.filter(c =>
                `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase())
            );
        }

        return clients;
    }, [data.clients, selectedCity, clientSearch]);

    const filteredCategoriesList = useMemo(() => {
        return data.categories.filter(cat =>
            cat.toLowerCase().includes(categorySearch.toLowerCase())
        );
    }, [data.categories, categorySearch]);

    const filteredServices = useMemo(() => {
        let services = data.services;

        // Filter by city
        if (selectedCity) {
            services = services.filter((s) => s.city.toLowerCase() === selectedCity.toLowerCase());
        } else {
            return []; // Hide markers if no city is selected
        }

        // Filter by category
        if (selectedCategory) {
            services = services.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());
        }

        if (selectedRadius !== "ALL" && selectedClient) {
            const rad = Number(selectedRadius);
            services = services.filter((s) => {
                const dist = calculateDistance(
                    selectedClient.latitude,
                    selectedClient.longitude,
                    s.latitude,
                    s.longitude
                );
                return dist <= rad;
            });
        }

        return services;
    }, [data.services, selectedCity, selectedCategory, selectedClient, selectedRadius]);

    const resetFilters = () => {
        setCitySearch("");
        setClientSearch("");
        setCategorySearch("");
        setSelectedCity("");
        setSelectedClient(null);
        setSelectedCategory("");
        setSelectedRadius("ALL");
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading Datasets...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex flex-col md:flex-row h-screen overflow-hidden bg-white relative">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-white z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <MapPin className="text-blue-600" size={20} />
                    <h1 className="text-lg font-bold text-gray-800">Coverage</h1>
                </div>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Sidebar - Controls */}
            <div className={`
                fixed inset-y-0 left-0 w-80 bg-white border-r flex flex-col shadow-2xl z-30 transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0 md:shadow-lg
                ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 border-b hidden md:flex items-center gap-2">
                    <MapPin className="text-blue-600" size={20} />
                    <h1 className="text-lg font-bold text-gray-800 tracking-tight">Service Coverage</h1>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-hide">
                    {/* 1. City Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-widest">
                            <MapPin size={14} className="text-blue-600" /> 1. Select City
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search city..."
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                className="w-full border-2 border-gray-100 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-600 transition-all text-gray-900 font-bold placeholder:text-gray-400 text-xs shadow-sm"
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600" size={14} />
                        </div>
                        <div className="max-h-24 overflow-y-auto border-2 border-gray-50 rounded-xl bg-gray-50/20 p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200">
                            <button
                                onClick={() => {
                                    setSelectedCity("");
                                    setSelectedClient(null);
                                    setCitySearch("");
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${selectedCity === "" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:shadow-sm"}`}
                            >
                                All Cities
                            </button>
                            {filteredCitiesList.map((city) => (
                                <button
                                    key={city}
                                    onClick={() => {
                                        setSelectedCity(city);
                                        setSelectedClient(null);
                                        setCitySearch(city);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCity === city ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-white hover:shadow-sm"}`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Client Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-widest">
                            <Search size={14} className="text-blue-600" /> 2. Find Client
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="w-full border-2 border-gray-100 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-600 transition-all text-gray-900 font-bold placeholder:text-gray-400 text-xs shadow-sm"
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600" size={14} />
                        </div>
                        <div className="max-h-32 overflow-y-auto border-2 border-gray-50 rounded-xl bg-gray-50/20 p-1 space-y-0.5 shadow-inner scrollbar-thin scrollbar-thumb-gray-200">
                            {filteredClients.map((client) => (
                                <button
                                    key={`${client.firstName}-${client.lastName}-${client.city}`}
                                    onClick={() => {
                                        setSelectedClient(client);
                                        setSelectedCity(client.city);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg transition-all group relative ${selectedClient === client ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-white shadow-sm"}`}
                                >
                                    <div className={`text-[11px] font-black leading-tight ${selectedClient === client ? "text-white" : "text-gray-900"}`}>{client.firstName} {client.lastName}</div>
                                    {selectedClient === client && <div className="absolute right-2 top-1/2 -translate-y-1/2"><Check size={12} strokeWidth={4} /></div>}
                                </button>
                            ))}
                            {filteredClients.length === 0 && (
                                <div className="text-[9px] text-gray-400 text-center py-4 font-black uppercase tracking-widest">No clients found</div>
                            )}
                        </div>
                    </div>

                    {/* 3. Category Selector */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-widest">
                            <Filter size={14} className="text-blue-600" /> 3. Service Category
                        </label>
                        <div className="space-y-2">
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Search categories..."
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                    className="w-full border-2 border-gray-100 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-600 transition-all text-gray-900 font-bold placeholder:text-gray-400 text-xs shadow-sm"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600" size={14} />
                            </div>
                            <div className="max-h-32 overflow-y-auto border-2 border-gray-50 rounded-xl bg-gray-50/20 p-1 space-y-0.5 shadow-inner scrollbar-thin scrollbar-thumb-gray-200">
                                <button
                                    onClick={() => setSelectedCategory("")}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${selectedCategory === "" ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:shadow-sm"}`}
                                >
                                    All Categories
                                </button>
                                {filteredCategoriesList.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? "text-white shadow-sm" : "text-gray-700 hover:bg-white hover:shadow-sm"}`}
                                        style={{
                                            backgroundColor: selectedCategory === cat ? (CATEGORY_COLORS[cat] || "#2563eb") : undefined,
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="truncate">{cat}</span>
                                            {selectedCategory === cat && <Check size={12} strokeWidth={4} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4. Radius Buttons */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-widest">
                            <Filter size={14} className="text-blue-600" /> 4. Radius
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[5, 10, 20, "ALL" as const].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setSelectedRadius(val)}
                                    className={`py-2 text-[10px] rounded-lg border-2 transition-all font-black ${selectedRadius === val
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                        : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                                        }`}
                                >
                                    {val === "ALL" ? "ALL" : `${val}Km`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={resetFilters}
                        className="w-full flex items-center justify-center gap-2 text-[10px] text-gray-900 hover:text-blue-600 transition-all pt-2 font-black uppercase tracking-widest"
                    >
                        <RotateCcw size={14} className="text-blue-600" /> Reset All
                    </button>
                </div>

                {/* Compact Status Bar */}
                <div className="p-3 bg-gray-900 text-white border-t border-white/10 flex justify-between items-center shrink-0">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Status: {filteredServices.length} Results</span>
                    <Settings
                        size={16}
                        className="text-gray-400 cursor-pointer hover:text-white"
                        onClick={() => setIsAdminOpen(true)}
                    />
                </div>
            </div>

            {/* Overlay for mobile menu */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-md z-20 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Map Content */}
            <div className="flex-1 relative h-full">
                <Map
                    selectedCity={selectedCity}
                    selectedClient={selectedClient}
                    filteredServices={filteredServices}
                    radius={selectedRadius}
                />

                {/* Floating Admin Buttons */}
                <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3">
                    <button
                        onClick={() => setIsAdminOpen(true)}
                        className="bg-blue-600 p-3 rounded-2xl shadow-xl hover:bg-blue-700 text-white transition-all border-2 border-blue-500 group relative flex items-center justify-center"
                        title="Quick Add"
                    >
                        <Plus size={20} strokeWidth={4} />
                        <span className="absolute right-full mr-3 bg-gray-900 text-white text-[10px] font-black py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest shadow-lg">New Entry</span>
                    </button>
                </div>

                {isAdminOpen && (
                    <AdminPanel
                        onClose={() => setIsAdminOpen(false)}
                        clients={data.clients}
                        services={data.services}
                        onDataUpdate={fetchData}
                    />
                )}
            </div>
        </main>
    );
}

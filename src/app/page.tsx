"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { Client, Service } from "@/types";
import { useMapContext } from "@/context/MapContext";
import { calculateDistance } from "@/lib/utils";
import { Search, MapPin, Filter, Settings, Plus, RotateCcw, Menu, X as CloseIcon, Check, Truck, LogOut, Wrench } from "lucide-react";
import Link from "next/link";

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
const ExtractionTools = dynamic(() => import("@/components/ExtractionTools"), { ssr: false });

export default function Home() {
    const [data, setData] = useState<{ clients: Client[]; services: Service[]; cities: string[]; categories: string[] }>({
        clients: [],
        services: [],
        cities: [],
        categories: [],
    });
    const [loading, setLoading] = useState(true);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isExtractionOpen, setIsExtractionOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [discoveredServices, setDiscoveredServices] = useState<any[]>([]);
    const { data: session, status } = useSession();

    const { filters, updateFilters, liveResults, setLiveResults } = useMapContext();

    // Field-specific search states (Now from context)
    const { 
        citySearch, clientSearch, categorySearch, 
        selectedCity, selectedClient, selectedCategories, selectedRadius 
    } = filters;

    const setCitySearch = (val: string) => updateFilters({ citySearch: val });
    const setClientSearch = (val: string) => updateFilters({ clientSearch: val });
    const setCategorySearch = (val: string) => updateFilters({ categorySearch: val });
    const setSelectedCity = (val: string) => updateFilters({ selectedCity: val });
    const setSelectedClient = (val: Client | null) => updateFilters({ selectedClient: val });
    const setSelectedCategories = (val: string[]) => updateFilters({ selectedCategories: val });
    const setSelectedRadius = (val: number | "ALL") => updateFilters({ selectedRadius: val });

    const fetchData = async (optimisticService?: Service) => {
        try {
            const res = await fetch("/api/data");
            const d = await res.json();
            if (d.error) {
                console.error("API error:", d.error);
                setData({ clients: [], services: [], cities: [], categories: [] });
                setLoading(false);
                return d;
            }

            // If we just added a service, inject it into the returned data
            // to show it on the map immediately with full details
            if (optimisticService && d.services) {
                const alreadyExists = d.services.some((s: Service) => s.source_id === optimisticService.source_id);
                if (!alreadyExists) {
                    d.services = [optimisticService, ...d.services];
                }
            }

            setData(d);
            setLoading(false);
            return d;
        } catch (e) {
            console.error("Fetch error:", e);
            setData({ clients: [], services: [], cities: [], categories: [] });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


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
        if (selectedCity && selectedCity !== "") {
            services = services.filter((s) => s.city.toLowerCase().trim() === selectedCity.toLowerCase().trim());
        }

        // Filter by category
        if (selectedCategories.length > 0) {
            services = services.filter((s) =>
                selectedCategories.some(cat => cat.toLowerCase().trim() === s.category.toLowerCase().trim())
            );
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
    }, [data.services, selectedCity, selectedCategories, selectedClient, selectedRadius]);

    // Legacy Discovery Logic
    useEffect(() => {
        if (selectedClient && selectedCategories.length > 0) {
            const fetchDiscovery = async () => {
                try {
                    const res = await fetch("/api/discover", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lat: selectedClient.latitude,
                            lng: selectedClient.longitude,
                            radius: selectedRadius === "ALL" ? 10 : selectedRadius,
                            categories: selectedCategories,
                            city: selectedCity
                        })
                    });
                    const d = await res.json();
                    if (d.results) setDiscoveredServices(d.results);
                } catch (e) {
                    console.error("Discovery failed:", e);
                }
            };
            fetchDiscovery();
        } else {
            setDiscoveredServices([]);
        }
    }, [selectedClient, selectedCategories, selectedRadius, selectedCity]);


    const resetFilters = () => {
        updateFilters({
            citySearch: "",
            clientSearch: "",
            categorySearch: "",
            selectedCity: "",
            selectedClient: null,
            selectedCategories: [],
            selectedRadius: "ALL"
        });
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
                <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading Map Please Wait ...</p>
            </div>
        );
    }

    return (
        <main className="flex flex-col md:flex-row h-screen overflow-hidden bg-white relative">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-gray-900 z-20 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded-lg shadow-inner">
                        <Truck className="text-white" size={20} strokeWidth={3} />
                    </div>
                    <h1 className="text-lg font-black text-white tracking-tight uppercase">Service Delivery Mapping</h1>
                </div>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20"
                >
                    {isMenuOpen ? <CloseIcon size={24} className="text-white" /> : <Menu size={24} className="text-white" strokeWidth={3} />}
                </button>
            </div>

            {/* Sidebar - Controls */}
            <div className={`
                fixed inset-y-0 left-0 w-80 bg-white border-r flex flex-col shadow-2xl z-30 transition-transform duration-300 ease-in-out
                md:relative md:translate-x-0 md:shadow-lg
                ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 border-b hidden md:flex items-center gap-3 bg-gray-50/50">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-md">
                        <Truck className="text-white" size={22} strokeWidth={3} />
                    </div>
                    <h1 className="text-lg font-black text-gray-900 tracking-tighter uppercase leading-tight">Service Delivery<br /><span className="text-blue-600">Mapping</span></h1>
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
                                    onClick={() => setSelectedCategories([])}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${selectedCategories.length === 0 ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-white hover:shadow-sm"}`}
                                >
                                    All Categories
                                </button>
                                {filteredCategoriesList.map((cat) => {
                                    const isSelected = selectedCategories.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                                } else {
                                                    setSelectedCategories([...selectedCategories, cat]);
                                                }
                                            }}
                                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSelected ? "text-white shadow-sm" : "text-gray-700 hover:bg-white hover:shadow-sm"}`}
                                            style={{
                                                backgroundColor: isSelected ? (CATEGORY_COLORS[cat] || "#2563eb") : undefined,
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="truncate">{cat}</span>
                                                {isSelected && <Check size={12} strokeWidth={4} />}
                                            </div>
                                        </button>
                                    );
                                })}
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
                </div>

                <div className="p-4 bg-gray-50/50 mt-auto border-t space-y-3">
                    {/* Paused: Interactive Mode Toggle */}
                    {/* {session?.user?.role === 'ADMIN' && (
                        <div className="flex items-center justify-between">
                            ...
                        </div>
                    )} */}

                    <button
                        onClick={resetFilters}
                        className="w-full flex items-center justify-center gap-2 text-[10px] text-gray-900 hover:text-blue-600 transition-all pt-2 font-black uppercase tracking-widest"
                    >
                        <RotateCcw size={14} className="text-blue-600" /> Reset All
                    </button>
                </div>

                <div className="p-3 bg-gray-900 text-white border-t border-white/10 flex justify-between items-center shrink-0">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-black">
                        {filteredServices.length === data.services.length 
                            ? `Showing All: ${data.services.length} Results`
                            : `Filtered: ${filteredServices.length} of ${data.services.length}`}
                    </span>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-widest font-black flex items-center gap-1 transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={12} strokeWidth={3} /> Logout
                    </button>
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
                    allServices={data.services}
                    discoveredServices={discoveredServices}
                    radius={selectedRadius}
                    onDataUpdate={fetchData}
                />

                {/* Floating Admin Dock - Premium UI refinement */}
                {session?.user?.role && ['ADMIN', 'EDITOR'].includes(session.user.role) && (
                    <div className="absolute bottom-24 right-6 z-[1000] flex flex-col items-center">
                        <div className="bg-white/80 backdrop-blur-xl p-2.5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/60 flex flex-col gap-3 group/dock transition-all duration-500 hover:bg-white/90">
                            <button
                                onClick={() => setIsExtractionOpen(true)}
                                className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group relative overflow-hidden"
                                title="Extraction Tools"
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Wrench size={22} strokeWidth={3} className="relative z-10 transition-transform duration-500 group-hover:rotate-12" />
                                <span className="absolute right-full mr-6 bg-gray-900/95 backdrop-blur-md text-white text-[10px] font-black py-2.5 px-4 rounded-xl opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap uppercase tracking-widest shadow-2xl border border-white/10">
                                    Extraction Tools
                                </span>
                            </button>
                            
                            <div className="h-px w-8 bg-gray-200/50 self-center mx-2" />

                            <button
                                onClick={() => setIsAdminOpen(true)}
                                className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group relative overflow-hidden"
                                title="Add New Entry"
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Plus size={26} strokeWidth={3} className="relative z-10 transition-transform duration-500 group-hover:rotate-90" />
                                <span className="absolute right-full mr-6 bg-gray-900/95 backdrop-blur-md text-white text-[10px] font-black py-2.5 px-4 rounded-xl opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap uppercase tracking-widest shadow-2xl border border-white/10">
                                    New Entry
                                </span>
                            </button>
                        </div>
                        {/* Decorative reflection element */}
                        <div className="mt-2 w-8 h-1 bg-black/10 blur-md rounded-full" />
                    </div>
                )}

                {isAdminOpen && (
                    <AdminPanel
                        onClose={() => setIsAdminOpen(false)}
                        clients={data.clients || []}
                        services={data.services || []}
                        onDataUpdate={async () => { 
                            await fetchData();
                            window.location.reload(); // Restoring full reload behavior as requested
                        }}
                    />
                )}

                {isExtractionOpen && (
                    <ExtractionTools
                        onClose={() => setIsExtractionOpen(false)}
                        onDataUpdate={async () => { 
                            await fetchData(); 
                            window.location.reload(); // Restoring full reload behavior as requested
                        }}
                    />
                )}
            </div>
        </main>
    );
}

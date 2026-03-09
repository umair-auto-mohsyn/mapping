"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Database, MapPin, CheckCircle2, AlertTriangle, ArrowRight, Search, X, Check } from "lucide-react";

const PAKISTAN_CITIES = [
    "Abbottabad", "Ahmedpur East", "Arif Wala", "Attock", "Badin", "Bahawalnagar",
    "Bahawalpur", "Bhakkar", "Bhalwal", "Burewala", "Chakwal", "Chaman", "Charsadda",
    "Chiniot", "Chishtian", "Dadu", "Daharki", "Daska", "Dera Ghazi Khan", "Dera Ismail Khan",
    "Faisalabad", "Ferozwala", "Ghotki", "Gojra", "Gujranwala", "Gujranwala Cantonment",
    "Gujrat", "Hafizabad", "Haroonabad", "Hasilpur", "Hub", "Hyderabad", "Islamabad",
    "Jacobabad", "Jaranwala", "Jatoi", "Jhang", "Jhelum", "Kabal", "Kamalia", "Kamber Ali Khan",
    "Kāmoke", "Kandhkot", "Karachi", "Kasur", "Khairpur", "Khanewal", "Khanpur", "Khushab",
    "Khuzdar", "Kohat", "Kot Abdul Malik", "Kot Addu", "Kotri", "Lahore", "Larkana", "Layyah",
    "Lodhran", "Mandi Bahauddin", "Mansehra", "Mardan", "Mianwali", "Mingora", "Mirpur Khas",
    "Mirpur Mathelo", "Multan", "Muridke", "Muzaffargarh", "Narowal", "Nawabshah", "Nowshera",
    "Okara", "Pakpattan", "Peshawar", "Quetta", "Rahim Yar Khan", "Rawalpindi", "Sadiqabad",
    "Sahiwal", "Sambrial", "Samundri", "Sargodha", "Shahdadkot", "Sheikhupura", "Shikarpur",
    "Sialkot", "Sukkur", "Swabi", "Tando Adam", "Tando Allahyar", "Tando Muhammad Khan",
    "Taxila", "Turbat", "Umerkot", "Vehari", "Wah Cantonment", "Wazirabad"
];

const TARGET_CATEGORIES = [
    "Hospital",
    "Burn Emergency Hospital",
    "Pharmacy",
    "Fire Station",
    "Police Station",
    "Ambulance Service",
    "Medical Store"
];

// --- Sub-Component: Searchable Select ---
function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    disabled,
    icon: Icon
}: {
    options: string[],
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    disabled?: boolean,
    icon: any
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() =>
        options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())),
        [options, search]);

    return (
        <div className="relative flex-1">
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500'}`}
            >
                <Icon size={18} className="text-gray-400" />
                <span className={`flex-1 font-medium ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {value || placeholder}
                </span>
                <Search size={16} className="text-gray-400" />
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Type to search..."
                            className="w-full px-3 py-2 bg-gray-50 border-none rounded-lg focus:ring-0 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filtered.length > 0 ? filtered.map(opt => (
                            <div
                                key={opt}
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                    setSearch("");
                                }}
                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors flex items-center justify-between ${value === opt ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700'}`}
                            >
                                {opt}
                                {value === opt && <Check size={14} />}
                            </div>
                        )) : (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center italic">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExtractionTools() {
    // --- State: General ---
    const [clients, setClients] = useState<any[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    // --- State: City Extraction ---
    const [cityInput, setCityInput] = useState("");
    const [cityCategories, setCityCategories] = useState<string[]>([]);
    const [isExtractingCity, setIsExtractingCity] = useState(false);
    const [cityProgress, setCityProgress] = useState(0);
    const [cityResult, setCityResult] = useState<{ status: 'success' | 'error' | 'warning', message: string, count?: number } | null>(null);

    // --- State: Client Extraction ---
    const [selectedClientStr, setSelectedClientStr] = useState("");
    const [clientCategories, setClientCategories] = useState<string[]>([]);
    const [isExtractingClient, setIsExtractingClient] = useState(false);
    const [clientProgress, setClientProgress] = useState(0);
    const [clientResult, setClientResult] = useState<{ status: 'success' | 'error' | 'warning', message: string, count?: number } | null>(null);

    useEffect(() => {
        fetch("/api/data")
            .then(res => res.json())
            .then(data => {
                if (data.clients) {
                    setClients(data.clients);
                }
            })
            .catch(err => console.error("Error fetching clients:", err))
            .finally(() => setIsLoadingClients(false));
    }, []);

    // Simulated Progress Hooks
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isExtractingCity && cityProgress < 95) {
            interval = setInterval(() => {
                setCityProgress(p => p + (Math.random() * 5));
            }, 800);
        } else if (!isExtractingCity) {
            setCityProgress(0);
        }
        return () => clearInterval(interval);
    }, [isExtractingCity, cityProgress]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isExtractingClient && clientProgress < 95) {
            interval = setInterval(() => {
                setClientProgress(p => p + (Math.random() * 10));
            }, 500);
        } else if (!isExtractingClient) {
            setClientProgress(0);
        }
        return () => clearInterval(interval);
    }, [isExtractingClient, clientProgress]);

    const toggleCategory = (list: string[], setList: (val: string[]) => void, cat: string) => {
        if (list.includes(cat)) {
            setList(list.filter(c => c !== cat));
        } else if (list.length < 4) {
            setList([...list, cat]);
        }
    };

    const handleCityExtraction = async () => {
        if (!cityInput || cityCategories.length === 0) return;

        setIsExtractingCity(true);
        setCityResult(null);
        setCityProgress(5);

        try {
            const response = await fetch("/api/tools/extract-city", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    city: cityInput,
                    categories: cityCategories
                }),
            });

            const data = await response.json();
            setCityProgress(100);

            setTimeout(() => {
                if (response.status === 403) {
                    setCityResult({ status: 'warning', message: data.error });
                } else if (!response.ok) {
                    throw new Error(data.error || "Failed to extract");
                } else {
                    setCityResult({
                        status: 'success',
                        message: `Extracted ${data.savedCount} new services. ${data.skippedCount} skipped. 30-day cooldown started.`,
                        count: data.savedCount
                    });
                }
                setIsExtractingCity(false);
            }, 500);

        } catch (error: any) {
            setCityProgress(100);
            setTimeout(() => {
                setCityResult({ status: 'error', message: error.message });
                setIsExtractingCity(false);
            }, 500);
        }
    };

    const handleClientExtraction = async () => {
        if (!selectedClientStr || clientCategories.length === 0) return;

        const client = clients.find(c => `${c.firstName} ${c.lastName} (${c.city})` === selectedClientStr);
        if (!client) return;

        setIsExtractingClient(true);
        setClientResult(null);
        setClientProgress(5);

        try {
            const response = await fetch("/api/tools/extract-client", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lat: client.latitude,
                    lng: client.longitude,
                    city: client.city,
                    clientId: client.id,
                    categories: clientCategories
                }),
            });

            const data = await response.json();
            setClientProgress(100);

            setTimeout(() => {
                if (response.status === 403) {
                    setClientResult({ status: 'warning', message: data.error });
                } else if (!response.ok) {
                    throw new Error(data.error || "Failed to extract");
                } else {
                    setClientResult({
                        status: 'success',
                        message: `Extracted ${data.savedCount} new services. 30-day cooldown started.`,
                        count: data.savedCount
                    });
                }
                setIsExtractingClient(false);
            }, 500);

        } catch (error: any) {
            setClientProgress(100);
            setTimeout(() => {
                setClientResult({ status: 'error', message: error.message });
                setIsExtractingClient(false);
            }, 500);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-12 max-w-5xl mx-auto">

            {/* --- Section 1: City-Wide Extraction --- */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">City-Wide Extraction</h2>
                        <p className="text-sm text-gray-500">Scan entire cities for high-volume data. 30-day cooldown applies after use.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <SearchableSelect
                            options={PAKISTAN_CITIES}
                            value={cityInput}
                            onChange={setCityInput}
                            placeholder="Search & Select City..."
                            disabled={isExtractingCity}
                            icon={MapPin}
                        />
                        <button
                            onClick={handleCityExtraction}
                            disabled={!cityInput || cityCategories.length === 0 || isExtractingCity}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 h-[54px] min-w-[220px]"
                        >
                            {isExtractingCity ? (
                                <><Loader2 size={18} className="animate-spin" /> RUNNING...</>
                            ) : (
                                <>EXTRACT DATA <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Categories (MAX 4)</label>
                        <div className="flex flex-wrap gap-2">
                            {TARGET_CATEGORIES.map(cat => {
                                const active = cityCategories.includes(cat);
                                const disabled = !active && cityCategories.length >= 4;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cityCategories, setCityCategories, cat)}
                                        disabled={disabled || isExtractingCity}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isExtractingCity && (
                        <div className="space-y-3 pt-2">
                            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                                    style={{ width: `${cityProgress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span>Scanning Sector Grids...</span>
                                <span>{Math.round(cityProgress)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Result Message */}
                    {cityResult && (
                        <div className={`p-5 rounded-2xl flex items-start gap-4 border animate-in zoom-in-95 duration-200 ${cityResult.status === 'success' ? 'bg-green-50 border-green-200 text-green-900' :
                                cityResult.status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                                    'bg-red-50 border-red-200 text-red-900'
                            }`}>
                            <div className="mt-1">
                                {cityResult.status === 'success' ? <CheckCircle2 className="text-green-600" /> :
                                    cityResult.status === 'warning' ? <AlertTriangle className="text-amber-600" /> :
                                        <X className="text-red-600 border rounded-full p-0.5" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-sm uppercase tracking-tight">{cityResult.status === 'success' ? 'Extraction Complete' : 'Notice'}</h4>
                                <p className="text-sm font-medium opacity-80 leading-relaxed">{cityResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Section 2: Client-Specific Extraction --- */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Client-Specific Extraction</h2>
                        <p className="text-sm text-gray-500">Discover essential services within a 5km radius of a specific client location.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <SearchableSelect
                            options={clients.map(c => `${c.firstName} ${c.lastName} (${c.city})`)}
                            value={selectedClientStr}
                            onChange={setSelectedClientStr}
                            placeholder={isLoadingClients ? "Loading clients..." : "Search & Select Client..."}
                            disabled={isExtractingClient || isLoadingClients}
                            icon={Database}
                        />
                        <button
                            onClick={handleClientExtraction}
                            disabled={!selectedClientStr || clientCategories.length === 0 || isExtractingClient}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 h-[54px] min-w-[220px]"
                        >
                            {isExtractingClient ? (
                                <><Loader2 size={18} className="animate-spin" /> RUNNING...</>
                            ) : (
                                <>EXTRACT NEARBY <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Categories (MAX 4)</label>
                        <div className="flex flex-wrap gap-2">
                            {TARGET_CATEGORIES.map(cat => {
                                const active = clientCategories.includes(cat);
                                const disabled = !active && clientCategories.length >= 4;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(clientCategories, setClientCategories, cat)}
                                        disabled={disabled || isExtractingClient}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${active ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-400'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isExtractingClient && (
                        <div className="space-y-3 pt-2">
                            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                                    style={{ width: `${clientProgress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span>Checking Nearby Area...</span>
                                <span>{Math.round(clientProgress)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Result Message */}
                    {clientResult && (
                        <div className={`p-5 rounded-2xl flex items-start gap-4 border animate-in zoom-in-95 duration-200 ${clientResult.status === 'success' ? 'bg-green-50 border-green-200 text-green-900' :
                                clientResult.status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                                    'bg-red-50 border-red-200 text-red-900'
                            }`}>
                            <div className="mt-1">
                                {clientResult.status === 'success' ? <CheckCircle2 className="text-green-600" /> :
                                    clientResult.status === 'warning' ? <AlertTriangle className="text-amber-600" /> :
                                        <X className="text-red-600 border rounded-full p-0.5" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-sm uppercase tracking-tight">{clientResult.status === 'success' ? 'Extraction Complete' : 'Notice'}</h4>
                                <p className="text-sm font-medium opacity-80 leading-relaxed">{clientResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

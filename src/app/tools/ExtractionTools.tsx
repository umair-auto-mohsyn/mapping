"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Loader2, Database, MapPin, CheckCircle2, AlertTriangle, ArrowRight, Search, X, Check, ChevronDown, Filter, RotateCcw, XCircle, FileText, ChevronRight } from "lucide-react";

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

const ALL_CATEGORIES = [
    "AC Technition", "Ambulance Service", "Bakery", "Car Repair", "Child day care",
    "Clinic", "Electrician", "Electricity Provider Office", "Female Salon", "Fire Station",
    "Flower Shops", "Gas Provider", "Gas cylinder Services", "Hardware Store", "Home Chef",
    "Hospital", "Internet Service Provider", "Laboratory", "Male Salon", "Mason Service",
    "Medical Equipment Supplier", "Medical Store", "Mineral Water home delivery", "Old age houses",
    "Pharmacy", "Plumber", "Police Station", "Burn Emergency Hospital"
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
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = useMemo(() =>
        options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())),
        [options, search]);

    return (
        <div className="relative flex-1" ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500'}`}
            >
                <Icon size={18} className="text-gray-400" />
                <span className={`flex-1 font-medium ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400 ml-1" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Type to search..."
                            className="w-full px-2 py-1.5 bg-transparent border-none rounded-lg focus:ring-0 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
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

// --- Sub-Component: Searchable Multi-Select ---
function SearchableMultiSelect({
    options,
    selected,
    onToggle,
    placeholder,
    disabled,
    max = 5,
    lockedOptions = []
}: {
    options: string[],
    selected: string[],
    onToggle: (val: string) => void,
    placeholder: string,
    disabled?: boolean,
    max?: number,
    lockedOptions?: { category: string, lockedUntil: string }[]
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = useMemo(() =>
        options.filter(opt => opt.toLowerCase().includes(search.toLowerCase())),
        [options, search]);

    const handleToggle = (opt: string) => {
        onToggle(opt);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer transition-all min-h-[54px] ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}`}
            >
                <div className="bg-gray-200 p-1.5 rounded-lg text-gray-500 shrink-0">
                    <Filter size={16} />
                </div>

                {selected.length === 0 ? (
                    <span className="text-gray-400 font-medium flex-1">{placeholder}</span>
                ) : (
                    <div className="flex flex-wrap gap-1.5 flex-1">
                        {selected.map(item => (
                            <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[11px] font-black uppercase rounded-lg border border-blue-200">
                                {item}
                                <X
                                    size={12}
                                    className="cursor-pointer hover:text-blue-900"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggle(item);
                                    }}
                                />
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {selected.length}/{max}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div
                    className={`absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                        // Simple heuristic: if container is below halfway, open up
                        containerRef.current && containerRef.current.getBoundingClientRect().top > window.innerHeight / 2
                            ? 'bottom-full mb-2' : 'top-full mt-1'
                        }`}
                >
                    <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400 ml-1" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search categories..."
                            className="w-full px-2 py-1.5 bg-transparent border-none rounded-lg focus:ring-0 text-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 rounded-b-xl bg-white">
                        {filtered.length > 0 ? filtered.map(opt => {
                            const isSelected = selected.includes(opt);
                            const lock = lockedOptions.find(l => l.category.toLowerCase() === opt.toLowerCase());
                            const isLimitReached = !isSelected && selected.length >= max;
                            const isLocked = !!lock;

                            return (
                                <div
                                    key={opt}
                                    title={isLocked ? `Locked until ${lock.lockedUntil} (30-day cooldown)` : ""}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isLimitReached && !isLocked) {
                                            handleToggle(opt);
                                        }
                                    }}
                                    className={`px-3 py-2.5 text-sm cursor-pointer rounded-lg transition-all flex items-center justify-between mb-0.5 group relative ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md transform scale-[1.02]' :
                                        (isLimitReached || isLocked) ? 'text-gray-300 cursor-not-allowed opacity-60' : 'text-gray-700 hover:bg-gray-100 hover:pl-4'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-white border-white' : 'bg-white border-gray-300'}`}>
                                            {isSelected && <Check size={12} className="text-blue-600" />}
                                            {isLocked && <X size={10} className="text-red-400" />}
                                        </div>
                                        <span className={isLocked ? 'line-through opacity-50' : ''}>{opt}</span>
                                    </span>
                                    {isLimitReached && !isLocked && <span className="text-[10px] font-bold opacity-50 uppercase">Limit Reached</span>}
                                    {isLocked && (
                                        <span className="text-[9px] font-black bg-red-50 text-red-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter border border-red-100">
                                            Locked
                                        </span>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="px-4 py-6 text-sm text-gray-400 text-center italic">No matching categories</div>
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
    const [cityLockedCats, setCityLockedCats] = useState<{ category: string, lockedUntil: string }[]>([]);
    const [isExtractingCity, setIsExtractingCity] = useState(false);
    const [cityProgress, setCityProgress] = useState(0);
    const [cityResult, setCityResult] = useState<{ status: 'success' | 'error' | 'warning', message: string, count?: number } | null>(null);

    // --- State: Client Extraction ---
    const [selectedClientStr, setSelectedClientStr] = useState("");
    const [clientCategories, setClientCategories] = useState<string[]>([]);
    const [clientLockedCats, setClientLockedCats] = useState<{ category: string, lockedUntil: string }[]>([]);
    const [isExtractingClient, setIsExtractingClient] = useState(false);
    const [clientProgress, setClientProgress] = useState(0);
    const [clientResult, setClientResult] = useState<{ status: 'success' | 'error' | 'warning', message: string, count?: number } | null>(null);

    // --- State: Coverage Optimizer ---
    const [unenrichedClients, setUnenrichedClients] = useState<any[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [enrichmentProgress, setEnrichmentProgress] = useState<{ clientId: string, currentBatch: number, totalBatches: number } | null>(null);

    const fetchCoverage = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch("/api/tools/analyze-coverage");
            const data = await res.json();
            setUnenrichedClients(data.unenrichedClients || []);
        } catch (err) {
            console.error("Coverage fetch error:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

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

        fetchCoverage();
    }, []);

    // Unified Refresh Function for City
    const refreshCityCooldowns = (city: string) => {
        if (!city) {
            setCityLockedCats([]);
            return;
        }
        const t = new Date().getTime();
        fetch(`/api/tools/cooldown?target=${encodeURIComponent(city)}&t=${t}`)
            .then(res => res.json())
            .then(data => {
                const locked = data.lockedCategories || [];
                setCityLockedCats(locked);
                const lockedNames = new Set(locked.map((l: any) => l.category.toLowerCase()));
                setCityCategories(prev => prev.filter(cat => !lockedNames.has(cat.toLowerCase())));
            })
            .catch(err => console.error("Error fetching city cooldowns:", err));
    };

    // Unified Refresh Function for Client
    const refreshClientCooldowns = (identifier: string) => {
        if (!identifier) {
            setClientLockedCats([]);
            return;
        }
        const t = new Date().getTime();
        fetch(`/api/tools/cooldown?target=${encodeURIComponent(identifier)}&t=${t}`)
            .then(res => res.json())
            .then(data => {
                const locked = data.lockedCategories || [];
                setClientLockedCats(locked);
                const lockedNames = new Set(locked.map((l: any) => l.category.toLowerCase()));
                setClientCategories(prev => prev.filter(cat => !lockedNames.has(cat.toLowerCase())));
            })
            .catch(err => console.error("Error fetching client cooldowns:", err));
    };

    useEffect(() => {
        refreshCityCooldowns(cityInput);
    }, [cityInput]);

    useEffect(() => {
        const client = clients.find(c => `${c.firstName} ${c.lastName} (${c.city})` === selectedClientStr);
        const identifier = client?.id || selectedClientStr;
        refreshClientCooldowns(identifier);
    }, [selectedClientStr, clients]);

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
        } else if (list.length < 5) {
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
                        message: `Extracted ${data.savedCount} new services. ${data.skippedCount} skipped (duplicates). 30-day cooldown started.`,
                        count: data.savedCount
                    });
                    // Refresh cooldowns immediately
                    refreshCityCooldowns(cityInput);
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
                        message: `Extracted ${data.savedCount} new services. ${data.skippedCount} skipped (duplicates). 30-day cooldown started.`,
                        count: data.savedCount
                    });
                    // Refresh cooldowns immediately
                    const client = clients.find(c => `${c.firstName} ${c.lastName} (${c.city})` === selectedClientStr);
                    const identifier = client?.id || selectedClientStr;
                    refreshClientCooldowns(identifier);
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

    const handleBatchEnrichment = async () => {
        if (unenrichedClients.length === 0 || isExtractingClient) return;

        const target = unenrichedClients[0];
        setClientResult(null);

        // Filter out categories that are currently on cooldown
        const lockedSet = new Set((target as any).lockedCategories?.map((c: string) => c.toLowerCase()) || []);
        const searchableCategories = target.missingCategories.filter((cat: string) => !lockedSet.has(cat.toLowerCase()));

        if (searchableCategories.length === 0) {
            setClientResult({
                status: 'warning',
                message: `All remaining missing categories for ${target.client.firstName} are currently on a 30-day cooldown. Please try again later or select a different client.`
            });
            return;
        }

        // Take the first 5 searchable categories
        const batch = searchableCategories.slice(0, 5);

        setIsExtractingClient(true);
        setClientProgress(0);

        try {
            const response = await fetch("/api/tools/extract-client", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lat: target.client.latitude,
                    lng: target.client.longitude,
                    city: target.client.city,
                    clientId: target.client.id,
                    categories: batch
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setClientResult({ status: 'error', message: data.error || "Batch extraction failed" });
                setIsExtractingClient(false);
                return;
            }

            setClientResult({
                status: data.savedCount > 0 ? 'success' : 'warning',
                message: data.savedCount > 0
                    ? `Successfully enriched ${target.client.firstName} with ${data.savedCount} new service(s) across ${batch.join(", ")}.`
                    : `Checked ${batch.join(", ")}, but no new unique services were found in this area.`
            });
            // Refresh coverage to update the list
            await fetchCoverage();
            setIsExtractingClient(false);

        } catch (error: any) {
            setClientProgress(100);
            setTimeout(() => {
                setClientResult({ status: 'error', message: error.message });
                setIsExtractingClient(false);
            }, 500);
        }
    };

    const newCities = Array.from(new Set(unenrichedClients.filter(c => c.isNewCity).map(c => c.client.city)));

    return (
        <div className="p-6 md:p-10 space-y-12 max-w-5xl mx-auto">

            {/* --- Section 0: Coverage Optimizer --- */}
            {unenrichedClients.length > 0 && (
                <div className="relative overflow-hidden bg-white rounded-[2.5rem] p-1 border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all">
                    {/* Decorative Background Blur */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 blur-[100px] -mr-32 -mt-16 rounded-full" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100/20 blur-[80px] -ml-24 -mb-16 rounded-full" />

                    <div className="relative p-8 md:p-10 space-y-10">
                        {/* Header Area */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="flex items-start gap-5">
                                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-3xl text-white shadow-lg shadow-amber-200">
                                    <Database size={28} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Coverage Manager</h2>
                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200">
                                            {unenrichedClients.length} Blind Spots
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">Automatic detection identified clients missing regional service data.</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchCoverage}
                                disabled={isAnalyzing}
                                className="group flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-gray-100 transition-all active:scale-95"
                            >
                                <RotateCcw size={14} className={`transition-transform duration-700 ${isAnalyzing ? "animate-spin" : "group-hover:rotate-180"}`} />
                                Refresh Audit
                            </button>
                        </div>

                        {/* Hero Action Card (Next Suggested) */}
                        <div className="relative group overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 rounded-[2rem] p-1 shadow-2xl">
                            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

                            <div className="relative bg-white/5 backdrop-blur-sm rounded-[1.9rem] p-8 flex flex-col lg:flex-row items-center justify-between gap-8 border border-white/10">
                                <div className="flex items-center gap-8 text-white">
                                    {/* Circular Progress Indicator */}
                                    <div className="relative w-24 h-24 shrink-0">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="48" cy="48" r="42" className="stroke-white/10 fill-none" strokeWidth="6" />
                                            <circle
                                                cx="48" cy="48" r="42"
                                                className="stroke-amber-400 fill-none transition-all duration-1000"
                                                strokeWidth="6"
                                                strokeDasharray={264}
                                                strokeDashoffset={264 - (264 * (28 - unenrichedClients[0].missingCount) / 28)}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black leading-none">{28 - unenrichedClients[0].missingCount}</span>
                                            <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">/ 28</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Priority Target Identified</span>
                                        </div>
                                        <h3 className="text-3xl font-black tracking-tight">{unenrichedClients[0].client.firstName} {unenrichedClients[0].client.lastName}</h3>
                                        <div className="flex items-center gap-4 text-sm font-medium opacity-60">
                                            <span className="flex items-center gap-1.5"><MapPin size={14} /> {unenrichedClients[0].client.city}</span>
                                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                                            <span>Missing {unenrichedClients[0].missingCount} Categories</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
                                    <button
                                        onClick={handleBatchEnrichment}
                                        disabled={isExtractingClient}
                                        className="relative w-full lg:w-auto px-10 py-5 bg-amber-400 hover:bg-amber-300 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_15px_30_rgba(251,191,36,0.2)] active:translate-y-1 block h-[64px]"
                                    >
                                        {isExtractingClient ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <Loader2 size={24} className="animate-spin" />
                                                <span>Extracting...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-3">
                                                {(() => {
                                                    const lockedSet = new Set((unenrichedClients[0] as any).lockedCategories?.map((c: string) => c.toLowerCase()) || []);
                                                    const searchable = unenrichedClients[0].missingCategories.filter((cat: string) => !lockedSet.has(cat.toLowerCase()));
                                                    if (searchable.length === 0) return <span>On Cooldown</span>;
                                                    return <span>Start Phase {Math.ceil((28 - searchable.length) / 5) + 1}</span>;
                                                })()}
                                                <ArrowRight size={20} />
                                            </div>
                                        )}
                                    </button>
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
                                        {(() => {
                                            const lockedSet = new Set((unenrichedClients[0] as any).lockedCategories?.map((c: string) => c.toLowerCase()) || []);
                                            const searchable = unenrichedClients[0].missingCategories.filter((cat: string) => !lockedSet.has(cat.toLowerCase()));
                                            if (searchable.length === 0) return "Remaining categories locked for 30 days";
                                            return `Searchable: ${searchable.length} / Total Missing: ${unenrichedClients[0].missingCount}`;
                                        })()}
                                    </p>
                                </div>
                            </div>

                            {/* Batch Result Message */}
                            {clientResult && !isExtractingClient && (
                                <div className={`p-6 rounded-[1.5rem] border animate-in slide-in-from-top-4 duration-300 ${clientResult.status === 'success' ? 'bg-green-50/50 border-green-200 text-green-900' :
                                    clientResult.status === 'warning' ? 'bg-amber-50/50 border-amber-200 text-amber-900' :
                                        'bg-red-50/50 border-red-200 text-red-900'
                                    }`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-0.5 ${clientResult.status === 'success' ? 'text-green-600' :
                                            clientResult.status === 'warning' ? 'text-amber-600' :
                                                'text-red-600'
                                            }`}>
                                            {clientResult.status === 'success' ? <CheckCircle2 size={20} /> :
                                                clientResult.status === 'warning' ? <AlertTriangle size={20} /> :
                                                    <XCircle size={20} />}
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black uppercase tracking-tight">
                                                {clientResult.status === 'success' ? 'Batch Successful' : 'Notice'}
                                            </h4>
                                            <p className="text-xs font-medium opacity-80 leading-relaxed">{clientResult.message}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Queue Grid Area */}
                        <div className="space-y-5">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <Loader2 size={14} className={isAnalyzing ? "animate-spin text-amber-500" : "text-gray-300"} />
                                    Pending Enrichment Queue
                                </h3>
                                <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{unenrichedClients.length} PENDING</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {unenrichedClients.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className={`group relative flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all duration-300 ${idx === 0
                                            ? 'bg-amber-50 border-amber-200 shadow-lg shadow-amber-100/50 scale-[1.02] z-10'
                                            : 'bg-white border-gray-100 hover:border-amber-200 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1'
                                            }`}
                                    >
                                        {/* Entry Rank */}
                                        <div className={`absolute top-0 right-0 mt-3 mr-3 text-[10px] font-black transition-opacity ${idx === 0 ? 'opacity-100' : 'opacity-10 group-hover:opacity-100'}`}>
                                            #{idx + 1}
                                        </div>

                                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-colors ${idx === 0 ? 'bg-amber-400 border-amber-500 text-white' : 'bg-gray-50 border-gray-100 text-gray-900 group-hover:bg-amber-50'
                                            }`}>
                                            <span className="text-[14px] font-black leading-none">{28 - item.missingCount}</span>
                                            <span className={`text-[8px] font-bold uppercase opacity-60 ${idx === 0 ? 'text-white' : 'text-gray-400'}`}>/ 28</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-black truncate uppercase tracking-tight ${idx === 0 ? 'text-amber-900' : 'text-gray-900'}`}>
                                                {item.client.firstName} {item.client.lastName}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[9px] font-bold truncate uppercase ${idx === 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                                                    {item.client.city}
                                                </span>
                                                {item.isNewCity && (
                                                    <>
                                                        <span className="w-1 h-1 bg-amber-300 rounded-full" />
                                                        <span className="text-[8px] font-black text-amber-600 uppercase">New City</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {idx === 0 && (
                                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Disclaimer */}
                        <div className="pt-6 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                                    <Check size={14} />
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Smart Deduplication Engine Active</p>
                            </div>
                            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter italic">Only unique regional records will persist.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Section 1: City-Wide Extraction --- */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">City-Wide Extraction</h2>
                        <p className="text-sm text-gray-500">Scan entire cities for high-volume data. 30-day cooldown applies per category.</p>
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

                    {/* Multi-Select Category Field */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Filter size={12} /> 3. Service Category (MAX 4)
                        </label>
                        <SearchableMultiSelect
                            options={ALL_CATEGORIES}
                            selected={cityCategories}
                            onToggle={(cat) => toggleCategory(cityCategories, setCityCategories, cat)}
                            placeholder="Search & select up to 5 categories..."
                            disabled={isExtractingCity}
                            max={5}
                            lockedOptions={cityLockedCats}
                        />
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
                        <p className="text-sm text-gray-500">Discover essential services within a 10km radius of a specific client location.</p>
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

                    {/* Multi-Select Category Field */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Filter size={12} /> 3. Service Category (MAX 4)
                        </label>
                        <SearchableMultiSelect
                            options={ALL_CATEGORIES}
                            selected={clientCategories}
                            onToggle={(cat) => toggleCategory(clientCategories, setClientCategories, cat)}
                            placeholder="Search & select up to 5 categories..."
                            disabled={isExtractingClient}
                            max={5}
                            lockedOptions={clientLockedCats}
                        />
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

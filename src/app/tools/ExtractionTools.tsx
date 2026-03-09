"use client";

import { useState, useEffect } from "react";
import { Loader2, Database, MapPin, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

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

export default function ExtractionTools() {
    // --- State: General ---
    const [clients, setClients] = useState<any[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);

    // --- State: City Extraction ---
    const [cityInput, setCityInput] = useState("");
    const [isExtractingCity, setIsExtractingCity] = useState(false);
    const [cityProgress, setCityProgress] = useState(0);
    const [cityResult, setCityResult] = useState<{ status: 'success' | 'error', message: string, count?: number } | null>(null);

    // --- State: Client Extraction ---
    const [selectedClientStr, setSelectedClientStr] = useState("");
    const [isExtractingClient, setIsExtractingClient] = useState(false);
    const [clientProgress, setClientProgress] = useState(0);
    const [clientResult, setClientResult] = useState<{ status: 'success' | 'error', message: string, count?: number } | null>(null);

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

    // Simulated Progress Hook
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


    const handleCityExtraction = async () => {
        if (!cityInput.trim()) return;

        setIsExtractingCity(true);
        setCityResult(null);
        setCityProgress(5);

        try {
            const response = await fetch("/api/tools/extract-city", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ city: cityInput.trim() }),
            });

            const data = await response.json();

            // Force progress bar to 100% just before finishing
            setCityProgress(100);

            // Wait a tiny bit for the UI to show 100% before showing result
            setTimeout(() => {
                if (!response.ok) throw new Error(data.error || "Failed to extract");

                setCityResult({
                    status: 'success',
                    message: `Data added to Database. Extracted ${data.savedCount} new services. Deduplicated ${data.skippedCount} existing.`,
                    count: data.savedCount
                });
                setIsExtractingCity(false);
            }, 500);

        } catch (error: any) {
            setCityProgress(100);
            setTimeout(() => {
                setCityResult({
                    status: 'error',
                    message: error.message || "An error occurred during extraction",
                });
                setIsExtractingCity(false);
            }, 500);
        }
    };

    const handleClientExtraction = async () => {
        if (!selectedClientStr) return;

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
                    city: client.city
                }),
            });

            const data = await response.json();

            setClientProgress(100);

            setTimeout(() => {
                if (!response.ok) throw new Error(data.error || "Failed to extract");

                setClientResult({
                    status: 'success',
                    message: `Data added to Database. Extracted ${data.savedCount} new services near the client. Skipped ${data.skippedCount} duplicates.`,
                    count: data.savedCount
                });
                setIsExtractingClient(false);
            }, 500);

        } catch (error: any) {
            setClientProgress(100);
            setTimeout(() => {
                setClientResult({
                    status: 'error',
                    message: error.message || "An error occurred during extraction",
                });
                setIsExtractingClient(false);
            }, 500);
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-12">

            {/* --- Section 1: City-Wide Extraction --- */}
            <div className="space-y-6">
                <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">City-Wide Extraction</h2>
                        <p className="text-sm text-gray-500">Extract up to 2,000 services for a specific city. Skips existing data.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <select
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            disabled={isExtractingCity}
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-900 disabled:opacity-50"
                        >
                            <option value="">Select a City...</option>
                            {PAKISTAN_CITIES.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleCityExtraction}
                            disabled={!cityInput.trim() || isExtractingCity}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[200px]"
                        >
                            {isExtractingCity ? (
                                <><Loader2 size={18} className="animate-spin" /> Extracting...</>
                            ) : (
                                <>Start Extraction <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {isExtractingCity && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Scanning & Deduplicating...</span>
                                <span>{Math.round(cityProgress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                                    style={{ width: `${cityProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Result Message */}
                    {cityResult && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${cityResult.status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                            {cityResult.status === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" /> : <AlertTriangle className="shrink-0 mt-0.5" />}
                            <div>
                                <h4 className="font-bold">{cityResult.status === 'success' ? 'Success!' : 'Error'}</h4>
                                <p className="text-sm opacity-90">{cityResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Section 2: Client-Specific Extraction --- */}
            <div className="space-y-6">
                <div className="flex items-start gap-4 pb-4 border-b">
                    <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Client-Specific Extraction</h2>
                        <p className="text-sm text-gray-500">Discover essential services (Hospitals, Pharmacies, etc.) limited to a 5-10km radius around a specific client. Capped at 400.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <select
                            value={selectedClientStr}
                            onChange={(e) => setSelectedClientStr(e.target.value)}
                            disabled={isExtractingClient || isLoadingClients}
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-medium text-gray-900 disabled:opacity-50"
                        >
                            <option value="">{isLoadingClients ? 'Loading clients...' : 'Select a Client...'}</option>
                            {clients.map(c => {
                                const val = `${c.firstName} ${c.lastName} (${c.city})`;
                                return <option key={val} value={val}>{val}</option>;
                            })}
                        </select>
                        <button
                            onClick={handleClientExtraction}
                            disabled={!selectedClientStr || isExtractingClient}
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[200px]"
                        >
                            {isExtractingClient ? (
                                <><Loader2 size={18} className="animate-spin" /> Extracting...</>
                            ) : (
                                <>Extract Nearby <ArrowRight size={18} /></>
                            )}
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {isExtractingClient && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Scanning & Deduplicating...</span>
                                <span>{Math.round(clientProgress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 transition-all duration-300 ease-out"
                                    style={{ width: `${clientProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Result Message */}
                    {clientResult && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${clientResult.status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                            {clientResult.status === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" /> : <AlertTriangle className="shrink-0 mt-0.5" />}
                            <div>
                                <h4 className="font-bold">{clientResult.status === 'success' ? 'Success!' : 'Error'}</h4>
                                <p className="text-sm opacity-90">{clientResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

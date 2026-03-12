"use client";

import { useState, useRef, useEffect } from "react";
import { X as CloseIcon, Plus, Trash2, Edit, Search } from "lucide-react";
import { Client, Service } from "@/types";

interface AdminPanelProps {
    onClose: () => void;
    clients: Client[];
    services: Service[];
    onDataUpdate: () => void;
}

export default function AdminPanel({ onClose, clients, services, onDataUpdate }: AdminPanelProps) {
    const [tab, setTab] = useState<"clients" | "services">("clients");
    const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
    const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
    const [adminSearch, setAdminSearch] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top when starting an edit/add action
    useEffect(() => {
        if ((editingClient || editingService) && scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [editingClient, editingService]);

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingClient),
        });
        setEditingClient(null);
        onDataUpdate();
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingService),
        });
        setEditingService(null);
        onDataUpdate();
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await fetch("/api/services", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_id: id }),
        });
        onDataUpdate();
    };

    const filteredClients = clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(adminSearch.toLowerCase()) ||
        c.city.toLowerCase().includes(adminSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(adminSearch.toLowerCase())
    );

    const filteredServices = services.filter(s =>
        s.entity_name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(adminSearch.toLowerCase()) ||
        s.city.toLowerCase().includes(adminSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-none md:rounded-3xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] flex flex-col overflow-hidden border border-white/20">
                {/* Header */}
                <div className="p-5 md:p-7 border-b flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h2>
                        <p className="text-gray-500 text-sm font-medium">Manage your service coverage network</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-2xl transition-all shadow-sm hover:rotate-90 duration-300"
                        title="Close Dashboard"
                    >
                        <CloseIcon size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Tabs & Local Search */}
                <div className="flex flex-col md:flex-row border-b bg-white">
                    <div className="flex flex-1 p-2 gap-2">
                        <button
                            onClick={() => { setTab("clients"); setAdminSearch(""); }}
                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${tab === "clients" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                            Clients ({clients.length})
                        </button>
                        <button
                            onClick={() => { setTab("services"); setAdminSearch(""); }}
                            className={`flex-1 py-4 text-sm font-bold rounded-xl transition-all ${tab === "services" ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                            Services ({services.length})
                        </button>
                    </div>
                    <div className="p-2 md:w-80 border-t md:border-t-0 md:border-l flex items-center">
                        <div className="relative w-full group">
                            <input
                                type="text"
                                placeholder={`Filter ${tab}...`}
                                value={adminSearch}
                                onChange={(e) => setAdminSearch(e.target.value)}
                                className="w-full bg-gray-100 border-transparent focus:bg-white border-2 focus:border-blue-600 rounded-xl py-3 pl-11 pr-4 focus:outline-none transition-all text-gray-900 font-bold placeholder:text-gray-400"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        </div>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
                    {tab === "clients" ? (
                        <div className="space-y-6">
                            <button
                                onClick={() => setEditingClient({})}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 font-black shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                            >
                                <Plus size={20} strokeWidth={3} /> Add New Client
                            </button>

                            {editingClient && (
                                <form onSubmit={handleSaveClient} className="bg-white p-8 rounded-3xl border-2 border-blue-50 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                                    <h3 className="text-xl font-bold text-gray-900">Client Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">First Name</label>
                                            <input type="text" placeholder="John" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingClient.firstName || ""} onChange={e => setEditingClient({ ...editingClient, firstName: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Last Name</label>
                                            <input type="text" placeholder="Doe" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingClient.lastName || ""} onChange={e => setEditingClient({ ...editingClient, lastName: e.target.value })} required />
                                        </div>
                                        <div className="col-span-1 md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Email (System ID)</label>
                                            <input type="email" placeholder="john.doe@example.com" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingClient.email || ""} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} required />
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Primary City</label>
                                            <input
                                                type="text"
                                                list="city-suggestions"
                                                placeholder="Enter or select city"
                                                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold bg-white"
                                                value={editingClient.city || ""}
                                                onChange={e => setEditingClient({ ...editingClient, city: e.target.value })}
                                                required
                                            />
                                            <datalist id="city-suggestions">
                                                <option value="Karachi" />
                                                <option value="Lahore" />
                                                <option value="Islamabad" />
                                                <option value="Rawalpindi" />
                                                <option value="Lodhran" />
                                            </datalist>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 space-y-0">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Latitude</label>
                                                <input type="number" step="any" placeholder="0.00" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingClient.latitude || ""} onChange={e => setEditingClient({ ...editingClient, latitude: parseFloat(e.target.value) })} required />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Longitude</label>
                                                <input type="number" step="any" placeholder="0.00" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingClient.longitude || ""} onChange={e => setEditingClient({ ...editingClient, longitude: parseFloat(e.target.value) })} required />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t">
                                        <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all hover:bg-blue-700">Save Client Profile</button>
                                        <button type="button" onClick={() => setEditingClient(null)} className="px-8 bg-gray-100 text-gray-900 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                                    </div>
                                </form>
                            )}

                            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/80">
                                                <th className="px-6 py-5 text-gray-900 font-black text-sm border-b">Client Name</th>
                                                <th className="px-6 py-5 text-gray-900 font-black text-sm border-b">City Location</th>
                                                <th className="px-6 py-5 text-gray-900 font-black text-sm border-b text-right">Settings</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredClients.map(c => (
                                                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{c.firstName} {c.lastName}</div>
                                                        <div className="text-xs text-gray-500">{c.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">{c.city}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setEditingClient(c)}
                                                            className="p-2 bg-white border border-gray-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredClients.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium italic">No clients found matching your search.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button
                                onClick={() => setEditingService({ source_id: Math.random().toString(36).substr(2, 9) })}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 font-black shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
                            >
                                <Plus size={20} strokeWidth={3} /> Add New Service
                            </button>

                            {editingService && (
                                <form onSubmit={handleSaveService} className="bg-white p-8 rounded-3xl border-2 border-blue-50 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                                    <h3 className="text-xl font-bold text-gray-900">Service Entity Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Entity Name</label>
                                            <input type="text" placeholder="Hospital, Utility, etc." className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.entity_name || ""} onChange={e => setEditingService({ ...editingService, entity_name: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                            <input type="text" placeholder="Medical" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.category || ""} onChange={e => setEditingService({ ...editingService, category: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">City</label>
                                            <input type="text" placeholder="City" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.city || ""} onChange={e => setEditingService({ ...editingService, city: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                                            <input type="text" placeholder="Address" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.address || ""} onChange={e => setEditingService({ ...editingService, address: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Contacts</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" placeholder="Primary" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.primary_contact || ""} onChange={e => setEditingService({ ...editingService, primary_contact: e.target.value })} />
                                                <input type="text" placeholder="Secondary" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.secondary_contact || ""} onChange={e => setEditingService({ ...editingService, secondary_contact: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Coordinates</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="number" step="any" placeholder="Lat" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.latitude || ""} onChange={e => setEditingService({ ...editingService, latitude: parseFloat(e.target.value) })} required />
                                                <input type="number" step="any" placeholder="Lng" className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-blue-600 outline-none text-gray-900 font-bold" value={editingService.longitude || ""} onChange={e => setEditingService({ ...editingService, longitude: parseFloat(e.target.value) })} required />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t">
                                        <button type="submit" className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-green-100 transition-all hover:bg-green-700">Save Service Entity</button>
                                        <button type="button" onClick={() => setEditingService(null)} className="px-8 bg-gray-100 text-gray-900 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                                    </div>
                                </form>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredServices.slice(0, 50).map(s => (
                                    <div key={s.source_id} className="bg-white border-2 border-transparent hover:border-blue-500 p-5 rounded-3xl shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur flex gap-1 rounded-bl-2xl">
                                            <button onClick={() => setEditingService(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteService(s.source_id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-900 text-lg leading-tight mb-1">{s.entity_name}</div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">{s.category}</span>
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">{s.city}</span>
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500 font-medium line-clamp-1">{s.address}</div>
                                        </div>
                                    </div>
                                ))}
                                {filteredServices.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400 font-medium italic">No services matched your query.</div>
                                )}
                            </div>
                            {services.length > 50 && !adminSearch && <div className="text-center text-xs text-blue-600 font-bold bg-blue-50 py-4 rounded-2xl">Only first 50 results shown for performance. Use Search to find specific entries.</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ExtractionTools from "./ExtractionTools";

export const metadata = {
    title: "Extraction Tools | Admin",
};

export default async function ToolsPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.role || !["ADMIN", "EDITOR"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gray-900 p-6 text-white text-center">
                    <h1 className="text-2xl font-black uppercase tracking-tight">Data Extraction Tools</h1>
                    <p className="text-sm text-gray-400 mt-2">Targeted API scraping with enforced data caps.</p>
                </div>
                <ExtractionTools />
            </div>
        </main>
    );
}

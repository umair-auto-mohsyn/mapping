import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLockedCategories } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.role || !["ADMIN", "EDITOR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const target = searchParams.get("target");

        if (!target) {
            return NextResponse.json({ error: "Target (city or client ID) required" }, { status: 400 });
        }

        const lockedCategories = await getLockedCategories(target);

        return NextResponse.json({
            lockedCategories
        });

    } catch (error: any) {
        console.error("Cooldown fetch error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch cooldowns" }, { status: 500 });
    }
}

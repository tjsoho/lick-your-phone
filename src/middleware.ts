"use server";

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "./utils/server";

// Admin routes hidden from the dashboard (redirect to /admin). Add routes
// here to keep them reachable by URL but off the dashboard grid.
const HIDDEN_ADMIN_ROUTES: string[] = [];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/admin")) {
        // Redirect hidden admin routes to dashboard
        if (HIDDEN_ADMIN_ROUTES.includes(pathname)) {
            return NextResponse.redirect(new URL("/admin", request.url));
        }

        if (pathname === "/admin/login") {
            return NextResponse.next();
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin", "/admin/:path*"],
};

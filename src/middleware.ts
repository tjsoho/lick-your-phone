import { NextResponse, NextRequest } from "next/server";
import { createClient } from "./utils/server";

// Admin routes hidden from the dashboard (redirect to /admin). Add routes
// here to keep them reachable by URL but off the dashboard grid.
const HIDDEN_ADMIN_ROUTES: string[] = [];

/** Header used to hand the verified user down to the admin layout. */
const USER_EMAIL_HEADER = "x-admin-user-email";

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Always strip any inbound value first — a client could otherwise send
    // this header itself and make the layout believe it is signed in.
    const forwarded = new Headers(request.headers);
    forwarded.delete(USER_EMAIL_HEADER);

    if (pathname.startsWith("/admin")) {
        // Redirect hidden admin routes to dashboard
        if (HIDDEN_ADMIN_ROUTES.includes(pathname)) {
            return NextResponse.redirect(new URL("/admin", request.url));
        }

        if (pathname === "/admin/login") {
            return NextResponse.next({ request: { headers: forwarded } });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        // The session is verified here on every admin request, so the layout
        // can read the email off this header instead of making a second
        // round trip to the auth server on every navigation.
        if (user.email) forwarded.set(USER_EMAIL_HEADER, user.email);

        return NextResponse.next({ request: { headers: forwarded } });
    }

    return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
    matcher: ["/admin", "/admin/:path*"],
};

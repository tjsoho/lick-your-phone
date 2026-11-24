import { Toaster } from "react-hot-toast";
import { headers } from "next/headers";
import Sidebar from "@/components/admin/Sidebar";
import NotificationBell from "@/components/admin/NotificationBell";
import HoverTips from "@/components/admin/HoverTips";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Middleware has already verified the session on every /admin request and
  // forwards the email, so this avoids a second auth round trip per
  // navigation. It is display-only — access is enforced by middleware and by
  // row-level security on the data itself.
  const requestHeaders = await headers();
  const userEmail = requestHeaders.get("x-admin-user-email") || undefined;

  // The live preview is rendered inside a frame beside the editor, so it gets
  // the page to itself — no sidebar, no padding.
  const isBareRoute = (requestHeaders.get("x-admin-pathname") ?? "").endsWith(
    "/preview",
  );

  // Login page renders without sidebar
  return (
    <>
      {/* Draws the hover text for every control that carries a `title`, half
          a second in — the browser's own tooltip is far slower and its delay
          cannot be set. One listener for the whole dashboard, login included. */}
      <HoverTips />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1A1113",
            color: "#FBF8F8",
            border: "1px solid rgba(251, 248, 248, 0.12)",
            borderRadius: "9999px",
            padding: "10px 18px",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.01em",
            boxShadow: "0 18px 40px -20px rgba(61, 11, 17, 0.55)",
          },
        }}
      />
      {userEmail && !isBareRoute ? (
        <div className="min-h-screen bg-lyp-off-white">
          <Sidebar userEmail={userEmail} />
          <main className="lg:pl-64 transition-all duration-300">
            {/* The bell rides above the page rather than inside it, so every
                screen has it without each one having to ask. */}
            <div className="pointer-events-none sticky top-0 z-40 flex justify-end px-6 pt-4 lg:px-8">
              <div className="pointer-events-auto">
                <NotificationBell />
              </div>
            </div>
            <div className="px-6 pb-6 pt-2 lg:px-8 lg:pb-8">{children}</div>
          </main>
        </div>
      ) : (
        children
      )}
    </>
  );
}

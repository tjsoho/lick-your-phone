import { Toaster } from "react-hot-toast";
import { headers } from "next/headers";
import Sidebar from "@/components/admin/Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Middleware has already verified the session on every /admin request and
  // forwards the email, so this avoids a second auth round trip per
  // navigation. It is display-only — access is enforced by middleware and by
  // row-level security on the data itself.
  const userEmail =
    (await headers()).get("x-admin-user-email") || undefined;

  // Login page renders without sidebar
  return (
    <>
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
      {userEmail ? (
        <div className="min-h-screen bg-lyp-off-white">
          <Sidebar userEmail={userEmail} />
          <main className="lg:pl-64 transition-all duration-300">
            <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
          </main>
        </div>
      ) : (
        children
      )}
    </>
  );
}

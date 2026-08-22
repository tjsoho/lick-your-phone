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
            background: "#000",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.2)",
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

import { Toaster } from "react-hot-toast";
import { createClient } from "@/utils/server";
import Sidebar from "@/components/admin/Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  let userEmail: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? undefined;
  } catch {
    // Not logged in - will be caught by middleware
  }

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

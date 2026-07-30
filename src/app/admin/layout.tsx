/* ************************************************************
                        NOTES
************************************************************ */
// Admin layout without global header
// Provides clean admin interface without navigation distractions
/* ************************************************************
                        IMPORTS
************************************************************ */
import { Toaster } from "react-hot-toast";

/* ************************************************************
                        INTERFACES
************************************************************ */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/* ************************************************************
                        COMPONENTS
************************************************************ */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#000',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
        }}
      />
      {children}
    </>
  );
}
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-brand-black text-white">
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <p className="text-white/80 mb-6">This page could not be found.</p>
            <Link
                href="/"
                className="px-6 py-3 bg-brand-green text-white rounded-full font-semibold hover:bg-brand-green/90 transition-colors"
            >
                Back to home
            </Link>
        </div>
    );
}

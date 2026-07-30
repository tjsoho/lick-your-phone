import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Settings
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Settings className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-body">
          Settings page coming soon.
        </p>
      </div>
    </div>
  );
}

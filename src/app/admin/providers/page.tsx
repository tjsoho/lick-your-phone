import { getProviders } from "@/server-actions/providers";
import { getStates } from "@/server-actions/states";
import ProvidersList from "@/components/admin/ProvidersList";

export default async function ProvidersPage() {
  const [providersRes, statesRes] = await Promise.all([
    getProviders(),
    getStates(),
  ]);

  const providers = providersRes.data ?? [];
  const states = statesRes.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          Providers
        </h1>
      </div>
      <ProvidersList
        providers={providers}
        states={states}
      />
    </div>
  );
}

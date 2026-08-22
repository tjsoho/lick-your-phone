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
    <div className="mx-auto max-w-[80rem]">
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Talent
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Providers
        </h1>
        <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
          Photographers and videographers available across your states.
        </p>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <ProvidersList providers={providers} states={states} />
      </div>
    </div>
  );
}

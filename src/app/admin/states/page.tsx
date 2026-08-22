import { getStates } from "@/server-actions/states";
import StatesList from "@/components/admin/StatesList";

export default async function StatesPage() {
  const { data: states } = await getStates();

  return (
    <div className="mx-auto max-w-[64rem]">
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Coverage
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          States
        </h1>
        <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
          The regions venues and providers can be assigned to.
        </p>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <StatesList states={states ?? []} />
      </div>
    </div>
  );
}

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[64rem]">
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Configuration
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Settings
        </h1>
      </header>

      <section
        className="animate-rise rounded-3xl border border-[#EFE6E6] bg-lyp-white px-8 py-16 text-center"
        style={{ animationDelay: "80ms" }}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
          <Settings
            strokeWidth={1}
            aria-hidden="true"
            className="h-6 w-6 text-lyp-cherry/60"
          />
        </span>

        <h2 className="mt-6 font-heading text-[18px] font-bold tracking-[-0.02em] text-lyp-black">
          Nothing to configure yet
        </h2>
        <p className="mx-auto mt-2.5 max-w-sm font-body text-[13px] leading-relaxed text-[#8A7A7A]">
          Workspace settings will live here. For now, everything is managed from
          the sections in the sidebar.
        </p>

        <span className="mt-6 inline-block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#C3B5B5]">
          Coming soon
        </span>
      </section>
    </div>
  );
}

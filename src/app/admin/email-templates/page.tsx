import { listEmailTemplates } from "@/server-actions/email-templates";
import EmailTemplatesPanel from "@/components/admin/EmailTemplatesPanel";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  const { data: templates, error } = await listEmailTemplates();

  return (
    <div className="mx-auto max-w-[72rem]">
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Communication
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Email Templates
        </h1>
        <p className="mt-2.5 max-w-[40rem] font-body text-[13px] leading-relaxed text-[#6B5A5A]">
          Every email the system sends, in the order a client receives them.
          Edit the wording here and the next one out uses it. No developer, no
          Make.
        </p>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <EmailTemplatesPanel templates={templates} loadError={error} />
      </div>
    </div>
  );
}

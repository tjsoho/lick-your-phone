import { getAgreementSettings } from "@/server-actions/agreement-settings";
import AgreementSettingsForm from "@/components/admin/AgreementSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getAgreementSettings();

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
          Agreement Settings
        </h1>
        <p className="mt-2.5 max-w-xl font-body text-[13px] leading-relaxed text-[#8A7A7A]">
          The terms, counter-signature and confirmation wording shared by every
          proposal. Edits save as you type.
        </p>
      </header>

      <AgreementSettingsForm
        initialTerms={settings.termsAndConditions}
        initialPostSignature={settings.postSignatureText}
        initialImage={settings.countersignatureImage}
        initialName={settings.countersignatureName}
        initialTitle={settings.countersignatureTitle}
      />
    </div>
  );
}

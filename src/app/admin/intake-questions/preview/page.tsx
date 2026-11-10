import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/utils/server";
import IntakePage from "@/components/portal/pages/IntakePage";
import PortalBackground from "@/components/portal/PortalBackground";
import {
  ProposalProvider,
  type ProposalData,
} from "@/components/portal/ProposalContext";
import { getAgreementSettings } from "@/server-actions/agreement-settings";
import { getAllProviders, getIntakeQuestions } from "@/server-actions/intake";
import { getIntakePageTitles } from "@/server-actions/intake-questions";
import { getServices } from "@/server-actions/services";
import type { CopyOverrides } from "@/lib/portal-copy";
import { resolveTermsTarget } from "@/lib/terms";

export const dynamic = "force-dynamic";

/** Stand-in values for the parts a real proposal supplies. */
const SAMPLE_PROPOSAL: ProposalData = {
  id: "preview",
  token: "preview",
  // Signed and paid, because that is the only state in which a client ever
  // reaches this form, and the tracker in the bar reads it.
  status: "signed",
  discountExpiresAt: null,
  discountTimerActive: false,
  discountStartsAt: null,
  signedAt: null,
  lastPage: null,
  furthestPage: null,
  clientName: "Sample Venue",
  contactName: "Sample Contact",
  venueName: "Sample Venue",
  // The real form opens its email questions with the address we already hold,
  // and the preview should show that happening rather than a blank box.
  clientEmail: "client@example.com",
};

/**
 * THE WHOLE ONBOARDING FORM, WITHOUT A PROPOSAL BEHIND IT.
 *
 * "Is there a way for us to see how the whole onboarding form would look like
 * from a client's POV, without having to test it through an actual proposal?
 * [...] In order to see my new question I had to test it."
 *
 * So this is the client's own screen, running the client's own component on
 * the real questions. It is not a rebuild of the form, which is the point: a
 * second copy would have told the agency something that was true last month.
 * Routed under `/preview`, which the admin layout already serves without the
 * sidebar, so the form gets the full height it is designed for.
 *
 * Two things are deliberately not the client's experience, and the bar along
 * the top says both: nothing is saved, and every question is shown.
 */
export default async function IntakeFormPreviewPage() {
  const supabase = await createClient();

  const [
    { data: intakePage },
    agreementSettings,
    { data: questions },
    { data: providers },
    { data: pageTitles },
    { data: services },
  ] = await Promise.all([
    supabase.from("pages").select("copy").eq("slug", "intake").maybeSingle(),
    getAgreementSettings(),
    // The same read the client's form does, so a hidden question stays hidden
    // here too and the preview cannot flatter the form.
    getIntakeQuestions(),
    getAllProviders(),
    getIntakePageTitles(),
    getServices<ServiceWithTiersWithInclusionsWithObligationsWithDisclaimers>(
      `id, slug, name, billing, term, target_price_cents,
       discount_pct, discount_window_hours, price_display_period,
       requires_other_service, sequence, billing_cycle_months,
       service_tiers ( id, slug, name, target_price_cents, sequence, billing_cycle_months ),
       service_inclusions ( id, text, sequence ),
       service_client_obligations ( id, text, sequence ),
       service_disclaimers ( id, text, sequence )`,
    ),
  ]);

  const intakeCopy = (intakePage?.copy as CopyOverrides | null) ?? {};

  /* EVERY QUESTION, NOT ONE CLIENT'S SUBSET.
     A question tied to a service only shows for a client who bought it, so a
     preview with an empty basket would hide exactly the questions the agency
     has just written. Treating every service as signed shows the lot. The
     "answer equals" rules still behave normally, because those follow what is
     typed into the preview itself. */
  const everyService = (services ?? []).map((s) => ({
    serviceId: s.id,
    tierId: null,
  }));

  return (
    <div className="flex h-dvh flex-col bg-[#050203]">
      {/* Above the smoke, which is fixed to the viewport at z-0. */}
      <div className="relative z-20 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#EFE6E6] bg-lyp-white px-6 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.08] text-lyp-cherry">
            <Eye strokeWidth={1.5} className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-body text-[13px] font-semibold text-lyp-black">
              Preview of the onboarding form
            </p>
            <p className="font-body text-[11.5px] leading-relaxed text-[#6B5A5A]">
              This is what a client sees. Nothing you fill in is saved, and
              Submit does nothing. Every question is shown here, including the
              ones only some clients get.
            </p>
          </div>
        </div>

        <Link
          href="/admin/intake-questions"
          title="Back to all onboarding questions"
          className="group inline-flex flex-shrink-0 items-center gap-2.5 font-body text-[12px] font-semibold tracking-wide text-[#6B5A5A] transition-colors duration-500 ease-brand hover:text-lyp-cherry"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ease-brand group-hover:-translate-x-0.5">
            <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" />
          </span>
          Back to questions
        </Link>
      </div>

      <div className="relative min-h-0 flex-1">
        <PortalBackground />
        <div className="relative z-10 h-full">
          <ProposalProvider
            proposal={SAMPLE_PROPOSAL}
            pages={[]}
            services={services ?? []}
            initialSelections={everyService}
            // The tracker in the bar below would otherwise sit the payment
            // stage open on the one screen that proves it is closed.
            paymentCaptured
            pageCopy={{ intake: intakeCopy }}
            agreement={{
              termsClauses: [],
              postSignatureText: agreementSettings.postSignatureText,
              portalCopy: agreementSettings.portalCopy,
              termsKind: resolveTermsTarget({
                termsDocumentUrl: agreementSettings.termsDocumentUrl,
                termsDocumentName: agreementSettings.termsDocumentName,
                termsUrl: agreementSettings.termsUrl,
                clauseCount: agreementSettings.termsAndConditions
                  .split("\n")
                  .filter((line: string) => line.trim()).length,
              }).kind,
            }}
          >
            <IntakePage
              questions={questions}
              providers={providers ?? []}
              existingResponses={{}}
              pageTitles={pageTitles}
              // No proposal, so no signed agreement to hand back.
              hasContract={false}
              preview
            />
          </ProposalProvider>
        </div>
      </div>
    </div>
  );
}

import { dispatchNotification } from "./notification-service";
import { logAuditEvent } from "./audit-service";
import { getAppUrl } from "./app-url";

interface IntegrationContext {
  proposalId: string;
  clientName: string;
  clientSlug: string;
  venueName: string;
  venueAddress: string;
  signerEmail: string;
  totalCents: number;
  lineItems: Array<{
    serviceName: string;
    priceCents: number;
    billing: string;
  }>;
  documentUrl: string;
  documentHash: string;
}

export async function onProposalSigned(ctx: IntegrationContext) {
  const appUrl = await getAppUrl();
  const payload = {
    client: {
      clientName: ctx.clientName,
      clientEmail: ctx.signerEmail,
      portalUrl: `${appUrl}/portal/${ctx.proposalId}`,
      venueName: ctx.venueName,
      venueAddress: "", // Assuming venue address is not available in the context
    },
    proposalId: ctx.proposalId,
    contractUrl: ctx.documentUrl,
    totalAmount: ctx.totalCents,
    intakeUrl: `${appUrl}/portal/${ctx.proposalId}`,
    services: ctx.lineItems.map((li) => ({
      name: li.serviceName,
      billing: li.billing,
      term: null,
    })),
    signerEmail: ctx.signerEmail,
  };

  await Promise.allSettled([
    dispatchNotification("PROPOSAL_SIGNED", payload),
    logAuditEvent(ctx.proposalId, "PROPOSAL_SIGNED", payload),
  ]);
}

export async function onIntakeCompleted(params: {
  proposalId: string;
  proposalToken: string;
  clientName: string;
  clientEmail: string;
  venueAddress: string;
  venueName: string;
  isEdit: boolean;
  assets: string[];
  /** The signed PDF itself, where one is on file, for attaching to the email. */
  agreementFileUrl?: string | null;
}) {
  const appUrl = await getAppUrl();
  const payload = {
    client: {
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      portalUrl: `${appUrl}/portal/${params.proposalToken}`,
      venueName: params.venueName,
      venueAddress: params.venueAddress,
    },
    intakeUrl: `${appUrl}/admin/proposals/${params.proposalId}/intake`,
    // The client's own two copies, by token — the same addresses the All
    // Done screen hands them, so the email and the screen can never disagree
    // about what they were given.
    agreementUrl: `${appUrl}/api/contract/by-token/${params.proposalToken}`,
    agreementFileUrl: params.agreementFileUrl ?? null,
    responsesUrl: `${appUrl}/api/intake/${params.proposalToken}`,
    proposalId: params.proposalId,
    isEdit: params.isEdit,
    assets: params.assets,
  };

  await Promise.allSettled([
    dispatchNotification("INTAKE_COMPLETED", payload),
    logAuditEvent(params.proposalId, "INTAKE_COMPLETED", payload),
  ]);
}

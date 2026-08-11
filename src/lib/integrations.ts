import { dispatchNotification } from "./notification-service";
import { logAuditEvent } from "./audit-service";

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
  const payload = {
    client: {
      clientName: ctx.clientName,
      clientEmail: ctx.signerEmail,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${ctx.proposalId}`,
      venueName: ctx.venueName,
      venueAddress: "", // Assuming venue address is not available in the context
    },
    contractUrl: ctx.documentUrl,
    totalAmount: ctx.totalCents,
    intakeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${ctx.proposalId}`,
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
}) {
  const payload = {
    client: {
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${params.proposalToken}`,
      venueName: params.venueName,
      venueAddress: params.venueAddress,
    },
    intakeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/proposals/${params.proposalId}/intake`,
    proposalId: params.proposalId,
    isEdit: params.isEdit,
    assets: params.assets,
  };

  await Promise.allSettled([
    dispatchNotification("INTAKE_COMPLETED", payload),
    logAuditEvent(params.proposalId, "INTAKE_COMPLETED", payload),
  ]);
}

import { dispatchNotification } from "./notification-service";
import {
  sendContractToMake,
  sendOnboardingSubmittedToMake,
  sendOnboardingToMake,
} from "./make-webhook";
import { logAuditEvent } from "./audit-service";
import { getAppUrl } from "./app-url";

interface IntegrationContext {
  proposalId: string;
  clientName: string;
  clientSlug: string;
  venueName: string;
  venueAddress: string;
  /** Set on the client record by the team. Empty until somebody fills it in. */
  abn?: string | null;
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
      venueAddress: ctx.venueAddress,
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
    // Make's contract scenario, which can no longer read PandaDoc and so
    // needs the whole signed picture handed to it.
    sendContractToMake({
      proposalId: ctx.proposalId,
      clientName: ctx.clientName,
      venueName: ctx.venueName,
      venueAddress: ctx.venueAddress,
      abn: ctx.abn,
      signerEmail: ctx.signerEmail,
      totalCents: ctx.totalCents,
      signedAt: new Date().toISOString(),
      contractUrl: ctx.documentUrl,
      intakeUrl: `${appUrl}/portal/${ctx.proposalId}`,
      lineItems: ctx.lineItems,
    }),
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
    // THE CLIENT'S TWO EMAILS, AND NOTHING ELSE.
    //
    // Drive, ClickUp and the Slack post used to go at the same moment,
    // which told the team a client was finished before anyone had read
    // their answers. Those now wait for sign-off; see `onProposalSignedOff`.
    sendOnboardingSubmittedToMake({
      proposalId: params.proposalId,
      businessName: params.venueName,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      venueAddress: params.venueAddress,
      agreementUrl: params.agreementFileUrl ?? null,
      responsesUrl: payload.responsesUrl,
      intakeUrl: `${appUrl}/portal/${params.proposalToken}`,
      assets: params.assets,
      isEdit: params.isEdit,
      signOffUrl: `${appUrl}/admin/proposals/${params.proposalId}`,
    }),
  ]);
}

/**
 * SALES HAS READ THE FORM AND SIGNED IT OFF.
 *
 * Everything internal happens here rather than on submission: the Drive
 * upload, the ClickUp tasks and their statuses, and the Slack post that
 * tells the team there is a new client. Their notes ride along with it, so
 * the marketing team opens a task that already says what the deal is.
 */
export async function onProposalSignedOff(params: {
  proposalId: string;
  proposalToken: string;
  clientName: string;
  clientEmail: string;
  venueAddress: string;
  venueName: string;
  assets: string[];
  agreementFileUrl?: string | null;
  /** What sales wants the marketing team to know. May be empty. */
  notes: string;
}) {
  const appUrl = await getAppUrl();
  const responsesUrl = `${appUrl}/api/intake/${params.proposalToken}`;

  await Promise.allSettled([
    logAuditEvent(params.proposalId, "PROPOSAL_SIGNED_OFF", {
      notes: params.notes,
    }),
    sendOnboardingToMake({
      proposalId: params.proposalId,
      businessName: params.venueName,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      venueAddress: params.venueAddress,
      agreementUrl: params.agreementFileUrl ?? null,
      responsesUrl,
      intakeUrl: `${appUrl}/portal/${params.proposalToken}`,
      assets: params.assets,
      isEdit: false,
      notes: params.notes,
    }),
  ]);
}

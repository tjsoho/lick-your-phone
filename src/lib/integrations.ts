import { createClient as createServiceClient } from "@supabase/supabase-js";
import { dispatchNotification } from "./notification-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!supabaseServiceKey) return null;
  return createServiceClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface IntegrationContext {
  proposalId: string;
  clientName: string;
  clientSlug: string;
  venueName: string;
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

async function createJob(
  proposalId: string,
  type: string,
  idempotencyKey: string,
) {
  const sb = getServiceClient();
  if (!sb) return null;

  const { data } = await sb
    .from("integration_jobs")
    .select("id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (data?.status === "completed") return null;

  if (data) {
    await sb
      .from("integration_jobs")
      .update({
        status: "processing",
        attempt_count: (data as Record<string, unknown>).attempt_count
          ? Number((data as Record<string, unknown>).attempt_count) + 1
          : 1,
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return data.id;
  }

  const { data: newJob } = await sb
    .from("integration_jobs")
    .insert({
      proposal_id: proposalId,
      type,
      status: "processing",
      idempotency_key: idempotencyKey,
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return newJob?.id ?? null;
}

async function completeJob(jobId: string) {
  const sb = getServiceClient();
  if (!sb) return;
  await sb
    .from("integration_jobs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", jobId);
}

async function failJob(jobId: string, error: string) {
  const sb = getServiceClient();
  if (!sb) return;
  await sb
    .from("integration_jobs")
    .update({ status: "failed", last_error: error })
    .eq("id", jobId);
}

async function sendClientEmail(ctx: IntegrationContext) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(
      "[integrations] RESEND_API_KEY not set — skipping client email",
    );
    return;
  }

  const jobId = await createJob(
    ctx.proposalId,
    "email_client",
    `email_client:${ctx.proposalId}`,
  );
  if (!jobId) return;

  try {
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "hello@lickyourphone.com.au";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `LickYourPhone <${fromEmail}>`,
        to: [ctx.signerEmail],
        subject: `Your LickYourPhone Agreement — ${ctx.venueName}`,
        html: `
          <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-family: 'Fira Sans', Arial, sans-serif; color: #B22626; font-size: 28px; margin-bottom: 8px;">
              LickYourPhone
            </h1>
            <hr style="border: none; border-top: 2px solid #B22626; margin: 16px 0 24px;" />
            <p>Hi there,</p>
            <p>Thank you for signing your agreement for <strong>${ctx.venueName}</strong>.</p>
            <p>Your signed contract is attached below. Please keep it for your records.</p>
            <p style="margin: 24px 0;">
              <a href="${ctx.documentUrl}"
                 style="background: #B22626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Download Contract
              </a>
            </p>
            <h2 style="font-family: 'Fira Sans', Arial, sans-serif; font-size: 18px; margin-top: 32px;">What happens next?</h2>
            <ol>
              <li>Complete the intake form using the link in your portal</li>
              <li>Your Account Manager will schedule your onboarding call within 48 hours</li>
              <li>Content creation begins within 2 weeks of your onboarding call</li>
            </ol>
            <p>If you have any questions, reply to this email — your Account Manager is always just a message away.</p>
            <p style="margin-top: 32px; color: #666; font-size: 12px;">
              LickYourPhone Media Pty Ltd | Australia's Leading Hospitality Marketing Agency
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Resend API error ${res.status}: ${errBody}`);
    }

    await completeJob(jobId);
  } catch (err) {
    await failJob(jobId, (err as Error).message);
    console.error(
      "[integrations] Client email failed:",
      (err as Error).message,
    );
  }
}

async function emitN8nWebhook(
  event: string,
  ctx: IntegrationContext,
  extra?: Record<string, unknown>,
) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookUrl) {
    console.log(`[integrations] N8N_WEBHOOK_URL not set — skipping ${event}`);
    return;
  }

  const jobId = await createJob(
    ctx.proposalId,
    `n8n_${event}`,
    `n8n_${event}:${ctx.proposalId}`,
  );
  if (!jobId) return;

  try {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      proposal_id: ctx.proposalId,
      client_name: ctx.clientName,
      client_slug: ctx.clientSlug,
      venue_name: ctx.venueName,
      signer_email: ctx.signerEmail,
      total_cents: ctx.totalCents,
      document_url: ctx.documentUrl,
      line_items: ctx.lineItems,
      ...extra,
    };

    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (webhookSecret) {
      fetchHeaders["X-Webhook-Secret"] = webhookSecret;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`n8n webhook returned ${res.status}`);
    }

    await completeJob(jobId);
  } catch (err) {
    await failJob(jobId, (err as Error).message);
    console.error(
      `[integrations] n8n ${event} webhook failed:`,
      (err as Error).message,
    );
  }
}

export async function onProposalSigned(ctx: IntegrationContext) {
  await Promise.allSettled([
    sendClientEmail(ctx),
    // emitN8nWebhook("proposal_signed", ctx),
    dispatchNotification("PROPOSAL_SIGNED", {
      clientName: ctx.clientName,
      contractUrl: ctx.documentUrl,
      totalAmount: ctx.totalCents,
      venueName: ctx.venueName,
      intakeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${ctx.proposalId}`,
      sevices: ctx.lineItems.map((li) => ({
        name: li.serviceName,
        billing: li.billing,
        term: null,
      })),
      signerEmail: ctx.signerEmail,
    }),
  ]);
}

export async function onIntakeCompleted(
  proposalId: string,
  clientName: string,
  clientSlug: string,
  venueName: string,
  signerEmail: string,
) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log(
      "[integrations] N8N_WEBHOOK_URL not set — skipping intake_completed",
    );
    return;
  }

  const jobId = await createJob(
    proposalId,
    "n8n_intake_completed",
    `n8n_intake_completed:${proposalId}`,
  );
  if (!jobId) return;

  try {
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (webhookSecret) {
      fetchHeaders["X-Webhook-Secret"] = webhookSecret;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({
        event: "intake_completed",
        timestamp: new Date().toISOString(),
        proposal_id: proposalId,
        client_name: clientName,
        client_slug: clientSlug,
        venue_name: venueName,
        signer_email: signerEmail,
      }),
    });

    if (!res.ok) throw new Error(`n8n webhook returned ${res.status}`);
    await completeJob(jobId);
  } catch (err) {
    await failJob(jobId, (err as Error).message);
    console.error(
      "[integrations] intake_completed webhook failed:",
      (err as Error).message,
    );
  }
}

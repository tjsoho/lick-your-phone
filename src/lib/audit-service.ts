import { createAdminClient, createClient } from "@/utils/server";

type Client = {
  clientName: string;
  clientEmail: string;
  portalUrl: string;
  venueName: string;
  venueAddress: string;
};

export type AuditEvent =
  | "PROPOSAL_SENT"
  | "PROPOSAL_SIGNED"
  | "PAYMENT_FAILED"
  | "INTAKE_COMPLETED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_CAPTURED";

interface AuditPayloadMap {
  PROPOSAL_SENT: Client;
  PROPOSAL_SIGNED: {
    client: Client;
    totalAmount: number;
    contractUrl: string;
    intakeUrl: string;
    signerEmail: string;
    services: { name: string; billing: string; term: string | null }[];
  };
  PAYMENT_FAILED: { client: Client; amount: number; paymentId: string };
  INTAKE_COMPLETED: {
    client: Client;
    proposalId: string;
    intakeUrl: string;
    isEdit: boolean;
    assets: string[];
  };
  PAYMENT_SUCCEEDED: {
    client: Client;
    amount: number;
    paymentId: string;
  };
  PAYMENT_CAPTURED: {
    client: Client;
    amount: number;
    paymentId: string;
    intakeUrl: string;
    paymentSchedules: {
      date: string;
      description: string;
      amount: number;
    }[];
  };
}

export async function logAuditEvent<K extends AuditEvent>(
  proposalId: string,
  event: K,
  payload: AuditPayloadMap[K],
  options?: {
    actorType?: "staff" | "client" | "system";
    actorId?: string;
  },
) {
  console.log(
    `[Audit Service] Logging event: ${event} for proposal: ${proposalId}`,
  );

  try {
    const adminSupabase = await createAdminClient();

    let actorType: "staff" | "client" | "system" =
      options?.actorType || "system";
    let actorId: string | null = options?.actorId || null;

    // If actor info not explicitly provided, try to infer it from current session
    if (!options?.actorType && !options?.actorId) {
      try {
        const clientSupabase = await createClient();
        const {
          data: { user },
        } = await clientSupabase.auth.getUser();
        if (user) {
          actorType = "staff";
          actorId = user.id;
        }
      } catch {
        // Ignore cookie reading error if executed in environments without cookies
      }
    }

    // Default actorType based on action context
    if (actorType === "system") {
      if (event === "PROPOSAL_SIGNED" || event === "INTAKE_COMPLETED") {
        actorType = "client";
      }
    }

    const { error } = await adminSupabase.from("audit_events").insert({
      entity_type: "proposal",
      entity_id: proposalId,
      action: event,
      actor_id: actorId,
      actor_type: actorType,
      metadata: payload,
    });

    if (error) {
      console.error("[Audit Service] Supabase insert error:", error);
    }
  } catch (error) {
    console.error(`[Audit Service] Error logging ${event}:`, error);
  }
}

import axios from "axios";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

type Client = {
  clientName: string;
  clientEmail: string;
  portalUrl: string;
  venueName: string;
  venueAddress: string;
};

export type NotificationEvent =
  | "PROPOSAL_SENT"
  | "PROPOSAL_SIGNED"
  | "PAYMENT_FAILED"
  | "INTAKE_COMPLETED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_CAPTURED";

interface PayloadMap {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendWebhook(event: NotificationEvent, data: any) {
  if (!N8N_WEBHOOK_URL) return console.warn("n8n Webhook URL missing");

  try {
    await axios.post(
      N8N_WEBHOOK_URL,
      {
        event,
        timestamp: new Date().toISOString(),
        data,
      },
      {
        headers: {
          "X-Auth": process.env.N8N_WEBHOOK_SECRET || "",
        },
      },
    );
  } catch (error) {
    console.error(
      `[Notification Service] Error sending webhook for ${event}:`,
      error,
    );
  }
}
export async function dispatchNotification<K extends NotificationEvent>(
  event: K,
  payload: PayloadMap[K],
) {
  console.log(`[Notification Service] Dispatching event: ${event}`);

  try {
    switch (event) {
      case "PROPOSAL_SENT": {
        const data = payload as PayloadMap["PROPOSAL_SENT"];
        await sendWebhook(event, data);
        break;
      }

      case "PROPOSAL_SIGNED": {
        const data = payload as PayloadMap["PROPOSAL_SIGNED"];
        await sendWebhook(event, data);
        break;
      }

      case "PAYMENT_FAILED": {
        const data = payload as PayloadMap["PAYMENT_FAILED"];
        await Promise.all([sendWebhook(event, data)]);
        break;
      }

      case "INTAKE_COMPLETED": {
        const data = payload as PayloadMap["INTAKE_COMPLETED"];
        await sendWebhook(event, data);
        break;
      }

      case "PAYMENT_SUCCEEDED": {
        const data = payload as PayloadMap["PAYMENT_SUCCEEDED"];
        await sendWebhook(event, data);
        break;
      }

      case "PAYMENT_CAPTURED": {
        const data = payload as PayloadMap["PAYMENT_CAPTURED"];
        await sendWebhook(event, data);
        break;
      }

      default:
        console.warn(`[Notification Service] Unhandled event type: ${event}`);
    }
  } catch (error) {
    console.error(`[Notification Service] Error processing ${event}:`, error);
  }
}

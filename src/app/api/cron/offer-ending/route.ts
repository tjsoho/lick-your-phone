import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/server";
import { dispatchNotification } from "@/lib/notification-service";
import { getAppUrl } from "@/lib/app-url";

/**
 * "CAN AN EMAIL GO OUT AUTOMATICALLY BEFORE THE DISCOUNT COUNTDOWN ENDS?"
 *
 * Yes, and this is the half of it that lives here. No email is sent from this
 * app at all: everything goes out through n8n, so this fires an OFFER_ENDING
 * webhook and n8n decides what the client receives and when within the day.
 *
 * It runs once a day and picks up every proposal whose offer closes inside
 * the next 48 hours, has not been signed, and has not already been reminded.
 * The stamp is what keeps it to once: without it the job would send the same
 * nudge every morning until the window shut.
 *
 * Nothing here charges anyone. It is a message, which is why it is scheduled
 * where the payment job deliberately is not.
 */

/** How far ahead to look. Two days gives n8n room to pick its own sending hour. */
const LOOKAHEAD_HOURS = 48;

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);

    const { data: closing, error } = await supabase
      .from("proposals")
      .select(
        "id, token, signer_email, discount_expires_at, clients(name, email), venues(name, address)",
      )
      .eq("discount_timer_active", true)
      .is("offer_reminder_sent_at", null)
      .in("status", ["sent"])
      .not("discount_expires_at", "is", null)
      .gt("discount_expires_at", now.toISOString())
      .lte("discount_expires_at", horizon.toISOString());

    if (error) throw new Error(error.message);
    if (!closing || closing.length === 0) {
      return NextResponse.json({ message: "No offers closing soon.", sent: 0 });
    }

    const appUrl = await getAppUrl();
    let sent = 0;

    for (const proposal of closing) {
      const client = proposal.clients as unknown as {
        name: string;
        email: string;
      } | null;
      const venue = proposal.venues as unknown as {
        name: string;
        address: string | null;
      } | null;

      await dispatchNotification("OFFER_ENDING", {
        proposalId: proposal.id,
        endsAt: proposal.discount_expires_at as string,
        client: {
          clientName: client?.name || "",
          clientEmail: proposal.signer_email || client?.email || "",
          venueName: venue?.name || "",
          venueAddress: venue?.address || "",
          portalUrl: `${appUrl}/portal/${proposal.token}`,
        },
      });

      // Stamped after the dispatch, so a webhook that fails is retried
      // tomorrow rather than silently skipped.
      await supabase
        .from("proposals")
        .update({ offer_reminder_sent_at: now.toISOString() })
        .eq("id", proposal.id);

      sent++;
    }

    return NextResponse.json({ message: `Reminded ${sent}.`, sent });
  } catch (error) {
    console.error("[Offer ending] ", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

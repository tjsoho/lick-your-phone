"use server";

import { createAdminClient, createClient } from "@/utils/server";
import { getAppUrl } from "@/lib/app-url";
import { revalidatePath } from "next/cache";

/**
 * THE PEOPLE WHO CAN OPEN THE DASHBOARD.
 *
 * Adding somebody means two things that have to stay in step: an account in
 * Supabase's own auth store, which is what a password hangs off, and a row in
 * `users`, which is what the rest of the app reads a name off when it says
 * who sent a proposal or signed one off.
 *
 * NOBODY HERE EVER SETS SOMEBODY ELSE'S PASSWORD.
 *
 * An invite link is generated instead and handed back to whoever added them,
 * to send on. The new person opens it, chooses their own password, and it is
 * never known to anyone but them. The alternative, typing a password in for
 * them and passing it along in a message, leaves it sitting in a chat window
 * for as long as that window exists.
 */

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  /** Null until they have actually signed in once. */
  lastSignInAt: string | null;
  /** False while the invite is still outstanding. */
  hasSignedIn: boolean;
  createdAt: string;
}

/** A signed-in member of staff, or nothing. Every action here needs one. */
async function requireUser() {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  return user;
}

/**
 * READ IT OFF THE AUTH STORE, NOT OFF `users`.
 *
 * This list answers "who can open the dashboard", and the only thing that
 * actually decides that is whether Supabase holds an account for them. The
 * `users` table is a separate record the app keeps for names, and it had
 * drifted: it was empty while four people could sign in, so a list built
 * from it would have shown nobody and told whoever read it the opposite of
 * the truth. Names are joined on where there are any.
 */
export async function listTeamMembers(): Promise<{
  data: TeamMember[];
  error: string | null;
}> {
  try {
    if (!(await requireUser())) return { data: [], error: "Not signed in." };

    const admin = await createAdminClient();
    const [authList, { data: rows }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("users").select("id, name"),
    ]);

    if (authList.error) throw new Error(authList.error.message);

    const names = new Map((rows ?? []).map((r) => [r.id, r.name]));

    return {
      data: (authList.data?.users ?? [])
        .map((u) => ({
          id: u.id,
          name: names.get(u.id) ?? (u.user_metadata?.name as string) ?? null,
          email: u.email ?? "",
          lastSignInAt: u.last_sign_in_at ?? null,
          hasSignedIn: Boolean(u.last_sign_in_at),
          createdAt: u.created_at,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      error: null,
    };
  } catch (err) {
    return { data: [], error: (err as Error).message };
  }
}

/**
 * Add somebody, and hand back the link that lets them set their own password.
 *
 * `generateLink` makes the account and returns the link without sending
 * anything. Supabase's own invite email is not used: its built-in sender is
 * rate limited to a couple an hour and will not reach an address outside the
 * project's own team unless custom SMTP is set up, so an invite could fail
 * silently. A link on screen cannot fail silently.
 */
export async function addTeamMember(input: {
  name: string;
  email: string;
}): Promise<{ data: { link: string; email: string } | null; error: string | null }> {
  try {
    const actor = await requireUser();
    if (!actor) return { data: null, error: "Not signed in." };

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    if (name.length < 2) {
      return { data: null, error: "Enter their name." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { data: null, error: "That does not look like an email address." };
    }

    const admin = await createAdminClient();
    const appUrl = await getAppUrl();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${appUrl}/admin/set-password`,
        data: { name },
      },
    });

    if (error || !data?.user || !data.properties?.action_link) {
      // The usual cause by a mile, and worth saying in plain words rather
      // than passing Supabase's own wording through.
      if (error?.message?.toLowerCase().includes("already")) {
        return {
          data: null,
          error:
            "Somebody is already using that email address. Send them a new password link instead.",
        };
      }
      return {
        data: null,
        error: error?.message ?? "The invite could not be created.",
      };
    }

    // The auth account and this row have to carry the same id, or the rest of
    // the app cannot put a name to whoever is signed in.
    const { error: rowErr } = await admin.from("users").upsert(
      {
        id: data.user.id,
        email,
        name,
        // Everyone who can sign in can reach every admin page, so recording
        // anything else here would say more than is true.
        role: "admin",
      },
      { onConflict: "id" },
    );

    if (rowErr) throw new Error(rowErr.message);

    revalidatePath("/admin/users");
    return {
      data: { link: data.properties.action_link, email },
      error: null,
    };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

/**
 * A fresh link for somebody already on the list.
 *
 * Covers both "the invite expired before they got to it" and "they have
 * forgotten their password". Either way it is a recovery link, which lands on
 * the same screen and does the same thing: they choose a new password.
 */
export async function resendPasswordLink(
  email: string,
): Promise<{ data: { link: string } | null; error: string | null }> {
  try {
    if (!(await requireUser())) return { data: null, error: "Not signed in." };

    const admin = await createAdminClient();
    const appUrl = await getAppUrl();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${appUrl}/admin/set-password` },
    });

    if (error || !data?.properties?.action_link) {
      return {
        data: null,
        error: error?.message ?? "A link could not be created for that address.",
      };
    }

    return { data: { link: data.properties.action_link }, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

/**
 * TAKE SOMEBODY'S ACCESS AWAY.
 *
 * The auth account is what lets them in, so that is what goes. The `users`
 * row goes with it, since anything still pointing at it is historical and
 * reads the id rather than the row.
 *
 * Deliberately refuses to remove whoever is asking: locking yourself out of
 * the only dashboard you have is a mistake nobody recovers from in the
 * browser.
 */
export async function removeTeamMember(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const actor = await requireUser();
    if (!actor) return { error: "Not signed in." };
    if (actor.id === userId) {
      return { error: "You cannot remove your own access." };
    }

    const admin = await createAdminClient();

    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) return { error: authErr.message };

    await admin.from("users").delete().eq("id", userId);

    revalidatePath("/admin/users");
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

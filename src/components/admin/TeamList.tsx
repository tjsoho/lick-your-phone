"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Check,
  Copy,
  Clock,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  addTeamMember,
  removeTeamMember,
  resendPasswordLink,
  type TeamMember,
} from "@/server-actions/team";

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3 font-body text-[14px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#9C8C8C] hover:border-[#E2D2D2] focus:border-lyp-cherry/40 focus:bg-lyp-white focus-visible:ring-2 focus-visible:ring-lyp-cherry/20 disabled:opacity-50`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]";

/**
 * THE LINK IS THE WHOLE POINT, SO IT GETS ITS OWN PANEL.
 *
 * Whoever added the person has to send it on, and a line of small grey text
 * they might scroll past is not good enough: it is the only copy, and it is
 * the only way that person ever gets in.
 */
function LinkPanel({ email, link }: { email: string; link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#CFE3D5] bg-[#F3F9F4] px-4 py-4">
      <div className="flex items-center gap-2.5">
        <Check strokeWidth={1.75} className="h-4 w-4 flex-shrink-0 text-[#4A7A5C]" />
        <p className="font-body text-[13px] font-semibold text-[#2F5A3E]">
          {email} has been added
        </p>
      </div>

      <p className="mt-2 font-body text-[12px] leading-relaxed text-[#3F6B4E]">
        Send them this link. It lets them choose their own password and sign
        in. It is the only copy, so take it now.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full flex-1 rounded-xl border border-[#CFE3D5] bg-lyp-white px-3.5 py-2.5 font-body text-[12px] text-[#2F5A3E] outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className={`inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-[#2F5A3E] px-5 py-2.5 font-body text-[12.5px] font-semibold text-lyp-white transition-all duration-500 ${EASE} hover:bg-[#25492F] active:scale-[0.985]`}
        >
          {copied ? (
            <Check strokeWidth={2} className="h-3.5 w-3.5" />
          ) : (
            <Copy strokeWidth={1.75} className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <a
        href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          "Your LickYourPhone dashboard login",
        )}&body=${encodeURIComponent(
          `Open this link to set your password and sign in.\n\n${link}\n\nIt only works once.`,
        )}`}
        className={`mt-3 inline-flex items-center gap-2 font-body text-[12px] font-semibold text-[#2F5A3E] underline underline-offset-4 transition-colors duration-500 ${EASE} hover:text-[#1D3B26]`}
      >
        <Mail strokeWidth={1.75} className="h-3.5 w-3.5" />
        Open an email with it ready to send
      </a>
    </div>
  );
}

export default function TeamList({
  members,
  loadError,
  currentUserEmail,
}: {
  members: TeamMember[];
  loadError: string | null;
  /** So the list can refuse to offer you a button that locks you out. */
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<{ email: string; link: string } | null>(
    null,
  );
  const [resending, setResending] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setIssued(null);
    const res = await addTeamMember({ name, email });
    if (res.error || !res.data) {
      toast.error(res.error ?? "That did not work.");
    } else {
      setIssued(res.data);
      setName("");
      setEmail("");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleResend(address: string) {
    setResending(address);
    const res = await resendPasswordLink(address);
    if (res.error || !res.data) {
      toast.error(res.error ?? "That did not work.");
    } else {
      setIssued({ email: address, link: res.data.link });
    }
    setResending(null);
  }

  /**
   * Typed confirmation rather than a plain "are you sure".
   *
   * Removing somebody cannot be undone from here and locks a real person out
   * of a live dashboard, so it asks for the email back. A stray click cannot
   * do it.
   */
  async function handleRemove(member: TeamMember) {
    const typed = window.prompt(
      `This removes ${member.email} from the dashboard for good. They will not be able to sign in again and it cannot be undone.\n\nType their email address to confirm.`,
    );
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== member.email.toLowerCase()) {
      toast.error("That did not match, so nothing was removed.");
      return;
    }

    setRemoving(member.id);
    const res = await removeTeamMember(member.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`${member.email} can no longer sign in`);
      router.refresh();
    }
    setRemoving(null);
  }

  return (
    <div className="space-y-6">
      {/* ─────────────── Add somebody ─────────────── */}
      <section className="rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6">
        <div className="flex items-center gap-2.5">
          <UserPlus strokeWidth={1.75} className="h-4 w-4 text-lyp-cherry" />
          <h2 className="font-body text-[13px] font-semibold text-lyp-black">
            Add a user
          </h2>
        </div>

        <form onSubmit={handleAdd} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="member-name" className={labelClasses}>
                Name
              </label>
              <input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="off"
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="member-email" className={labelClasses}>
                Email
              </label>
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@lickyourphone.com"
                autoComplete="off"
                className={inputClasses}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim() || !email.trim()}
            className={`inline-flex items-center gap-2.5 rounded-full bg-lyp-cherry px-6 py-3 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`}
          >
            {saving ? (
              <Loader2 strokeWidth={1.75} className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus strokeWidth={1.75} className="h-4 w-4" />
            )}
            {saving ? "Adding" : "Add user"}
          </button>
        </form>

        {issued && <LinkPanel email={issued.email} link={issued.link} />}

        {/* Said plainly, because the page would otherwise imply a level of
            control that does not exist yet. */}
        <p className="mt-5 flex items-start gap-2 border-t border-[#F3ECEC] pt-4 font-body text-[11px] leading-relaxed text-[#867474]">
          <ShieldCheck
            strokeWidth={1.75}
            className="mt-px h-3.5 w-3.5 flex-shrink-0 text-[#BFADAD]"
          />
          <span>
            Anybody added here can open every page of this dashboard, including
            clients, proposals and bank details. There are no limited accounts
            yet, so only add people who should see all of it.
          </span>
        </p>
      </section>

      {/* ─────────────── Who is already on ─────────────── */}
      <section className="rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6">
        <h2 className="font-body text-[13px] font-semibold text-lyp-black">
          Who can sign in
        </h2>

        {loadError ? (
          <p className="mt-4 font-body text-[13px] text-lyp-cherry">
            {loadError}
          </p>
        ) : members.length === 0 ? (
          <p className="mt-4 font-body text-[13px] text-[#867474]">
            Nobody yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#F3ECEC]">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-[13.5px] font-semibold text-lyp-black">
                    {m.name || "No name on file"}
                  </p>
                  <p className="truncate font-body text-[12px] text-[#6B5A5A]">
                    {m.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {m.hasSignedIn ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F9F4] px-3 py-1.5 font-body text-[11px] font-semibold text-[#2F5A3E]">
                      <Check strokeWidth={2} className="h-3 w-3" />
                      Password set
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF8EE] px-3 py-1.5 font-body text-[11px] font-semibold text-[#8A6E2A]">
                      <Clock strokeWidth={2} className="h-3 w-3" />
                      Not signed in yet
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleResend(m.email)}
                    disabled={resending === m.email}
                    title="Create a fresh link so they can set a new password"
                    className={`inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12px] font-semibold text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985] disabled:opacity-50`}
                  >
                    {resending === m.email ? (
                      <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    New password link
                  </button>

                  {m.email.toLowerCase() !==
                  (currentUserEmail ?? "").toLowerCase() ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(m)}
                      disabled={removing === m.id}
                      title={`Remove ${m.email} from the dashboard for good`}
                      aria-label={`Remove ${m.email}`}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#EFE6E6] bg-lyp-white text-[#BFADAD] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985] disabled:opacity-50`}
                    >
                      {removing === m.id ? (
                        <Loader2 strokeWidth={1.75} className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : (
                    <span className="inline-flex h-9 items-center px-2 font-body text-[11px] text-[#BFADAD]">
                      You
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

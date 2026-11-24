import { headers } from "next/headers";
import { listTeamMembers } from "@/server-actions/team";
import TeamList from "@/components/admin/TeamList";

export default async function UsersPage() {
  const { data: members, error } = await listTeamMembers();
  // Middleware has already verified the session and forwarded the email.
  const currentUserEmail =
    (await headers()).get("x-admin-user-email") ?? null;

  return (
    <div className="mx-auto max-w-[64rem]">
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Access
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          Users
        </h1>
        <p className="mt-2.5 max-w-[36rem] font-body text-[13px] leading-relaxed text-[#6B5A5A]">
          Who can sign in to this dashboard. Adding somebody gives you a link
          to send them. They choose their own password on it, so nobody here
          ever sees it.
        </p>
      </header>

      <div className="animate-rise" style={{ animationDelay: "80ms" }}>
        <TeamList
          members={members}
          loadError={error}
          currentUserEmail={currentUserEmail}
        />
      </div>
    </div>
  );
}

import SetPasswordForm from "@/components/admin/SetPasswordForm";
import Logo from "@/components/Logo";

/**
 * WHERE AN INVITE OR A RESET LINK LANDS.
 *
 * Deliberately outside the signed-in part of the dashboard: whoever opens
 * this has no password yet, so they cannot have a session, and the admin
 * layout renders it bare for exactly that reason.
 */
export default function SetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-lyp-off-white px-6 py-16">
      <div className="w-full max-w-[26rem]">
        <Logo variant="mark" className="mx-auto h-14" priority />
        <SetPasswordForm />
      </div>
    </main>
  );
}

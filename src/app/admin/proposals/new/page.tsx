import { getClients } from "@/server-actions/clients";
import { getStates } from "@/server-actions/states";
import ProposalWizard from "@/components/admin/ProposalWizard";

export default async function NewProposalPage() {
  const [clientsRes, statesRes] = await Promise.all([
    getClients(),
    getStates(),
  ]);

  return (
    <div className="mx-auto max-w-[52rem]">
      <header className="animate-rise mb-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-lyp-cherry/30" />
          <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
            Proposals
          </span>
        </div>
        <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
          New Proposal
        </h1>
      </header>
      <ProposalWizard
        clients={clientsRes.data ?? []}
        states={statesRes.data ?? []}
      />
    </div>
  );
}

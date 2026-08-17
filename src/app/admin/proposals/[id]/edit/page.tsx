import { notFound } from "next/navigation";
import { getClients } from "@/server-actions/clients";
import { getStates } from "@/server-actions/states";
import { getProposal } from "@/server-actions/proposals";
import ProposalWizard from "@/components/admin/ProposalWizard";

export default async function EditProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const wizardMode = mode === "supersede" ? "supersede" : "edit";

  const [{ data: proposal, error }, clientsRes, statesRes] = await Promise.all([
    getProposal(id),
    getClients(),
    getStates(),
  ]);

  if (error || !proposal) return notFound();

  const initialData = {
    clientId: proposal.clients?.id ?? "",
    venueId: proposal.venues?.id ?? "",
    notes: proposal.internal_notes?.[0]?.content ?? "",
  };

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
          {wizardMode === "edit" ? "Edit Proposal" : "Supersede Proposal"}
        </h1>
      </header>
      <ProposalWizard
        clients={clientsRes.data ?? []}
        states={statesRes.data ?? []}
        mode={wizardMode}
        proposalId={id}
        initialData={initialData}
      />
    </div>
  );
}

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
    <div>
      <h1 className="text-2xl font-heading font-bold text-lyp-black mb-6">
        {wizardMode === "edit" ? "Edit Proposal" : "Supersede Proposal"}
      </h1>
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

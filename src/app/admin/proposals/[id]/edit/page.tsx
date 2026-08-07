import { notFound } from "next/navigation";
import { getProposal } from "@/server-actions/proposals";
import { getClients } from "@/server-actions/clients";
import { getStates } from "@/server-actions/states";
import ProposalWizard from "@/components/admin/ProposalWizard";
import type { ProposalInitialData } from "@/components/admin/ProposalWizard";

export default async function EditProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = modeParam === "supersede" ? "supersede" : "edit";

  const [proposalRes, clientsRes, statesRes] = await Promise.all([
    getProposal(id),
    getClients(),
    getStates(),
  ]);

  if (!proposalRes.data) return notFound();

  const proposal = proposalRes.data;

  // Only allow editing drafts
  if (mode === "edit" && proposal.status !== "draft") {
    return notFound();
  }

  const initialData: ProposalInitialData = {
    clientId: proposal.client_id,
    venueId: proposal.venue_id,
    notes: proposal.notes ?? "",
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-lyp-black mb-6">
        {mode === "edit" ? "Edit Proposal" : "Supersede Proposal"}
      </h1>
      <ProposalWizard
        clients={clientsRes.data ?? []}
        states={statesRes.data ?? []}
        mode={mode}
        proposalId={id}
        initialData={initialData}
      />
    </div>
  );
}

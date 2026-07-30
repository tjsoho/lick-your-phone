import { getClients } from "@/server-actions/clients";
import { getStates } from "@/server-actions/states";
import ProposalWizard from "@/components/admin/ProposalWizard";

export default async function NewProposalPage() {
  const [clientsRes, statesRes] = await Promise.all([
    getClients(),
    getStates(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-lyp-black mb-6">
        New Proposal
      </h1>
      <ProposalWizard
        clients={clientsRes.data ?? []}
        states={statesRes.data ?? []}
      />
    </div>
  );
}

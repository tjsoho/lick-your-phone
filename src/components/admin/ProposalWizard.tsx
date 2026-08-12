"use client";

import { cn } from "@/lib/utils";
import { createClient, createVenue } from "@/server-actions/clients";
import {
  createProposal,
  supersedeProposal,
  updateProposal,
} from "@/server-actions/proposals";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Client = {
  id: string;
  name: string;
  entity_name?: string;
  abn?: string;
  venues: { id: string; name: string }[];
};

type State = {
  id: string;
  name: string;
  abbreviation: string;
};

export type ProposalInitialData = {
  clientId: string;
  venueId: string;
  notes: string;
};

type Props = {
  clients: Client[];
  states: State[];
  mode?: "create" | "edit" | "supersede";
  proposalId?: string;
  initialData?: ProposalInitialData;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

const steps = ["Client", "Venue", "Notes", "Review"];

export default function ProposalWizard({
  clients,
  states,
  mode = "create",
  proposalId,
  initialData,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Client state
  const [selectedClientId, setSelectedClientId] = useState(
    initialData?.clientId ?? "",
  );
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEntity, setNewClientEntity] = useState("");
  const [newClientAbn, setNewClientAbn] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [createdClients, setCreatedClients] = useState<Client[]>([]);

  // Venue state
  const [selectedVenueId, setSelectedVenueId] = useState(
    initialData?.venueId ?? "",
  );
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueStateId, setNewVenueStateId] = useState("");
  const [createdVenues, setCreatedVenues] = useState<
    { id: string; name: string }[]
  >([]);

  // Notes
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const allClients = [...clients, ...createdClients];
  const selectedClient = allClients.find((c) => c.id === selectedClientId);
  const allVenues = [...(selectedClient?.venues ?? []), ...createdVenues];
  const selectedVenue = allVenues.find((v) => v.id === selectedVenueId);

  async function handleCreateClient() {
    if (!newClientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    setLoading(true);
    const { data, error } = await createClient({
      name: newClientName.trim(),
      slug: slugify(newClientName),
      entity_name: newClientEntity.trim() || undefined,
      abn: newClientAbn.trim() || undefined,
      email: newClientEmail.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      const newClient: Client = { ...data, venues: [] };
      setCreatedClients((prev) => [...prev, newClient]);
      setSelectedClientId(data.id);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientEntity("");
      setNewClientAbn("");
      setNewClientEmail("");
      toast.success("Client created");
    }
  }

  async function handleCreateVenue() {
    if (!newVenueName.trim()) {
      toast.error("Venue name is required");
      return;
    }
    if (!newVenueStateId) {
      toast.error("State is required");
      return;
    }
    setLoading(true);
    const { data, error } = await createVenue({
      client_id: selectedClientId,
      name: newVenueName.trim(),
      address: newVenueAddress.trim() || undefined,
      state_id: newVenueStateId,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setCreatedVenues((prev) => [...prev, { id: data.id, name: data.name }]);
      setSelectedVenueId(data.id);
      setShowNewVenue(false);
      setNewVenueName("");
      setNewVenueAddress("");
      setNewVenueStateId("");
      toast.success("Venue created");
    }
  }

  async function handleSubmit() {
    setLoading(true);
    const payload = {
      client_id: selectedClientId,
      venue_id: selectedVenueId,
      notes: notes.trim() || undefined,
    };

    let result: { error: string | null };

    if (mode === "edit" && proposalId) {
      result = await updateProposal(proposalId, payload);
    } else if (mode === "supersede" && proposalId) {
      result = await supersedeProposal(proposalId, payload);
    } else {
      result = await createProposal(payload);
    }

    setLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    const msg =
      mode === "edit"
        ? "Proposal updated"
        : mode === "supersede"
          ? "Superseding proposal created"
          : "Proposal created";
    toast.success(msg);
    router.push("/admin/proposals");
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return !!selectedClientId;
      case 2:
        return !!selectedVenueId;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  }

  const reviewTitle =
    mode === "edit"
      ? "Review & Save"
      : mode === "supersede"
        ? "Review & Supersede"
        : "Review & Create";

  const submitLabel = loading
    ? "Saving..."
    : mode === "edit"
      ? "Save Changes"
      : mode === "supersede"
        ? "Create & Supersede"
        : "Create Proposal";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-heading font-bold",
                    isActive && "bg-lyp-cherry text-white",
                    isCompleted && "bg-green-500 text-white",
                    !isActive && !isCompleted && "bg-gray-200 text-gray-500",
                  )}
                >
                  {stepNum}
                </div>
                <span
                  className={cn(
                    "font-body text-sm hidden sm:inline",
                    isActive ? "text-lyp-black font-semibold" : "text-gray-500",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            Select Client
          </h2>
          {!showNewClient ? (
            <>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedVenueId("");
                  setCreatedVenues([]);
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
              >
                <option value="">Choose a client...</option>
                {allClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewClient(true)}
                className="text-lyp-cherry font-body text-sm hover:underline"
              >
                + Create New Client
              </button>
            </>
          ) : (
            <div className="border border-gray-200 rounded-md p-4 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-lyp-black">
                New Client
              </h3>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  Entity Name
                </label>
                <input
                  type="text"
                  value={newClientEntity}
                  onChange={(e) => setNewClientEntity(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                  placeholder="Entity name"
                />
              </div>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  ABN
                </label>
                <input
                  type="text"
                  value={newClientAbn}
                  onChange={(e) => setNewClientAbn(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                  placeholder="ABN"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={loading}
                  className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Client"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewClient(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Venue */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            Select Venue
          </h2>
          <p className="font-body text-sm text-gray-500">
            Client: {selectedClient?.name}
          </p>
          {!showNewVenue ? (
            <>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
              >
                <option value="">Choose a venue...</option>
                {allVenues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewVenue(true)}
                className="text-lyp-cherry font-body text-sm hover:underline"
              >
                + Create New Venue
              </button>
            </>
          ) : (
            <div className="border border-gray-200 rounded-md p-4 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-lyp-black">
                New Venue
              </h3>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                  placeholder="Venue name"
                />
              </div>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newVenueAddress}
                  onChange={(e) => setNewVenueAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block font-body text-sm text-gray-700 mb-1">
                  State *
                </label>
                <select
                  value={newVenueStateId}
                  onChange={(e) => setNewVenueStateId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent"
                >
                  <option value="">Choose a state...</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name} ({state.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateVenue}
                  disabled={loading}
                  className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Venue"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewVenue(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Notes */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            Internal Notes
          </h2>
          <p className="font-body text-sm text-gray-500">
            Add any internal notes for this proposal (optional).
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent resize-vertical"
            placeholder="Internal notes..."
          />
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            {reviewTitle}
          </h2>
          <div className="border border-gray-200 rounded-md p-4 space-y-3">
            <div>
              <span className="font-body text-sm text-gray-500">Client</span>
              <p className="font-body text-sm text-lyp-black font-medium">
                {selectedClient?.name}
              </p>
            </div>
            <div>
              <span className="font-body text-sm text-gray-500">Venue</span>
              <p className="font-body text-sm text-lyp-black font-medium">
                {selectedVenue?.name}
              </p>
            </div>
            {notes.trim() && (
              <div>
                <span className="font-body text-sm text-gray-500">Notes</span>
                <p className="font-body text-sm text-gray-700 whitespace-pre-wrap">
                  {notes.length > 200 ? notes.slice(0, 200) + "..." : notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className={cn(
            "border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors",
            step === 1 && "invisible",
          )}
        >
          Back
        </button>

        <div className="flex gap-2">
          {/* {step === 4 && selectedClientId && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
          )} */}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-lyp-cherry text-white px-6 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

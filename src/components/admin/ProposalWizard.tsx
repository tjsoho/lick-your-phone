"use client";

import { cn } from "@/lib/utils";
import { createClient, createVenue } from "@/server-actions/clients";
import {
  createProposal,
  supersedeProposal,
  updateProposal,
} from "@/server-actions/proposals";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type Venue = {
  id: string;
  name: string;
  address?: string | null;
  state_id?: string | null;
};

type Client = {
  id: string;
  name: string;
  entity_name?: string;
  abn?: string;
  venues: Venue[];
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

const steps = ["Client", "Location", "Notes", "Review"];

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3 font-body text-[14px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] hover:border-[#E2D2D2] focus:border-lyp-cherry/40 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`;

const selectClasses = `${fieldClasses} appearance-none pr-11`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const primaryPill = `group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`;

const secondaryPill = `group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-5 pr-5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`;

const pillIcon = `flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`;

/** Native selects need their own chevron once appearance is stripped. */
function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        strokeWidth={1.5}
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89898]"
      />
    </div>
  );
}

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

  // Location state
  const [selectedVenueId, setSelectedVenueId] = useState(
    initialData?.venueId ?? "",
  );
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueStateId, setNewVenueStateId] = useState("");
  const [createdVenues, setCreatedVenues] = useState<Venue[]>([]);

  // Notes
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const allClients = [...clients, ...createdClients];
  const selectedClient = allClients.find((c) => c.id === selectedClientId);
  const allVenues = [...(selectedClient?.venues ?? []), ...createdVenues];
  const selectedVenue = allVenues.find((v) => v.id === selectedVenueId);
  const selectedVenueState = states.find(
    (s) => s.id === selectedVenue?.state_id,
  );

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
      setStep(2);
    }
  }

  async function handleCreateVenue() {
    if (!newVenueName.trim()) {
      toast.error("Location name is required");
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
      setCreatedVenues((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          address: data.address,
          state_id: data.state_id,
        },
      ]);
      setSelectedVenueId(data.id);
      setNewVenueName("");
      setNewVenueAddress("");
      setNewVenueStateId("");
      toast.success("Location created");
      setStep(3);
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
    ? "Saving"
    : mode === "edit"
      ? "Save Changes"
      : mode === "supersede"
        ? "Create & Supersede"
        : "Create Proposal";

  return (
    <div className="animate-rise overflow-hidden rounded-3xl border border-[#EFE6E6] bg-lyp-white">
      {/* ─────────────── Step rail ─────────────── */}
      <div className="flex items-center justify-center gap-1.5 border-b border-[#F1E8E8] bg-[#FCFAFA] px-6 py-5 sm:gap-3">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full font-body text-[11px] font-semibold transition-all duration-500",
                    EASE,
                    isActive &&
                      "bg-lyp-cherry text-lyp-white shadow-[0_6px_16px_-6px_rgba(178,38,38,0.6)]",
                    isCompleted && "bg-lyp-cherry/10 text-lyp-cherry",
                    !isActive && !isCompleted && "bg-[#F3ECEC] text-[#A89898]",
                  )}
                >
                  {isCompleted ? (
                    <Check strokeWidth={2} className="h-3.5 w-3.5" />
                  ) : (
                    stepNum
                  )}
                </span>
                <span
                  className={cn(
                    "hidden font-body text-[11px] uppercase tracking-[0.18em] transition-colors duration-500 sm:inline",
                    EASE,
                    isActive
                      ? "font-semibold text-lyp-black"
                      : isCompleted
                        ? "text-lyp-cherry/70"
                        : "text-[#A89898]",
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "h-px w-4 transition-colors duration-500 sm:w-8",
                    EASE,
                    isCompleted ? "bg-lyp-cherry/25" : "bg-[#EFE6E6]",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="px-6 py-8 sm:px-8">
        {/* ─────────────── Step 1: Client ─────────────── */}
        {step === 1 && (
          <div>
            <h2 className="font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black">
              Select Client
            </h2>
            <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
              Choose who this proposal is for, or add a new client.
            </p>

            {!showNewClient ? (
              <div className="mt-7 space-y-4">
                <div>
                  <label htmlFor="client" className={labelClasses}>
                    Client
                  </label>
                  <SelectShell>
                    <select
                      id="client"
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        setSelectedVenueId("");
                        setCreatedVenues([]);
                      }}
                      className={selectClasses}
                    >
                      <option value="">Choose a client…</option>
                      {allClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </SelectShell>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className={`group inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lyp-cherry/[0.08]">
                    <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </span>
                  Create new client
                </button>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-5 sm:p-6">
                <h3 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
                  New Client
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="c-name" className={labelClasses}>
                      Name *
                    </label>
                    <input
                      id="c-name"
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className={fieldClasses}
                      placeholder="Client name"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="c-email" className={labelClasses}>
                      Email *
                    </label>
                    <input
                      id="c-email"
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className={fieldClasses}
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-entity" className={labelClasses}>
                      Entity Name
                    </label>
                    <input
                      id="c-entity"
                      type="text"
                      value={newClientEntity}
                      onChange={(e) => setNewClientEntity(e.target.value)}
                      className={fieldClasses}
                      placeholder="Entity name"
                    />
                  </div>
                  <div>
                    <label htmlFor="c-abn" className={labelClasses}>
                      ABN
                    </label>
                    <input
                      id="c-abn"
                      type="text"
                      value={newClientAbn}
                      onChange={(e) => setNewClientAbn(e.target.value)}
                      className={fieldClasses}
                      placeholder="ABN"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={loading}
                    className={primaryPill}
                  >
                    {loading ? "Creating" : "Create Client"}
                    <span className={pillIcon}>
                      {loading ? (
                        <Loader2
                          strokeWidth={1.5}
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClient(false)}
                    className={secondaryPill}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────── Step 2: Location ─────────────── */}
        {step === 2 && (
          <div>
            <h2 className="font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black">
              Location
            </h2>
            <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
              Where the work happens, for{" "}
              <span className="font-semibold text-lyp-black">
                {selectedClient?.name}
              </span>
              .
            </p>

            {/* Saved locations, when this client already has some */}
            {allVenues.length > 0 && (
              <div className="mt-7">
                <p className={labelClasses}>Saved locations</p>
                <div className="flex flex-wrap gap-2">
                  {allVenues.map((venue) => {
                    const isSelected = selectedVenueId === venue.id;
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() =>
                          setSelectedVenueId(isSelected ? "" : venue.id)
                        }
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-[13px] transition-all duration-500",
                          EASE,
                          isSelected
                            ? "border-lyp-cherry/30 bg-lyp-cherry/[0.06] font-semibold text-lyp-cherry"
                            : "border-[#EFE6E6] bg-lyp-white text-[#8A7A7A] hover:border-lyp-cherry/25 hover:text-lyp-black",
                        )}
                      >
                        <MapPin strokeWidth={1.25} className="h-3.5 w-3.5" />
                        {venue.name}
                        {isSelected && (
                          <Check strokeWidth={2} className="h-3.5 w-3.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-7 flex items-center gap-4">
                  <span className="h-px flex-1 bg-[#F1E8E8]" />
                  <span className="font-body text-[10px] uppercase tracking-[0.22em] text-[#C3B5B5]">
                    Or add a new one
                  </span>
                  <span className="h-px flex-1 bg-[#F1E8E8]" />
                </div>
              </div>
            )}

            {/* The form is always available */}
            <div className="mt-7 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-5 sm:p-6">
              <h3 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
                New Location
              </h3>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="v-name" className={labelClasses}>
                    Location Name *
                  </label>
                  <input
                    id="v-name"
                    type="text"
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    className={fieldClasses}
                    placeholder="e.g. Riverside Ballroom"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="v-address" className={labelClasses}>
                    Address
                  </label>
                  <input
                    id="v-address"
                    type="text"
                    value={newVenueAddress}
                    onChange={(e) => setNewVenueAddress(e.target.value)}
                    className={fieldClasses}
                    placeholder="Street address"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="v-state" className={labelClasses}>
                    State *
                  </label>
                  <SelectShell>
                    <select
                      id="v-state"
                      value={newVenueStateId}
                      onChange={(e) => setNewVenueStateId(e.target.value)}
                      className={selectClasses}
                    >
                      <option value="">Choose a state…</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name} ({state.abbreviation})
                        </option>
                      ))}
                    </select>
                  </SelectShell>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreateVenue}
                  disabled={loading}
                  className={primaryPill}
                >
                  {loading ? "Creating" : "Create Location"}
                  <span className={pillIcon}>
                    {loading ? (
                      <Loader2
                        strokeWidth={1.5}
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── Step 3: Notes ─────────────── */}
        {step === 3 && (
          <div>
            <h2 className="font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black">
              Internal Notes
            </h2>
            <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
              Only your team sees these. Optional.
            </p>
            <div className="mt-7">
              <label htmlFor="notes" className={labelClasses}>
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className={`${fieldClasses} resize-y leading-relaxed`}
                placeholder="Anything the team should know about this proposal…"
              />
            </div>
          </div>
        )}

        {/* ─────────────── Step 4: Review ─────────────── */}
        {step === 4 && (
          <div>
            <h2 className="font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black">
              {reviewTitle}
            </h2>
            <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
              Check the details before you commit.
            </p>

            <dl className="mt-7 overflow-hidden rounded-2xl border border-[#EFE6E6]">
              <div className="flex items-start gap-4 border-b border-[#F1E8E8] px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#A89898]">
                  Client
                </dt>
                <dd className="font-body text-[14px] font-medium text-lyp-black">
                  {selectedClient?.name ?? "—"}
                </dd>
              </div>
              <div className="flex items-start gap-4 px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#A89898]">
                  Location
                </dt>
                <dd>
                  <p className="font-body text-[14px] font-medium text-lyp-black">
                    {selectedVenue?.name ?? "—"}
                  </p>
                  {(selectedVenue?.address || selectedVenueState) && (
                    <p className="mt-1 font-body text-[13px] leading-relaxed text-[#8A7A7A]">
                      {[selectedVenue?.address, selectedVenueState?.name]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </dd>
              </div>
              {notes.trim() && (
                <div className="flex items-start gap-4 border-t border-[#F1E8E8] px-5 py-4">
                  <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#A89898]">
                    Notes
                  </dt>
                  <dd className="whitespace-pre-wrap font-body text-[13px] leading-relaxed text-[#8A7A7A]">
                    {notes.length > 200 ? `${notes.slice(0, 200)}…` : notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* ─────────────── Navigation ─────────────── */}
      <div className="flex items-center justify-between gap-4 border-t border-[#F1E8E8] bg-[#FCFAFA] px-6 py-5 sm:px-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className={cn(
            `group inline-flex items-center gap-2.5 rounded-full border border-[#EFE6E6] bg-lyp-white py-2 pl-3.5 pr-5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`,
            step === 1 && "pointer-events-none opacity-0",
          )}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          >
            <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" />
          </span>
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className={primaryPill}
          >
            Next
            <span className={pillIcon}>
              <ArrowRight strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={primaryPill}
          >
            {submitLabel}
            <span className={pillIcon}>
              {loading ? (
                <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
              ) : (
                <Check strokeWidth={1.5} className="h-4 w-4" />
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

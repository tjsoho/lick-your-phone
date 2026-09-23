"use client";

import { cn } from "@/lib/utils";
import { createClientWithVenue, createVenue } from "@/server-actions/clients";
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
};

type Client = {
  id: string;
  /** The person. Their venues hang off them. */
  name: string;
  email?: string | null;
  venues: Venue[];
};

export type ProposalInitialData = {
  clientId: string;
  venueId: string;
};

type Props = {
  clients: Client[];
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

/**
 * Creating a client or venue revalidates the page, so the server props catch
 * up while the locally added copy is still held. Keep the first of each id.
 */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const steps = ["Details", "Review"];

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3 font-body text-[14px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] hover:border-[#E2D2D2] focus:border-lyp-cherry/40 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`;

const selectClasses = `${fieldClasses} appearance-none pr-11`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const hintClasses = "mt-1.5 font-body text-[11px] text-[#A89898]";

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
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newVenueName, setNewVenueName] = useState("");
  const [createdClients, setCreatedClients] = useState<Client[]>([]);

  // Venue state, for clients that already exist
  const [selectedVenueId, setSelectedVenueId] = useState(
    initialData?.venueId ?? "",
  );
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [extraVenueName, setExtraVenueName] = useState("");
  const [createdVenues, setCreatedVenues] = useState<Venue[]>([]);

  const allClients = dedupeById([...clients, ...createdClients]);
  const selectedClient = allClients.find((c) => c.id === selectedClientId);
  const allVenues = dedupeById([
    ...(selectedClient?.venues ?? []),
    ...createdVenues,
  ]);
  const selectedVenue = allVenues.find((v) => v.id === selectedVenueId);

  /** Picking a client resets the venue, unless that client has exactly one. */
  function handleSelectClient(clientId: string) {
    setSelectedClientId(clientId);
    setCreatedVenues([]);
    setShowNewVenue(false);
    const venues = allClients.find((c) => c.id === clientId)?.venues ?? [];
    setSelectedVenueId(venues.length === 1 ? venues[0].id : "");
  }

  /** The person is the record; their first venue is created underneath. */
  async function handleCreateClient() {
    if (!newClientName.trim()) {
      toast.error("Client full name is required");
      return;
    }
    if (!newClientEmail.trim()) {
      toast.error("Client email is required");
      return;
    }
    if (!newVenueName.trim()) {
      toast.error("Venue name is required");
      return;
    }
    setLoading(true);
    const { data, error } = await createClientWithVenue({
      name: newClientName.trim(),
      email: newClientEmail.trim(),
      venue_name: newVenueName.trim(),
      // Slugs live in URLs; the server makes this unique before inserting.
      slug: slugify(newClientName),
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      const venue: Venue = { id: data.venue.id, name: data.venue.name };
      const newClient: Client = {
        id: data.client.id,
        name: data.client.name,
        email: data.client.email,
        venues: [venue],
      };
      setCreatedClients((prev) => [...prev, newClient]);
      setSelectedClientId(data.client.id);
      setSelectedVenueId(venue.id);
      setShowNewClient(false);
      setNewClientName("");
      setNewClientEmail("");
      setNewVenueName("");
      toast.success("Client added");
      setStep(2);
    }
  }

  async function handleCreateVenue() {
    if (!extraVenueName.trim()) {
      toast.error("Venue name is required");
      return;
    }
    setLoading(true);
    const { data, error } = await createVenue({
      client_id: selectedClientId,
      name: extraVenueName.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setCreatedVenues((prev) => [...prev, { id: data.id, name: data.name }]);
      setSelectedVenueId(data.id);
      setExtraVenueName("");
      setShowNewVenue(false);
      toast.success("Venue added");
    }
  }

  async function handleSubmit() {
    setLoading(true);
    const payload = {
      client_id: selectedClientId,
      venue_id: selectedVenueId,
    };

    let result: { data?: { id: string } | null; error: string | null };

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

    // Land on the proposal itself, where the presentation gets tailored,
    // rather than back on the list.
    const landingId = mode === "edit" ? proposalId : result.data?.id;
    router.push(
      landingId ? `/admin/proposals/${landingId}` : "/admin/proposals",
    );
  }

  const canProceed = !!selectedClientId && !!selectedVenueId;

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
        {/* ─────────────── Step 1: Details ─────────────── */}
        {step === 1 && (
          <div>
            <h2 className="font-heading text-[20px] font-bold tracking-[-0.02em] text-lyp-black">
              Client
            </h2>
            <p className="mt-2 font-body text-[13px] text-[#8A7A7A]">
              Start with the person. Choose an existing client, or add a new
              one, then say which of their venues this proposal is for.
            </p>

            {!showNewClient ? (
              <div className="mt-7 space-y-5">
                <div>
                  <label htmlFor="client" className={labelClasses}>
                    Client
                  </label>
                  <SelectShell>
                    <select
                      id="client"
                      value={selectedClientId}
                      onChange={(e) => handleSelectClient(e.target.value)}
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
                  {selectedClient?.email && (
                    <p className={hintClasses}>{selectedClient.email}</p>
                  )}
                </div>

                {/* Their venues, listed so a client with several reads clearly */}
                {selectedClient && allVenues.length > 0 && (
                  <div>
                    <p className={labelClasses}>Venue</p>
                    <div className="flex flex-wrap gap-2">
                      {allVenues.map((venue) => {
                        const isSelected = selectedVenueId === venue.id;
                        return (
                          <button
                            key={venue.id}
                            type="button"
                            onClick={() => setSelectedVenueId(venue.id)}
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
                  </div>
                )}

                {/* Adding another venue under a client we already have */}
                {selectedClient &&
                  (showNewVenue ? (
                    <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-5">
                      <label htmlFor="extra-venue" className={labelClasses}>
                        Venue Name
                      </label>
                      <input
                        id="extra-venue"
                        type="text"
                        value={extraVenueName}
                        onChange={(e) => setExtraVenueName(e.target.value)}
                        className={fieldClasses}
                        placeholder="e.g. Riverside Ballroom"
                      />
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCreateVenue}
                          disabled={loading}
                          className={primaryPill}
                        >
                          {loading ? "Adding" : "Add Venue"}
                          <span className={pillIcon}>
                            {loading ? (
                              <Loader2
                                strokeWidth={1.5}
                                className="h-4 w-4 animate-spin"
                              />
                            ) : (
                              <Check strokeWidth={1.5} className="h-4 w-4" />
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewVenue(false)}
                          className={secondaryPill}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNewVenue(true)}
                      className={`group inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lyp-cherry/[0.08]">
                        <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                      </span>
                      {allVenues.length > 0
                        ? "Add another venue for this client"
                        : "Add a venue for this client"}
                    </button>
                  ))}

                <div className="flex items-center gap-4 pt-1">
                  <span className="h-px flex-1 bg-[#F1E8E8]" />
                  <span className="font-body text-[10px] uppercase tracking-[0.22em] text-[#C3B5B5]">
                    Or
                  </span>
                  <span className="h-px flex-1 bg-[#F1E8E8]" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className={`group inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lyp-cherry/[0.08]">
                    <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </span>
                  New client
                </button>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-5 sm:p-6">
                <h3 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
                  New Client
                </h3>
                <p className="mt-1.5 font-body text-[12px] text-[#A89898]">
                  The client is the person. Their first venue is added
                  underneath — more can follow later.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="c-name" className={labelClasses}>
                      Client Full Name *
                    </label>
                    <input
                      id="c-name"
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className={fieldClasses}
                      placeholder="e.g. Sarah Nguyen"
                    />
                    <p className={hintClasses}>
                      The person who will sign, not the venue.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="c-email" className={labelClasses}>
                      Client Email *
                    </label>
                    <input
                      id="c-email"
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className={fieldClasses}
                      placeholder="sarah@example.com"
                    />
                    <p className={hintClasses}>
                      Their personal work address — not a shared inbox like
                      info@.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="c-venue" className={labelClasses}>
                      Venue Name *
                    </label>
                    <input
                      id="c-venue"
                      type="text"
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value)}
                      className={fieldClasses}
                      placeholder="e.g. Riverside Ballroom"
                    />
                    <p className={hintClasses}>
                      Their first venue. You can add more from the client
                      record.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={loading}
                    className={primaryPill}
                  >
                    {loading ? "Adding" : "Add Client"}
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

        {/* ─────────────── Step 2: Review ─────────────── */}
        {step === 2 && (
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
                  {selectedClient?.name || "—"}
                </dd>
              </div>
              <div className="flex items-start gap-4 border-b border-[#F1E8E8] px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#A89898]">
                  Email
                </dt>
                <dd className="font-body text-[14px] font-medium text-lyp-black">
                  {selectedClient?.email || "—"}
                </dd>
              </div>
              <div className="flex items-start gap-4 px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#A89898]">
                  Venue
                </dt>
                <dd className="font-body text-[14px] font-medium text-lyp-black">
                  {selectedVenue?.name ?? "—"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 font-body text-[12px] leading-relaxed text-[#A89898]">
              Internal notes are added after the client signs, in the
              post-signature review.
            </p>
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

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed}
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

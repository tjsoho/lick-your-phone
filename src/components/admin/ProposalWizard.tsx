"use client";

import { cn } from "@/lib/utils";
import {
  createClientWithVenue,
  createVenue,
  updateClient,
  updateVenue,
} from "@/server-actions/clients";
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
import ClientLogoField from "./ClientLogoField";
import VenueLogoField from "./venues/VenueLogoField";

type Venue = {
  id: string;
  name: string;
  /** This venue's own logo, which its proposal covers prefer over the client's. */
  logo_url?: string | null;
};

type Client = {
  id: string;
  /** The person. Their venues hang off them. */
  name: string;
  email?: string | null;
  /** Their own logo, used on covers where the venue has none of its own. */
  logo_url?: string | null;
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

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3 font-body text-[14px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#9C8C8C] hover:border-[#E2D2D2] focus:border-lyp-cherry/40 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)] disabled:opacity-50`;

const selectClasses = `${fieldClasses} appearance-none pr-11`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]";

const hintClasses = "mt-1.5 font-body text-[11px] text-[#867474]";

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
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#867474]"
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
  // Optional — the cover falls back to the LickYourPhone mark without it, and
  // it can be added from the client record later.
  const [newClientLogo, setNewClientLogo] = useState("");
  const [createdClients, setCreatedClients] = useState<Client[]>([]);

  // Venue state, for clients that already exist
  const [selectedVenueId, setSelectedVenueId] = useState(
    initialData?.venueId ?? "",
  );
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [extraVenueName, setExtraVenueName] = useState("");
  const [extraVenueLogo, setExtraVenueLogo] = useState("");
  const [createdVenues, setCreatedVenues] = useState<Venue[]>([]);
  /**
   * Logos edited here, by venue id. The server props are a snapshot from the
   * page load, so a logo swapped on this screen has to be remembered locally
   * or the field would snap back to the old one the moment it re-renders.
   */
  const [venueLogoEdits, setVenueLogoEdits] = useState<
    Record<string, string | null>
  >({});
  const [venueLogoSaving, setVenueLogoSaving] = useState(false);
  /** The same, for the client's own logo. Same reason: props are a snapshot. */
  const [clientLogoEdits, setClientLogoEdits] = useState<
    Record<string, string | null>
  >({});
  const [clientLogoSaving, setClientLogoSaving] = useState(false);

  const allClients = dedupeById([...clients, ...createdClients]);
  const selectedClient = allClients.find((c) => c.id === selectedClientId);
  const allVenues = dedupeById([
    ...(selectedClient?.venues ?? []),
    ...createdVenues,
  ]);
  const selectedVenue = allVenues.find((v) => v.id === selectedVenueId);
  /** What the field shows: this screen's edit if there is one, else the venue's. */
  const selectedVenueLogo =
    (selectedVenueId in venueLogoEdits
      ? venueLogoEdits[selectedVenueId]
      : selectedVenue?.logo_url) ?? "";

  /** What the field shows for the chosen client: this screen's edit, else theirs. */
  const selectedClientLogo =
    (selectedClientId in clientLogoEdits
      ? clientLogoEdits[selectedClientId]
      : selectedClient?.logo_url) ?? "";

  /** And the client's own, saved to the client the moment it changes. */
  async function handleClientLogoChange(next: string) {
    if (!selectedClientId) return;
    setClientLogoEdits((prev) => ({ ...prev, [selectedClientId]: next }));
    setClientLogoSaving(true);
    // null, not "": clearing it falls the cover back to the LickYourPhone mark.
    const { error } = await updateClient(selectedClientId, {
      logo_url: next.trim() || null,
    });
    setClientLogoSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(next.trim() ? "Client logo saved" : "Client logo removed");
  }

  /** A logo picked for an existing venue is saved to that venue there and then. */
  async function handleVenueLogoChange(next: string) {
    if (!selectedVenueId) return;
    setVenueLogoEdits((prev) => ({ ...prev, [selectedVenueId]: next }));
    setVenueLogoSaving(true);
    // null, not "": clearing it has to fall the cover back to the client's logo.
    const { error } = await updateVenue(selectedVenueId, {
      logo_url: next.trim() || null,
    });
    setVenueLogoSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(next.trim() ? "Venue logo saved" : "Venue logo removed");
  }

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
      logo_url: newClientLogo.trim() || null,
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
      setNewClientLogo("");
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
      logo_url: extraVenueLogo.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setCreatedVenues((prev) => [
        ...prev,
        { id: data.id, name: data.name, logo_url: data.logo_url ?? null },
      ]);
      setSelectedVenueId(data.id);
      setExtraVenueName("");
      setExtraVenueLogo("");
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
          ? "New version created"
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

  /** An inline "new client" or "new venue" form is on screen, with its own
   *  button to finish it. The wizard's own bar stands down while it is. */
  const inlineFormOpen = step === 1 && (showNewClient || showNewVenue);

  const reviewTitle =
    mode === "edit"
      ? "Review & Save"
      : mode === "supersede"
        ? "Review & create new version"
        : "Review & Create";

  const submitLabel = loading
    ? "Saving"
    : mode === "edit"
      ? "Save Changes"
      : mode === "supersede"
        ? "Create new version"
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
                    !isActive && !isCompleted && "bg-[#F3ECEC] text-[#867474]",
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
                        : "text-[#867474]",
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

                {/* THE CHOSEN CLIENT'S OWN LOGO.
                    "In the choose client or add new client can we see their
                     logo?" — the new-client form has always had one; picking
                     an existing client showed nothing. Same behaviour as the
                     venue field below it: what they have, or an empty box,
                     and a change saves straight to the client. */}
                {selectedClient && (
                  <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-5">
                    <ClientLogoField
                      value={selectedClientLogo}
                      onChange={handleClientLogoChange}
                      idPrefix="wizard-client-logo"
                    />
                    {clientLogoSaving && <p className={hintClasses}>Saving…</p>}
                  </div>
                )}

                {/* Their venues, listed so a client with several reads clearly */}
                {selectedClient && allVenues.length > 0 && (
                  <div>
                    <p className={labelClasses}>Venue</p>
                    <div className="flex flex-wrap gap-2">
                      {allVenues.map((venue) => {
                        const isSelected = selectedVenueId === venue.id;
                        return (
                          <button
                            title={isSelected ? `${venue.name} is the chosen venue` : `Use ${venue.name} for this proposal`}
                            key={venue.id}
                            type="button"
                            onClick={() => setSelectedVenueId(venue.id)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-body text-[13px] transition-all duration-500",
                              EASE,
                              isSelected
                                ? "border-lyp-cherry/30 bg-lyp-cherry/[0.06] font-semibold text-lyp-cherry"
                                : "border-[#EFE6E6] bg-lyp-white text-[#6B5A5A] hover:border-lyp-cherry/25 hover:text-lyp-black",
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

                {/* THE CHOSEN VENUE'S OWN LOGO.
                    "The client logo is still not showing when choosing an old
                     venue … because the old venue has it, it should show
                     there, so that we can update it, for example, the client
                     changes their logo — or showing empty, in this case that
                     we don't have the logo yet."
                    So it appears the moment a venue is picked, carrying what
                    that venue already has, and saves straight to the venue. */}
                {selectedVenue && !showNewVenue && (
                  <div className="rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] p-5">
                    <VenueLogoField
                      value={selectedVenueLogo}
                      onChange={handleVenueLogoChange}
                      idPrefix="wizard-venue-logo"
                    />
                    {venueLogoSaving && (
                      <p className={hintClasses}>Saving…</p>
                    )}
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
                      {/* "It should also show when creating a new venue for
                          an existing client." */}
                      <div className="mt-5 border-t border-[#F1E8E8] pt-5">
                        <VenueLogoField
                          value={extraVenueLogo}
                          onChange={setExtraVenueLogo}
                          idPrefix="wizard-new-venue-logo"
                        />
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                          title={loading ? "Adding this venue" : "Add this venue to the client"}
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
                          title="Discard this new venue"
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
                      title={allVenues.length > 0 ? "Add another venue for this client" : "Add a venue for this client"}
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
                  <span className="font-body text-[10px] uppercase tracking-[0.22em] text-[#9C8C8C]">
                    Or
                  </span>
                  <span className="h-px flex-1 bg-[#F1E8E8]" />
                </div>

                <button
                  title="Create a new client and their first venue"
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
                <p className="mt-1.5 font-body text-[12px] text-[#867474]">
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
                  {/* Optional, and deliberately last: the three fields above
                      are what the record cannot be made without. The logo
                      carries through to the cover of every proposal written
                      for this client, and can be added later instead. */}
                  <ClientLogoField
                    value={newClientLogo}
                    onChange={setNewClientLogo}
                    idPrefix="c-logo"
                  />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    title={loading ? "Adding this client" : "Add this client and their first venue"}
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
                    title="Discard this new client"
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

            <dl className="mt-7 overflow-hidden rounded-2xl border border-[#EFE6E6]">
              <div className="flex items-start gap-4 border-b border-[#F1E8E8] px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#867474]">
                  Client
                </dt>
                <dd className="font-body text-[14px] font-medium text-lyp-black">
                  {selectedClient?.name || "—"}
                </dd>
              </div>
              <div className="flex items-start gap-4 border-b border-[#F1E8E8] px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#867474]">
                  Email
                </dt>
                <dd className="font-body text-[14px] font-medium text-lyp-black">
                  {selectedClient?.email || "—"}
                </dd>
              </div>
              <div className="flex items-start gap-4 px-5 py-4">
                <dt className="w-24 flex-shrink-0 font-body text-[10px] uppercase tracking-[0.22em] text-[#867474]">
                  Venue
                </dt>
                <dd className="font-body text-[14px] font-medium text-lyp-black">
                  {selectedVenue?.name ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* ─────────────── Navigation ─────────────── */}
      {/* ONE BUTTON AT A TIME.

          The inline forms carry their own action — "Add Client", "Add Venue" —
          and the bar below was offering a "Next" beside it: "why do we still
          have double up buttons … we don't need both." Adding the client is
          the step forward, and it selects what it just made, so the bar comes
          back by itself with the client in place. */}
      {!inlineFormOpen && (
      <div className="flex items-center justify-between gap-4 border-t border-[#F1E8E8] bg-[#FCFAFA] px-6 py-5 sm:px-8">
        <button
          title="Go back to the previous step"
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
            title="Go on to review this proposal"
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
            title={mode === "edit" ? "Save changes to this proposal" : mode === "supersede" ? "Create a new version of this proposal" : "Create this proposal"}
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
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  updateClient,
  createVenue,
  createContact,
} from "@/server-actions/clients";
import { formatCents, formatDate } from "@/lib/format";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  AlertCircle,
  CreditCard,
  FileText,
  Download,
  ClipboardList,
  MapPin,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import ProposalInternalNotes from "@/components/admin/ProposalInternalNotes";
import PortalLinkCell from "@/components/admin/PortalLinkCell";

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const selectClasses = `${fieldClasses} appearance-none pr-11`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const thClasses =
  "whitespace-nowrap px-5 py-3 text-left font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

const primaryPill = `group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`;

const secondaryPill = `group inline-flex items-center gap-3 rounded-full border border-[#EFE6E6] bg-lyp-white py-1.5 pl-5 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`;

const plainPill = `inline-flex items-center rounded-full border border-[#EFE6E6] bg-lyp-white px-5 py-2.5 font-body text-[13px] font-semibold tracking-wide text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`;

const pillIcon = `flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`;

const pillIconMuted = `flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F1F1] transition-transform duration-500 ${EASE} group-hover:scale-105`;

const sectionHeading =
  "font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black";

const groupHeading =
  "mb-2.5 flex items-center gap-1.5 font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]";

/** Muted, tonal pills — saturated Tailwind defaults read cheap next to the brand. */
const statusStyles: Record<string, string> = {
  draft: "bg-[#F2EDED] text-[#8A7A7A]",
  sent: "bg-[#EDF1F7] text-[#5B7394]",
  intake_complete: "bg-[#FBF3E3] text-[#9A7B2E]",
  signed: "bg-[#E9F2EC] text-[#4A7A5C]",
  superseded: "bg-lyp-cherry/[0.07] text-lyp-cherry",
};

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

type State = { id: string; code: string; name: string };

type Venue = {
  id: string;
  name: string;
  address?: string;
  state_id: string;
  states?: State;
};

type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role?: string;
  is_primary?: boolean;
};

type LineItem = {
  id: string;
  price_snapshot_cents: number;
  billing: string;
  term?: string;
  services: { name: string; slug: string };
};

type Document = {
  id: string;
  type: string;
  file_url?: string;
  created_at: string;
};

type Payment = {
  id: string;
  status: string;
  card_last_four?: string;
  card_brand?: string;
  details_captured_at?: string;
};

type Proposal = {
  id: string;
  status: string;
  token: string;
  created_at: string;
  signed_at?: string;
  total_snapshot_cents?: number;
  proposal_line_items?: LineItem[];
  documents?: Document[];
  payments?: Payment[];
  intake_responses?: { id: string }[];
  internal_notes?: {
    id: string;
    content: string;
    created_at: string;
  }[];
};

type Client = {
  id: string;
  name: string;
  slug: string;
  abn?: string;
  entity_name?: string;
  created_at: string;
  venues: Venue[];
  contacts: Contact[];
  proposals: Proposal[];
};

type Props = {
  client: Client;
  states: State[];
  /** Absolute base URL, resolved server-side, for building portal links. */
  appUrl: string;
};

function ClientInfoCard({
  client,
  onUpdated,
}: {
  client: Client;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: client.name,
      entity_name: client.entity_name ?? "",
      abn: client.abn ?? "",
      slug: client.slug,
    },
  });

  async function onSubmit(values: {
    name: string;
    entity_name: string;
    abn: string;
    slug: string;
  }) {
    const { error } = await updateClient(client.id, {
      name: values.name,
      entity_name: values.entity_name || undefined,
      abn: values.abn || undefined,
      slug: values.slug,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Client updated");
    setEditing(false);
    onUpdated();
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6 sm:p-7"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="client-info-name" className={labelClasses}>
              Name
            </label>
            <input
              id="client-info-name"
              {...register("name", { required: true })}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="client-info-slug" className={labelClasses}>
              Slug
            </label>
            <input
              id="client-info-slug"
              {...register("slug")}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="client-info-entity" className={labelClasses}>
              Entity Name
            </label>
            <input
              id="client-info-entity"
              {...register("entity_name")}
              className={fieldClasses}
            />
          </div>
          <div>
            <label htmlFor="client-info-abn" className={labelClasses}>
              ABN
            </label>
            <input
              id="client-info-abn"
              {...register("abn")}
              className={`${fieldClasses} tabular-nums`}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-[#F1E8E8] pt-6">
          <button type="submit" disabled={isSubmitting} className={primaryPill}>
            {isSubmitting ? "Saving..." : "Save"}
            <span className={pillIcon}>
              <Check strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={plainPill}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.32em] text-lyp-cherry/70">
              Client
            </span>
          </div>
          <h1 className="mt-3 font-heading text-[28px] font-bold leading-[1.05] tracking-[-0.03em] text-lyp-black">
            {client.name}
          </h1>
        </div>
        <button
          onClick={() => setEditing(true)}
          className={secondaryPill}
          aria-label={`Edit ${client.name}`}
        >
          Edit
          <span className={pillIconMuted}>
            <Pencil strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-5 border-t border-[#F1E8E8] pt-6 font-body md:grid-cols-4">
        <div>
          <p className="font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
            Entity
          </p>
          <p className="mt-1.5 text-[13px] text-lyp-black">
            {client.entity_name || "—"}
          </p>
        </div>
        <div>
          <p className="font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
            ABN
          </p>
          <p className="mt-1.5 text-[13px] tabular-nums text-lyp-black">
            {client.abn || "—"}
          </p>
        </div>
        <div>
          <p className="font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
            Slug
          </p>
          <p className="mt-1.5 text-[13px] text-lyp-black">{client.slug}</p>
        </div>
        <div>
          <p className="font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
            Created
          </p>
          <p className="mt-1.5 text-[13px] tabular-nums text-lyp-black">
            {formatDate(client.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

function VenueAddForm({
  clientId,
  states,
  onDone,
}: {
  clientId: string;
  states: State[];
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { name: "", address: "", stateId: "" },
  });

  async function onSubmit(values: {
    name: string;
    address: string;
    stateId: string;
  }) {
    const { error } = await createVenue({
      client_id: clientId,
      name: values.name,
      address: values.address || undefined,
      state_id: values.stateId,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Venue added");
    reset();
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="venue-name" className={labelClasses}>
            Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            id="venue-name"
            placeholder="Venue name"
            {...register("name", { required: true })}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="venue-address" className={labelClasses}>
            Address
          </label>
          <input
            id="venue-address"
            placeholder="Street address"
            {...register("address")}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="venue-state" className={labelClasses}>
            State <span className="text-lyp-cherry">*</span>
          </label>
          <SelectShell>
            <select
              id="venue-state"
              {...register("stateId", { required: true })}
              className={selectClasses}
            >
              <option value="">Select state</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </SelectShell>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={isSubmitting} className={primaryPill}>
          {isSubmitting ? "Adding..." : "Add Venue"}
          <span className={pillIcon}>
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </button>
        <button type="button" onClick={onDone} className={plainPill}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ContactAddForm({
  clientId,
  onDone,
}: {
  clientId: string;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
    },
  });

  async function onSubmit(values: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  }) {
    const { error } = await createContact({
      client_id: clientId,
      first_name: values.firstName,
      last_name: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      role: values.role || undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Contact added");
    reset();
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-3 rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="contact-first-name" className={labelClasses}>
            First Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            id="contact-first-name"
            placeholder="First name"
            {...register("firstName", { required: true })}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="contact-last-name" className={labelClasses}>
            Last Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            id="contact-last-name"
            placeholder="Last name"
            {...register("lastName", { required: true })}
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClasses}>
            Email
          </label>
          <input
            id="contact-email"
            placeholder="name@example.com"
            {...register("email")}
            type="email"
            className={fieldClasses}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelClasses}>
            Phone
          </label>
          <input
            id="contact-phone"
            placeholder="Phone number"
            {...register("phone")}
            className={`${fieldClasses} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="contact-role" className={labelClasses}>
            Role
          </label>
          <input
            id="contact-role"
            placeholder="e.g. Venue Manager"
            {...register("role")}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={isSubmitting} className={primaryPill}>
          {isSubmitting ? "Adding..." : "Add Contact"}
          <span className={pillIcon}>
            <Plus strokeWidth={1.5} className="h-4 w-4" />
          </span>
        </button>
        <button type="button" onClick={onDone} className={plainPill}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Muted tonal payment states — matches the proposals list vocabulary. */
function PaymentLine({ status }: { status: string }) {
  const map: Record<
    string,
    { icon: typeof Check; color: string; label: string }
  > = {
    details_captured: {
      icon: Check,
      color: "text-[#4A7A5C]",
      label: "Details captured",
    },
    settled: { icon: Check, color: "text-[#4A7A5C]", label: "Settled" },
    pending: { icon: Clock, color: "text-[#9A7B2E]", label: "Pending" },
    scheduled: { icon: Clock, color: "text-[#5B7394]", label: "Scheduled" },
    dishonoured: {
      icon: AlertCircle,
      color: "text-lyp-cherry",
      label: "Dishonoured",
    },
    failed: { icon: AlertCircle, color: "text-lyp-cherry", label: "Failed" },
  };

  const entry = map[status];
  if (!entry)
    return <p className="font-body text-[13px] text-[#8A7A7A]">{status}</p>;

  const Icon = entry.icon;
  return (
    <p
      className={`flex items-center gap-1.5 font-body text-[13px] font-medium ${entry.color}`}
    >
      <Icon strokeWidth={1.75} className="h-3.5 w-3.5" />
      {entry.label}
    </p>
  );
}

export default function ClientDetailView({ client, states, appUrl }: Props) {
  const router = useRouter();
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[80rem]">
      {/* Back link */}
      <div className="animate-rise">
        <Link
          href="/admin/clients"
          className={`group inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
        >
          <ArrowLeft
            strokeWidth={1.5}
            className={`h-3.5 w-3.5 transition-transform duration-500 ${EASE} group-hover:-translate-x-0.5`}
          />
          Back to Clients
        </Link>
      </div>

      {/* Client Info */}
      <div className="animate-rise mt-5">
        <ClientInfoCard client={client} onUpdated={refresh} />
      </div>

      {/* Venues */}
      <section
        className="animate-rise mt-8"
        style={{ animationDelay: "80ms" }}
      >
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
          <h2 className={sectionHeading}>Venues</h2>
          {!showVenueForm && (
            <button
              onClick={() => setShowVenueForm(true)}
              className={secondaryPill}
            >
              Add Venue
              <span className={pillIconMuted}>
                <Plus strokeWidth={1.5} className="h-4 w-4" />
              </span>
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1E8E8]">
                  <th className={thClasses}>Name</th>
                  <th className={thClasses}>Address</th>
                  <th className={thClasses}>State</th>
                </tr>
              </thead>
              <tbody>
                {client.venues && client.venues.length > 0 ? (
                  client.venues.map((venue) => (
                    <tr
                      key={venue.id}
                      className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                    >
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-lyp-black">
                        {venue.name}
                      </td>
                      <td className="px-5 py-3 text-[#8A7A7A]">
                        {venue.address || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                        {venue.states?.name || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-8 py-12 text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                        <MapPin
                          strokeWidth={1}
                          className="h-6 w-6 text-lyp-cherry/60"
                        />
                      </span>
                      <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                        No venues yet.
                      </p>
                      {!showVenueForm && (
                        <button
                          onClick={() => setShowVenueForm(true)}
                          className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                        >
                          Add the first venue
                          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showVenueForm && (
          <VenueAddForm
            clientId={client.id}
            states={states}
            onDone={() => {
              setShowVenueForm(false);
              refresh();
            }}
          />
        )}
      </section>

      {/* Contacts */}
      <section
        className="animate-rise mt-8"
        style={{ animationDelay: "140ms" }}
      >
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
          <h2 className={sectionHeading}>Contacts</h2>
          {!showContactForm && (
            <button
              onClick={() => setShowContactForm(true)}
              className={secondaryPill}
            >
              Add Contact
              <span className={pillIconMuted}>
                <Plus strokeWidth={1.5} className="h-4 w-4" />
              </span>
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-[12.5px]">
              <thead>
                <tr className="border-b border-[#F1E8E8]">
                  <th className={thClasses}>First Name</th>
                  <th className={thClasses}>Last Name</th>
                  <th className={thClasses}>Email</th>
                  <th className={thClasses}>Phone</th>
                  <th className={thClasses}>Role</th>
                  <th className={thClasses}>Primary</th>
                </tr>
              </thead>
              <tbody>
                {client.contacts && client.contacts.length > 0 ? (
                  client.contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className={`border-b border-[#F7F1F1] transition-colors duration-500 last:border-0 ${EASE} hover:bg-[#FBF8F8]`}
                    >
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-lyp-black">
                        {contact.first_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-lyp-black">
                        {contact.last_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                        {contact.email || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-[#8A7A7A]">
                        {contact.phone || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                        {contact.role || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[#8A7A7A]">
                        {contact.is_primary ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
                        <Users
                          strokeWidth={1}
                          className="h-6 w-6 text-lyp-cherry/60"
                        />
                      </span>
                      <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
                        No contacts yet.
                      </p>
                      {!showContactForm && (
                        <button
                          onClick={() => setShowContactForm(true)}
                          className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                        >
                          Add the first contact
                          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showContactForm && (
          <ContactAddForm
            clientId={client.id}
            onDone={() => {
              setShowContactForm(false);
              refresh();
            }}
          />
        )}
      </section>

      {/* Proposals */}
      <section
        className="animate-rise mt-8 pb-2"
        style={{ animationDelay: "200ms" }}
      >
        <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
          <h2 className={sectionHeading}>Proposals</h2>
          <Link
            href={`/admin/proposals/new?clientId=${client.id}`}
            className={primaryPill}
          >
            New Proposal
            <span className={pillIcon}>
              <Plus strokeWidth={1.5} className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {client.proposals && client.proposals.length > 0 ? (
          <div className="space-y-4">
            {client.proposals.map((proposal) => {
              const payment = proposal.payments?.[0];
              const contract = proposal.documents?.find(
                (d) => d.type === "contract",
              );
              const hasIntake = (proposal.intake_responses?.length ?? 0) > 0;
              const lineItems = proposal.proposal_line_items ?? [];

              return (
                <div
                  key={proposal.id}
                  className={`overflow-hidden rounded-2xl border border-[#EFE6E6] bg-lyp-white transition-shadow duration-500 ${EASE} hover:shadow-[0_12px_28px_-16px_rgba(61,11,17,0.25)]`}
                >
                  {/* Proposal header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1E8E8] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] ${
                          statusStyles[proposal.status] ??
                          "bg-[#F2EDED] text-[#8A7A7A]"
                        }`}
                      >
                        {String(proposal.status ?? "—").replace(/_/g, " ")}
                      </span>
                      <span className="font-body text-[12.5px] tabular-nums text-[#A89898]">
                        Created {formatDate(proposal.created_at)}
                      </span>
                      {proposal.signed_at && (
                        <span className="font-body text-[12.5px] tabular-nums text-[#4A7A5C]">
                          Signed {formatDate(proposal.signed_at)}
                        </span>
                      )}
                    </div>
                    {proposal.total_snapshot_cents != null && (
                      <span className="font-heading text-[18px] font-bold tracking-[-0.02em] tabular-nums text-lyp-black">
                        {formatCents(proposal.total_snapshot_cents)}
                        <span className="ml-1.5 font-body text-[10px] font-medium uppercase tracking-[0.18em] text-[#C3B5B5]">
                          + GST
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 px-5 py-5 md:grid-cols-2 lg:grid-cols-4">
                    {/* Services held */}
                    <div>
                      <h3 className={groupHeading}>
                        <ClipboardList
                          strokeWidth={1.5}
                          className="h-3.5 w-3.5"
                        />
                        Services
                      </h3>
                      {lineItems.length > 0 ? (
                        <ul className="space-y-1.5">
                          {lineItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-3 font-body text-[13px] text-lyp-black"
                            >
                              <span className="flex items-center gap-1.5">
                                <Check
                                  strokeWidth={1.75}
                                  className="h-3 w-3 shrink-0 text-[#4A7A5C]"
                                />
                                {item.services?.name ?? "—"}
                              </span>
                              <span className="text-[12px] tabular-nums text-[#A89898]">
                                {formatCents(item.price_snapshot_cents)}
                                {item.billing === "recurring_monthly" && "/mo"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="font-body text-[13px] text-[#C3B5B5]">
                          No services selected
                        </p>
                      )}
                    </div>

                    {/* Agreement */}
                    <div>
                      <h3 className={groupHeading}>
                        <FileText strokeWidth={1.5} className="h-3.5 w-3.5" />
                        Agreement
                      </h3>
                      {contract ? (
                        <div className="space-y-1">
                          <a
                            href={contract.file_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
                          >
                            <Download
                              strokeWidth={1.5}
                              className="h-3.5 w-3.5"
                            />
                            Download Contract
                          </a>
                          <p className="font-body text-[11px] tabular-nums text-[#A89898]">
                            Generated {formatDate(contract.created_at)}
                          </p>
                        </div>
                      ) : proposal.status === "signed" ? (
                        <p className="flex items-center gap-1.5 font-body text-[13px] font-medium text-[#9A7B2E]">
                          <Clock strokeWidth={1.75} className="h-3.5 w-3.5" />
                          Generating...
                        </p>
                      ) : (
                        <p className="font-body text-[13px] text-[#C3B5B5]">
                          Awaiting signature
                        </p>
                      )}
                    </div>

                    {/* Payment status */}
                    <div>
                      <h3 className={groupHeading}>
                        <CreditCard strokeWidth={1.5} className="h-3.5 w-3.5" />
                        Payment
                      </h3>
                      {payment ? (
                        <div className="space-y-1">
                          <PaymentLine status={payment.status} />
                          {payment.card_last_four && (
                            <p className="font-body text-[11px] tabular-nums text-[#A89898]">
                              {payment.card_brand ?? "Card"} ending{" "}
                              {payment.card_last_four}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-body text-[13px] text-[#C3B5B5]">
                          {proposal.status === "signed"
                            ? "Awaiting payment"
                            : "Not yet signed"}
                        </p>
                      )}
                    </div>

                    {/* Intake status */}
                    <div>
                      <h3 className={groupHeading}>
                        <ClipboardList
                          strokeWidth={1.5}
                          className="h-3.5 w-3.5"
                        />
                        Intake
                      </h3>
                      {hasIntake ? (
                        <p className="flex items-center gap-1.5 font-body text-[13px] font-medium text-[#4A7A5C]">
                          <Check strokeWidth={1.75} className="h-3.5 w-3.5" />
                          Completed
                        </p>
                      ) : (
                        <p className="font-body text-[13px] text-[#C3B5B5]">
                          {proposal.status === "signed"
                            ? "Awaiting intake"
                            : "Not yet signed"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Portal link — clickable, opens the client's proposal */}
                  {proposal.status !== "superseded" && proposal.token && (
                    <div className="flex items-center gap-3 border-t border-[#F1E8E8] bg-[#FBF8F8] px-5 py-3">
                      <span className="shrink-0 font-body text-[9px] font-medium uppercase tracking-[0.2em] text-[#A89898]">
                        Portal link
                      </span>
                      <PortalLinkCell
                        url={`${appUrl}/portal/${proposal.token}`}
                      />
                    </div>
                  )}

                  {/* Internal Notes */}
                  <div className="border-t border-[#F1E8E8] bg-[#FBF8F8]/60 px-5 py-4">
                    <h4 className={groupHeading}>Internal Notes</h4>
                    <ProposalInternalNotes
                      proposalId={proposal.id}
                      initialNotes={proposal.internal_notes}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#EFE6E6] bg-lyp-white px-8 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lyp-cherry/[0.05] ring-1 ring-lyp-cherry/10">
              <FileText strokeWidth={1} className="h-6 w-6 text-lyp-cherry/60" />
            </span>
            <p className="mt-5 font-body text-[14px] text-[#8A7A7A]">
              No proposals yet.
            </p>
            <Link
              href={`/admin/proposals/new?clientId=${client.id}`}
              className={`mt-4 inline-flex items-center gap-2 font-body text-[13px] font-semibold text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
            >
              Create the first proposal
              <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

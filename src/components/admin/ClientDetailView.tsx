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
  Check,
  Clock,
  AlertCircle,
  CreditCard,
  FileText,
  Download,
  ClipboardList,
} from "lucide-react";
import ProposalInternalNotes from "@/components/admin/ProposalInternalNotes";

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
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-body text-sm font-medium text-lyp-black mb-1">
              Name
            </label>
            <input
              {...register("name", { required: true })}
              className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
            />
          </div>
          <div>
            <label className="block font-body text-sm font-medium text-lyp-black mb-1">
              Slug
            </label>
            <input
              {...register("slug")}
              className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
            />
          </div>
          <div>
            <label className="block font-body text-sm font-medium text-lyp-black mb-1">
              Entity Name
            </label>
            <input
              {...register("entity_name")}
              className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
            />
          </div>
          <div>
            <label className="block font-body text-sm font-medium text-lyp-black mb-1">
              ABN
            </label>
            <input
              {...register("abn")}
              className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border border-gray-300 text-lyp-black px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-heading font-bold text-lyp-black">
          {client.name}
        </h1>
        <button
          onClick={() => setEditing(true)}
          className="border border-gray-300 text-lyp-black px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-body text-sm">
        <div>
          <span className="text-gray-500">Entity</span>
          <p className="text-lyp-black">{client.entity_name || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">ABN</span>
          <p className="text-lyp-black">{client.abn || "—"}</p>
        </div>
        <div>
          <span className="text-gray-500">Slug</span>
          <p className="text-lyp-black">{client.slug}</p>
        </div>
        <div>
          <span className="text-gray-500">Created</span>
          <p className="text-lyp-black">{formatDate(client.created_at)}</p>
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
      className="border border-gray-200 rounded-lg p-4 mt-3 space-y-3 bg-gray-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            {...register("name", { required: true })}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            Address
          </label>
          <input
            {...register("address")}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            State <span className="text-lyp-cherry">*</span>
          </label>
          <select
            {...register("stateId", { required: true })}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          >
            <option value="">Select state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Venue"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border border-gray-300 text-lyp-black px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
        >
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
      className="border border-gray-200 rounded-lg p-4 mt-3 space-y-3 bg-gray-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            First Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            {...register("firstName", { required: true })}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            Last Name <span className="text-lyp-cherry">*</span>
          </label>
          <input
            {...register("lastName", { required: true })}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            Email
          </label>
          <input
            {...register("email")}
            type="email"
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            Phone
          </label>
          <input
            {...register("phone")}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
        <div>
          <label className="block font-body text-xs font-medium text-lyp-black mb-1">
            Role
          </label>
          <input
            {...register("role")}
            className="w-full border border-gray-300 rounded px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-lyp-cherry"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Contact"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="border border-gray-300 text-lyp-black px-4 py-2 rounded-md font-body text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ClientDetailView({ client, states }: Props) {
  const router = useRouter();
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/admin/clients"
        className="text-lyp-cherry font-body text-sm hover:underline"
      >
        &larr; Back to Clients
      </Link>

      {/* Client Info */}
      <ClientInfoCard client={client} onUpdated={refresh} />

      {/* Venues */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            Venues
          </h2>
          {!showVenueForm && (
            <button
              onClick={() => setShowVenueForm(true)}
              className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors"
            >
              Add Venue
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Name
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Address
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  State
                </th>
              </tr>
            </thead>
            <tbody>
              {client.venues && client.venues.length > 0 ? (
                client.venues.map((venue) => (
                  <tr
                    key={venue.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-body text-sm text-lyp-black">
                      {venue.name}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {venue.address || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {venue.states?.name || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center font-body text-sm text-gray-500"
                  >
                    No venues yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            Contacts
          </h2>
          {!showContactForm && (
            <button
              onClick={() => setShowContactForm(true)}
              className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors"
            >
              Add Contact
            </button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  First Name
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Last Name
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Email
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Phone
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Role
                </th>
                <th className="px-4 py-3 font-heading text-sm font-semibold text-lyp-black">
                  Primary
                </th>
              </tr>
            </thead>
            <tbody>
              {client.contacts && client.contacts.length > 0 ? (
                client.contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-body text-sm text-lyp-black">
                      {contact.first_name}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-lyp-black">
                      {contact.last_name}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {contact.email || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {contact.phone || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {contact.role || "—"}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-gray-700">
                      {contact.is_primary ? "Yes" : "No"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center font-body text-sm text-gray-500"
                  >
                    No contacts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-bold text-lyp-black">
            Proposals
          </h2>
          <Link
            href={`/admin/proposals/new?clientId=${client.id}`}
            className="bg-lyp-cherry text-white px-4 py-2 rounded-md font-body text-sm hover:opacity-90 transition-colors"
          >
            New Proposal
          </Link>
        </div>

        {client.proposals && client.proposals.length > 0 ? (
          <div className="space-y-4">
            {client.proposals.map((proposal) => {
              const statusStyles: Record<string, string> = {
                draft: "bg-gray-100 text-gray-700",
                sent: "bg-blue-100 text-blue-700",
                signed: "bg-green-100 text-green-700",
                superseded: "bg-red-100 text-red-700",
              };

              const payment = proposal.payments?.[0];
              const contract = proposal.documents?.find(
                (d) => d.type === "contract",
              );
              const hasIntake = (proposal.intake_responses?.length ?? 0) > 0;
              const lineItems = proposal.proposal_line_items ?? [];

              return (
                <div
                  key={proposal.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Proposal header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyles[proposal.status] ?? ""}`}
                      >
                        {proposal.status}
                      </span>
                      <span className="font-body text-sm text-gray-500">
                        Created {formatDate(proposal.created_at)}
                      </span>
                      {proposal.signed_at && (
                        <span className="font-body text-sm text-green-600">
                          Signed {formatDate(proposal.signed_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {proposal.total_snapshot_cents != null && (
                        <span className="font-heading text-lg text-lyp-black">
                          {formatCents(proposal.total_snapshot_cents)}
                          <span className="font-body text-xs text-gray-400 ml-1">
                            + GST
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Services held */}
                    <div>
                      <h3 className="font-heading text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Services
                      </h3>
                      {lineItems.length > 0 ? (
                        <ul className="space-y-1">
                          {lineItems.map((item) => (
                            <li
                              key={item.id}
                              className="font-body text-sm text-lyp-black flex items-center justify-between"
                            >
                              <span className="flex items-center gap-1.5">
                                <Check className="h-3 w-3 text-green-500 shrink-0" />
                                {item.services?.name ?? "—"}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {formatCents(item.price_snapshot_cents)}
                                {item.billing === "recurring_monthly" && "/mo"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="font-body text-sm text-gray-400">
                          No services selected
                        </p>
                      )}
                    </div>

                    {/* Agreement */}
                    <div>
                      <h3 className="font-heading text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Agreement
                      </h3>
                      {contract ? (
                        <div className="space-y-1">
                          <a
                            href={contract.file_url ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-sm text-lyp-cherry hover:underline flex items-center gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download Contract
                          </a>
                          <p className="font-body text-xs text-gray-400">
                            Generated {formatDate(contract.created_at)}
                          </p>
                        </div>
                      ) : proposal.status === "signed" ? (
                        <p className="font-body text-sm text-amber-600 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Generating...
                        </p>
                      ) : (
                        <p className="font-body text-sm text-gray-400">
                          Awaiting signature
                        </p>
                      )}
                    </div>

                    {/* Payment status */}
                    <div>
                      <h3 className="font-heading text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" />
                        Payment
                      </h3>
                      {payment ? (
                        <div className="space-y-1">
                          <p className="font-body text-sm text-lyp-black flex items-center gap-1.5">
                            {payment.status === "details_captured" && (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-500" />
                                Details captured
                              </>
                            )}
                            {payment.status === "settled" && (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-500" />
                                Settled
                              </>
                            )}
                            {payment.status === "pending" && (
                              <>
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                                Pending
                              </>
                            )}
                            {payment.status === "dishonoured" && (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                Dishonoured
                              </>
                            )}
                            {payment.status === "failed" && (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                Failed
                              </>
                            )}
                            {payment.status === "scheduled" && (
                              <>
                                <Clock className="h-3.5 w-3.5 text-blue-500" />
                                Scheduled
                              </>
                            )}
                          </p>
                          {payment.card_last_four && (
                            <p className="font-body text-xs text-gray-500">
                              {payment.card_brand ?? "Card"} ending{" "}
                              {payment.card_last_four}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-body text-sm text-gray-400">
                          {proposal.status === "signed"
                            ? "Awaiting payment"
                            : "Not yet signed"}
                        </p>
                      )}
                    </div>

                    {/* Intake status */}
                    <div>
                      <h3 className="font-heading text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Intake
                      </h3>
                      {hasIntake ? (
                        <p className="font-body text-sm text-green-600 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" />
                          Completed
                        </p>
                      ) : (
                        <p className="font-body text-sm text-gray-400">
                          {proposal.status === "signed"
                            ? "Awaiting intake"
                            : "Not yet signed"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Portal link */}
                  {proposal.status !== "superseded" && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                      <p className="font-body text-xs text-gray-500">
                        Portal link:{" "}
                        <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                          /portal/{proposal.token}
                        </code>
                      </p>
                    </div>
                  )}

                  {/* Internal Notes */}
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                    <h4 className="font-heading text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Internal Notes
                    </h4>
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
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="font-body text-sm text-gray-500">No proposals yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}

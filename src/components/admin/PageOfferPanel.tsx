"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  attachServiceToPage,
  createServiceForPage,
  detachServiceFromPage,
} from "@/server-actions/pages";
import { updateService } from "@/server-actions/services";
import { deleteTier, upsertTier } from "@/server-actions/service-tiers";
import { createSlug } from "@/utils/create-slug";
import { isStructuralPage } from "@/lib/structural-pages";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#9C8C8C] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

/* The page editor's own field label. 11px on a looser track, against the
 * admin's usual 10px at 0.22em: this screen stacks more labels than any
 * other, and at that size they stopped reading as words and became grey
 * texture. "so many containers and small text". */
const labelClasses =
  "block font-body text-[11px] font-medium uppercase tracking-[0.14em] text-[#7A6868]";

const hintClasses = "mt-1.5 font-body text-[11px] leading-relaxed text-[#867474]";

const pillClasses = `inline-flex items-center gap-2 rounded-full bg-lyp-cherry px-5 py-2 font-body text-[12.5px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50`;

const quietPillClasses = `inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50`;

type Billing = "one_off" | "recurring_monthly" | "in_kind";

/** A term the client can pick, as the page editor holds it while being typed. */
export type OfferTerm = {
  id: string;
  name: string;
  billing_cycle_months: number;
  target_price_cents: number;
  sequence: number;
};

export type OfferService = {
  id: string;
  slug: string;
  name: string;
  billing: Billing | null;
  target_price_cents: number;
  price_display_period: string | null;
  terms: OfferTerm[];
};

/** Everything in the catalogue, with the page it is already on if it is on one. */
export type AttachableService = {
  id: string;
  name: string;
  slug: string;
  usedOnPage: string | null;
};

/**
 * The three ways the agency charges, said in the words a sales person uses
 * rather than the enum's. Each one carried a line of explanation underneath
 * and the three together read as a paragraph to be studied rather than three
 * words to be picked between, so the labels stand on their own.
 */
const BILLING_CHOICES: { value: Billing; label: string }[] = [
  {
    value: "one_off",
    label: "One-off payment",
  },
  {
    value: "in_kind",
    label: "Complimentary",
  },
  {
    value: "recurring_monthly",
    label: "Recurring",
  },
];

/** The lengths the agency actually sells. A term's own length wins if it differs. */
const TERM_LENGTHS = [1, 3, 6, 12, 18, 24];

const centsFromDollars = (value: string) =>
  Math.round((Number(value) || 0) * 100);

const dollarsFromCents = (cents: number) => String(cents / 100);

const isMoney = (value: string) =>
  value.trim() !== "" && Number.isFinite(Number(value));

/**
 * What this page sells, and what the client can pick.
 *
 * Every page editor shows this, attached or not, because a page with no
 * service gave no clue that pricing lived anywhere at all. Price, charge
 * period and terms are written straight onto the service record and its
 * tiers, which is where the slide, the basket, the summary and the contract
 * all read them from. There is no price on a page.
 */
export default function PageOfferPanel({
  pageId,
  pageTitle,
  pageSlug,
  service,
  services,
  onChanged,
}: {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  service: OfferService | null;
  services: AttachableService[];
  /** Reload the live preview, which is a separate frame to the draft. */
  onChanged?: () => void;
}) {
  return (
    <div>
      <h2 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
        What This Page Sells
      </h2>

      <div className="mt-5">
        {service ? (
          // Keyed so swapping the service starts the fields from its figures
          // rather than the last one's.
          <AttachedOffer
            key={service.id}
            pageId={pageId}
            service={service}
            onChanged={onChanged}
          />
        ) : isStructuralPage(pageSlug) ? (
          <p className="rounded-2xl border border-dashed border-[#E4D8D8] bg-[#FBF8F8] p-5 font-body text-[12.5px] leading-relaxed text-[#6B5A5A]">
            This is one of the proposal&rsquo;s own steps, so it can&rsquo;t
            sell a service. Selling from here would replace the step with a
            price slide. Add a new page for anything you want to charge for.
          </p>
        ) : (
          <NothingAttached
            pageId={pageId}
            pageTitle={pageTitle}
            pageSlug={pageSlug}
            services={services}
            onChanged={onChanged}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The empty state, which has to say out loud what happens if it is left
 * empty. "It has to be crystal clear. I dont care how it works but just make
 * it work."
 */
function NothingAttached({
  pageId,
  pageTitle,
  pageSlug,
  services,
  onChanged,
}: {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  services: AttachableService[];
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState<"attach" | "create" | null>(null);

  const free = services.filter((item) => !item.usedOnPage);
  const taken = services.filter((item) => item.usedOnPage);

  function settle(error: string | null, done: string) {
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(done);
    router.refresh();
    onChanged?.();
  }

  async function handleAttach() {
    if (!choice) return;
    setBusy("attach");
    const { error } = await attachServiceToPage(pageId, choice);
    setBusy(null);
    settle(error, "Service attached. Set its price below.");
  }

  async function handleCreate() {
    setBusy("create");
    const { error } = await createServiceForPage(pageId, {
      name: pageTitle,
      slug: pageSlug,
    });
    setBusy(null);
    settle(error, "Service created and attached. Set its price below.");
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#E4D8D8] bg-[#FBF8F8] p-5">
      <p className="font-body text-[12.5px] leading-relaxed text-[#6B5A5A]">
        Nothing attached, so this slide has no price and no way for a client
        to add it.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label htmlFor="offer-attach" className={labelClasses}>
            Attach a service you already have
          </label>
          {services.length === 0 ? (
            <p className="mt-2 font-body text-[12.5px] text-[#6B5A5A]">
              There are no services yet, so start a new one below.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  id="offer-attach"
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  className={cn(inputClasses, "min-w-[12rem] flex-1")}
                >
                  <option value="">Choose a service</option>
                  {free.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                  {taken.length > 0 && (
                    <optgroup label="Already on another page">
                      {taken.map((item) => (
                        <option key={item.id} value={item.id} disabled>
                          {item.name} (on {item.usedOnPage})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  type="button"
                  onClick={handleAttach}
                  disabled={!choice || busy !== null}
                  title="Attach the chosen service to this page"
                  className={pillClasses}
                >
                  {busy === "attach" ? (
                    <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
                  ) : null}
                  Attach
                </button>
              </div>
              <p className={hintClasses}>
                The slide then shows that service&rsquo;s price, terms and
                inclusions. A service already on another page is listed but
                can&rsquo;t be picked, so nothing gets charged twice.
              </p>
            </>
          )}
        </div>

        <div className="border-t border-[#F1E8E8] pt-5">
          <span className={labelClasses}>Or start a new one</span>
          <div className="mt-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy !== null || !pageTitle.trim() || !pageSlug.trim()}
              title="Create a service from this page and attach it"
              className={quietPillClasses}
            >
              {busy === "create" ? (
                <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
              ) : (
                <Plus strokeWidth={1.5} className="h-4 w-4" />
              )}
              Create &ldquo;{pageTitle || "this page"}&rdquo; as a service
            </button>
          </div>
          <p className={hintClasses}>
            Starts a service with this page&rsquo;s name and address, attaches
            it, and leaves you here to set the price. You never need to open
            the Services screen.
          </p>
        </div>
      </div>
    </div>
  );
}

type TermRow = {
  id: string;
  name: string;
  months: number;
  price: string;
};

type Draft = {
  billing: Billing;
  price: string;
  period: "week" | "";
  terms: TermRow[];
};

/** The snapshot of a term as it was last written, so saving rewrites only what changed. */
const termSnapshot = (term: TermRow, sequence: number) =>
  JSON.stringify({
    name: term.name.trim(),
    months: term.months,
    cents: centsFromDollars(term.price),
    sequence,
  });

function AttachedOffer({
  pageId,
  service,
  onChanged,
}: {
  pageId: string;
  service: OfferService;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [detaching, setDetaching] = useState(false);
  const [addingTerm, setAddingTerm] = useState(false);

  const [draft, setDraft] = useState<Draft>(() => ({
    billing: service.billing ?? "one_off",
    price: dollarsFromCents(service.target_price_cents),
    period: service.price_display_period === "week" ? "week" : "",
    terms: [...service.terms]
      .sort((a, b) => a.sequence - b.sequence)
      .map((term) => ({
        id: term.id,
        name: term.name,
        months: term.billing_cycle_months,
        price: dollarsFromCents(term.target_price_cents),
      })),
  }));

  // What is already in the database. A term is created and deleted on the
  // spot so it always has its real id here; only its fields are autosaved.
  const writtenRef = useRef<{ service: string; terms: Record<string, string> }>(
    {
      service: JSON.stringify({
        billing: service.billing ?? "one_off",
        cents: service.target_price_cents,
        period: service.price_display_period === "week" ? "week" : "",
      }),
      terms: Object.fromEntries(
        [...service.terms]
          .sort((a, b) => a.sequence - b.sequence)
          .map((term, index) => [
            term.id,
            termSnapshot(
              {
                id: term.id,
                name: term.name,
                months: term.billing_cycle_months,
                price: dollarsFromCents(term.target_price_cents),
              },
              index + 1,
            ),
          ]),
      ),
    },
  );

  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const everyPriceReads =
    isMoney(draft.price) && draft.terms.every((term) => isMoney(term.price));

  const { status } = useAutosave(
    draft,
    async (value) => {
      const written = writtenRef.current;

      const nextService = JSON.stringify({
        billing: value.billing,
        cents: centsFromDollars(value.price),
        // A single payment and a complimentary service have no cadence to
        // show, so the week-or-month choice is only written for a recurring
        // one and left alone otherwise.
        period: value.billing === "recurring_monthly" ? value.period : "",
      });

      if (nextService !== written.service) {
        const { error } = await updateService(service.id, {
          billing: value.billing,
          target_price_cents: centsFromDollars(value.price),
          ...(value.billing === "recurring_monthly"
            ? { price_display_period: value.period }
            : {}),
        });
        if (error) return { error };
        written.service = nextService;
      }

      for (const [index, term] of value.terms.entries()) {
        const snapshot = termSnapshot(term, index + 1);
        if (written.terms[term.id] === snapshot) continue;

        const { error } = await upsertTier({
          id: term.id,
          service_id: service.id,
          name: term.name.trim() || `Term ${index + 1}`,
          slug: createSlug(term.name) || `term-${index + 1}`,
          target_price_cents: centsFromDollars(term.price),
          billing_cycle_months: term.months,
          sequence: index + 1,
        });
        if (error) return { error };
        written.terms[term.id] = snapshot;
      }

      onChangedRef.current?.();
      return { error: null };
    },
    { enabled: everyPriceReads },
  );

  async function handleDetach() {
    if (
      !window.confirm(
        `Take "${service.name}" off this page? The page keeps its words and picture, but loses its price and the client can no longer add it.`,
      )
    )
      return;

    setDetaching(true);
    const { error } = await detachServiceFromPage(pageId);
    setDetaching(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Service taken off this page");
    router.refresh();
    onChanged?.();
  }

  /**
   * A term is written the moment it is added, rather than when its fields are
   * filled in, so the row on screen always stands for a real row in the
   * database and typing into it can never create a second one.
   */
  async function handleAddTerm() {
    setAddingTerm(true);
    const sequence = draft.terms.length + 1;
    const name = "New term";
    const { data, error } = await upsertTier({
      service_id: service.id,
      name,
      slug: createSlug(name),
      target_price_cents: 0,
      billing_cycle_months: 12,
      sequence,
    });
    setAddingTerm(false);

    if (error || !data) {
      toast.error(error ?? "Couldn't add that term");
      return;
    }

    const row: TermRow = { id: data.id, name, months: 12, price: "0" };
    writtenRef.current.terms[data.id] = termSnapshot(row, sequence);
    setDraft((prev) => ({ ...prev, terms: [...prev.terms, row] }));
    onChanged?.();
  }

  async function handleRemoveTerm(term: TermRow) {
    if (!window.confirm(`Remove the "${term.name}" term?`)) return;

    const { error } = await deleteTier(term.id);
    if (error) {
      toast.error(error);
      return;
    }
    delete writtenRef.current.terms[term.id];
    setDraft((prev) => ({
      ...prev,
      terms: prev.terms.filter((row) => row.id !== term.id),
    }));
    onChanged?.();
  }

  function patchTerm(id: string, patch: Partial<TermRow>) {
    setDraft((prev) => ({
      ...prev,
      terms: prev.terms.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  }

  const isRecurring = draft.billing === "recurring_monthly";
  const isComplimentary = draft.billing === "in_kind";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3">
        <div className="min-w-0">
          <span className={labelClasses}>Selling</span>
          <p className="mt-1 truncate font-body text-[13px] font-semibold text-lyp-black">
            {service.name}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <SaveStatusBadge status={status} />
          <button
            type="button"
            onClick={handleDetach}
            disabled={detaching}
            title="Take this service off the page"
            className={quietPillClasses}
          >
            {detaching ? "Taking it off..." : "Take it off"}
          </button>
        </div>
      </div>

      <fieldset>
        <legend className={labelClasses}>How it is charged</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {BILLING_CHOICES.map((choice) => {
            const active = draft.billing === choice.value;
            return (
              <label
                key={choice.value}
                className={cn(
                  `cursor-pointer rounded-2xl border p-4 transition-all duration-500 ${EASE}`,
                  active
                    ? "border-lyp-cherry/30 bg-lyp-cherry/[0.04] shadow-[0_0_0_4px_rgba(178,38,38,0.05)]"
                    : "border-[#EFE6E6] bg-[#FBF8F8] hover:border-lyp-cherry/20",
                )}
              >
                <input
                  type="radio"
                  name="offer-billing"
                  value={choice.value}
                  checked={active}
                  onChange={() =>
                    setDraft((prev) => ({ ...prev, billing: choice.value }))
                  }
                  className="sr-only"
                />
                <span className="block font-body text-[13px] font-semibold text-lyp-black">
                  {choice.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {isComplimentary ? (
        <p className="rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3 font-body text-[12.5px] leading-relaxed text-[#6B5A5A]">
          No price to set. The slide reads Complimentary, and the client can
          still add it to their proposal at no charge.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="offer-price" className={labelClasses}>
              Price (AUD)
            </label>
            <input
              id="offer-price"
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, price: e.target.value }))
              }
              className={cn(inputClasses, "mt-2 tabular-nums")}
            />
            <p className={hintClasses}>
              In dollars, before GST. This is the figure on the slide
              {isRecurring ? ", with each term below able to set its own." : "."}
            </p>
          </div>

          {isRecurring && (
            <div>
              <label htmlFor="offer-period" className={labelClasses}>
                Price shown as
              </label>
              <select
                id="offer-period"
                value={draft.period}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    period: e.target.value === "week" ? "week" : "",
                  }))
                }
                className={cn(inputClasses, "mt-2")}
              >
                <option value="week">Per week</option>
                <option value="">Per month</option>
              </select>
              <p className={hintClasses}>
                How the figure is read on the slide. Most subscriptions are
                quoted by the week.
              </p>
            </div>
          )}
        </div>
      )}

      {isRecurring && (
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className={labelClasses}>Terms the client can choose</span>
            <button
              type="button"
              onClick={handleAddTerm}
              disabled={addingTerm}
              title="Add another term to this service"
              className={`inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70 disabled:opacity-50`}
            >
              {addingTerm ? (
                <Loader2 strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
              )}
              Add a term
            </button>
          </div>

          {draft.terms.length === 0 ? (
            <p className="mt-2 font-body text-[12.5px] leading-relaxed text-[#6B5A5A]">
              No terms yet, so the client sees the one price above.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {draft.terms.map((term, index) => {
                const lengths = TERM_LENGTHS.includes(term.months)
                  ? TERM_LENGTHS
                  : [...TERM_LENGTHS, term.months].sort((a, b) => a - b);

                return (
                  <div
                    key={term.id}
                    className="rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={labelClasses}>Term {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(term)}
                        aria-label={`Remove term ${index + 1}`}
                        title={`Remove term ${index + 1}`}
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-transparent text-[#867474] transition-all duration-500 ${EASE} hover:border-lyp-cherry/15 hover:bg-lyp-cherry/[0.04] hover:text-lyp-cherry`}
                      >
                        <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_9rem]">
                      <div>
                        <label
                          htmlFor={`term-name-${term.id}`}
                          className={labelClasses}
                        >
                          Name
                        </label>
                        <input
                          id={`term-name-${term.id}`}
                          type="text"
                          value={term.name}
                          onChange={(e) =>
                            patchTerm(term.id, { name: e.target.value })
                          }
                          placeholder="e.g. 12 months"
                          className={cn(inputClasses, "mt-2")}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`term-months-${term.id}`}
                          className={labelClasses}
                        >
                          Length
                        </label>
                        <select
                          id={`term-months-${term.id}`}
                          value={term.months}
                          onChange={(e) =>
                            patchTerm(term.id, {
                              months: Number(e.target.value),
                            })
                          }
                          className={cn(inputClasses, "mt-2")}
                        >
                          {lengths.map((months) => (
                            <option key={months} value={months}>
                              {months} {months === 1 ? "month" : "months"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`term-price-${term.id}`}
                          className={labelClasses}
                        >
                          Price (AUD)
                        </label>
                        <input
                          id={`term-price-${term.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={term.price}
                          onChange={(e) =>
                            patchTerm(term.id, { price: e.target.value })
                          }
                          className={cn(inputClasses, "mt-2 tabular-nums")}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className={hintClasses}>
            The name is what the client reads on the term card. The length is
            what the contract commits them to. The price is per week or per
            month, whichever you picked above.
          </p>
        </div>
      )}

      {!everyPriceReads && (
        <p className="font-body text-[12px] text-lyp-cherry">
          A price is empty, so nothing is being saved. Put a number in every
          price box, using 0 for free.
        </p>
      )}
    </div>
  );
}

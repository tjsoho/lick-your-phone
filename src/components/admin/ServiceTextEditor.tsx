"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import {
  getServiceText,
  updateService,
  updateServiceDisclaimers,
  updateServiceInclusions,
  updateServiceObligations,
  updateServiceTierNames,
} from "@/server-actions/services";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";
import { cn } from "@/lib/utils";

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const hintClasses = "mt-1.5 font-body text-[11px] text-[#A89898]";

/** A row carries a local key so reordering doesn't hand focus to a neighbour. */
interface Row {
  key: string;
  text: string;
}

/** A pricing term keeps its database id: only its name is edited here. */
interface TierRow extends Row {
  id: string;
}

interface Draft {
  term: string;
  tiers: TierRow[];
  inclusions: Row[];
  obligations: Row[];
  disclaimers: Row[];
}

type ListName = "inclusions" | "obligations" | "disclaimers";

const EMPTY: Draft = {
  term: "",
  tiers: [],
  inclusions: [],
  obligations: [],
  disclaimers: [],
};

let rowCounter = 0;
const newKey = () => `row-${++rowCounter}`;

function toRows(items: { text: string; sequence: number | null }[] | null) {
  return [...(items ?? [])]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((item) => ({ key: newKey(), text: item.text }));
}

/** What actually gets written: blank rows dropped, order as shown. */
function toTierPayload(rows: TierRow[]) {
  return rows
    .filter((row) => row.text.trim())
    .map((row) => ({ id: row.id, name: row.text.trim() }));
}

function toPayload(rows: Row[]) {
  return rows
    .filter((row) => row.text.trim())
    .map((row, i) => ({ text: row.text, sequence: i }));
}

/**
 * The client-visible words of a service, edited from inside a page editor.
 *
 * Term, inclusions, commitments and disclaimers live on the service record, so
 * they read the same on every proposal. Prices, tiers and billing are left to
 * the service record itself.
 */
export default function ServiceTextEditor({
  serviceSlug,
  onSaved,
}: {
  serviceSlug: string;
  onSaved?: () => void;
}) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  // Each save rewrites only the parts that changed since the last one, so
  // editing the term doesn't delete and reinsert every list row.
  const writtenRef = useRef<Record<keyof Draft, string>>({
    term: "",
    tiers: "",
    inclusions: "",
    obligations: "",
    disclaimers: "",
  });

  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const { status, markSaved } = useAutosave(
    draft,
    async (value) => {
      if (!serviceId) return { error: null };

      const term = value.term.trim() || null;
      const next = {
        term: JSON.stringify(term),
        tiers: JSON.stringify(toTierPayload(value.tiers)),
        inclusions: JSON.stringify(toPayload(value.inclusions)),
        obligations: JSON.stringify(toPayload(value.obligations)),
        disclaimers: JSON.stringify(toPayload(value.disclaimers)),
      };
      const written = writtenRef.current;

      if (next.term !== written.term) {
        const { error } = await updateService(serviceId, { term });
        if (error) return { error };
        written.term = next.term;
      }

      if (next.tiers !== written.tiers) {
        const { error } = await updateServiceTierNames(
          serviceId,
          toTierPayload(value.tiers),
        );
        if (error) return { error };
        written.tiers = next.tiers;
      }

      const lists = [
        ["inclusions", updateServiceInclusions],
        ["obligations", updateServiceObligations],
        ["disclaimers", updateServiceDisclaimers],
      ] as const;

      for (const [name, write] of lists) {
        if (next[name] === written[name]) continue;
        const { error } = await write(serviceId, toPayload(value[name]));
        if (error) return { error };
        written[name] = next[name];
      }

      onSavedRef.current?.();
      return { error: null };
    },
    { enabled: !!serviceId },
  );

  useEffect(() => {
    let cancelled = false;
    setServiceId(null);
    setLoadError(null);

    getServiceText(serviceSlug).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error ?? "Service not found");
        return;
      }

      const loaded: Draft = {
        term: data.term ?? "",
        tiers: [...(data.service_tiers ?? [])]
          .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
          .map((tier) => ({ key: newKey(), id: tier.id, text: tier.name })),
        inclusions: toRows(data.service_inclusions),
        obligations: toRows(data.service_client_obligations),
        disclaimers: toRows(data.service_disclaimers),
      };
      writtenRef.current = {
        term: JSON.stringify(data.term?.trim() || null),
        tiers: JSON.stringify(toTierPayload(loaded.tiers)),
        inclusions: JSON.stringify(toPayload(loaded.inclusions)),
        obligations: JSON.stringify(toPayload(loaded.obligations)),
        disclaimers: JSON.stringify(toPayload(loaded.disclaimers)),
      };

      // Record the loaded values as the baseline before they reach state, so
      // opening the editor never writes anything back.
      markSaved(loaded, { silent: true });
      setDraft(loaded);
      setServiceId(data.id);
    });

    return () => {
      cancelled = true;
    };
  }, [serviceSlug, markSaved]);

  function updateList(name: ListName, update: (rows: Row[]) => Row[]) {
    setDraft((prev) => ({ ...prev, [name]: update(prev[name]) }));
  }

  if (loadError) {
    return (
      <p className="font-body text-[12.5px] text-lyp-cherry">
        Couldn&rsquo;t load this service&rsquo;s text: {loadError}
      </p>
    );
  }

  if (!serviceId) {
    return (
      <div className="flex items-center gap-2 font-body text-[12.5px] text-[#A89898]">
        <Loader2 strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" />
        Loading service text
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <span className={labelClasses}>Shown on every proposal</span>
        <SaveStatusBadge status={status} />
      </div>

      <div>
        <label htmlFor="service-term" className={labelClasses}>
          Term
        </label>
        <input
          id="service-term"
          type="text"
          value={draft.term}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, term: e.target.value }))
          }
          placeholder="e.g. 3 month minimum"
          className={cn(inputClasses, "mt-2")}
        />
        <p className={hintClasses}>
          Sits beside the service name on the slide. Leave blank to hide it.
        </p>
      </div>

      {draft.tiers.length > 0 && (
        <div>
          <span className={labelClasses}>Term options</span>
          <div className="mt-2 space-y-2">
            {draft.tiers.map((tier, index) => (
              <input
                key={tier.key}
                type="text"
                value={tier.text}
                onChange={(e) => {
                  const text = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    tiers: prev.tiers.map((t) =>
                      t.key === tier.key ? { ...t, text } : t,
                    ),
                  }));
                }}
                placeholder="e.g. Annually"
                aria-label={`Term option ${index + 1}`}
                className={inputClasses}
              />
            ))}
          </div>
          <p className={hintClasses}>
            The price choices on the slide and in the summary. Prices and
            lengths are set on the service record.
          </p>
        </div>
      )}

      <ListEditor
        title="Inclusions"
        itemLabel="Inclusion"
        placeholder="What's included"
        rows={draft.inclusions}
        onChange={(update) => updateList("inclusions", update)}
      />

      <ListEditor
        title="Your Commitments"
        itemLabel="Commitment"
        placeholder="What the client provides"
        rows={draft.obligations}
        onChange={(update) => updateList("obligations", update)}
      />

      <ListEditor
        title="Disclaimers"
        itemLabel="Disclaimer"
        placeholder="Small print"
        rows={draft.disclaimers}
        onChange={(update) => updateList("disclaimers", update)}
      />
    </div>
  );
}

function ListEditor({
  title,
  itemLabel,
  placeholder,
  rows,
  onChange,
}: {
  title: string;
  itemLabel: string;
  placeholder: string;
  rows: Row[];
  onChange: (update: (rows: Row[]) => Row[]) => void;
}) {
  function move(index: number, direction: -1 | 1) {
    onChange((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className={labelClasses}>{title}</span>
        <button
          type="button"
          onClick={() =>
            onChange((prev) => [...prev, { key: newKey(), text: "" }])
          }
          className={`inline-flex items-center gap-1.5 font-body text-[12px] font-semibold tracking-wide text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`}
        >
          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
          Add {itemLabel.toLowerCase()}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 font-body text-[12.5px] text-[#8A7A7A]">
          None yet — this section is hidden on the slide.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((row, index) => (
            <div key={row.key} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
                  className={cn(
                    `rounded-full p-1 transition-colors duration-500 ${EASE}`,
                    index === 0
                      ? "cursor-not-allowed text-[#E4D8D8]"
                      : "text-[#A89898] hover:text-lyp-cherry",
                  )}
                >
                  <ChevronUp strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
                  className={cn(
                    `rounded-full p-1 transition-colors duration-500 ${EASE}`,
                    index === rows.length - 1
                      ? "cursor-not-allowed text-[#E4D8D8]"
                      : "text-[#A89898] hover:text-lyp-cherry",
                  )}
                >
                  <ChevronDown strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={row.text}
                onChange={(e) => {
                  const text = e.target.value;
                  onChange((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, text } : r)),
                  );
                }}
                placeholder={placeholder}
                aria-label={`${itemLabel} ${index + 1}`}
                className={cn(inputClasses, "flex-1")}
              />
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => prev.filter((r) => r.key !== row.key))
                }
                aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-transparent text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/15 hover:bg-lyp-cherry/[0.04] hover:text-lyp-cherry`}
              >
                <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

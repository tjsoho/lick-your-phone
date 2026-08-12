"use client";

import { ExternalLink, Check } from "lucide-react";
import type { FieldProps } from "./types";

export default function ProviderPickerField({
  question,
  value,
  onChange,
  providers,
}: FieldProps) {
  const selected = (value as string[]) ?? [];
  const providerType = (question.config as Record<string, string>)
    ?.providerType;

  const filtered = (providers ?? []).filter(
    (p) => !providerType || p.type === providerType,
  );

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toLocaleString("en-AU")}`;
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block font-body text-sm text-lyp-white/80">
          {question.field_label}
          {question.required && <span className="text-lyp-cherry ml-1">*</span>}
        </label>
        <p className="font-body text-sm text-lyp-white/40">
          No providers available for your area yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block font-body text-sm text-lyp-white/80">
        {question.field_label}
        {question.required && <span className="text-lyp-cherry ml-1">*</span>}
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((provider) => {
          const isSelected = selected.includes(provider.id);
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => toggle(provider.id)}
              className={`relative flex flex-col rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? "border-lyp-cherry bg-lyp-cherry/10"
                  : "border-lyp-white/15 hover:border-lyp-white/30"
              }`}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-lyp-cherry">
                  <Check className="h-4 w-4 text-lyp-white" />
                </div>
              )}

              {provider.image_url && (
                <div className="mb-3 h-32 w-full overflow-hidden rounded-lg bg-lyp-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={provider.image_url}
                    alt={provider.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <h4 className="font-heading text-base text-lyp-white">
                {provider.name}
              </h4>

              {provider.description && (
                <p className="mt-1 font-body text-xs text-lyp-white/60 line-clamp-2">
                  {provider.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                {provider.price_cents > 0 && (
                  <span className="font-body text-sm text-lyp-cherry font-semibold">
                    {formatPrice(provider.price_cents)}
                  </span>
                )}
                {provider.portfolio_url && (
                  <a
                    href={provider.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 font-body text-xs text-lyp-white/40 hover:text-lyp-white transition-colors"
                  >
                    Portfolio
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

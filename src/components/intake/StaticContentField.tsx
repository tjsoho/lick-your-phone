"use client";

import type { FieldProps } from "./types";

export default function StaticContentField({ question }: FieldProps) {
  const config = question.config as Record<string, string> | null;
  const content = config?.content ?? question.field_label ?? "";

  return (
    <div className="rounded-lg border border-lyp-white/10 bg-lyp-white/5 p-5">
      <div className="font-body text-sm text-lyp-white/80 leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}

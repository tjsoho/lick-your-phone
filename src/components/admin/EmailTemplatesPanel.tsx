"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Eye, Loader2, Mail, Save, Users } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import {
  previewEmailTemplate,
  saveEmailTemplate,
  type EmailTemplate,
} from "@/server-actions/email-templates";
import { PLACEHOLDER_LABELS } from "@/lib/email-template";

const EASE = "ease-brand";

export default function EmailTemplatesPanel({
  templates,
  loadError,
}: {
  templates: EmailTemplate[];
  loadError: string | null;
}) {
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? "");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(
    null,
  );

  const current = useMemo(
    () => templates.find((t) => t.key === selectedKey) ?? null,
    [templates, selectedKey],
  );

  // Load whichever email is selected into the boxes, and throw away any
  // preview from the last one so the two can never disagree on screen.
  useEffect(() => {
    if (!current) return;
    setSubject(current.subject);
    setBodyHtml(current.bodyHtml);
    setPreview(null);
  }, [current]);

  const dirty =
    !!current && (subject !== current.subject || bodyHtml !== current.bodyHtml);

  async function handleSave() {
    if (!current) return;
    setSaving(true);
    const res = await saveEmailTemplate({ key: current.key, subject, bodyHtml });
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Saved. The next one sent will use this.");
      current.subject = subject;
      current.bodyHtml = bodyHtml;
    }
    setSaving(false);
  }

  async function handlePreview() {
    const res = await previewEmailTemplate({ subject, bodyHtml });
    setPreview(res);
  }

  if (loadError) {
    return (
      <p className="rounded-3xl border border-lyp-cherry/15 bg-lyp-cherry/[0.04] px-5 py-4 font-body text-[13px] text-lyp-cherry">
        {loadError}
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* ── The journey, in the order it happens ───────────────── */}
      <nav className="space-y-2">
        {templates.map((t) => {
          const on = t.key === selectedKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelectedKey(t.key)}
              title={t.description ?? t.title}
              className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-500 ${EASE} ${
                on
                  ? "border-lyp-cherry/30 bg-lyp-cherry/[0.05]"
                  : "border-[#EFE6E6] bg-lyp-white hover:border-lyp-cherry/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-body text-[10px] font-semibold ${
                    on ? "text-lyp-cherry" : "text-[#BFADAD]"
                  }`}
                >
                  {t.sequence}
                </span>
                <span
                  className={`font-body text-[13px] font-semibold ${
                    on ? "text-lyp-cherry" : "text-lyp-black"
                  }`}
                >
                  {t.title}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-[#867474]">
                {t.audience === "client" ? (
                  <>
                    <Mail strokeWidth={2} className="h-3 w-3" /> To the client
                  </>
                ) : (
                  <>
                    <Users strokeWidth={2} className="h-3 w-3" /> Internal
                  </>
                )}
              </p>
            </button>
          );
        })}
      </nav>

      {/* ── The one being edited ───────────────────────────────── */}
      {current && (
        <section className="rounded-3xl border border-[#EFE6E6] bg-lyp-white p-6">
          <h2 className="font-body text-[14px] font-semibold text-lyp-black">
            {current.title}
          </h2>
          {current.description && (
            <p className="mt-1.5 max-w-[40rem] font-body text-[12px] leading-relaxed text-[#6B5A5A]">
              {current.description}
            </p>
          )}

          <label
            htmlFor="template-subject"
            className="mb-2 mt-6 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]"
          >
            Subject line
          </label>
          <input
            id="template-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={`w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3 font-body text-[14px] text-lyp-black outline-none transition-all duration-500 ${EASE} focus:border-lyp-cherry/40 focus:bg-lyp-white`}
          />

          <p className="mb-2 mt-6 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]">
            Body
          </p>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} disabled={saving} />

          {/* The names they are allowed to use. Without this the feature is
              guesswork, and a mistyped name shows up in a client's inbox. */}
          {current.placeholders.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3.5">
              <p className="font-body text-[11px] font-semibold text-lyp-black">
                Details you can drop in
              </p>
              <p className="mt-1 font-body text-[11px] leading-relaxed text-[#867474]">
                Type these anywhere in the subject or the body, braces and all,
                and the real value takes their place when it sends.
              </p>
              <ul className="mt-2.5 space-y-1">
                {current.placeholders.map((p) => (
                  <li key={p} className="font-body text-[11.5px] text-[#6B5A5A]">
                    <code className="rounded bg-[#F3ECEC] px-1.5 py-0.5 text-[11px] text-lyp-black">
                      {`{{${p}}}`}
                    </code>{" "}
                    {PLACEHOLDER_LABELS[p] ?? p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`inline-flex items-center gap-2.5 rounded-full bg-lyp-cherry px-6 py-3 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`}
            >
              {saving ? (
                <Loader2 strokeWidth={1.75} className="h-4 w-4 animate-spin" />
              ) : (
                <Save strokeWidth={1.75} className="h-4 w-4" />
              )}
              {saving ? "Saving" : dirty ? "Save changes" : "Saved"}
            </button>

            <button
              type="button"
              onClick={handlePreview}
              className={`inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-5 py-3 font-body text-[12.5px] font-semibold text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
            >
              <Eye strokeWidth={1.75} className="h-3.5 w-3.5" />
              See it with real details
            </button>

            <span className="font-body text-[11px] text-[#867474]">
              Last changed{" "}
              {new Date(current.updatedAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {preview && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#EFE6E6]">
              <div className="border-b border-[#EFE6E6] bg-[#FCFAFA] px-4 py-3">
                <p className="font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#867474]">
                  Subject
                </p>
                <p className="mt-1 font-body text-[13.5px] font-semibold text-lyp-black">
                  {preview.subject}
                </p>
              </div>
              {/* The sanitised HTML, rendered by the same code the sending
                  route runs, so what is on screen is what arrives. */}
              <div
                className="bg-lyp-white px-5 py-4 font-body text-[14px] leading-relaxed text-lyp-black [&_a]:text-lyp-cherry [&_a]:underline [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

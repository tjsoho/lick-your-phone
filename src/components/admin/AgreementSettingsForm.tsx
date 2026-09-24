"use client";

import { useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  FileUp,
  Images,
  Loader2,
  PenLine,
  Scroll,
  Trash2,
  Type,
} from "lucide-react";
import toast from "react-hot-toast";
import MediaLibraryModal from "./MediaLibraryModal";
import { updateAgreementSettings } from "@/server-actions/agreement-settings";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";
import { CopyFields, cleanCopy } from "@/components/admin/PageWordingForm";
import type { CopyOverrides } from "@/lib/portal-copy";
import { DOCUMENT_ACCEPT, uploadDocument } from "@/utils/storage";
import { isValidTermsUrl, resolveTermsTarget } from "@/lib/terms";

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

/**
 * The signature is drawn into the contract PDF at 36pt tall, object-contain,
 * so ~200px of artwork covers it comfortably at print resolution.
 */
const SIGNATURE_SIZE_HINT = "Recommended 600 x 200px (transparent PNG)";

/**
 * What to attach as the full terms. PDF only — it opens the same
 * way on every phone the client might be holding, which a .docx does not.
 */
const DOCUMENT_HINT = "PDF, up to 10MB";

type Props = {
  initialTerms: string;
  initialPostSignature: string;
  initialImage: string | null;
  initialName: string;
  initialTitle: string;
  initialTermsUrl: string;
  initialTermsDocumentUrl: string | null;
  initialTermsDocumentName: string | null;
  initialPortalCopy: CopyOverrides;
};

function Card({
  icon: Icon,
  title,
  description,
  status,
  children,
  delay,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  status: React.ReactNode;
  children: React.ReactNode;
  delay: string;
}) {
  return (
    <section
      className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
      style={{ animationDelay: delay }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-lyp-cherry/[0.06] ring-1 ring-lyp-cherry/10">
            <Icon strokeWidth={1.25} className="h-4 w-4 text-lyp-cherry" />
          </span>
          <div>
            <h2 className="font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black">
              {title}
            </h2>
            <p className="mt-1 font-body text-[12.5px] leading-relaxed text-[#8A7A7A]">
              {description}
            </p>
          </div>
        </div>
        {status}
      </div>
      {children}
    </section>
  );
}

export default function AgreementSettingsForm({
  initialTerms,
  initialPostSignature,
  initialImage,
  initialName,
  initialTitle,
  initialTermsUrl,
  initialTermsDocumentUrl,
  initialTermsDocumentName,
  initialPortalCopy,
}: Props) {
  const [terms, setTerms] = useState(initialTerms);
  const [postSignature, setPostSignature] = useState(initialPostSignature);
  const [image, setImage] = useState(initialImage ?? "");
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [portalCopy, setPortalCopy] = useState(initialPortalCopy);

  const [termsUrl, setTermsUrl] = useState(initialTermsUrl);
  const [documentUrl, setDocumentUrl] = useState(initialTermsDocumentUrl ?? "");
  const [documentName, setDocumentName] = useState(
    initialTermsDocumentName ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const termsStatus = useAutosave(terms, async (value) =>
    updateAgreementSettings({ terms_and_conditions: value }),
  ).status;

  const postStatus = useAutosave(postSignature, async (value) =>
    updateAgreementSettings({ post_signature_text: value }),
  ).status;

  const signStatus = useAutosave(
    { image: image.trim() || null, name, title },
    async (value) =>
      updateAgreementSettings({
        countersignature_image: value.image,
        countersignature_name: value.name,
        countersignature_title: value.title,
      }),
  ).status;

  const wordingStatus = useAutosave(cleanCopy(portalCopy), async (value) =>
    updateAgreementSettings({ portal_copy: value }),
  ).status;

  /* A half-typed address is not a link yet. The save is held until it parses,
     so an in-progress "https://lick" is never the thing a client clicks —
     and clearing the field back to empty still saves, because removing the
     link is a real edit. */
  const urlTyped = termsUrl.trim();
  const urlValid = urlTyped === "" || isValidTermsUrl(urlTyped);

  const fullTermsStatus = useAutosave(
    {
      terms_url: urlTyped,
      terms_document_url: documentUrl.trim() || null,
      terms_document_name: documentName.trim() || null,
    },
    async (value) => updateAgreementSettings(value),
    { enabled: urlValid },
  ).status;

  const clauseCount = terms.split("\n").filter((l) => l.trim()).length;

  /* The same rule the portal applies, said out loud here so the agency can
     see which of the three the client will actually get. */
  const termsTarget = resolveTermsTarget({
    termsDocumentUrl: documentUrl.trim() || null,
    termsDocumentName: documentName.trim() || null,
    termsUrl: urlValid ? urlTyped : null,
    clauseCount,
  });

  async function handleDocument(file: File) {
    setUploading(true);
    const result = await uploadDocument(file);
    setUploading(false);

    if (result.error || !result.url) {
      toast.error(result.error?.message ?? "Upload failed");
      return;
    }

    setDocumentUrl(result.url);
    setDocumentName(result.name);
    toast.success("Full T&Cs document uploaded");
  }

  return (
    <div className="space-y-6">
      <Card
        icon={FileText}
        title="Terms & Conditions Summary"
        description="One clause per line. This is the short version the client reads on screen, and the terms written into every contract from now on. The full document goes in the card below."
        status={<SaveStatusBadge status={termsStatus} />}
        delay="80ms"
      >
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={14}
          aria-label="Terms and conditions"
          className={`${fieldClasses} resize-y leading-relaxed`}
          placeholder="Agreement Start: This agreement commences on…"
        />
        <p className="mt-2 font-body text-[11px] text-[#A89898]">
          {clauseCount} {clauseCount === 1 ? "clause" : "clauses"}. They are
          numbered automatically. Changes apply to proposals signed from now on
          — contracts already signed keep the terms they were signed under.
        </p>
      </Card>

      <Card
        icon={Scroll}
        title="Full Terms & Conditions"
        description="The extensive version, for clients who want all of it. Link to the T&Cs on your own site, upload the document, or both — the summary above stays on screen either way."
        status={<SaveStatusBadge status={fullTermsStatus} />}
        delay="120ms"
      >
        <div>
          <label htmlFor="terms-url" className={labelClasses}>
            Link to your live T&amp;Cs
          </label>
          <input
            id="terms-url"
            type="url"
            inputMode="url"
            value={termsUrl}
            onChange={(e) => setTermsUrl(e.target.value)}
            placeholder="https://lickyourphone.com/terms"
            aria-invalid={!urlValid}
            aria-describedby="terms-url-note"
            className={`${fieldClasses} max-w-xl ${
              urlValid ? "" : "border-lyp-cherry/40 bg-lyp-cherry/[0.04]"
            }`}
          />
          <p
            id="terms-url-note"
            className={`mt-2 max-w-xl font-body text-[11px] leading-relaxed ${
              urlValid ? "text-[#A89898]" : "text-lyp-cherry"
            }`}
          >
            {urlValid
              ? "The address clients are sent to, opened in a new tab so they don't lose the proposal. Always the page as it stands today, so an edit on your site is live here too."
              : "That isn't a web address yet — it needs to start with https:// and include the domain. Nothing is saved until it does."}
          </p>
          {urlValid && urlTyped !== "" && (
            <a
              href={urlTyped}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2 inline-flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
            >
              <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" />
              Check the link
            </a>
          )}
        </div>

        <div className="mt-5 border-t border-[#F1E8E8] pt-5">
          <span className={labelClasses}>Full T&amp;Cs Document</span>
          <p className="-mt-1 mb-2 font-body text-[11px] text-[#A89898]">
            {DOCUMENT_HINT}
          </p>

          {documentUrl ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-3">
              <FileText
                strokeWidth={1.25}
                className="h-5 w-5 flex-shrink-0 text-lyp-cherry"
              />
              <span className="min-w-0 flex-1 truncate font-body text-[13px] text-lyp-black">
                {documentName || "Terms document"}
              </span>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
              >
                <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" />
                Open
              </a>
              <button
                type="button"
                onClick={() => documentInputRef.current?.click()}
                className={`inline-flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
              >
                <FileUp strokeWidth={1.5} className="h-3.5 w-3.5" />
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocumentUrl("");
                  setDocumentName("");
                }}
                title="Remove the document"
                aria-label="Remove the document"
                className={`flex h-7 w-7 items-center justify-center rounded-full border border-[#EFE6E6] text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-95`}
              >
                <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              disabled={uploading}
              className={`mt-2 flex w-full max-w-sm flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] py-8 text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {uploading ? (
                <Loader2
                  strokeWidth={1.5}
                  className="h-7 w-7 animate-spin text-lyp-cherry motion-reduce:animate-none"
                />
              ) : (
                <FileUp strokeWidth={1.25} className="h-7 w-7" />
              )}
              <span className="font-body text-[13px]">
                {uploading ? "Uploading…" : "Upload the full T&Cs"}
              </span>
            </button>
          )}

          <input
            ref={documentInputRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleDocument(file);
              if (documentInputRef.current) documentInputRef.current.value = "";
            }}
          />
        </div>

        {/* One rule, one sentence — so nobody has to guess which of the three
            a client clicking "the full terms" is actually handed. */}
        <p className="mt-4 max-w-xl font-body text-[11px] leading-relaxed text-[#A89898]">
          <strong className="font-semibold text-[#8A7A7A]">
            What the client gets:
          </strong>{" "}
          {termsTarget.kind === "document"
            ? "the document above, downloaded. Remove it to fall back to the link."
            : termsTarget.kind === "link"
              ? "the link above, opened in a new tab. Upload a document to use that instead."
              : termsTarget.kind === "generated"
                ? `the ${clauseCount} ${
                    clauseCount === 1 ? "clause" : "clauses"
                  } above, rendered as a PDF. Add a link or a document to send them the real thing instead.`
                : "nothing yet — write some clauses above, or add a link or a document here."}
        </p>
      </Card>

      <Card
        icon={PenLine}
        title="Counter-signature"
        description="Rita's signature, added to every contract alongside the client's, so the copy they download is signed by both parties."
        status={<SaveStatusBadge status={signStatus} />}
        delay="160ms"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cs-name" className={labelClasses}>
              Name
            </label>
            <input
              id="cs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClasses}
              placeholder="Rita Agoulian"
            />
          </div>
          <div>
            <label htmlFor="cs-title" className={labelClasses}>
              Title
            </label>
            <input
              id="cs-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClasses}
              placeholder="Director"
            />
          </div>
        </div>

        <div className="mt-4">
          <span className={labelClasses}>Signature Image</span>
          <p className="-mt-1 mb-2 font-body text-[11px] text-[#A89898]">
            {SIGNATURE_SIZE_HINT}
          </p>
          {image ? (
            <div className="mt-2">
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt="Counter-signature"
                  className="max-h-24 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setImage("")}
                  title="Remove signature image"
                  aria-label="Remove signature image"
                  className={`absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a0606]/45 text-lyp-white backdrop-blur-sm transition-all duration-500 ${EASE} hover:bg-lyp-cherry active:scale-95`}
                >
                  <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className={`mt-3 flex items-center gap-1.5 font-body text-[12.5px] font-medium text-[#8A7A7A] transition-colors duration-500 ${EASE} hover:text-lyp-cherry`}
              >
                <Images strokeWidth={1.5} className="h-3.5 w-3.5" />
                Replace signature
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className={`mt-2 flex w-full max-w-sm flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#EFE6E6] bg-[#FBF8F8] py-8 text-[#A89898] transition-all duration-500 ${EASE} hover:border-lyp-cherry/30 hover:text-lyp-cherry`}
            >
              <Images strokeWidth={1.25} className="h-7 w-7" />
              <span className="font-body text-[13px]">
                Upload Rita&rsquo;s signature
              </span>
            </button>
          )}
          <p className="mt-2 max-w-md font-body text-[11px] leading-relaxed text-[#A89898]">
            Upload a <strong className="font-semibold text-[#8A7A7A]">transparent
            version</strong> of the signature — a PNG with no background, so it
            sits on the contract like ink rather than a white box. It is added
            to every contract from now on. Until one is set, contracts show the
            name and title on a signature line instead.
          </p>
        </div>
      </Card>

      <Card
        icon={FileText}
        title="After Signing"
        description="What the client reads on the confirmation screen once they have signed."
        status={<SaveStatusBadge status={postStatus} />}
        delay="200ms"
      >
        <textarea
          value={postSignature}
          onChange={(e) => setPostSignature(e.target.value)}
          rows={3}
          aria-label="Post-signature message"
          className={`${fieldClasses} resize-y leading-relaxed`}
          placeholder="Thank you for signing…"
        />
      </Card>

      <Card
        icon={Type}
        title="Client Portal Wording"
        description="Buttons, price bar and link messages that appear on every slide rather than belonging to one page. Leave a field empty to use the wording shown in it."
        status={<SaveStatusBadge status={wordingStatus} />}
        delay="240ms"
      >
        <CopyFields
          kinds={["global"]}
          value={portalCopy}
          onChange={setPortalCopy}
          idPrefix="settings"
        />
      </Card>

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={setImage}
        title="Counter-signature"
        hint={SIGNATURE_SIZE_HINT}
      />
    </div>
  );
}

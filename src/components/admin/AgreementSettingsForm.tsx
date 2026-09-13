"use client";

import { useState } from "react";
import { FileText, Images, PenLine, Trash2 } from "lucide-react";
import MediaLibraryModal from "./MediaLibraryModal";
import { updateAgreementSettings } from "@/server-actions/agreement-settings";
import { useAutosave } from "@/hooks/use-autosave";
import SaveStatusBadge from "@/components/admin/SaveStatusBadge";

const EASE = "ease-brand";

const fieldClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

type Props = {
  initialTerms: string;
  initialPostSignature: string;
  initialImage: string | null;
  initialName: string;
  initialTitle: string;
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
}: Props) {
  const [terms, setTerms] = useState(initialTerms);
  const [postSignature, setPostSignature] = useState(initialPostSignature);
  const [image, setImage] = useState(initialImage ?? "");
  const [name, setName] = useState(initialName);
  const [title, setTitle] = useState(initialTitle);
  const [libraryOpen, setLibraryOpen] = useState(false);

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

  const clauseCount = terms.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="space-y-6">
      <Card
        icon={FileText}
        title="Terms & Conditions"
        description="One clause per line. These appear on every proposal's signing page and in every contract from now on."
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
        icon={PenLine}
        title="Counter-signature"
        description="Rita's signature, added to every contract alongside the client's, so the copy they download is signed by both parties."
        status={<SaveStatusBadge status={signStatus} />}
        delay="120ms"
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
        delay="160ms"
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

      <MediaLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={setImage}
        title="Counter-signature"
      />
    </div>
  );
}

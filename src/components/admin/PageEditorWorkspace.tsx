"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Monitor, Smartphone } from "lucide-react";
import { ContentBlocksEditor } from "@/components/admin/ContentBlocksEditor";
import { PageSettingsForm } from "@/components/admin/PageSettingsForm";
import PageTitleForm from "@/components/admin/PageTitleForm";
import { PREVIEW_MESSAGE } from "@/components/admin/PagePreviewSurface";

const EASE = "ease-brand";

type Block = {
  id: string;
  type: string | null;
  content: unknown;
  sequence: number | null;
};

type Props = {
  pageId: string;
  initialTitle: string;
  initialSlug: string;
  initialImage: string | null;
  initialPosition: string;
  initialBlocks: Block[];
  isServicePage: boolean;
  serviceSlug: string | null;
};

/** The slide is designed for a wide screen; the frame renders at that size
 *  and is scaled down to fit the column, so proportions stay honest. */
const FRAME_SIZE = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 430, height: 860 },
};

export default function PageEditorWorkspace({
  pageId,
  initialTitle,
  initialSlug,
  initialImage,
  initialPosition,
  initialBlocks,
  isServicePage,
  serviceSlug,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [scale, setScale] = useState(0.4);

  // The draft lives here so the three editors below can each own their own
  // fields while the preview sees the page as a whole.
  const draftRef = useRef({
    title: initialTitle,
    featuredImage: initialImage,
    imagePosition: initialPosition,
    contentBlocks: initialBlocks,
  });

  const post = useCallback(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: PREVIEW_MESSAGE, draft: draftRef.current },
      window.location.origin,
    );
  }, [ready]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === `${PREVIEW_MESSAGE}:ready`) setReady(true);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Send the current draft as soon as the frame says it is listening.
  useEffect(() => {
    if (ready) post();
  }, [ready, post]);

  const frame = FRAME_SIZE[device];

  // Scale the frame to whatever width the column actually has.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const available = shell.clientWidth;
      if (available > 0) setScale(Math.min(available / frame.width, 1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [frame.width]);

  const handleTitle = useCallback(
    (title: string) => {
      draftRef.current = { ...draftRef.current, title };
      post();
    },
    [post],
  );

  const handleSettings = useCallback(
    (draft: { featuredImage: string | null; imagePosition: string }) => {
      draftRef.current = { ...draftRef.current, ...draft };
      post();
    },
    [post],
  );

  const handleBlocks = useCallback(
    (contentBlocks: Block[]) => {
      draftRef.current = { ...draftRef.current, contentBlocks };
      post();
    },
    [post],
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ─────────────── Editor ─────────────── */}
      <div className="min-w-0 space-y-6">
        <section
          className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
          style={{ animationDelay: "140ms" }}
        >
          <PageTitleForm
            pageId={pageId}
            initialTitle={initialTitle}
            initialSlug={initialSlug}
            onDraftChange={handleTitle}
          />
        </section>

        <section
          className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
          style={{ animationDelay: "180ms" }}
        >
          <PageSettingsForm
            pageId={pageId}
            initialImage={initialImage}
            initialPosition={initialPosition}
            onDraftChange={handleSettings}
          />
        </section>

        {isServicePage && (
          <section
            className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
            style={{ animationDelay: "210ms" }}
          >
            <h2 className="font-heading text-[15px] font-bold tracking-[-0.01em] text-lyp-black">
              Pricing &amp; Inclusions
            </h2>
            <p className="mt-2 font-body text-[12.5px] leading-relaxed text-[#8A7A7A]">
              This page&rsquo;s price, tiers, inclusions, client obligations and
              disclaimers come from the service record, so they stay consistent
              wherever the service appears. Edits there show up in the preview.
            </p>
            <Link
              href={
                serviceSlug ? `/admin/services/${serviceSlug}` : "/admin/services"
              }
              className={`mt-4 inline-flex items-center gap-2 rounded-full border border-[#EFE6E6] bg-lyp-white px-4 py-2 font-body text-[12.5px] font-semibold text-lyp-black transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:text-lyp-cherry active:scale-[0.985]`}
            >
              Edit pricing &amp; inclusions
              <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        <section
          className="animate-rise rounded-2xl border border-[#EFE6E6] bg-lyp-white p-6"
          style={{ animationDelay: "240ms" }}
        >
          <ContentBlocksEditor
            pageId={pageId}
            initialBlocks={initialBlocks}
            onDraftChange={handleBlocks}
          />
        </section>
      </div>

      {/* ─────────────── Live preview ─────────────── */}
      <div
        className="animate-rise xl:sticky xl:top-8"
        style={{ animationDelay: "180ms" }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-px w-5 bg-lyp-cherry/30" />
            <span className="font-body text-[10px] font-medium uppercase tracking-[0.28em] text-lyp-cherry/70">
              Live Preview
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-[#EFE6E6] bg-lyp-white p-1">
            {(["desktop", "mobile"] as const).map((option) => {
              const Icon = option === "desktop" ? Monitor : Smartphone;
              const active = device === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDevice(option)}
                  aria-label={`${option} preview`}
                  aria-pressed={active}
                  className={`rounded-full p-1.5 transition-colors duration-500 ${EASE} ${
                    active
                      ? "bg-lyp-cherry/[0.08] text-lyp-cherry"
                      : "text-[#A89898] hover:text-lyp-black"
                  }`}
                >
                  <Icon strokeWidth={1.5} className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={shellRef}
          className="overflow-hidden rounded-2xl border border-[#EFE6E6] bg-[#050203]"
          style={{ height: frame.height * scale }}
        >
          <iframe
            ref={frameRef}
            src={`/admin/pages/${pageId}/preview`}
            title="Live preview of this page"
            className="origin-top-left border-0"
            style={{
              width: frame.width,
              height: frame.height,
              transform: `scale(${scale})`,
            }}
          />
        </div>

        <p className="mt-3 font-body text-[11px] leading-relaxed text-[#A89898]">
          Exactly what the client sees, updating as you type. Sample client
          details stand in for the real ones.
        </p>
      </div>
    </div>
  );
}

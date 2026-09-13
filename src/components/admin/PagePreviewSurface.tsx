"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ProposalProvider,
  type AgreementCopy,
  type PageData,
  type ProposalData,
} from "@/components/portal/ProposalContext";
import { SLUG_KINDS, type CopyOverrides } from "@/lib/portal-copy";
import { PageRenderer } from "@/components/portal/ProposalCarousel";
import PortalBackground from "@/components/portal/PortalBackground";

/** Draft shape the editor posts in; mirrors the editable parts of a page. */
export type PageDraft = {
  title: string | null;
  featuredImage: string | null;
  imagePosition: "left" | "right" | null;
  contentBlocks: PageData["contentBlocks"];
  copy: CopyOverrides;
};

type Props = {
  proposal: ProposalData;
  page: PageData;
  // Loosely typed on purpose: the shape comes straight from the portal's own
  // service query and is only ever handed back to the portal's renderer.
  services: React.ComponentProps<typeof ProposalProvider>["services"];
  /** The saved agreement settings, including the workspace-wide wording. */
  agreement: AgreementCopy;
};

export const PREVIEW_MESSAGE = "lyp:page-draft";

/**
 * The client-facing slide, rendered on its own for the admin editor.
 *
 * It listens for draft updates from the parent window rather than reading the
 * database, so edits appear before they are saved. Everything below the
 * provider is the portal's own code, so the preview cannot drift from what
 * the client actually sees.
 */
export default function PagePreviewSurface({
  proposal,
  page,
  services,
  agreement,
}: Props) {
  const [draft, setDraft] = useState<PageData>(page);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PREVIEW_MESSAGE) return;

      const payload = event.data.draft as PageDraft;
      setDraft((prev) => ({
        ...prev,
        title: payload.title ?? prev.title,
        featuredImage: payload.featuredImage,
        imagePosition: payload.imagePosition ?? prev.imagePosition,
        contentBlocks: payload.contentBlocks,
        copy: payload.copy ?? prev.copy,
      }));
    }

    window.addEventListener("message", handleMessage);
    // Tell the editor the frame is ready for drafts.
    window.parent?.postMessage(
      { type: `${PREVIEW_MESSAGE}:ready` },
      window.location.origin,
    );

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Structural pages also read their wording by slug, so feed the draft in
  // there too.
  const pageCopy = useMemo(
    () =>
      draft.slug && SLUG_KINDS[draft.slug]
        ? { [draft.slug]: draft.copy ?? {} }
        : {},
    [draft.slug, draft.copy],
  );

  return (
    <ProposalProvider
      proposal={proposal}
      agreement={agreement}
      pages={[draft]}
      services={services}
      initialSelections={[]}
      pageCopy={pageCopy}
    >
      <div className="relative flex h-dvh flex-col overflow-hidden bg-[#050203]">
        <PortalBackground />
        <div className="relative z-10 flex-1 overflow-hidden">
          <PageRenderer page={draft} />
        </div>
      </div>
    </ProposalProvider>
  );
}

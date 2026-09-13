"use client";

import { useEffect, useState } from "react";
import {
  ProposalProvider,
  type PageData,
  type ProposalData,
} from "@/components/portal/ProposalContext";
import { PageRenderer } from "@/components/portal/ProposalCarousel";
import PortalBackground from "@/components/portal/PortalBackground";

/** Draft shape the editor posts in; mirrors the editable parts of a page. */
export type PageDraft = {
  title: string | null;
  featuredImage: string | null;
  imagePosition: "left" | "right" | null;
  contentBlocks: PageData["contentBlocks"];
};

type Props = {
  proposal: ProposalData;
  page: PageData;
  // Loosely typed on purpose: the shape comes straight from the portal's own
  // service query and is only ever handed back to the portal's renderer.
  services: React.ComponentProps<typeof ProposalProvider>["services"];
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

  return (
    <ProposalProvider
      proposal={proposal}
      pages={[draft]}
      services={services}
      initialSelections={[]}
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

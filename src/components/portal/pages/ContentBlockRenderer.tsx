import { ContentBlock } from "../ProposalContext";

export default function ContentBlockRenderer({
  blocks,
}: {
  blocks: ContentBlock[];
}) {
  return (
    <div className="space-y-5">
      {blocks
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
        .map((block) => {
          if (block.type === "heading") {
            return (
              <h2
                key={block.id}
                className="font-heading text-2xl md:text-3xl text-lyp-white uppercase tracking-wide"
              >
                {String(block.content ?? "")}
              </h2>
            );
          }
          if (block.type === "paragraph") {
            return (
              <p
                key={block.id}
                className="font-body text-base text-lyp-white/85 leading-relaxed"
              >
                {String(block.content ?? "")}
              </p>
            );
          }
          if (block.type === "list" && Array.isArray(block.content)) {
            return (
              <ul key={block.id} className="space-y-2 pl-1">
                {(block.content as string[]).map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 font-body text-base text-lyp-white/85"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lyp-cherry" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          if (block.type === "logos" && Array.isArray(block.content)) {
            return (
              <div key={block.id} className="flex flex-wrap items-center gap-3">
                {(block.content as { url: string; alt: string }[]).map(
                  (logo, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={logo.url}
                      alt={logo.alt || "Logo"}
                      className="h-16 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                    />
                  ),
                )}
              </div>
            );
          }

          if (block.type === "image" && typeof block.content === "string") {
            return (
              <div key={block.id} className="overflow-hidden rounded-2xl">
                <img
                  src={block.content}
                  alt="Content image"
                  className="w-full h-auto object-cover aspect-[4/3] md:aspect-auto"
                />
              </div>
            );
          }

          return (
            <div
              key={block.id}
              className="font-body text-base text-lyp-white/60"
            >
              {JSON.stringify(block.content)}
            </div>
          );
        })}
    </div>
  );
}

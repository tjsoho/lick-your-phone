-- The layout of a content page used to be worked out from whichever blocks
-- happened to be on it: one `results` block turned the whole page into the
-- results slide, images with almost no copy became a showcase, and adding a
-- second paragraph silently turned it back into the two column template.
--
-- Nothing on screen said so, so adding one element changed the shape of the
-- page under them: "its quite confusing for the client to choose the layout
-- and content types".
--
-- NULL keeps the old behaviour, so every page that exists today renders
-- exactly as it did until somebody actually picks something.
CREATE TYPE "public"."page_layout" AS ENUM('text_image', 'showcase', 'results', 'statement');--> statement-breakpoint
ALTER TABLE "public"."pages" ADD COLUMN IF NOT EXISTS "layout" "public"."page_layout";

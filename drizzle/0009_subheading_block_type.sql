-- A Subheading block could be chosen in the editor and drawn by the portal,
-- but the database had never been told the type existed, so every save of one
-- came back as "invalid input value for enum content_block_type".
--
-- It goes next to `heading` rather than on the end, since the list is read in
-- order anywhere it is offered as a choice.
ALTER TYPE "public"."content_block_type" ADD VALUE IF NOT EXISTS 'subheading' AFTER 'heading';

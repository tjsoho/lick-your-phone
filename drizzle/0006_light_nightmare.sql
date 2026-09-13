ALTER TABLE "agreement_settings" ADD COLUMN "portal_copy" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "copy" jsonb DEFAULT '{}'::jsonb NOT NULL;
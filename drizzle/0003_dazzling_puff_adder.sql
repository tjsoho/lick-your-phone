CREATE TABLE "agreement_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"terms_and_conditions" text,
	"post_signature_text" text,
	"countersignature_image" text,
	"countersignature_name" text,
	"countersignature_title" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_page_settings" ALTER COLUMN "discount_pct" SET DATA TYPE real;
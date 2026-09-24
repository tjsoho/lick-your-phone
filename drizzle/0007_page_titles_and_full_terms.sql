CREATE TABLE "intake_pages" (
	"page_number" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agreement_settings" ADD COLUMN "terms_url" text;--> statement-breakpoint
ALTER TABLE "agreement_settings" ADD COLUMN "terms_document_url" text;--> statement-breakpoint
ALTER TABLE "agreement_settings" ADD COLUMN "terms_document_name" text;
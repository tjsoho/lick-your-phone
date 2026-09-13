CREATE TABLE "proposal_page_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"visible" boolean,
	"discount_pct" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_page_settings_proposal_id_page_id_key" UNIQUE("proposal_id","page_id")
);
--> statement-breakpoint
ALTER TABLE "proposal_page_settings" ADD CONSTRAINT "proposal_page_settings_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_page_settings" ADD CONSTRAINT "proposal_page_settings_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE no action ON UPDATE no action;
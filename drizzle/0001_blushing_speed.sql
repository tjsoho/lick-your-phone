ALTER TABLE "venues" ALTER COLUMN "state_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_name" text;

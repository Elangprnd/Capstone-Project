ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "end_date" timestamp;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "birth_date" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "phone_number" varchar(20);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "domicile" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "skills_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "skills_public_id" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "video_link" text;
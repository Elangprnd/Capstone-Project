ALTER TABLE "applications" ADD COLUMN "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "birth_date" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "phone_number" varchar(20);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "domicile" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "skills_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "skills_public_id" varchar(255);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "video_link" text;
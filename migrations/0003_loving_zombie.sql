ALTER TYPE "public"."application_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "rejected_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "missions" DROP COLUMN "deleted_at";
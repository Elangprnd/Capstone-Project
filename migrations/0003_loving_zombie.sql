DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'application_status' AND e.enumlabel = 'cancelled') THEN
        ALTER TYPE "public"."application_status" ADD VALUE 'cancelled';
    END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "rejected_reason" varchar(255);
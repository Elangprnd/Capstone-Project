DO $$ BEGIN
 CREATE TYPE "public"."event_mode" AS ENUM('offline', 'online');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "missions" RENAME COLUMN "address" TO "location";--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "latitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "longitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "event_mode" "event_mode" DEFAULT 'offline' NOT NULL;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE "public"."application_status" AS ENUM('pending', 'approved', 'rejected');
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_category') THEN
        CREATE TYPE "public"."mission_category" AS ENUM('pendidikan', 'tanggap_bencana', 'medis', 'logistik');
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mission_status') THEN
        CREATE TYPE "public"."mission_status" AS ENUM('menunggu_relawan', 'sedang_berjalan', 'relawan_terkumpul', 'selesai');
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_volunteer_id_users_id_fk') THEN
        ALTER TABLE "applications" DROP CONSTRAINT "applications_volunteer_id_users_id_fk";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_mission_id_missions_id_fk') THEN
        ALTER TABLE "applications" DROP CONSTRAINT "applications_mission_id_missions_id_fk";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    -- applications.id transformations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='id' AND data_type != 'uuid') THEN
        ALTER TABLE "applications" ALTER COLUMN "id" SET DATA TYPE uuid;
    END IF;
    ALTER TABLE "applications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='id' AND is_identity='YES') THEN
        ALTER TABLE "applications" ALTER COLUMN "id" DROP IDENTITY;
    END IF;

    -- applications.mission_id transformations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='mission_id' AND data_type != 'uuid') THEN
        ALTER TABLE "applications" ALTER COLUMN "mission_id" SET DATA TYPE uuid;
    END IF;

    -- applications.status transformations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='status' AND column_default IS NOT NULL) THEN
        ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='status' AND udt_name != 'application_status') THEN
        ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::text::"public"."application_status";
    END IF;
    ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending';

    -- missions.id transformations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='missions' AND column_name='id' AND data_type != 'uuid') THEN
        ALTER TABLE "missions" ALTER COLUMN "id" SET DATA TYPE uuid;
    END IF;
    ALTER TABLE "missions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='missions' AND column_name='id' AND is_identity='YES') THEN
        ALTER TABLE "missions" ALTER COLUMN "id" DROP IDENTITY;
    END IF;

    -- missions.status transformations
    ALTER TABLE "missions" ALTER COLUMN "status" SET DEFAULT 'menunggu_relawan'::"public"."mission_status";
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='missions' AND column_name='status' AND udt_name != 'mission_status') THEN
        ALTER TABLE "missions" ALTER COLUMN "status" SET DATA TYPE "public"."mission_status" USING "status"::"public"."mission_status";
    END IF;

    -- missions other columns
    ALTER TABLE "missions" ALTER COLUMN "volunteers_needed" SET DEFAULT 1;
    ALTER TABLE "missions" ALTER COLUMN "created_at" SET NOT NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "applied_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "lembaga_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "category" "mission_category" NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7) NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7) NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "photos" text[];--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_volunteer_id_users_id_fk') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_mission_id_missions_id_fk') THEN
        ALTER TABLE "applications" ADD CONSTRAINT "applications_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'missions_lembaga_id_users_id_fk') THEN
        ALTER TABLE "missions" ADD CONSTRAINT "missions_lembaga_id_users_id_fk" FOREIGN KEY ("lembaga_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='created_at') THEN
        ALTER TABLE "applications" DROP COLUMN "created_at";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='missions' AND column_name='location') THEN
        ALTER TABLE "missions" DROP COLUMN "location";
    END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'apply_status') THEN
        DROP TYPE "public"."apply_status";
    END IF;
END $$;
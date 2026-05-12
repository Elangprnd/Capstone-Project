CREATE TYPE "public"."application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."mission_category" AS ENUM('pendidikan', 'tanggap_bencana', 'medis', 'logistik');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('menunggu_relawan', 'sedang_berjalan', 'relawan_terkumpul', 'selesai');--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_volunteer_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_mission_id_missions_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "mission_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DATA TYPE "public"."application_status" USING "status"::text::"public"."application_status";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "status" SET DEFAULT 'menunggu_relawan'::"public"."mission_status";--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "status" SET DATA TYPE "public"."mission_status" USING "status"::"public"."mission_status";--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "volunteers_needed" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "applied_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "lembaga_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "category" "mission_category" NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "latitude" numeric(10, 7) NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "longitude" numeric(10, 7) NOT NULL;--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "photos" text[];--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_volunteer_id_users_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_lembaga_id_users_id_fk" FOREIGN KEY ("lembaga_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "missions" DROP COLUMN "location";--> statement-breakpoint
DROP TYPE "public"."apply_status";
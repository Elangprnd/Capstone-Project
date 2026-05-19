DO $$ BEGIN
 CREATE TYPE "public"."kategori_edukasi" AS ENUM('Pendidikan', 'Kesehatan', 'Kesiapsiagaan Bencana');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "edukasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploader_id" uuid NOT NULL,
	"judul_materi" varchar(255) NOT NULL,
	"deskripsi_materi" text NOT NULL,
	"kategori_materi" "kategori_edukasi" NOT NULL,
	"link_video" varchar(255) NOT NULL,
	"thumbnail_url" varchar(255),
	"thumbnail_public_id" varchar(255),
	"tanggal_upload" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "domisili" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "skills" varchar(255)[];--> statement-breakpoint
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "edukasi" ADD CONSTRAINT "edukasi_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
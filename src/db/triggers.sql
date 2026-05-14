
-- ================================================
-- TRIGGER 1: Update volunteers_applied based on application status
-- Hanya menghitung pendaftaran yang statusnya 'approved'
-- ================================================
CREATE OR REPLACE FUNCTION update_mission_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: Jika pendaftaran baru langsung approved
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.status = 'approved') THEN
      UPDATE missions 
      SET volunteers_applied = volunteers_applied + 1,
          updated_at = NOW()
      WHERE id = NEW.mission_id;
    END IF;
  
  -- UPDATE: Jika status berubah ke/dari approved
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Dari non-approved ke approved
    IF (OLD.status != 'approved' AND NEW.status = 'approved') THEN
      UPDATE missions 
      SET volunteers_applied = volunteers_applied + 1,
          updated_at = NOW()
      WHERE id = NEW.mission_id;
    -- Dari approved ke non-approved (cancelled/rejected)
    ELSIF (OLD.status = 'approved' AND NEW.status != 'approved') THEN
      UPDATE missions 
      SET volunteers_applied = volunteers_applied - 1,
          updated_at = NOW()
      WHERE id = NEW.mission_id;
    END IF;
  
  -- DELETE: Jika pendaftaran dihapus dan sebelumnya approved
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.status = 'approved') THEN
      UPDATE missions 
      SET volunteers_applied = volunteers_applied - 1,
          updated_at = NOW()
      WHERE id = OLD.mission_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS after_application_insert ON applications;
DROP TRIGGER IF EXISTS after_application_update ON applications;
DROP TRIGGER IF EXISTS after_application_delete ON applications;

CREATE TRIGGER after_application_change
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_volunteer_count();


-- ================================================
-- TRIGGER 2: Auto update status misi
-- Sesuai state machine: menunggu_relawan <-> relawan_terkumpul
-- ================================================
CREATE OR REPLACE FUNCTION sync_mission_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika kuota terpenuhi, set ke relawan_terkumpul
  IF NEW.volunteers_applied >= NEW.volunteers_needed THEN
    IF NEW.status = 'menunggu_relawan' THEN
      UPDATE missions
      SET status = 'relawan_terkumpul',
          updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  -- Jika kuota berkurang di bawah target, kembalikan ke menunggu_relawan
  -- Hanya jika sebelumnya relawan_terkumpul
  ELSIF NEW.volunteers_applied < NEW.volunteers_needed THEN
    IF NEW.status = 'relawan_terkumpul' THEN
      UPDATE missions
      SET status = 'menunggu_relawan',
          updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS after_mission_volunteers_update ON missions;

CREATE TRIGGER after_mission_volunteers_sync
  AFTER UPDATE OF volunteers_applied ON missions
  FOR EACH ROW
  EXECUTE FUNCTION sync_mission_status();


-- ================================================
-- CHECK CONSTRAINT: volunteers_applied tidak boleh negatif
-- ================================================
ALTER TABLE missions DROP CONSTRAINT IF EXISTS check_volunteers_non_negative;
ALTER TABLE missions ADD CONSTRAINT check_volunteers_non_negative 
CHECK (volunteers_applied >= 0);

-- Note: Constraint volunteers_applied <= volunteers_needed sengaja tidak dipasang
-- karena bisa saja admin meng-approve sedikit lebih banyak dari kuota awal
-- atau kuota dikurangi setelah ada yang di-approve.


-- ================================================
-- TRIGGER 1: Increment volunteers_applied saat INSERT applications
-- ================================================
CREATE OR REPLACE FUNCTION increment_volunteers_applied()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE missions 
  SET volunteers_applied = volunteers_applied + 1,
      updated_at = NOW()
  WHERE id = NEW.mission_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_application_insert
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION increment_volunteers_applied();

-- ================================================
-- TRIGGER 2: Auto update status misi ke relawan_terkumpul
-- saat volunteers_applied = volunteers_needed
-- ================================================
CREATE OR REPLACE FUNCTION auto_update_mission_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Cek apakah volunteers_applied sudah sama dengan volunteers_needed
  IF NEW.volunteers_applied >= NEW.volunteers_needed THEN
    UPDATE missions
    SET status = 'relawan_terkumpul',
        updated_at = NOW()
    WHERE id = NEW.id
    AND status = 'menunggu_relawan'; -- Jangan overwrite status lain
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_mission_volunteers_update
  AFTER UPDATE OF volunteers_applied ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_mission_status();

-- ================================================
-- CHECK CONSTRAINT: volunteers_applied tidak boleh melebihi volunteers_needed
-- Ini adalah safety net terakhir untuk mencegah over-quota
-- ================================================
ALTER TABLE missions 
ADD CONSTRAINT check_volunteers_not_exceed
CHECK (volunteers_applied <= volunteers_needed);
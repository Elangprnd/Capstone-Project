import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function updateTriggers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Updating triggers for mission status engine...');
    
    // 1. Cleanup old triggers and functions
    await pool.query('DROP TRIGGER IF EXISTS after_application_insert ON applications');
    await pool.query('DROP TRIGGER IF EXISTS after_application_update ON applications');
    await pool.query('DROP TRIGGER IF EXISTS after_application_delete ON applications');
    await pool.query('DROP TRIGGER IF EXISTS after_application_change ON applications');
    await pool.query('DROP TRIGGER IF EXISTS trigger_sync_volunteers_applied ON applications');
    await pool.query('DROP FUNCTION IF EXISTS increment_volunteers_applied()');
    await pool.query('DROP FUNCTION IF EXISTS sync_volunteers_applied()');
    await pool.query('DROP FUNCTION IF EXISTS update_mission_volunteer_count()');

    await pool.query('DROP TRIGGER IF EXISTS after_mission_volunteers_update ON missions');
    await pool.query('DROP TRIGGER IF EXISTS after_mission_volunteers_sync ON missions');
    await pool.query('DROP FUNCTION IF EXISTS auto_update_mission_status()');
    await pool.query('DROP FUNCTION IF EXISTS sync_mission_status()');
    
    // 2. Create function to handle volunteer count (only approved)
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_mission_volunteer_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'INSERT') THEN
          IF (NEW.status = 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied + 1, updated_at = NOW() WHERE id = NEW.mission_id;
          END IF;
        ELSIF (TG_OP = 'UPDATE') THEN
          IF (OLD.status != 'approved' AND NEW.status = 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied + 1, updated_at = NOW() WHERE id = NEW.mission_id;
          ELSIF (OLD.status = 'approved' AND NEW.status != 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied - 1, updated_at = NOW() WHERE id = NEW.mission_id;
          END IF;
        ELSIF (TG_OP = 'DELETE') THEN
          IF (OLD.status = 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied - 1, updated_at = NOW() WHERE id = OLD.mission_id;
          END IF;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 3. Create the application trigger
    await pool.query(`
      CREATE TRIGGER after_application_change
        AFTER INSERT OR UPDATE OR DELETE ON applications
        FOR EACH ROW
        EXECUTE FUNCTION update_mission_volunteer_count();
    `);

    // 4. Create function to sync mission status
    await pool.query(`
      CREATE OR REPLACE FUNCTION sync_mission_status()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.volunteers_applied >= NEW.volunteers_needed THEN
          IF NEW.status = 'menunggu_relawan' THEN
            UPDATE missions SET status = 'relawan_terkumpul', updated_at = NOW() WHERE id = NEW.id;
          END IF;
        ELSIF NEW.volunteers_applied < NEW.volunteers_needed THEN
          IF NEW.status = 'relawan_terkumpul' THEN
            UPDATE missions SET status = 'menunggu_relawan', updated_at = NOW() WHERE id = NEW.id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 5. Create the mission trigger
    await pool.query(`
      CREATE TRIGGER after_mission_volunteers_sync
        AFTER UPDATE OF volunteers_applied ON missions
        FOR EACH ROW
        EXECUTE FUNCTION sync_mission_status();
    `);

    // 6. Ensure constraint
    await pool.query('ALTER TABLE missions DROP CONSTRAINT IF EXISTS check_volunteers_non_negative');
    await pool.query('ALTER TABLE missions ADD CONSTRAINT check_volunteers_non_negative CHECK (volunteers_applied >= 0)');

    console.log('Successfully updated triggers.');
  } catch (e) {
    console.error('Failed to update triggers:', e);
  } finally {
    await pool.end();
  }
}

updateTriggers();

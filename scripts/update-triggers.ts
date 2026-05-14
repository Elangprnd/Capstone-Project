import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function updateTriggers() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Updating triggers for volunteers_applied...');
    
    // 1. Drop existing triggers and functions
    await pool.query('DROP TRIGGER IF EXISTS after_application_insert ON applications');
    await pool.query('DROP TRIGGER IF EXISTS after_mission_volunteers_update ON missions');
    await pool.query('DROP FUNCTION IF EXISTS increment_volunteers_applied()');
    
    // 2. Create new function to handle all cases (insert, update, delete)
    await pool.query(`
      CREATE OR REPLACE FUNCTION sync_volunteers_applied()
      RETURNS TRIGGER AS $$
      BEGIN
        -- INSERT case
        IF (TG_OP = 'INSERT') THEN
          IF (NEW.status = 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied + 1 WHERE id = NEW.mission_id;
          END IF;
          RETURN NEW;
          
        -- UPDATE case
        ELSIF (TG_OP = 'UPDATE') THEN
          -- Pending -> Approved
          IF (OLD.status != 'approved' AND NEW.status = 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied + 1 WHERE id = NEW.mission_id;
          -- Approved -> Not Approved (Rejected/Cancelled)
          ELSIF (OLD.status = 'approved' AND NEW.status != 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied - 1 WHERE id = NEW.mission_id;
          END IF;
          RETURN NEW;
          
        -- DELETE case
        ELSIF (TG_OP = 'DELETE') THEN
          IF (OLD.status = 'approved') THEN
            UPDATE missions SET volunteers_applied = volunteers_applied - 1 WHERE id = OLD.mission_id;
          END IF;
          RETURN OLD;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 3. Create the trigger
    await pool.query(`
      CREATE TRIGGER trigger_sync_volunteers_applied
      AFTER INSERT OR UPDATE OR DELETE ON applications
      FOR EACH ROW
      EXECUTE FUNCTION sync_volunteers_applied();
    `);

    // 4. Update the auto_update_mission_status function to be more robust
    // It should also handle status being set back to 'menunggu_relawan' if someone cancels
    await pool.query(`
      CREATE OR REPLACE FUNCTION auto_update_mission_status()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Jika kuota terpenuhi, set ke relawan_terkumpul
        IF NEW.volunteers_applied >= NEW.volunteers_needed THEN
          IF NEW.status = 'menunggu_relawan' THEN
            UPDATE missions SET status = 'relawan_terkumpul', updated_at = NOW() WHERE id = NEW.id;
          END IF;
        -- Jika kuota tidak lagi terpenuhi (ada yang batal), set kembali ke menunggu_relawan
        ELSE
          IF NEW.status = 'relawan_terkumpul' THEN
            UPDATE missions SET status = 'menunggu_relawan', updated_at = NOW() WHERE id = NEW.id;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS after_mission_volunteers_update ON missions;
      CREATE TRIGGER after_mission_volunteers_update
      AFTER UPDATE OF volunteers_applied ON missions
      FOR EACH ROW
      EXECUTE FUNCTION auto_update_mission_status();
    `);

    console.log('Successfully updated triggers.');
  } catch (e) {
    console.error('Failed to update triggers:', e);
  } finally {
    await pool.end();
  }
}

updateTriggers();

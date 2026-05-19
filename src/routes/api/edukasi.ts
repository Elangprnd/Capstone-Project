import express, { Router } from "express";
import { 
  createEdukasiHandler, 
  updateEdukasiHandler, 
  deleteEdukasiHandler, 
  browseEdukasiHandler, 
  getEdukasiDetailHandler 
} from "../../controller/edukasi.controller";
import { authenticate, authorize } from "../../middlewares/authMiddleware";
import { upload } from "../../middlewares/upload";

const router: Router = express.Router();

// Public browse
router.get("/", browseEdukasiHandler);

// Public detail
router.get("/:id", getEdukasiDetailHandler);

// Volunteer only CRUD
router.post("/", authenticate, authorize("volunteer"), upload.single("thumbnail"), createEdukasiHandler);
router.put("/:id", authenticate, authorize("volunteer"), upload.single("thumbnail"), updateEdukasiHandler);
router.delete("/:id", authenticate, authorize("volunteer"), deleteEdukasiHandler);

export default router;

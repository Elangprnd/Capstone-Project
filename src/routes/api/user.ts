import express, { Router } from "express";
import * as userController from "../../controller/user.controller";
import { authenticate } from "../../middlewares/authMiddleware";

const router: Router = express.Router();

// Update user name
router.patch("/name", authenticate, userController.updateNameHandler);

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({ message: "get my profile endpoint", user: req.user });
});

export default router;

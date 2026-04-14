import express, { Router } from "express";
const router: Router = express.Router();

router.post("/register", (req, res) => {
  res.status(200).json({ message: "register endpoint" });
});

router.post("/login", (req, res) => {
  res.status(200).json({ message: "login endpoint" });
});

router.post("/google", (req, res) => {
  res.status(200).json({ message: "google oauth endpoint" });
});

router.post("/refresh", (req, res) => {
  res.status(200).json({ message: "refresh token endpoint" });
});

router.post("/logout", (req, res) => {
  res.status(200).json({ message: "logout endpoint" });
});

router.post("/forgot-password", (req, res) => {
  res.status(200).json({ message: "forgot password endpoint" });
});

router.post("/reset-password", (req, res) => {
  res.status(200).json({ message: "reset password endpoint" });
});

export default router;

import express, { Router } from "express";
const router: Router = express.Router();

router.get("/me", (req, res) => {
  res.status(200).json({ message: "get my profile endpoint" });
});

router.put("/me", (req, res) => {
  res.status(200).json({ message: "update my profile endpoint" });
});

router.put("/me/password", (req, res) => {
  res.status(200).json({ message: "change password endpoint" });
});

router.put("/relawan/skills", (req, res) => {
  res.status(200).json({ message: "update relawan skills endpoint" });
});

router.get("/relawan/:id", (req, res) => {
  res.status(200).json({ message: `get relawan profile id: ${req.params.id}` });
});

export default router;

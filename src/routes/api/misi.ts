import express, { Router } from "express";
const router: Router = express.Router();


router.get("/pelapor/me", (req, res) => {
  res.status(200).json({ message: "get my misi (pelapor) endpoint" });
});

router.get("/", (req, res) => {
  res.status(200).json({ message: "get all misi endpoint" });
});

router.get("/:id", (req, res) => {
  res.status(200).json({ message: `get misi detail id: ${req.params.id}` });
});

router.post("/", (req, res) => {
  res.status(200).json({ message: "create misi endpoint" });
});

router.put("/:id", (req, res) => {
  res.status(200).json({ message: `update misi id: ${req.params.id}` });
});

router.patch("/:id/status", (req, res) => {
  res.status(200).json({ message: `update status misi id: ${req.params.id}` });
});

router.delete("/:id", (req, res) => {
  res.status(200).json({ message: `delete misi id: ${req.params.id}` });
});

router.get("/:id/applicants", (req, res) => {
  res.status(200).json({ message: `get applicants misi id: ${req.params.id}` });
});

export default router;

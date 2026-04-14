import express, { Router } from "express";
const router: Router = express.Router();

// Users
router.get("/users", (req, res) => {
  res.status(200).json({ message: "admin get all users endpoint" });
});

router.patch("/users/:id/status", (req, res) => {
  res
    .status(200)
    .json({ message: `admin update user status id: ${req.params.id}` });
});

router.delete("/users/:id", (req, res) => {
  res.status(200).json({ message: `admin delete user id: ${req.params.id}` });
});

// Misi
router.get("/misi", (req, res) => {
  res.status(200).json({ message: "admin get all misi endpoint" });
});

router.delete("/misi/:id", (req, res) => {
  res.status(200).json({ message: `admin delete misi id: ${req.params.id}` });
});

// Edukasi
router.get("/edukasi", (req, res) => {
  res.status(200).json({ message: "admin get all edukasi endpoint" });
});

router.delete("/edukasi/:id", (req, res) => {
  res
    .status(200)
    .json({ message: `admin delete edukasi id: ${req.params.id}` });
});

export default router;

import express, { Router } from "express";
const router: Router = express.Router();


router.get("/me", (req, res) => {
  res.status(200).json({ message: "get my edukasi uploads endpoint" });
});

router.get("/", (req, res) => {
  res.status(200).json({ message: "get all edukasi endpoint" });
});

router.get("/:id", (req, res) => {
  res.status(200).json({ message: `get edukasi detail id: ${req.params.id}` });
});

router.post("/", (req, res) => {
  res.status(200).json({ message: "upload edukasi endpoint" });
});

router.put("/:id", (req, res) => {
  res.status(200).json({ message: `update edukasi id: ${req.params.id}` });
});

router.delete("/:id", (req, res) => {
  res.status(200).json({ message: `delete edukasi id: ${req.params.id}` });
});

export default router;

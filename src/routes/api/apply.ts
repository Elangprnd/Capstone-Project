import express, { Router } from "express";
const router: Router = express.Router();


router.get("/me", (req, res) => {
  res.status(200).json({ message: "get my applications endpoint" });
});

router.post("/", (req, res) => {
  res.status(200).json({ message: "apply misi endpoint" });
});

router.delete("/:id", (req, res) => {
  res.status(200).json({ message: `cancel apply id: ${req.params.id}` });
});

router.patch("/:id/approve", (req, res) => {
  res.status(200).json({ message: `approve apply id: ${req.params.id}` });
});

router.patch("/:id/reject", (req, res) => {
  res.status(200).json({ message: `reject apply id: ${req.params.id}` });
});

export default router;

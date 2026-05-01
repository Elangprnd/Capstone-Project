import express, { Router } from "express";
import jwt from "jsonwebtoken";
const router: Router = express.Router();

// REGISTER
router.post("/register", (req, res) => {
  const { email, password } = req.body;

  res.status(200).json({
    message: "register endpoint",
    data: { email, password },
  });
});

// LOGIN
router.post("/login", (req, res) => {
  const payload = {
  userId: 1,
  email: "dummy@email.com",
  role: "volunteer", 
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1h",
    }
  );

  res.status(200).json({
    message: "login success",
    token,
  });
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
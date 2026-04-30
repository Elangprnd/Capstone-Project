import express, { Router } from "express";
const router: Router = express.Router();

<<<<<<< HEAD
router.post("/register", (req, res) => {
  res.status(200).json({ message: "register endpoint" });
});

router.post("/login", (req, res) => {
  res.status(200).json({ message: "login endpoint" });
});

=======
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

// sisanya tetap
>>>>>>> 6aa995b (feat: setup apply mission endpoint with auth middleware (dummy response))
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
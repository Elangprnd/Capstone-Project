<<<<<<< HEAD
=======
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized - Token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    // simpan user ke request
    (req as any).user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized - Token invalid",
    });
  }
};
>>>>>>> 6aa995b (feat: setup apply mission endpoint with auth middleware (dummy response))

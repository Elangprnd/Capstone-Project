import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Middleware untuk verifikasi JWT (Handling 401)
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized - Token missing",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized - Token invalid or expired",
    });
  }
};

// Middleware untuk verifikasi Role (Handling 403)
export const authorizeRole = (allowedRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || user.role !== allowedRole) {
      return res.status(403).json({
        message: "Hanya relawan yang dapat mendaftar misi.",
      });
    }
    next();
  };
};
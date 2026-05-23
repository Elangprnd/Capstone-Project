import { Request, Response } from "express";
import { z } from "zod";
import * as userService from "../services/user.services";

const updateNameSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(255),
});

export const updateNameHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.user_id;
    const parsed = updateNameSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const updatedUser = await userService.updateName(userId, parsed.data.name);

    res.status(200).json({
      success: true,
      message: "Nama berhasil diperbarui",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error("Update name error:", error);
    if (error.message === "USER_NOT_FOUND") {
      res.status(404).json({ success: false, message: "User tidak ditemukan" });
      return;
    }
    res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
  }
};

import { NextFunction, Request, Response } from "express";
import { db } from "../../lib/db";
import jwt from "jsonwebtoken";

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET!
        ) as {
          sessionId: string;
        };

        await db.session.update({
          where: { id: decoded.sessionId },
          data: {
            isValid: false,
            revokedAt: new Date(),
            revokedReason: "User logout",
          },
        });
      } catch (error) {}
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({
      code: "LOGOUT_SUCCESS",
      message: "Successfully logged out",
    });
  } catch (error) {
    next(error);
  }
};

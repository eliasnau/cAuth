import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../lib/db";
import { createSession } from "../../utils/session";
import { generateTokens } from "../../utils/jwt";
import { setRefreshTokenCookie } from "../../utils/cookie";
import { authResponses } from "../../utils/responses";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return authResponses.invalidCredentials(res);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return authResponses.accountLocked(res);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      const updatedFailedAttempts = user.failedLoginAttempts + 1;

      const shouldLockAccount = updatedFailedAttempts >= 5;
      const lockedUntil = shouldLockAccount
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null; // 15 minutes

      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: updatedFailedAttempts,
          lockedUntil,
        },
      });

      return authResponses.invalidCredentials(res);
    }

    const session = await createSession({
      userId: user.id,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      sessionId: session.id,
      sessionToken: session.sessionToken,
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImg: user.profileImg,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

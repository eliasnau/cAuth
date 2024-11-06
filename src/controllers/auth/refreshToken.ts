import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../../lib/db";
import crypto from "crypto";
import { env } from "../../env";

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        code: "AUTH_NO_REFRESH_TOKEN",
        message: "No refresh token provided",
      });
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_TOKEN_SECRET) as {
      userId: string;
      sessionId: string;
      sessionToken: string;
    };

    const session = await db.session.findFirst({
      where: {
        id: decoded.sessionId,
        userId: decoded.userId,
        sessionToken: decoded.sessionToken,
        isValid: true,
        expires: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImg: true,
            banHistory: {
              where: {
                OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
                AND: {
                  liftedAt: null,
                },
              },
            },
          },
        },
      },
    });

    if (!session || !session.user) {
      return res.status(401).json({
        code: "AUTH_INVALID_SESSION",
        message: "Invalid or expired session",
      });
    }

    if (session.user.banHistory.length > 0) {
      await db.session.update({
        where: { id: session.id },
        data: {
          isValid: false,
          revokedAt: new Date(),
          revokedReason: "User banned",
        },
      });

      return res.status(403).json({
        code: "AUTH_USER_BANNED",
        message: "Account is banned",
      });
    }

    const newSessionToken = crypto.randomUUID();

    await db.session.update({
      where: { id: session.id },
      data: {
        lastActive: new Date(),
        sessionToken: newSessionToken,
      },
    });

    const newAccessToken = jwt.sign(
      {
        userId: session.user.id,
        sessionId: session.id,
      },
      env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: session.user.id,
        sessionId: session.id,
        sessionToken: newSessionToken,
      },
      env.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      accessToken: newAccessToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        profileImg: session.user.profileImg,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: "AUTH_INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
    }
    console.error("refreshToken error:", error);
    return res.status(500).json({
      code: "AUTH_ERROR",
      message: "Internal server error",
    });
  }
};

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../lib/db";
import { env } from "../env";

const authenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        code: "AUTH_NO_TOKEN",
        message: "No authentication token provided",
      });
    }

    const accessToken = authHeader.split(" ")[1];

    const decoded = jwt.verify(accessToken, env.JWT_ACCESS_TOKEN_SECRET) as {
      userId: string;
      sessionId: string;
    };

    // Check session first
    const session = await db.session.findFirst({
      where: {
        id: decoded.sessionId,
        isValid: true,
        revokedAt: null,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      return res.status(401).json({
        code: "AUTH_INVALID_SESSION",
        message: "Invalid or expired session",
      });
    }

    // Only fetch user if session is valid
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        profileImg: true,
        emailVerified: true,
        twoFactorEnabled: true,
        riskLevel: true,
        banHistory: {
          where: {
            OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
            AND: {
              liftedAt: null,
            },
          },
          select: {
            reason: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        code: "AUTH_USER_NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.banHistory.length > 0) {
      const ban = user.banHistory[0];
      return res.status(403).json({
        code: "AUTH_USER_BANNED",
        message: "Account is banned",
        details: {
          reason: ban.reason,
          expiresAt: ban.expiresAt,
        },
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        code: "AUTH_EMAIL_NOT_VERIFIED",
        message: "Please verify your email address to continue",
      });
    }

    // Update session last active timestamp
    await db.session.update({
      where: { id: session.id },
      data: { lastActive: new Date() },
    });

    // Attach user and session info to request for downstream handlers
    (req as any).user = user;
    (req as any).sessionId = session.id;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: "AUTH_INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }
    next(error);
  }
};

export default authenticationMiddleware;

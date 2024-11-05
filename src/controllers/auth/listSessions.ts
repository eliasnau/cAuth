import { NextFunction, Request, Response } from "express";
import { db } from "../../lib/db";

export const listSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.id;
    const currentSessionId = (req as any).sessionId;

    const sessions = await db.session.findMany({
      where: {
        userId,
        isValid: true,
        expires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        browser: true,
        operatingSystem: true,
        deviceType: true,
        isMobile: true,
        ipAddress: true,
        lastActive: true,
        createdAt: true,
      },
      orderBy: {
        lastActive: "desc",
      },
    });

    return res.json({
      sessions: sessions.map((session) => ({
        ...session,
        isCurrentSession: session.id === currentSessionId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

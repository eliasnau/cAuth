import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";
import { sessionService } from "../services/sessionService";
import { verifyAccessToken } from "../utils/jwt";
import { authResponses } from "../utils/responses";
import { JsonWebTokenError } from "jsonwebtoken";

const authenticationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        code: "AUTH_NO_TOKEN",
        message: "No authentication token provided",
      });
    }

    const accessToken = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(accessToken);

    const session = await sessionService.validateSession(
      decoded.sessionId,
      decoded.tokenVersion
    );
    if (!session) {
      return res.status(401).json({
        code: "AUTH_INVALID_SESSION",
        message: "Invalid or expired session",
      });
    }

    const user = await authService.getUserAuth(decoded.userId);
    if (!user) {
      return res.status(401).json({
        code: "AUTH_USER_NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.banHistory && user.banHistory.length > 0) {
      const ban = user.banHistory[0];
      return authResponses.userBanned(res, ban.reason, ban.expiresAt);
    }

    if (!user.emailVerified) {
      return authResponses.emailNotVerified(res);
    }

    await sessionService.updateSessionActivity(session.id);

    // Attach user and session info to request
    (req as any).user = user;
    (req as any).sessionId = session.id;

    next();
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({
        code: "AUTH_INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }
    next(error);
  }
};

export default authenticationMiddleware;

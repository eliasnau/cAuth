import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UAParser from "ua-parser-js";
import { db } from "../../lib/db";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({
        message: "Account is temporarily locked. Please try again later",
      });
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

      return res.status(401).json({ message: "Invalid credentials" });
    }

    //! UAParser error
    const parser = UAParser(req.headers["user-agent"]);
    const userAgent = parser.getResult();

    const session = await db.session.create({
      data: {
        userId: user.id,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        browser: userAgent.browser.name,
        operatingSystem: userAgent.os.name,
        deviceType: userAgent.device.type || "desktop",
        isMobile: !!userAgent.device.type,
        sessionToken: crypto.randomUUID(),
      },
    });

    const accessToken = jwt.sign(
      {
        userId: user.id,
        sessionId: session.id,
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        sessionId: session.id,
        sessionToken: session.sessionToken,
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "7d" }
    );

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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
    next(error);
  }
};

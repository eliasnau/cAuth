import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UAParser } from "ua-parser-js";
import { db } from "../../lib/db";
import crypto from "crypto";
import { sendVerificationEmail } from "../../lib/email";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        riskLevel: "LOW",
        maxActiveSessions: 5,
        notifyOnNewLogin: true,
        backupCodes: [],
        emailVerificationToken,
      },
    });

    await sendVerificationEmail(user.email, emailVerificationToken);

    // Fix UAParser usage
    const parser = new UAParser();
    parser.setUA(req.headers["user-agent"] as string);
    const userAgent = parser.getResult();

    const session = await db.session.create({
      data: {
        userId: user.id,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        browser: userAgent.browser.name,
        operatingSystem: userAgent.os.name,
        deviceType: userAgent.device.type || "unknown",
        isMobile: !!userAgent.device.type,
        sessionToken: crypto.randomUUID(),
        trustedDevice: true,
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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      message:
        "Registration successful. Please check your email to verify your account.",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

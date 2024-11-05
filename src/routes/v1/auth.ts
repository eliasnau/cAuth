import express from "express";
import {
  authenticateUser,
  changePassword,
  login,
  logout,
  refreshToken,
  register,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  revokeAllSessions,
  listSessions,
  verifyEmail,
} from "../../controllers/auth";
import authenticationMiddleware from "../../middleware/authMiddleware";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/refresh-token", refreshToken);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);

router.get("/me", authenticationMiddleware, authenticateUser);
router.post("/logout", authenticationMiddleware, logout);
router.post("/change-password", authenticationMiddleware, changePassword);
router.get("/sessions", authenticationMiddleware, listSessions);
router.delete("/sessions/:sessionId", authenticationMiddleware, revokeSession);
router.delete("/sessions", authenticationMiddleware, revokeAllSessions);

export default router;

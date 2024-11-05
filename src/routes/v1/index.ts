import express from "express";
import authenticationMiddleware from "../../middleware/authMiddleware";
import auth from "./auth";

const router = express.Router();

router.use("/auth", auth);

export default router;

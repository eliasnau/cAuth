import express from "express";
import { index, store, show, update } from "../../controllers/index";
import authenticationMiddleware from "../../middleware/authMiddleware";
import auth from "./auth";

const router = express.Router();

router.use("/auth", auth);

router.get("/users/", authenticationMiddleware, index);
router.post("/users/", authenticationMiddleware, store);
router.get("/users/:id", authenticationMiddleware, show);
router.put("/users/:id", authenticationMiddleware, update);

export default router;

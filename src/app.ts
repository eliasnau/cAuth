import dotenv from "dotenv";
dotenv.config();

import express from "express";
import webRoutes from "./routes/web";
import errorHandler from "./middleware/errorHandler";
import cookieParser from "cookie-parser";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use("/", webRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

import express from "express";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error";
import router from "./routes/indexRoutes";

const app = express();

app.use(express.json());
app.use(cookieParser());

export default app;

app.use("/api", router);

app.use(errorMiddleware);

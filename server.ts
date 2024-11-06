import { Response } from "express";
import app from "./app";

app.route("/").get((res: Response) => {
  res.status(200).json({
    success: true,
    message: "Yoo, Server is working!",
  });
});

app.listen(6000, () => {
  console.log("Server is running");
});

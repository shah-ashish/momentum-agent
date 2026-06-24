import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import chalk from "chalk";
import userRouter from "./user/routes.js";
import serviceRouter from "./service/chatRoutes.js";
import notificationRouter from "./notification/routes.js";
import { startNotificationScheduler } from "./notification/service.js";
import { connectToDB } from "./db.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/user", userRouter);
app.use("/service", serviceRouter);
app.use("/service/notifications", notificationRouter);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Connect to Database and start server
async function startServer() {
  await connectToDB();
  
  if (!process.env.VERCEL) {
    startNotificationScheduler();
    app.listen(80, () => {
        console.log(chalk.cyan("🚀 Server is running on port 80"));
    });
  } else {
    console.log(chalk.cyan("🚀 Running in Vercel Serverless environment"));
  }
}

startServer();

export default app;
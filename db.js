import mongoose from "mongoose";
import chalk from "chalk";

/**
 * Connect to MongoDB Database.
 */
export async function connectToDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/agent-server";
  
  try {
    await mongoose.connect(uri);
    console.log(chalk.green("\n✔ Connected to MongoDB successfully."));
  } catch (error) {
    console.error(chalk.red("\n✖ Failed to connect to MongoDB:"), chalk.red.bold(error.message));
    console.log(chalk.yellow("⚠️ Please make sure MongoDB Server is running on your machine.\n"));
    process.exit(1);
  }
}

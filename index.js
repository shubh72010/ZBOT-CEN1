import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { configRouter } from "./auth.js";
import "./bot.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Directory fixes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/auth", configRouter); // handles Discord OAuth and key form

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
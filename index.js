import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express server setup
const app = express();
const PORT = process.env.PORT || 10000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Default route: serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start web server
app.listen(PORT, () => {
  console.log(`Web server live on http://localhost:${PORT}`);
});

// Discord bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Basic reply (example)
client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.reply("Pong!");
  }
});

// Login using token from .env
client.login(process.env.DISCORD_TOKEN);
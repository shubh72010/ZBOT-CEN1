import { Client, GatewayIntentBits } from "discord.js";
import { store } from "./store.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const apiKey = store[msg.guild.id];
  if (!apiKey) return msg.reply("No API key set for this server.");

  // Fake call to Groq/OpenRouter (replace with actual API call)
  msg.reply(`Your Groq key ends with: ${apiKey.slice(-4)}`);
});

client.login(process.env.DISCORD_TOKEN);
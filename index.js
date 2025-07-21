import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

// Discord bot setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const apiKeys = {}; // In-memory store: guildId -> apiKey (swap with DB later)

client.once('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
});

// Listen to messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;
  const key = apiKeys[guildId];

  if (!key) {
    message.reply('❌ No Groq API key set for this server yet.');
    return;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192', // or your default
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: message.content }
        ],
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;

    if (reply) {
      message.reply(reply);
    } else {
      message.reply('❌ Groq did not return a response.');
      console.error(data);
    }
  } catch (err) {
    console.error(err);
    message.reply('⚠️ Error calling Groq API.');
  }
});

// Express setup
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Handle saving API key via POST
app.post('/save-key', (req, res) => {
  const { apiKey, guildId } = req.body;

  if (!apiKey || !guildId) {
    return res.status(400).send('Missing fields');
  }

  apiKeys[guildId] = apiKey;
  console.log(`✅ Saved key for guild ${guildId}`);
  res.send({ message: `Your Groq key ends with: ${apiKey.slice(-4)}` });
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server live at http://localhost:${PORT}`);
});
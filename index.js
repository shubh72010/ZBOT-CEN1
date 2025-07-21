import { Client, GatewayIntentBits, Partials, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

config();

// Firebase Setup
const firebaseConfig = {
  apiKey: "AIzaSyAmD9lC7CGAn4zUgM59IAXXmVam3N8Vr1o",
  authDomain: "zbots-90001.firebaseapp.com",
  projectId: "zbots-90001",
  storageBucket: "zbots-90001.appspot.com",
  messagingSenderId: "517190005064",
  appId: "1:517190005064:web:e849a5ec88a84b752d837d",
  measurementId: "G-JXG10W9DN7"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Discord Client Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder()
    .setName('setkey')
    .setDescription('Set your Groq API key')
    .addStringOption(option =>
      option.setName('key')
        .setDescription('Your Groq API key')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guilds = await client.guilds.fetch();
    for (const [guildId] of guilds) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
    }
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Failed to register slash commands:', err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setkey') {
    const apiKey = interaction.options.getString('key');
    const guildId = interaction.guildId;

    try {
      await setDoc(doc(db, 'keys', guildId), {
        apiKey
      });

      const last4 = apiKey.slice(-4);
      await interaction.reply({ content: `✅ Saved your API key ending with \`${last4}\``, ephemeral: true });
    } catch (err) {
      console.error('🔥 Failed to save key:', err);
      await interaction.reply({ content: `❌ Failed to save key`, ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const keyDoc = await getDoc(doc(db, 'keys', guildId));

  if (!keyDoc.exists()) return;

  const userKey = keyDoc.data().apiKey;
  const userMessage = message.content;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are a helpful Discord bot.' },
          { role: 'user', content: userMessage }
        ]
      })
    });

    const data = await res.json();

    const reply = data?.choices?.[0]?.message?.content;
    if (reply) {
      await message.reply(reply);
    } else {
      await message.reply('⚠️ No response from model.');
    }
  } catch (err) {
    console.error('🔥 Error fetching from Groq:', err);
    await message.reply('❌ Error generating response.');
  }
});

client.login(process.env.DISCORD_TOKEN);

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000; // Replit, Render, Railway use PORT env var

app.get('/', (req, res) => {
  res.send('👋 Bot is alive and running.');
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});
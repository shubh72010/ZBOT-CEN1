import { Client, GatewayIntentBits, Partials, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import express from 'express';

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

// Utility: AES-256-CBC Key Encryption (Node v20+ safe)
const algorithm = 'aes-256-cbc';
const ivLength = 16;
const key = crypto.createHash('sha256').update(String(process.env.ENCRYPTION_SECRET)).digest();

function encryptKey(text) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptKey(encryptedText) {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

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
    ),
  new SlashCommandBuilder()
    .setName('removekey')
    .setDescription('Remove your saved Groq API key')
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

  const guildId = interaction.guildId;

  if (interaction.commandName === 'setkey') {
    const apiKey = interaction.options.getString('key');
    const encrypted = encryptKey(apiKey);

    try {
      await setDoc(doc(db, 'keys', guildId), { apiKey: encrypted });

      const last4 = apiKey.slice(-4);
      await interaction.reply({ content: `✅ Saved your API key ending with \`${last4}\``, ephemeral: true });
    } catch (err) {
      console.error('🔥 Failed to save key:', err);
      await interaction.reply({ content: `❌ Failed to save key`, ephemeral: true });
    }

  } else if (interaction.commandName === 'removekey') {
    try {
      await deleteDoc(doc(db, 'keys', guildId));
      await interaction.reply({ content: `🗑️ Your API key has been removed.`, ephemeral: true });
    } catch (err) {
      console.error('🔥 Failed to remove key:', err);
      await interaction.reply({ content: `❌ Failed to remove key`, ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;

  const botMentioned = message.mentions.has(client.user);
  if (!botMentioned) return;

  const guildId = message.guild.id;
  const keyDoc = await getDoc(doc(db, 'keys', guildId));

  if (!keyDoc.exists()) {
    await message.reply('❌ No API key set. Use `/setkey` to add your Groq key.');
    return;
  }

  const encryptedKey = keyDoc.data().apiKey;
  const apiKey = decryptKey(encryptedKey);
  const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

// Express to keep port open on Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('👋 ZBØT is alive and running.');
});

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
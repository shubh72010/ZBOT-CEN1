import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config();

// Firebase Config
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

// Discord Setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const commands = [
  new SlashCommandBuilder()
    .setName('setkey')
    .setDescription('Set your Groq API key')
    .addStringOption(opt =>
      opt.setName('key').setDescription('Your Groq API key').setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guildId = process.env.GUILD_ID;
    const clientId = client.user.id;
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('📌 Slash commands registered.');
  } catch (err) {
    console.error('❌ Command registration error:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setkey') {
    const userKey = interaction.options.getString('key');
    const userId = interaction.user.id;

    try {
      await setDoc(doc(db, 'user_keys', userId), { key: userKey });
      const last4 = userKey.slice(-4);
      await interaction.reply(`✅ API key saved. Ends with: \`${last4}\``);
    } catch (err) {
      await interaction.reply('❌ Failed to save API key.');
      console.error(err);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  try {
    const docSnap = await getDoc(doc(db, 'user_keys', message.author.id));
    if (!docSnap.exists()) return;

    const userKey = docSnap.data().key;
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: message.content }]
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "❌ Error in response.";
    message.reply(reply);
  } catch (err) {
    console.error(err);
    message.reply("❌ Something went wrong.");
  }
});

client.login(process.env.DISCORD_TOKEN);
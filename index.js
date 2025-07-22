import { Client, GatewayIntentBits, Partials, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Firebase setup
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Encryption setup
const ALGO = 'aes-256-cbc';
const ENC_KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_SECRET).digest(); // 32 bytes key
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Discord setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const commands = [
  new SlashCommandBuilder()
    .setName('setkey')
    .setDescription('Store your Groq API key securely')
    .addStringOption(option =>
      option.setName('key')
        .setDescription('Your Groq API key')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('removekey')
    .setDescription('Remove your stored Groq API key'),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Slash commands registered');
  } catch (err) {
    console.error(err);
  }
})();

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const command = interaction.commandName;

  if (command === 'setkey') {
    const key = interaction.options.getString('key');
    try {
      const encryptedKey = encrypt(key);
      const userDoc = doc(db, 'keys', userId);
      await setDoc(userDoc, { apiKey: encryptedKey });
      await interaction.reply({ content: '✅ Your API key has been securely stored.', ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Failed to store key. Try again later.', ephemeral: true });
    }
  }

  if (command === 'removekey') {
    try {
      const userDoc = doc(db, 'keys', userId);
      await deleteDoc(userDoc);
      await interaction.reply({ content: '🗑️ Your API key has been removed.', ephemeral: true });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Failed to remove key.', ephemeral: true });
    }
  }
});

// Respond only to pings
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.mentions.has(client.user)) return;

  const userId = message.author.id;
  const userDoc = doc(db, 'keys', userId);
  const docSnap = await getDoc(userDoc);

  if (!docSnap.exists()) {
    return message.reply('🔑 You need to set your API key first using `/setkey`.');
  }

  const encryptedKey = docSnap.data().apiKey;
  const apiKey = decrypt(encryptedKey);

  // Here you'd add your actual API logic using the key
  return message.reply(`Hey <@${userId}>, I received your ping! (Key decrypted & ready to use ✅)`);
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
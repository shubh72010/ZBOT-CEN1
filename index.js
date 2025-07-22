import { Client, GatewayIntentBits, REST, Routes, Events } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import express from 'express';
import crypto from 'crypto';
import 'dotenv/config';

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// --- Discord Bot Setup ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const commands = [
  {
    name: 'removekey',
    description: 'Remove your API key from the bot’s database.'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// --- Register Slash Commands ---
(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();

// --- Utility: Key encryption ---
function encryptKey(key) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_SECRET);
  let encrypted = cipher.update(key, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// --- Utility: Decrypt key (not used yet but good to have) ---
function decryptKey(encrypted) {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_SECRET);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- Bot Logic: Respond only to mentions ---
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const botWasMentioned = message.mentions.has(client.user);
  if (!botWasMentioned) return;

  await message.reply('👋 I only respond to mentions and slash commands!');
});

// --- Slash Command: /removekey ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  if (interaction.commandName === 'removekey') {
    try {
      const docRef = doc(db, 'userKeys', userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await interaction.reply({ content: '❌ No key found to remove.', ephemeral: true });
        return;
      }

      await deleteDoc(docRef);
      await interaction.reply({ content: '✅ Your key has been removed.', ephemeral: true });
    } catch (err) {
      console.error('❌ Error removing key:', err);
      await interaction.reply({ content: '⚠️ Something went wrong while removing your key.', ephemeral: true });
    }
  }
});

// --- Keep Port Open: Web Server ---
const app = express();
app.get('/', (req, res) => res.send('ZBØT is alive and breathing.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Port open at http://localhost:${PORT}`));

// --- Login Bot ---
client.login(process.env.DISCORD_BOT_TOKEN);
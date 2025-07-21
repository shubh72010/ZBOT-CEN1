const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const bodyParser = require("body-parser");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const { firebaseConfig } = require("./firebase");

const app = express();
initializeApp(firebaseConfig);
const db = getFirestore();

const scopes = ["identify"];

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: "/auth/discord/callback",
      scope: scopes,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Login via Discord
app.get("/auth/discord", passport.authenticate("discord"));

// OAuth2 callback
app.get("/auth/discord/callback", passport.authenticate("discord", { failureRedirect: "/" }), (req, res) => {
  res.redirect(`/setup`);
});

// User submits Groq API key
app.post("/submit-key", async (req, res) => {
  if (!req.user) return res.status(401).send("Not logged in");
  const { groqKey } = req.body;
  const userId = req.user.id;
  try {
    await setDoc(doc(db, "users", userId), { groqKey });
    res.send("Key saved");
  } catch (err) {
    res.status(500).send("Error saving key");
  }
});

// Serve post-login page
app.get("/setup", (req, res) => {
  if (!req.user) return res.redirect("/");
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(3000, () => console.log("Server on http://localhost:3000"));

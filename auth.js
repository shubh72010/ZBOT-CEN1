import express from "express";
import { store } from "./store.js";

export const configRouter = express.Router();

configRouter.post("/save", (req, res) => {
  const { guildId, apiKey } = req.body;
  if (!guildId || !apiKey) return res.status(400).send("Missing data");

  store[guildId] = apiKey;
  res.send("API key saved for guild: " + guildId);
});
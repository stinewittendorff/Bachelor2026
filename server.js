const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3009;

app.use(express.json());

function loadCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, "beckn-catalog.json"), "utf8");
  return JSON.parse(raw);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/webhook", (req, res) => {
  const body = req.body || {};
  const action = body?.context?.action;

  console.log("Webhook called");
  console.log("Action:", action);
  console.log("Body:", JSON.stringify(body, null, 2));

  if (action === "search") {
    const catalog = loadCatalog();

    console.log("Returning catalog from webhook");
    console.log(JSON.stringify(catalog.message, null, 2));

    return res.json(catalog.message);
  }

  return res.status(400).json({
    error: `Unsupported action: ${action}`
  });
});

app.listen(PORT, () => {
  console.log(`Catalog service running on http://localhost:${PORT}`);
});
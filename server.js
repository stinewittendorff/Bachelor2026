const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

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

  if (action === "search") {
    const catalog = loadCatalog();

    return res.json({
      context: {
        ...body.context,
        action: "on_search",
        timestamp: new Date().toISOString()
      },
      ...catalog
    });
  }

  return res.status(400).json({
    error: `Unsupported action: ${action}`
  });
});

app.listen(PORT, () => {
  console.log('catalog service running on http://localhost:${PORT}');
});
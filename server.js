const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3009;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

function loadCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, "beckn-catalog.json"), "utf8");
  return JSON.parse(raw);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// added search endpoint for the UI 
app.get("/search", (req, res) => {
  const query = (req.query.q || "").toLowerCase();
  const catalog = loadCatalog();
  const providers = catalog.message.catalog.providers;

  const results = [];

  for (const provider of providers) {
    for (const item of provider.items) {
      const medicine = {
        id: item.id,
        name: item.descriptor.name || "",
        provider: provider.descriptor.name || "",
        price: item.price.value || "",
        currency: item.price.currency || ""
      };

      if (
        medicine.name.toLowerCase().includes(query) ||
        medicine.provider.toLowerCase().includes(query)
      ) {
        results.push(medicine);
      }
    }
  }
  res.json(results);
});


app.post("/webhook", (req, res) => {
  const body = req.body || {};
  const action = body?.context?.action;

  console.log("Endpoint called");
  console.log("Action:", action);
  console.log("Body:", JSON.stringify(body, null, 2));

  if (action === "search") {
  const catalog = loadCatalog();

  const response = {
    context: {
      domain: body?.context?.domain || "retail:1.1.0",
      location: {
        city: {
          code: body?.context?.city || "std:080"
        },
        country: {
          code: body?.context?.country || "IND"
        }
      },
      action: "on_search",
      core_version: body?.context?.core_version || "1.1.0",
      version: body?.context?.version || "1.1.0",
      bap_id: body?.context?.bap_id,
      bap_uri: body?.context?.bap_uri,
      bpp_id: body?.context?.bpp_id,
      bpp_uri: body?.context?.bpp_uri,
      transaction_id: body?.context?.transaction_id,
      message_id: body?.context?.message_id,
      timestamp: new Date().toISOString(),
      ttl: body?.context?.ttl || "PT10M"
    },
    message: {
      catalog: catalog.message.catalog
    }
  };
  console.log("Returning response from webhook");
  console.log(JSON.stringify(response, null, 2));

  return res.json(response);
}

  return res.status(400).json({
    error: `Unsupported action: ${action}`
  });
});


app.listen(PORT, () => {
  console.log(`Catalog service running on http://localhost:${PORT}`);
});
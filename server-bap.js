const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3009;
const HOST = "0.0.0.0";

const BPP_WEBHOOK_URL = "https://onix-bpp-client.beckn-med.dk/webhook";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", role: "BAP" });
});

// SEARCH
app.get("/search", async (req, res) => {
  const query = req.query.q || "";

  const searchPayload = {
    context: {
      action: "search",
      domain: "retail:1.1.0",
      bap_id: "onix-bap-client.beckn-med.dk",
      bap_uri: "https://onix-bap-client.beckn-med.dk",
      bpp_id: "onix-bpp-client.beckn-med.dk",
      bpp_uri: "https://onix-bpp-client.beckn-med.dk",
      transaction_id: `tx-search-${Date.now()}`,
      message_id: `msg-search-${Date.now()}`
    },
    message: {
      intent: {
        item: {
          descriptor: {
            name: query
          }
        }
      }
    }
  };

  try {
    const bppResponse = await fetch(BPP_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(searchPayload)
    });

    const onSearch = await bppResponse.json();
    const results = [];

    for (const provider of onSearch.message?.catalog?.providers || []) {
      const location = provider.locations?.[0]?.descriptor?.name || "";

      for (const item of provider.items || []) {
        results.push({
          id: item.id,
          providerId: provider.id,
          name: item.descriptor?.name || "",
          provider: provider.descriptor?.name || "",
          location,
          price: item.price?.value || "",
          currency: item.price?.currency || "",
          stockStatus: item.stock?.status || "unknown",
          stockCount: item.stock?.count ?? 0
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("BAP search failed:", error);
    res.status(500).json({
      error: "BAP could not complete search request",
      details: error.message
    });
  }
});

// SELECT
app.post("/select", async (req, res) => {
  const { providerId, itemId } = req.body || {};

  if (!providerId || !itemId) {
    return res.status(400).json({
      error: "providerId and itemId are required"
    });
  }

  const selectPayload = {
    context: {
      action: "select",
      domain: "retail:1.1.0",
      bap_id: "onix-bap-client.beckn-med.dk",
      bap_uri: "https://onix-bap-client.beckn-med.dk",
      bpp_id: "onix-bpp-client.beckn-med.dk",
      bpp_uri: "https://onix-bpp-client.beckn-med.dk",
      transaction_id: `tx-select-${Date.now()}`,
      message_id: `msg-select-${Date.now()}`
    },
    message: {
      order: {
        provider: {
          id: providerId
        },
        items: [
          {
            id: itemId
          }
        ]
      }
    }
  };

  try {
    const bppResponse = await fetch(BPP_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(selectPayload)
    });

    const onSelect = await bppResponse.json();
    res.json(onSelect);
  } catch (error) {
    console.error("BAP select failed:", error);
    res.status(500).json({
      error: "BAP could not complete select request",
      details: error.message
    });
  }
});

// INIT
app.post("/init", async (req, res) => {
  const { providerId, itemId, quantity = 1 } = req.body || {};

  if (!providerId || !itemId) {
    return res.status(400).json({
      error: "providerId and itemId are required"
    });
  }

  const initPayload = {
    context: {
      action: "init",
      domain: "retail:1.1.0",
      bap_id: "onix-bap-client.beckn-med.dk",
      bap_uri: "https://onix-bap-client.beckn-med.dk",
      bpp_id: "onix-bpp-client.beckn-med.dk",
      bpp_uri: "https://onix-bpp-client.beckn-med.dk",
      transaction_id: `tx-init-${Date.now()}`,
      message_id: `msg-init-${Date.now()}`
    },
    message: {
      order: {
        provider: {
          id: providerId
        },
        items: [
          {
            id: itemId,
            quantity: {
              count: quantity
            }
          }
        ],
        fulfillment: {
          type: "Delivery"
        },
        payment: {
          type: "PRE-FULFILLMENT"
        }
      }
    }
  };

  try {
    const bppResponse = await fetch(BPP_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(initPayload)
    });

    const onInit = await bppResponse.json();
    res.json(onInit);
  } catch (error) {
    console.error("BAP init failed:", error);
    res.status(500).json({
      error: "BAP could not complete init request",
      details: error.message
    });
  }
});

// Confirm
app.post("/confirm", async (req, res) => {
  const { providerId, itemId, quantity = 1 } = req.body || {};

  if (!providerId || !itemId) {
    return res.status(400).json({
      error: "providerId and itemId are required"
    });
  }

  const confirmPayload = {
    context: {
      action: "confirm",
      domain: "retail:1.1.0",
      bap_id: "onix-bap-client.beckn-med.dk",
      bap_uri: "https://onix-bap-client.beckn-med.dk",
      bpp_id: "onix-bpp-client.beckn-med.dk",
      bpp_uri: "https://onix-bpp-client.beckn-med.dk",
      transaction_id: `tx-confirm-${Date.now()}`,
      message_id: `msg-confirm-${Date.now()}`
    },
    message: {
      order: {
        provider: {
          id: providerId
        },
        items: [
          {
            id: itemId,
            quantity: {
              count: quantity
            }
          }
        ],
        fulfillment: {
          type: "pickup"
        },
        payment: {
          type: "PRE-FULFILLMENT"
        }
      }
    }
  };

  try {
    const bppResponse = await fetch(BPP_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(confirmPayload)
    });

    const onConfirm = await bppResponse.json();
    res.json(onConfirm);
  } catch (error) {
    console.error("BAP confirm failed:", error);
    res.status(500).json({
      error: "BAP could not complete confirm request",
      details: error.message
    });
  }
});


app.listen(PORT, HOST, () => {
  console.log(`BAP service running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});
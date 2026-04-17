const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3009;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, "beckn-catalog.json"), "utf8");
  return JSON.parse(raw);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/catalog", (req, res) => {
  const catalog = loadCatalog();
  res.json(catalog);
});


app.get("/search", (req, res) => {
  const query = (req.query.q || "").toLowerCase();
  const catalog = loadCatalog();
  const providers = catalog.message.catalog.providers;

  const results = [];

  for (const provider of providers) {
    for (const item of provider.items) {
      const medicine = {
        id: item.id,
        name: item.descriptor?.name || "",
        provider: provider.descriptor?.name || "",
        providerId: provider.id, 
        location: provider.locations?.[0]?.descriptor?.name || "",
        price: item.price?.value || "",
        currency: item.price?.currency || "",
        stockStatus: item.stock?.status || "unknown",
        stockCount: item.stock?.count ?? 0
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

    const query =
      body?.message?.intent?.item?.descriptor?.name?.toLowerCase() || "";

    const filteredProviders = [];

    for (const provider of catalog.message.catalog.providers || []) {
      const matchingItems = [];

      for (const item of provider.items || []) {
        const itemName = item.descriptor?.name?.toLowerCase() || "";
        const providerName = provider.descriptor?.name?.toLowerCase() || "";

        if (
          query === "" ||
          itemName.includes(query) ||
          providerName.includes(query)
        ) {
          matchingItems.push(item);
        }
      }

      if (matchingItems.length > 0) {
        filteredProviders.push({
          ...provider,
          items: matchingItems
        });
      }
    }

    const response = {
      context: {
        domain: body?.context?.domain || "retail:1.1.0",
        location: {
          city: {
            code: body?.context?.city || "std:080"
          },
          country: {
            code: body?.context?.country || "DNK"
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
        catalog: {
          ...catalog.message.catalog,
          providers: filteredProviders
        }
      }
    };

    console.log("Returning on_search response");
    console.log(JSON.stringify(response, null, 2));

    return res.json(response);
  }

  if (action === "select") {
    const catalog = loadCatalog();

    const selectedProviderId = body?.message?.order?.provider?.id;
    const selectedItemId = body?.message?.order?.items?.[0]?.id;

    if (!selectedProviderId || !selectedItemId) {
      return res.status(400).json({
        error: "Missing provider id or item id in select request",
        expectedShape: {
          message: {
            order: {
              provider: { id: "apotek_03" },
              items: [{ id: "1004" }]
            }
          }
        }
      });
    }

    let selectedProvider = null;
    let selectedItem = null;

    for (const provider of catalog.message.catalog.providers || []) {
      if (provider.id !== selectedProviderId) {
        continue;
      }

      for (const item of provider.items || []) {
        if (item.id === selectedItemId) {
          selectedProvider = provider;
          selectedItem = item;
          break;
        }
      }

      if (selectedProvider && selectedItem) {
        break;
      }
    }

    if (!selectedProvider || !selectedItem) {
      return res.status(404).json({
        error: "Selected provider or item not found",
        providerId: selectedProviderId,
        itemId: selectedItemId
      });
    }

    
    const stockStatus = selectedItem.stock?.status || "unknown";
    const stockCount = selectedItem.stock?.count ?? 0;
    const isSelectable = stockStatus !== "out_of_stock" && stockCount > 0;

    const response = {
      context: {
        domain: body?.context?.domain || "retail:1.1.0",
        location: {
          city: {
            code: body?.context?.city || "std:080"
          },
          country: {
            code: body?.context?.country || "DNK"
          }
        },
        action: "on_select",
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
        order: {
          provider: {
            id: selectedProvider.id,
            descriptor: selectedProvider.descriptor,
            locations: selectedProvider.locations
          },
          items: [
            selectedItem
          ],

          
          quote: {
            price: {
              currency: selectedItem.price?.currency || "DKK",
              value: selectedItem.price?.value || "0.00"
            },
            breakup: [
              {
                title: selectedItem.descriptor?.name || "Selected item",
                price: {
                  currency: selectedItem.price?.currency || "DKK",
                  value: selectedItem.price?.value || "0.00"
                }
              }
            ]
          },

          
          selection_status: {
            selectable: isSelectable,
            stock_status: stockStatus,
            stock_count: stockCount,
            message: isSelectable
              ? "Item can be selected"
              : "Item is out of stock and cannot be selected"
          }
        }
      }
    };

    console.log("Returning on_select response");
    console.log(JSON.stringify(response, null, 2));

    return res.json(response);
  }

  return res.status(400).json({
    error: `Unsupported action: ${action}`
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Catalog service running on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});
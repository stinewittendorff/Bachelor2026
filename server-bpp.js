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

// Gemmer seneste flow til UI
let latestFlow = {
  action: null,
  request: null,
  response: null,
  timestamp: null
};

const orders = new Map();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/catalog", (req, res) => {
  const catalog = loadCatalog();
  res.json(catalog);
});

app.get("/latest-flow", (req, res) => {
  res.json(latestFlow);
});

// WEBHOOK
app.post("/webhook", (req, res) => {
  const body = req.body || {};
  const action = body?.context?.action;

  console.log("Endpoint called");
  console.log("Action:", action);
  console.log("Body:", JSON.stringify(body, null, 2));

  // SEARCH
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
        ...body.context,
        action: "on_search",
        timestamp: new Date().toISOString()
      },
      message: {
        catalog: {
          ...catalog.message.catalog,
          providers: filteredProviders
        }
      }
    };

    latestFlow = {
      action: "search",
      request: body,
      response,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  }

  // SELECT
  if (action === "select") {
    const catalog = loadCatalog();

    const providerId = body?.message?.order?.provider?.id;
    const itemId = body?.message?.order?.items?.[0]?.id;

    const providers = catalog.message.catalog.providers || [];
    const provider = providers.find(p => p.id === providerId);
    const item = provider?.items.find(i => i.id === itemId);

    if (!provider || !item) {
      return res.status(404).json({
        error: "Selected provider or item not found"
      });
    }

    const response = {
      context: {
        ...body.context,
        action: "on_select",
        timestamp: new Date().toISOString()
      },
      message: {
        order: {
          provider: {
            id: provider.id,
            descriptor: provider.descriptor,
            locations: provider.locations
          },
          items: [item],
          quote: {
            price: item.price
          },
          selection_status: {
            selectable: item.stock?.status !== "out_of_stock",
            message: "Item selected"
          }
        }
      }
    };

    latestFlow = {
      action: "select",
      request: body,
      response,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  }

  // INIT
  if (action === "init") {
    const catalog = loadCatalog();
    const order = body?.message?.order || {};

    const providerId = order?.provider?.id;
    const itemId = order?.items?.[0]?.id;
    const quantity = order?.items?.[0]?.quantity?.count || 1;

    const providers = catalog.message.catalog.providers || [];
    const provider = providers.find(p => p.id === providerId);
    const item = provider?.items.find(i => i.id === itemId);

    if (!provider || !item) {
      return res.status(404).json({
        error: "Provider or item not found"
      });
    }

    if (item?.stock?.status === "out_of_stock") {
      return res.status(400).json({
        error: "Item is out of stock"
      });
    }

    const totalPrice = (Number(item.price.value) * quantity).toFixed(2);

    const response = {
      context: {
        ...body.context,
        action: "on_init",
        timestamp: new Date().toISOString()
      },
      message: {
        order: {
          id: `draft-${Date.now()}`,
          state: "Initialized",
          provider: {
            id: provider.id,
            descriptor: provider.descriptor,
            locations: provider.locations
          },
          items: [
            {
              id: item.id,
              descriptor: item.descriptor,
              quantity: {
                count: quantity
              },
              price: item.price
            }
          ],
          fulfillment: order.fulfillment || {
            type: "Delivery"
          },
          payment: {
            type: order?.payment?.type || "PRE-FULFILLMENT",
            status: "NOT-PAID"
          },
          quote: {
            price: {
              currency: item.price.currency,
              value: totalPrice
            }
          }
        }
      }
    };

    orders.set(response.message.order.id, response.message.order);

    latestFlow = {
      action: "init",
      request: body,
      response,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  }

    // CONFIRM
  if (action === "confirm") {
    const catalog = loadCatalog();
    const order = body?.message?.order || {};

    const providerId = order?.provider?.id;
    const itemId = order?.items?.[0]?.id;
    const quantity = order?.items?.[0]?.quantity?.count || 1;

    const providers = catalog.message.catalog.providers || [];
    const provider = providers.find(p => p.id === providerId);
    const item = provider?.items.find(i => i.id === itemId);

    if (!provider || !item) {
      return res.status(404).json({
        error: "Provider or item not found"
      });
    }

    if (item?.stock?.status === "out_of_stock") {
      return res.status(400).json({
        error: "Item is out of stock"
      });
    }

    const totalPrice = (Number(item.price.value) * quantity).toFixed(2);

    const response = {
      context: {
        ...body.context,
        action: "on_confirm",
        timestamp: new Date().toISOString()
      },
      message: {
        order: {
          id: `order-${Date.now()}`,
          state: "CONFIRMED_PROTOTYPE_ONLY",
          provider: {
            id: provider.id,
            descriptor: provider.descriptor,
            locations: provider.locations
          },
          items: [
            {
              id: item.id,
              descriptor: item.descriptor,
              quantity: {
                count: quantity
              },
              price: item.price,
              stock: item.stock
            }
          ],
          payment: {
            type: order?.payment?.type || "PRE-FULFILLMENT",
            status: "NOT-IMPLEMENTED"
          },
          fulfillment: order.fulfillment || {
            type: "pickup",
            state: {
              descriptor: {
                name: "Order placed"
              }
            }
          },
          quote: {
            price: {
              currency: item.price.currency,
              value: totalPrice
            }
          },
          confirmation_status: {
            confirmed: true,
            message: "Prototype order confirmed"
          }
        }
      }
    };

    orders.set(response.message.order.id, response.message.order);

    latestFlow = {
      action: "confirm",
      request: body,
      response,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  }

  //STATUS
  if (action === "status") {
    const orderId = body?.message?.order?.id;
    const existingOrder = orders.get(orderId);

    if (!orderId) {
      return res.status(400).json({
        error: "Missing prototype order id in status request"
      });
    }

    if (!existingOrder) {
      return res.status(404).json({
        error: "Prototype order not found",
        orderId: orderId
      });
    }

    let fulfillmentStateName = "Order placed";

    if (existingOrder.fulfillment?.type === "Pickup") {
      fulfillmentStateName = "Ready for pickup";
    } else if (existingOrder.fulfillment?.type === "Delivery") {
      // lidt variation for demoens skyld
      const random = Math.random();

      if (random < 0.5) {
        fulfillmentStateName = "Packed";
      } else {
        fulfillmentStateName = "Out for delivery";
      }
    }

    const updatedOrder = {
      ...existingOrder,
      fulfillment: {
        ...existingOrder.fulfillment,
        state: {
          descriptor: {
            name: fulfillmentStateName
          }
        }
      }
    };

    const response = {
      context: {
        ...body.context,
        action: "on_status",
        timestamp: new Date().toISOString()
      },
      message: {
        order: updatedOrder
      }
    };

    latestFlow = {
      action: "status",
      request: body,
      response: response,
      timestamp: new Date().toISOString()
    };

    console.log("Returning on_status response");
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
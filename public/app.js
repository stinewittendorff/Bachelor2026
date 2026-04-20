const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");
const selectedItemCard = document.getElementById("selectedItemCard");
const orderStatusCard = document.getElementById("orderStatusCard");

function formatStockStatus(status, count) {
  if (status === "in_stock") return `På lager · ${count} stk.`;
  if (status === "low_stock") return `Få tilbage · ${count} stk.`;
  if (status === "out_of_stock") return "Ikke på lager";
  return "Ukendt lagerstatus";
}

function formatFulfillmentType(type) {
  if (type === "Delivery") return "Levering";
  if (type === "Pickup") return "Afhentning i butik";
  return type || "Ukendt";
}

function formatPaymentType(type) {
  if (type === "PRE-FULFILLMENT") return "Betal nu";
  if (type === "POST-FULFILLMENT") return "Betal i butik";
  return type || "Ukendt";
}

function formatOrderState(state) {
  if (state === "Initialized") return "Initialiseret";
  if (state === "CONFIRMED_PROTOTYPE_ONLY") return "Bekræftet i prototype";
  return state || "Ukendt";
}

function formatFulfillmentState(state) {
  if (state === "Order placed") return "Ordre modtaget";
  if (state === "Packed") return "Pakket";
  if (state === "Out for delivery") return "På vej";
  if (state === "Ready for pickup") return "Klar til afhentning";
  return state || "Ukendt";
}

function formatTrackState(state) {
  if (state === "Order placed") return "Ordre modtaget";
  if (state === "Ready for pickup") return "Klar til afhentning";
  if (state === "Out for delivery") return "På vej";
  return state || "Ukendt";
}

async function searchMedicines() {
  const query = searchInput.value.trim();

  if (!query) {
    resultsContainer.innerHTML = "<p>Indtast en søgning.</p>";
    return;
  }

  selectedItemCard.innerHTML = "<p>Ingen vare valgt endnu.</p>";
  orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Ingen status endnu.</p>";
  resultsContainer.innerHTML = "<p>Søger...</p>";

  const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
  const results = await response.json();

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>Ingen resultater fundet.</p>";
    return;
  }

  resultsContainer.innerHTML = results
    .map(
      (item) => `
        <div class="medicine-card">
          <h3>${item.name}</h3>
          <p><strong>Apotek:</strong> ${item.provider}</p>
          <p><strong>Adresse:</strong> ${item.location}</p>
          <p><strong>Pris:</strong> ${item.price} ${item.currency}</p>
          <p><strong>Lager:</strong> ${formatStockStatus(item.stockStatus, item.stockCount)}</p>

          <button
            class="select-button"
            onclick="selectMedicine('${item.providerId}', '${item.id}')"
            ${item.stockStatus === "out_of_stock" ? "disabled" : ""}
          >
            Vælg produkt
          </button>
        </div>
      `
    )
    .join("");
}

async function selectMedicine(providerId, itemId) {
  selectedItemCard.innerHTML = "<p>Vælger produkt...</p>";
  orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Ingen status endnu.</p>";

  const response = await fetch("/select", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      providerId,
      itemId
    })
  });

  const result = await response.json();

  if (!response.ok) {
    selectedItemCard.innerHTML = `<p>Fejl: ${result.error}</p>`;
    return;
  }

  const order = result.message.order;
  const provider = order.provider;
  const item = order.items[0];
  const status = order.selection_status;

  selectedItemCard.innerHTML = `
    <div class="selected-card">
      <span class="selected-label">Valgt</span>

      <h3>${item.descriptor.name}</h3>

      <p><strong>Apotek:</strong> ${provider.descriptor.name}</p>
      <p><strong>Pris:</strong> ${item.price.value} ${item.price.currency}</p>
      <p><strong>Lager:</strong> ${formatStockStatus(item.stock.status, item.stock.count)}</p>
      <p><strong>Status:</strong> ${status?.message ?? "Produktet er valgt"}</p>

      <button
        class="order-button"
        onclick="showInitForm('${provider.id}', '${item.id}', '${item.descriptor.name}', '${provider.descriptor.name}', '${item.price.value}', '${item.price.currency}')"
      >
        Bestil
      </button>
    </div>
  `;
}

function showInitForm(providerId, itemId, itemName, providerName, priceValue, priceCurrency) {
  selectedItemCard.innerHTML = `
    <div class="selected-card">
      <span class="selected-label">Bestilling</span>

      <h3>${itemName}</h3>

      <p><strong>Apotek:</strong> ${providerName}</p>
      <p><strong>Pris:</strong> ${priceValue} ${priceCurrency}</p>

      <label for="fulfillmentType"><strong>Leveringsmetode:</strong></label>
      <select id="fulfillmentType" class="checkout-select">
        <option value="Delivery">Levering</option>
        <option value="Pickup">Afhentning i butik</option>
      </select>

      <label for="paymentType"><strong>Betalingsmetode:</strong></label>
      <select id="paymentType" class="checkout-select">
        <option value="PRE-FULFILLMENT">Betal nu</option>
        <option value="POST-FULFILLMENT">Betal i butik</option>
      </select>

      <button
        class="init-button"
        onclick="initMedicine('${providerId}', '${itemId}')"
      >
        Klargør ordre
      </button>
    </div>
  `;
}

async function initMedicine(providerId, itemId) {
  const fulfillmentType =
    document.getElementById("fulfillmentType")?.value || "Delivery";

  const paymentType =
    document.getElementById("paymentType")?.value || "PRE-FULFILLMENT";

  selectedItemCard.innerHTML = "<p>Klargør ordre...</p>";
  orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Ingen status endnu.</p>";

  const response = await fetch("/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      providerId,
      itemId,
      quantity: 1,
      fulfillment: {
        type: fulfillmentType
      },
      payment: {
        type: paymentType
      }
    })
  });

  const result = await response.json();

  if (!response.ok) {
    selectedItemCard.innerHTML = `<p>Fejl: ${result.error}</p>`;
    return;
  }

  const order = result.message?.order || result.order;
  const provider = order.provider;
  const item = order.items[0];

  selectedItemCard.innerHTML = `
    <div class="selected-card">
      <span class="selected-label">Ordre klargjort</span>
      <h3>${item.descriptor.name}</h3>

      <p><strong>Apotek:</strong> ${provider.descriptor.name}</p>
      <p><strong>Pris:</strong> ${order.quote.price.value} ${order.quote.price.currency}</p>
      <p><strong>Ordre-ID:</strong> ${order.id}</p>
      <p><strong>Status:</strong> ${formatOrderState(order.state)}</p>
      <p><strong>Levering:</strong> ${formatFulfillmentType(order.fulfillment?.type)}</p>
      <p><strong>Betaling:</strong> ${formatPaymentType(order.payment?.type)}</p>

      <button
        class="confirm-button"
        onclick="confirmMedicine('${provider.id}', '${item.id}', '${order.id}', '${order.fulfillment?.type || "Delivery"}', '${order.payment?.type || "PRE-FULFILLMENT"}')"
      >
        Bekræft ordre
      </button>
    </div>
  `;
}

async function confirmMedicine(providerId, itemId, orderId, fulfillmentType, paymentType) {
  selectedItemCard.innerHTML = "<p>Bekræfter ordre...</p>";
  orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Ingen status endnu.</p>";

  const response = await fetch("/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      providerId,
      itemId,
      orderId,
      quantity: 1,
      fulfillment: {
        type: fulfillmentType
      },
      payment: {
        type: paymentType
      }
    })
  });

  const result = await response.json();

  if (!response.ok) {
    selectedItemCard.innerHTML = `<p>Fejl: ${result.error}</p>`;
    return;
  }

  const order = result.message?.order || result.order;
  const provider = order.provider;
  const item = order.items[0];

  selectedItemCard.innerHTML = `
    <div class="selected-card confirmed-card">
      <span class="selected-label">Order confirmed</span>

      <h3>${item.descriptor.name}</h3>

      <p><strong>Apotek:</strong> ${provider.descriptor.name}</p>
      <p><strong>Pris:</strong> ${order.quote?.price?.value ?? item.price?.value} ${order.quote?.price?.currency ?? item.price?.currency}</p>
      <p><strong>Prototype order ID:</strong> ${order.id}</p>
      <p><strong>Status:</strong> ${formatOrderState(order.state)}</p>
      <p><strong>Levering:</strong> ${formatFulfillmentType(order.fulfillment?.type)}</p>
      <p><strong>Betaling:</strong> Ikke implementeret</p>

      <p><strong>Bekræftelse:</strong> ${
        order.confirmation_status?.message ?? "Prototype order confirmed"
      }</p>
    </div>
  `;
}

async function statusMedicine(orderId) {
  orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Henter ordrestatus...</p>";

  const response = await fetch("/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      orderId
    })
  });

  const result = await response.json();

  if (!response.ok) {
    orderStatusCard.innerHTML = `<h2>Ordrestatus</h2><p>Fejl: ${result.error}</p>`;
    return;
  }

  const order = result.message?.order || result.order;
  const provider = order.provider;
  const item = order.items?.[0];
  const fulfillmentState =
    formatFulfillmentState(
      order?.fulfillment?.state?.descriptor?.name
    );

  orderStatusCard.innerHTML = `
    <div class="selected-card confirmed-card">
      <h2>Ordrestatus</h2>

      <h3>${item?.descriptor?.name || "Ukendt vare"}</h3>

      <p><strong>Apotek:</strong> ${provider?.descriptor?.name || "Ukendt apotek"}</p>
      <p><strong>Ordre-ID:</strong> ${order.id}</p>
      <p><strong>Status:</strong> ${formatOrderState(order.state)}</p>
      <p><strong>Levering:</strong> ${formatFulfillmentType(order.fulfillment?.type)}</p>
      <p><strong>Fulfillment-status:</strong> ${fulfillmentState}</p>
      <p><strong>Betaling:</strong> ${formatPaymentType(order.payment?.type)}</p>
    </div>
  `;
}

async function trackMedicine(orderId) {
  orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Henter tracking...</p>";

  const response = await fetch("/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      orderId
    })
  });

  const result = await response.json();

  if (!response.ok) {
    orderStatusCard.innerHTML = `<h2>Ordrestatus</h2><p>Fejl: ${result.error}</p>`;
    return;
  }

  const order = result.message?.order || result.order;
  const tracking = order.tracking || {};
  const trackingState = formatTrackState(tracking.status);
  const trackingLocation = tracking.location?.descriptor?.name || "Ukendt lokation";

  orderStatusCard.innerHTML = `
    <div class="selected-card confirmed-card">
      <h2>Tracking</h2>

      <p><strong>Ordre-ID:</strong> ${order.id}</p>
      <p><strong>Track-status:</strong> ${trackingState}</p>
      <p><strong>Besked:</strong> ${tracking.message || "Ingen tracking-besked."}</p>
      <p><strong>Lokation:</strong> ${trackingLocation}</p>
    </div>
  `;
}

function handleStatusLookup() {
  const orderId = document.getElementById("orderIdInput").value.trim();

  if (!orderId) {
    orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Indtast et ordre-ID.</p>";
    return;
  }

  statusMedicine(orderId);
}

function handleTrackLookup() {
  const orderId = document.getElementById("orderIdInput").value.trim();

  if (!orderId) {
    orderStatusCard.innerHTML = "<h2>Ordrestatus</h2><p>Indtast et ordre-ID.</p>";
    return;
  }

  trackMedicine(orderId);
}

searchBtn.addEventListener("click", searchMedicines);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchMedicines();
  }
});
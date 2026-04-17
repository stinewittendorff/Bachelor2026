const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");
const selectedItemCard = document.getElementById("selectedItemCard");

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
  return state || "Ukendt";
}

async function searchMedicines() {
  const query = searchInput.value.trim();

  if (!query) {
    resultsContainer.innerHTML = "<p>Indtast en søgning.</p>";
    return;
  }

  selectedItemCard.innerHTML = "<p>Ingen vare valgt endnu.</p>";
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
    </div>
  `;
}

searchBtn.addEventListener("click", searchMedicines);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchMedicines();
  }
});
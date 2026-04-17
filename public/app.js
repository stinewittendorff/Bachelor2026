const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");

function formatStockStatus(status, count) {
  if (status === "in_stock") {
    return `På lager · ${count} stk.`;
  }

  if (status === "low_stock") {
    return `Få tilbage · ${count} stk.`;
  }

  if (status === "out_of_stock") {
    return "Ikke på lager";
  }

  return "Ukendt lagerstatus";
}

function getStockClass(status) {
  if (status === "in_stock") return "stock-in";
  if (status === "low_stock") return "stock-low";
  if (status === "out_of_stock") return "stock-out";
  return "";
}

async function searchMedicines() {
  const query = searchInput.value.trim();

  if (!query) {
    resultsContainer.innerHTML = `<p class="empty-state">Indtast en søgning.</p>`;
    return;
  }

  const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
  const results = await response.json();

  if (results.length === 0) {
    resultsContainer.innerHTML = `<p class="empty-state">Ingen resultater fundet.</p>`;
    return;
  }

  resultsContainer.innerHTML = results
    .map(
      (item) => `
        <article class="medicine-card">
          <h3>${item.name}</h3>
          <p><strong>Apotek:</strong> ${item.provider}</p>
          <p><strong>Adresse:</strong> ${item.location ?? "Ukendt adresse"}</p>
          <p><strong>Pris:</strong> ${item.price} ${item.currency}</p>
          <p>
            <strong>Lagerstatus:</strong>
            <span class="stock-badge ${getStockClass(item.stockStatus)}">
              ${formatStockStatus(item.stockStatus, item.stockCount)}
            </span>
          </p>
        </article>
      `
    )
    .join("");
}

searchBtn.addEventListener("click", searchMedicines);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchMedicines();
  }
});
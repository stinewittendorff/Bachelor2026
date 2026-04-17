const catalogOverview = document.getElementById("catalogOverview");
const latestRequest = document.getElementById("latestRequest");
const latestMatches = document.getElementById("latestMatches");
const latestResponse = document.getElementById("latestResponse");

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

async function loadCatalog() {
  try {
    const response = await fetch("/catalog");
    const data = await response.json();

    const providers = data.message.catalog.providers;

    catalogOverview.innerHTML = providers
      .map((provider) => {
        const location = provider.locations?.[0]?.descriptor?.name ?? "Ukendt adresse";

        const itemsHtml = provider.items
          .map(
            (item) => `
              <div class="provider-item">
                <strong>${item.descriptor.name}</strong>
                <div>Pris: ${item.price.value} ${item.price.currency}</div>
                <div>
                  Lager:
                  <span class="stock-badge ${getStockClass(item.stock?.status)}">
                    ${formatStockStatus(item.stock?.status, item.stock?.count)}
                  </span>
                </div>
              </div>
            `
          )
          .join("");

        return `
          <article class="provider-card">
            <h3>${provider.descriptor.name}</h3>
            <p class="provider-location">${location}</p>
            <div class="provider-items">
              ${itemsHtml}
            </div>
          </article>
        `;
      })
      .join("");

    latestRequest.textContent = JSON.stringify(
      {
        action: "search",
        description: "BPP waits for incoming search requests from BAP"
      },
      null,
      2
    );

    latestMatches.innerHTML = `<p class="empty-state">Matches vises, når BAP sender en søgning.</p>`;

    latestResponse.textContent = JSON.stringify(
      {
        action: "on_search",
        description: "BPP returns matching catalog items to BAP"
      },
      null,
      2
    );
  } catch (error) {
    console.error(error);
    catalogOverview.innerHTML = `<p class="empty-state">Kunne ikke hente katalog.</p>`;
  }
}

loadCatalog();
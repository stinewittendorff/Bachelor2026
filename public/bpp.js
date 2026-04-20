const catalogOverview = document.getElementById("catalogOverview");
const latestFlowSummary = document.getElementById("latestFlowSummary");
const latestRequest = document.getElementById("latestRequest");
const latestResponse = document.getElementById("latestResponse");

function formatStockStatus(status, count) {
  if (status === "in_stock") return `På lager · ${count} stk.`;
  if (status === "low_stock") return `Få tilbage · ${count} stk.`;
  if (status === "out_of_stock") return "Ikke på lager";
  return "Ukendt lagerstatus";
}

async function loadCatalog() {
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
              <div>Lager: ${formatStockStatus(item.stock?.status, item.stock?.count)}</div>
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
}

function renderLatestFlow(flow) {
  if (!flow || !flow.action) {
    latestFlowSummary.innerHTML = "<p>Ingen request modtaget endnu.</p>";
    latestRequest.textContent = "Ingen request endnu";
    latestResponse.textContent = "Ingen response endnu";
    return;
  }

  if (flow.action === "search") {
    const query =
      flow.request?.message?.intent?.item?.descriptor?.name ?? "Ukendt søgning";

    latestFlowSummary.innerHTML = `
      <div class="flow-card">
        <span class="flow-label">search</span>
        <h3>BAP søgte efter: ${query}</h3>
        <p>BPP returnerede matchende katalogdata.</p>
        <p><strong>Tidspunkt:</strong> ${flow.timestamp}</p>
      </div>
    `;
  }

  if (flow.action === "select") {
    const providerId = flow.request?.message?.order?.provider?.id;
    const itemId = flow.request?.message?.order?.items?.[0]?.id;
    const selectedItem = flow.response?.message?.order?.items?.[0];
    const selectedProvider = flow.response?.message?.order?.provider;

    latestFlowSummary.innerHTML = `
      <div class="flow-card">
        <span class="flow-label">select</span>
        <h3>BAP valgte: ${selectedItem?.descriptor?.name ?? itemId}</h3>
        <p><strong>Apotek:</strong> ${selectedProvider?.descriptor?.name ?? providerId}</p>
        <p><strong>Status:</strong> on_select response sendt tilbage til BAP.</p>
        <p><strong>Tidspunkt:</strong> ${flow.timestamp}</p>
      </div>
    `;
  }

  if (flow.action === "init") {
    const order = flow.response?.message?.order;
    const item = order?.items?.[0];
    const provider = order?.provider;

    latestFlowSummary.innerHTML = `
      <div class="flow-card">
        <span class="flow-label">init</span>
        <h3>BAP klargjorde ordre på: ${item?.descriptor?.name ?? "Ukendt vare"}</h3>
        <p><strong>Apotek:</strong> ${provider?.descriptor?.name ?? "Ukendt apotek"}</p>
        <p><strong>Levering:</strong> ${order?.fulfillment?.type ?? "Ukendt"}</p>
        <p><strong>Betaling:</strong> ${order?.payment?.type ?? "Ukendt"}</p>
        <p><strong>Ordre-ID:</strong> ${order?.id ?? "Ukendt"}</p>
        <p><strong>Status:</strong> on_init response sendt tilbage til BAP.</p>
        <p><strong>Tidspunkt:</strong> ${flow.timestamp}</p>
      </div>
    `;
  }
  if (flow.action === "confirm") {
    const order = flow.response?.message?.order;
    const item = order?.items?.[0];
    const provider = order?.provider;

    latestFlowSummary.innerHTML = `
      <div class="flow-card">
        <span class="flow-label">confirm</span>
        <h3>BAP bekræftede ordre på: ${item?.descriptor?.name ?? "Ukendt vare"}</h3>
        <p><strong>Apotek:</strong> ${provider?.descriptor?.name ?? "Ukendt apotek"}</p>
        <p><strong>Ordre-ID:</strong> ${order?.id ?? "Ukendt"}</p>
        <p><strong>Status:</strong> on_confirm response sendt tilbage til BAP.</p>
        <p><strong>Tidspunkt:</strong> ${flow.timestamp}</p>
      </div>
    `;
  }
  if (flow.action === "status") {
    const order = flow.response?.message?.order;
    const item = order?.items?.[0];
    const provider = order?.provider;
    const fulfillmentState =
      order?.fulfillment?.state?.descriptor?.name ?? "Ukendt status";

    latestFlowSummary.innerHTML = `
      <div class="flow-card">
        <span class="flow-label">status</span>
        <h3>Status på: ${item?.descriptor?.name ?? "Ukendt vare"}</h3>
        <p><strong>Apotek:</strong> ${provider?.descriptor?.name ?? "Ukendt apotek"}</p>
        <p><strong>Ordre-ID:</strong> ${order?.id ?? "Ukendt"}</p>
        <p><strong>Fulfillment-status:</strong> ${fulfillmentState}</p>
        <p><strong>Status:</strong> on_status response sendt tilbage til BAP.</p>
        <p><strong>Tidspunkt:</strong> ${flow.timestamp}</p>
      </div>
    `;
  }

  if (flow.action === "track") {
    const order = flow.response?.message?.order;
    const tracking = order?.tracking;

    latestFlowSummary.innerHTML = `
      <div class="flow-card">
        <span class="flow-label">track</span>
        <h3>BAP trackede ordre: ${order?.id ?? "Ukendt ordre"}</h3>
        <p><strong>Track-status:</strong> ${tracking?.status ?? "Ukendt"}</p>
        <p><strong>Besked:</strong> ${tracking?.message ?? "Ingen besked"}</p>
        <p><strong>Lokation:</strong> ${tracking?.location?.descriptor?.name ?? "Ukendt lokation"}</p>
        <p><strong>Status:</strong> on_track response sendt tilbage til BAP.</p>
        <p><strong>Tidspunkt:</strong> ${flow.timestamp}</p>
      </div>
    `;
  }

  latestRequest.textContent = JSON.stringify(flow.request, null, 2);
  latestResponse.textContent = JSON.stringify(flow.response, null, 2);
}

async function loadLatestFlow() {
  const response = await fetch("/latest-flow");
  const flow = await response.json();
  renderLatestFlow(flow);
}

loadCatalog();
loadLatestFlow();

setInterval(loadLatestFlow, 3000);

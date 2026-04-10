const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("results");

async function searchMedicines() {
  const query = searchInput.value.trim();

  const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
  const results = await response.json();

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>Ingen resultater fundet.</p>";
    return;
  }

  resultsContainer.innerHTML = results
    .map(
      (item) => `
        <div class="card">
          <h3>${item.name}</h3>
          <p><strong>Apotek:</strong> ${item.provider}</p>
          <p><strong>Pris:</strong> ${item.price} ${item.currency}</p>
        </div>
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
const API = "https://laistymassodas.onrender.com";

// ---- Naujausių duomenų užkrovimas ----
async function loadLatest() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    const last = data[0];

    document.getElementById("moisture-value").innerText =
      last.moisture + "%";
    document.getElementById("temp-value").innerText =
      last.temperature + "°C";
    document.getElementById("pressure-value").innerText =
      last.pressure + " hPa";

    document.getElementById("system-status").innerText = "OK";
    document.getElementById("system-status").classList.add("status-ok");

    document.getElementById("last-update").innerText =
      "Atnaujinta: " + new Date().toLocaleTimeString();
  } catch (err) {
    console.error("Klaida:", err);
    document.getElementById("system-status").innerText = "KLAIDA";
    document.getElementById("system-status").classList.remove("status-ok");
  }
}

// ---- Grafikai (paprasta versija iš paskutinių įrašų) ----
async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    const labels = data
      .map((x) => x.time || "")
      .reverse();
    const moist = data.map((x) => x.moisture).reverse();
    const temp = data.map((x) => x.temperature).reverse();
    const press = data.map((x) => x.pressure).reverse();

    new Chart(document.getElementById("moistureChart"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Drėgmė (%)",
            data: moist,
            borderColor: "#4CAF50",
            tension: 0.3,
          },
        ],
      },
    });

    new Chart(document.getElementById("tempChart"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Temperatūra (°C)",
            data: temp,
            borderColor: "#FF5722",
            tension: 0.3,
          },
        ],
      },
    });

    new Chart(document.getElementById("pressureChart"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Slėgis (hPa)",
            data: press,
            borderColor: "#2196F3",
            tension: 0.3,
          },
        ],
      },
    });
  } catch (err) {
    console.error("Klaida istorijoje:", err);
  }
}

// ---- Siurblio valdymas ----
document.getElementById("pump-btn").addEventListener("click", async () => {
  try {
    const res = await fetch(`${API}/api/watering`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pump" }),
    });

    const data = await res.json();
    document.getElementById("pump-status").innerText =
      "Siurblys: " + (data.status === "ON" ? "įjungtas" : "išjungtas");
  } catch (err) {
    console.error("Klaida valdant siurblį:", err);
  }
});

// ---- Startas ----
loadLatest();
loadHistory();
setInterval(loadLatest, 5000);

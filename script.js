const API = "https://laistymassodas.onrender.com";

// ---- WiFi padalų logika ----
function wifiBars(rssi) {
  if (rssi >= -50) return 4;   // puikus
  if (rssi >= -60) return 3;   // geras
  if (rssi >= -70) return 2;   // vidutinis
  if (rssi >= -80) return 1;   // silpnas
  return 0;                    // labai silpnas
}

function wifiIcon(bars) {
  const symbols = ["▁", "▂", "▃", "▅", "█"];
  return symbols[bars];
}

// ---- WiFi procentai ----
function wifiPercent(rssi) {
  if (rssi === null || rssi === undefined) return 0;

  // RSSI diapazonas: -90 (blogai) iki -30 (puikiai)
  let pct = Math.round(((rssi + 90) / 60) * 100);

  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  return pct;
}

// ---- WiFi spalvos ----
function wifiColor(rssi) {
  if (rssi === null || rssi === undefined) return "#777"; // pilka NO WIFI

  if (rssi >= -50) return "#00e676"; // žalia
  if (rssi >= -60) return "#69f0ae"; // šviesiai žalia
  if (rssi >= -70) return "#ffeb3b"; // geltona
  if (rssi >= -80) return "#ff9800"; // oranžinė
  return "#f44336";                 // raudona
}

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

    // ---- WiFi indikatorius ----
    const wifiIconEl = document.getElementById("wifi-icon");
    const wifiRssiEl = document.getElementById("wifi-rssi");
    const wifiPctEl = document.getElementById("wifi-percent");

    if (last.wifi === undefined || last.wifi === 0) {
      // NO WIFI režimas
      wifiIconEl.innerText = "✖";
      wifiIconEl.style.color = "#777";
      wifiRssiEl.innerText = "WiFi: nėra";
      wifiPctEl.innerText = "0%";
    } else {
      const bars = wifiBars(last.wifi);
      const pct = wifiPercent(last.wifi);
      const color = wifiColor(last.wifi);

      wifiIconEl.innerText = wifiIcon(bars);
      wifiIconEl.style.color = color;

      wifiRssiEl.innerText = "WiFi: " + last.wifi + " dBm";
      wifiPctEl.innerText = pct + "%";
      wifiPctEl.style.color = color;
    }

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

// ---- Grafikai (paskutiniai įrašai) ----
async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    const labels = data
      .map((x) => {
        const d = new Date(x.time);
        return (
          d.toLocaleDateString("lt-LT", {
            month: "2-digit",
            day: "2-digit",
          }) +
          " " +
          d.toLocaleTimeString("lt-LT", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      })
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

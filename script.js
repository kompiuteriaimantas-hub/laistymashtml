const API = "https://laistymassodas.onrender.com";

// ---- WiFi padalų logika ----
function wifiBars(rssi) {
  if (rssi >= -50) return 4;
  if (rssi >= -60) return 3;
  if (rssi >= -70) return 2;
  if (rssi >= -80) return 1;
  return 0;
}

function wifiIcon(bars) {
  const symbols = ["▁", "▂", "▃", "▅", "█"];
  return symbols[bars];
}

// ---- WiFi procentai ----
function wifiPercent(rssi) {
  if (rssi === null || rssi === undefined) return 0;

  let pct = Math.round(((rssi + 90) / 60) * 100);
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

// ---- WiFi spalvos ----
function wifiColor(rssi) {
  if (rssi === null || rssi === undefined) return "#777";

  if (rssi >= -50) return "#00e676";
  if (rssi >= -60) return "#69f0ae";
  if (rssi >= -70) return "#ffeb3b";
  if (rssi >= -80) return "#ff9800";
  return "#f44336";
}

// ---- Naujausių duomenų užkrovimas ----
async function loadLatest() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    // Surandame paskutinį pilną sensorių įrašą (ne heartbeat)
const last = data.find(row =>
  row.moisture !== null &&
  row.temperature !== null &&
  row.pressure !== null
);

if (!last) {
  console.warn("Nėra pilnų sensorių įrašų");
  return;
}


    // ---- ESP ONLINE/OFFLINE DETEKTORIUS ----
    const lastTime = new Date(last.time).getTime();
    const now = Date.now();
    const diff = (now - lastTime) / 1000;

    if (diff > 10) {
      document.getElementById("system-status").innerText = "OFFLINE";
      document.getElementById("system-status").classList.remove("status-ok");
      document.getElementById("system-status").classList.add("status-offline");
      return;
    }

    document.getElementById("system-status").innerText = "OK";
    document.getElementById("system-status").classList.add("status-ok");
    document.getElementById("system-status").classList.remove("status-offline");

    document.getElementById("moisture-value").innerText = last.moisture + "%";
    document.getElementById("temp-value").innerText = last.temperature + "°C";
    document.getElementById("pressure-value").innerText = last.pressure + " hPa";

    const wifiIconEl = document.getElementById("wifi-icon");
    const wifiRssiEl = document.getElementById("wifi-rssi");
    const wifiPctEl = document.getElementById("wifi-percent");

    if (last.wifi === null || last.wifi === undefined) {
      wifiIconEl.innerText = "✖";
      wifiIconEl.style.color = "#777";
      wifiRssiEl.innerText = "WiFi: nėra";
      wifiPctEl.innerText = "0%";
      wifiPctEl.style.color = "#777";
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

    document.getElementById("last-update").innerText =
      "Atnaujinta: " + new Date().toLocaleTimeString();

  } catch (err) {
    console.error("Klaida:", err);
    document.getElementById("system-status").innerText = "KLAIDA";
    document.getElementById("system-status").classList.remove("status-ok");
  }
}

// ---- DUOMENŲ NAUDOJIMO SKAIČIAVIMAS ----
async function loadDataUsage() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    let totalBytes = 0;

    for (const row of data) {
      if (row.bytes) totalBytes += row.bytes;
    }

    const mb = (totalBytes / 1024 / 1024).toFixed(2);

    document.getElementById("data-usage").innerText =
      "Web duomenys: " + mb + " MB";

  } catch (err) {
    console.error("Klaida skaičiuojant duomenis:", err);
  }
}

// ---- GRAFIKŲ KINTAMIEJI ----
let moistChart = null;
let tempChart = null;
let pressChart = null;

// ---- Grafikai ----
async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    const labels = data
      .map((x) => {
        const d = new Date(x.time);
        return (
          d.toLocaleDateString("lt-LT", { month: "2-digit", day: "2-digit" }) +
          " " +
          d.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })
        );
      })
      .reverse();

    const moist = data.map((x) => x.moisture).reverse();
    const temp = data.map((x) => x.temperature).reverse();
    const press = data.map((x) => x.pressure).reverse();

    // sunaikinam senus grafikus
    if (moistChart) moistChart.destroy();
    if (tempChart) tempChart.destroy();
    if (pressChart) pressChart.destroy();

    moistChart = new Chart(document.getElementById("moistureChart"), {
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

    tempChart = new Chart(document.getElementById("tempChart"), {
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

    pressChart = new Chart(document.getElementById("pressureChart"), {
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
// ---- Grafikai ----
async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();
    if (!data.length) return;

    // Filtruojame tik pilnus sensorių įrašus (IGNORUOJAM heartbeat)
    const clean = data.filter(x =>
      x.moisture !== null &&
      x.temperature !== null &&
      x.pressure !== null
    );

    if (!clean.length) {
      console.warn("Nėra pilnų sensorių istorijos");
      return;
    }

    const labels = clean
      .map((x) => {
        const d = new Date(x.time);
        return (
          d.toLocaleDateString("lt-LT", { month: "2-digit", day: "2-digit" }) +
          " " +
          d.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })
        );
      })
      .reverse();

    const moist = clean.map((x) => x.moisture).reverse();
    const temp = clean.map((x) => x.temperature).reverse();
    const press = clean.map((x) => x.pressure).reverse();

    // sunaikinam senus grafikus
    if (moistChart) moistChart.destroy();
    if (tempChart) tempChart.destroy();
    if (pressChart) pressChart.destroy();

    moistChart = new Chart(document.getElementById("moistureChart"), {
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

    tempChart = new Chart(document.getElementById("tempChart"), {
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

    pressChart = new Chart(document.getElementById("pressureChart"), {
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

loadDataUsage();

// realaus laiko atnaujinimai
setInterval(loadLatest, 5000);
setInterval(loadDataUsage, 5000);

// grafikai kas 1 valandą
setInterval(loadHistory, 3600000);

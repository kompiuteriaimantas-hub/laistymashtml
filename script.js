const API = "https://laistymassodas.onrender.com";

app.use(express.static("."));

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

function wifiPercent(rssi) {
  if (rssi === null || rssi === undefined) return 0;
  let pct = Math.round(((rssi + 90) / 60) * 100);
  return Math.min(100, Math.max(0, pct));
}

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
    const res = await fetch(`${API}/api/sensors/all`);
    const data = await res.json();
    if (!data.length) return;

    const lastAny = data[0];

    const fullList = data.filter(x =>
      x.moisture !== null &&
      x.temperature !== null &&
      x.pressure !== null
    );

    const lastFull = fullList.length ? fullList[0] : null;

    // ONLINE / OFFLINE
    const lastTime = new Date(lastAny.time).getTime();
    const diff = (Date.now() - lastTime) / 1000;

    const statusEl = document.getElementById("system-status");
    if (diff > 10) {
      statusEl.innerText = "OFFLINE";
      statusEl.classList.remove("status-ok");
      statusEl.classList.add("status-offline");
      return;
    }

    statusEl.innerText = "OK";
    statusEl.classList.add("status-ok");
    statusEl.classList.remove("status-offline");

    // Sensoriai (jei turime pilną įrašą)
    if (lastFull) {
      document.getElementById("moisture-value").innerText = lastFull.moisture + "%";
      document.getElementById("temp-value").innerText = lastFull.temperature + "°C";
      document.getElementById("pressure-value").innerText = lastFull.pressure + " hPa";
    }

    // WiFi
    const wifiIconEl = document.getElementById("wifi-icon");
    const wifiRssiEl = document.getElementById("wifi-rssi");
    const wifiPctEl = document.getElementById("wifi-percent");

    const bars = wifiBars(lastAny.wifi);
    const pct = wifiPercent(lastAny.wifi);
    const color = wifiColor(lastAny.wifi);

    wifiIconEl.innerText = wifiIcon(bars);
    wifiIconEl.style.color = color;

    wifiRssiEl.innerText = "WiFi: " + lastAny.wifi + " dBm";
    wifiPctEl.innerText = pct + "%";
    wifiPctEl.style.color = color;

    document.getElementById("last-update").innerText =
      "Atnaujinta: " + new Date().toLocaleTimeString();

  } catch (err) {
    console.error("Klaida:", err);
  }
}

// ---- DUOMENŲ NAUDOJIMO SKAIČIAVIMAS ----
async function loadDataUsage() {
  try {
    const res = await fetch(`${API}/api/sensors/all`);
    const data = await res.json();
    if (!data.length) return;

    let totalBytes = 0;

    for (const row of data) {
      if (row.bytes !== null && row.bytes !== undefined) {
        totalBytes += row.bytes;
      }
    }

    const kb = totalBytes / 1024;
    const mb = kb / 1024;

    let display = mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

    document.getElementById("data-usage").innerText =
      "Web duomenys: " + display;

  } catch (err) {
    console.error("Klaida skaičiuojant duomenis:", err);
  }
}

// ---- RESET MYGTUKAS ----
document.getElementById("reset-data-btn").addEventListener("click", async () => {
  if (!confirm("Tikrai ištrinti visus duomenis?")) return;

  const res = await fetch(`${API}/api/sensors/reset`, {
    method: "DELETE"
  });

  const data = await res.json();
  console.log("Reset:", data);

  document.getElementById("data-usage").innerText = "Web duomenys: 0 KB";
});

// ---- GRAFIKAI ----
let moistChart = null;
let tempChart = null;
let pressChart = null;

async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/sensors/all`);
    const data = await res.json();
    if (!data.length) return;

    const clean = data.filter(x =>
      x.moisture !== null &&
      x.temperature !== null &&
      x.pressure !== null
    );

    if (!clean.length) return;

    const labels = clean.map(x => {
      const d = new Date(x.time);
      return d.toLocaleDateString("lt-LT") + " " +
             d.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });
    }).reverse();

    const moist = clean.map(x => x.moisture).reverse();
    const temp = clean.map(x => x.temperature).reverse();
    const press = clean.map(x => x.pressure).reverse();

    if (moistChart) moistChart.destroy();
    if (tempChart) tempChart.destroy();
    if (pressChart) pressChart.destroy();

    moistChart = new Chart(document.getElementById("moistureChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Drėgmė (%)", data: moist, borderColor: "#4CAF50", tension: 0.3 }] }
    });

    tempChart = new Chart(document.getElementById("tempChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Temperatūra (°C)", data: temp, borderColor: "#FF5722", tension: 0.3 }] }
    });

    pressChart = new Chart(document.getElementById("pressureChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Slėgis (hPa)", data: press, borderColor: "#2196F3", tension: 0.3 }] }
    });

  } catch (err) {
    console.error("Klaida istorijoje:", err);
  }
}

// ---- RELES MYGTUKAS ----
document.getElementById("pump-btn").addEventListener("click", async () => {
  const btn = document.getElementById("pump-btn");
  const isOn = btn.classList.contains("active");
  const action = isOn ? "pump_off" : "pump_on";

  const res = await fetch(`${API}/api/watering/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action })
  });

  const data = await res.json();
  console.log("Komanda išsiųsta:", data);

  btn.classList.toggle("active");
});

// ---- Startas ----
loadLatest();
loadHistory();
loadDataUsage();

setInterval(loadLatest, 5000);
setInterval(loadDataUsage, 5000);
setInterval(loadHistory, 3600000);

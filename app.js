const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY = "PASTE_KEY";

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY
  };
}

/* -------------------------------
   GAUGES
--------------------------------*/
let moistureGauge, tempGauge, pressureGauge;

function initGauges() {
  moistureGauge = new RadialGauge({
    renderTo: 'moistureGauge',
    minValue: 0,
    maxValue: 100
  }).draw();

  tempGauge = new RadialGauge({
    renderTo: 'tempGauge',
    minValue: -10,
    maxValue: 40
  }).draw();

  pressureGauge = new RadialGauge({
    renderTo: 'pressureGauge',
    minValue: 500,
    maxValue: 1600
  }).draw();
}

/* -------------------------------
   STATUS + USAGE + RELAY
--------------------------------*/
async function fetchStatus() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
      { headers: sbHeaders() }
    );

    const data = (await res.json())[0];
    if (!data) return;

    // ✅ SENSORIAI
    document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
    document.getElementById("temperature").innerText = data.temperature_c ?? "-";
    document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";

    // ✅ RELAY
    const relayEl = document.getElementById("relayState");
    if (relayEl) {
      relayEl.innerText = data.relay ? "Įjungta" : "Išjungta";
    }

    // ✅ GAUGES
    if (moistureGauge) moistureGauge.value = data.moisture_percent || 0;
    if (tempGauge) tempGauge.value = data.temperature_c || 0;
    if (pressureGauge) pressureGauge.value = data.pressure_hpa || 0;

    // ✅ USAGE (live)
    const usageBytes = data.usage_bytes || 0;
    const kb = usageBytes / 1024;
    const mb = kb / 1024;

    const usageEl = document.getElementById("usage");
    if (usageEl) {
      usageEl.innerText =
        mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";
    }

  } catch (e) {
    console.log("fetchStatus error", e);
  }
}

/* -------------------------------
   MĖNESIO ISTORIJA
--------------------------------*/
async function updateMonthlyUsageUI() {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/usage_history?created_at=gte.${firstDay}&select=*`,
      { headers: sbHeaders() }
    );

    const data = await res.json();

    let total = 0;
    data.forEach(r => total += r.usage_bytes || 0);

    const kb = total / 1024;
    const mb = kb / 1024;

    const el = document.getElementById("monthlyUsage");
    if (el) {
      el.innerText =
        mb >= 1
          ? `Šio mėnesio: ${mb.toFixed(2)} MB`
          : `Šio mėnesio: ${kb.toFixed(1)} KB`;
    }

  } catch (e) {
    console.log("monthly usage error", e);
  }
}

/* -------------------------------
   HISTORY CHART
--------------------------------*/
async function fetchHistory() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/status?select=*&limit=200`,
    { headers: sbHeaders() }
  );
  return await res.json();
}

function groupByHour(data) {
  const map = {};
  data.forEach(row => {
    if (!row.updated_at) return;

    const d = new Date(row.updated_at);
    const key = d.getHours() + ":00";

    if (!map[key]) map[key] = row;
  });

  return Object.values(map).filter(r =>
    r.moisture_percent != null &&
    r.temperature_c != null &&
    r.pressure_hpa != null
  );
}

let moistureChart, tempChart, pressureChart;

async function updateChart() {
  const raw = await fetchHistory();
  const data = groupByHour(raw);

  const labels = data.map(r => {
    const d = new Date(r.updated_at);
    return d.getHours() + ":00";
  });

  const moisture = data.map(r => r.moisture_percent || 0);
  const temp = data.map(r => r.temperature_c || 0);
  const pressure = data.map(r => r.pressure_hpa || 0);

  // 💧
  if (moistureChart) moistureChart.destroy();
  moistureChart = new Chart(document.getElementById("moistureChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label:"Drėgmė", data: moisture, borderColor: "green" }]
    }
  });

  // 🌡️
  if (tempChart) tempChart.destroy();
  tempChart = new Chart(document.getElementById("tempChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label:"Temp", data: temp, borderColor: "orange" }]
    }
  });

  // 🧭
  if (pressureChart) pressureChart.destroy();
  pressureChart = new Chart(document.getElementById("pressureChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label:"Slėgis", data: pressure, borderColor: "blue" }]
    }
  });
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {
  initGauges();

  fetchStatus();
  updateMonthlyUsageUI();
  updateChart();

  setInterval(fetchStatus, 2000);
  setInterval(updateMonthlyUsageUI, 60000);
  setInterval(updateChart, 60000);
});

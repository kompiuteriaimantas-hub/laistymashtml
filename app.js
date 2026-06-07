const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInT5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    ...extra
  };
}

/* -------------------------------
   GAUGES
--------------------------------*/
let moistureGauge, tempGauge, pressureGauge;

function initGauges() {
  moistureGauge = new RadialGauge({
    renderTo: 'moistureGauge',
    width: 180,
    height: 180,
    units: "%",
    minValue: 0,
    maxValue: 100
  }).draw();

  tempGauge = new RadialGauge({
    renderTo: 'tempGauge',
    width: 180,
    height: 180,
    units: "°C",
    minValue: -10,
    maxValue: 40,
    majorTicks: ["-10","0","10","20","30","40"],
    minorTicks: 2,
    strokeTicks: true
  }).draw();

  pressureGauge = new RadialGauge({
    renderTo: 'pressureGauge',
    width: 180,
    height: 180,
    units: "hPa",
    minValue: 500,
    maxValue: 1600,
    majorTicks: ["500","700","900","1100","1300","1500"],
    minorTicks: 2,
    strokeTicks: true
  }).draw();
}

/* -------------------------------
   HISTORY (48h)
--------------------------------*/
async function fetchHistory() {
  const now = new Date();
  const past = new Date(now.getTime() - (48 * 60 * 60 * 1000)).toISOString();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/status?updated_at=gte.${past}&select=*`,
    { headers: sbHeaders() }
  );

  return await res.json();
}

function groupByHour(data) {
  const map = {};

  data.forEach(row => {
    const d = new Date(row.updated_at);

    const key =
      d.getFullYear() + "-" +
      (d.getMonth() + 1) + "-" +
      d.getDate() + " " +
      d.getHours() + ":00";

    if (!map[key]) map[key] = row;
  });

  return Object.values(map);
}

let chart;

async function updateChart() {
  const raw = await fetchHistory();
  const data = groupByHour(raw);

  const labels = data.map(r => {
    const d = new Date(r.updated_at);
    return d.getHours() + ":00";
  });

  const moisture = data.map(r => r.moisture_percent);
  const temp = data.map(r => r.temperature_c);
  const pressure = data.map(r => r.pressure_hpa);

  const ctx = document.getElementById("historyChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: "Drėgmė",
          data: moisture,
          borderColor: "#22c55e",
          tension: 0.3
        },
        {
          label: "Temp",
          data: temp,
          borderColor: "#f97316",
          tension: 0.3
        },
        {
          label: "Slėgis",
          data: pressure,
          borderColor: "#3b82f6",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "white" }
        }
      },
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } }
      }
    }
  });
}

/* -------------------------------
   MĖNESIO ISTORIJA
--------------------------------*/
async function fetchMonthlyUsage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/usage_history?created_at=gte.${firstDay}&select=*`,
    { headers: sbHeaders() }
  );

  return await res.json();
}

async function updateMonthlyUsageUI() {
  const data = await fetchMonthlyUsage();

  let total = 0;
  for (const row of data) total += row.usage_bytes;

  const kb = total / 1024;
  const mb = kb / 1024;

  document.getElementById("monthlyUsage").innerText =
    mb >= 1
      ? `Šio mėnesio sunaudota: ${mb.toFixed(2)} MB`
      : `Šio mėnesio sunaudota: ${kb.toFixed(1)} KB`;
}

/* -------------------------------
   STATUS
--------------------------------*/
async function fetchStatus() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
      { headers: sbHeaders() }
    );

    const arr = await res.json();
    const data = arr[0];

    if (!data) {
      setOffline();
      return;
    }

    const now = Date.now();
    let ts = data.updated_at;
    ts = ts.replace(/\.\d+/, "") + "Z";

    const updated = new Date(ts).getTime();

    if (isNaN(updated) || now - updated > 15000) {
      setOffline();
    } else {
      setOnline();
    }

    document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
    document.getElementById("temperature").innerText = data.temperature_c ?? "-";
    document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";
    document.getElementById("wifi").innerText = data.wifi_rssi ?? "-";

    document.getElementById("relayState").innerText =
      data.relay ? "Įjungta" : "Išjungta";

    document.getElementById("lockdownState").innerText =
      data.lockdown ? "TAIP" : "NE";

    const usageBytes = data.usage_bytes || 0;
    const kb = usageBytes / 1024;
    const mb = kb / 1024;

    document.getElementById("usage").innerText =
      mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

    const percent = Math.min((mb / 5) * 100, 100);
    document.getElementById("usageFill").style.width = percent + "%";

    if (moistureGauge) moistureGauge.value = Number(data.moisture_percent) || 0;
    if (tempGauge) tempGauge.value = Number(data.temperature_c) || 0;
    if (pressureGauge) pressureGauge.value = Number(data.pressure_hpa) || 0;

  } catch (err) {
    console.log("JS error:", err);
    setOffline();
  }
}

/* -------------------------------
   ONLINE / OFFLINE
--------------------------------*/
function setOnline() {
  document.getElementById("onlineStatus").innerText = "ONLINE";
  document.getElementById("onlineLed").classList.remove("off");
}

function setOffline() {
  document.getElementById("onlineStatus").innerText = "OFFLINE";
  document.getElementById("onlineLed").classList.add("off");
}

/* -------------------------------
   COMMANDS
--------------------------------*/
async function sendRelayCommand(state) {
  await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
    method: "POST",
    headers: sbHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ relay_state: state })
  });
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

  initGauges();

  document.getElementById("relayBtn").addEventListener("click", async () => {
    const isOn = document.getElementById("relayBtn").classList.contains("off");
    await sendRelayCommand(isOn ? "off" : "on");
    setTimeout(fetchStatus, 1000);
  });

  fetchStatus();
  updateMonthlyUsageUI();
  updateChart();

  setInterval(fetchStatus, 2000);
  setInterval(updateMonthlyUsageUI, 60000);
  setInterval(updateChart, 60000);
});

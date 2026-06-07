const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";

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
    units: "°C",
    minValue: -10,
    maxValue: 40,
    majorTicks: ["-10","0","10","20","30","40"]
  }).draw();

  pressureGauge = new RadialGauge({
    renderTo: 'pressureGauge',
    units: "hPa",
    minValue: 500,
    maxValue: 1600,
    majorTicks: ["500","700","900","1100","1300","1500"]
  }).draw();
}

/* -------------------------------
   HISTORY
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

  return Object.values(map);
}

/* -------------------------------
   CHARTS
--------------------------------*/
let moistureChart, tempChart, pressureChart;

function chartOptions() {
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: "white" } }
    },
    scales: {
      x: { ticks: { color: "white" } },
      y: { ticks: { color: "white" } }
    }
  };
}

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
      datasets: [{ label: "Drėgmė", data: moisture, borderColor: "#22c55e" }]
    },
    options: chartOptions()
  });

  // 🌡️
  if (tempChart) tempChart.destroy();
  tempChart = new Chart(document.getElementById("tempChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Temp", data: temp, borderColor: "#f97316" }]
    },
    options: chartOptions()
  });

  // 🧭
  if (pressureChart) pressureChart.destroy();
  pressureChart = new Chart(document.getElementById("pressureChart"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Slėgis", data: pressure, borderColor: "#3b82f6" }]
    },
    options: chartOptions()
  });
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

    if (!data) return;

    document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
    document.getElementById("temperature").innerText = data.temperature_c ?? "-";
    document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";

    if (moistureGauge) moistureGauge.value = data.moisture_percent || 0;
    if (tempGauge) tempGauge.value = data.temperature_c || 0;
    if (pressureGauge) pressureGauge.value = data.pressure_hpa || 0;

  } catch (err) {
    console.log("ERROR:", err);
  }
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

  initGauges();

  fetchStatus();
  updateChart();

  setInterval(fetchStatus, 2000);
  setInterval(updateChart, 60000);
});
``

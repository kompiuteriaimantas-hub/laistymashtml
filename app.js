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
    return d.toLocaleString("lt-LT", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  });

  const moisture = data.map(r => r.moisture_percent);
  const temp = data.map(r => r.temperature_c);
  const pressure = data.map(r => r.pressure_hpa);

  // 💧
  const ctx1 = document.getElementById("moistureChart").getContext("2d");
  if (moistureChart) moistureChart.destroy();

  moistureChart = new Chart(ctx1, {
    type: "line",
    data: { labels, datasets: [{ data: moisture, borderColor: "#22c55e" }] },
    options: chartOptions()
  });

  // 🌡️
  const ctx2 = document.getElementById("tempChart").getContext("2d");
  if (tempChart) tempChart.destroy();

  tempChart = new Chart(ctx2, {
    type: "line",
    data: { labels, datasets: [{ data: temp, borderColor: "#f97316" }] },
    options: chartOptions()
  });

  // 🧭
  const ctx3 = document.getElementById("pressureChart").getContext("2d");
  if (pressureChart) pressureChart.destroy();

  pressureChart = new Chart(ctx3, {
    type: "line",
    data: { labels, datasets: [{ data: pressure, borderColor: "#3b82f6" }] },
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

    document.getElementById("moisture").innerText = data.moisture_percent;
    document.getElementById("temperature").innerText = data.temperature_c;
    document.getElementById("pressure").innerText = data.pressure_hpa;

    if (moistureGauge) moistureGauge.value = data.moisture_percent;
    if (tempGauge) tempGauge.value = data.temperature_c;
    if (pressureGauge) pressureGauge.value = data.pressure_hpa;

  } catch (err) {
    console.log(err);
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

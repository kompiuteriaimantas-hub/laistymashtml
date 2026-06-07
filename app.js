const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY = "PASTE_KEY";

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY
  };
}

/* GAUGES */
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

/* FETCH STATUS */
async function fetchStatus() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
    { headers: sbHeaders() }
  );

  const data = (await res.json())[0];

  if (!data) return;

  document.getElementById("moisture").innerText = data.moisture_percent;
  document.getElementById("temperature").innerText = data.temperature_c;
  document.getElementById("pressure").innerText = data.pressure_hpa;

  moistureGauge.value = data.moisture_percent;
  tempGauge.value = data.temperature_c;
  pressureGauge.value = data.pressure_hpa;

  // usage
  const kb = data.usage_bytes / 1024;
  document.getElementById("usage").innerText = kb.toFixed(1) + " KB";
}

/* HISTORY */
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
    const key = d.getHours() + ":00";
    if (!map[key]) map[key] = row;
  });
  return Object.values(map);
}

let moistureChart, tempChart, pressureChart;

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

  if (moistureChart) moistureChart.destroy();
  if (tempChart) tempChart.destroy();
  if (pressureChart) pressureChart.destroy();

  moistureChart = new Chart(document.getElementById("moistureChart"), {
    type: "line",
    data: { labels, datasets: [{ data: moisture, borderColor: "green" }] }
  });

  tempChart = new Chart(document.getElementById("tempChart"), {
    type: "line",
    data: { labels, datasets: [{ data: temp, borderColor: "orange" }] }
  });

  pressureChart = new Chart(document.getElementById("pressureChart"), {
    type: "line",
    data: { labels, datasets: [{ data: pressure, borderColor: "blue" }] }
  });
}

/* START */
window.addEventListener("DOMContentLoaded", () => {
  initGauges();
  fetchStatus();
  updateChart();

  setInterval(fetchStatus, 2000);
  setInterval(updateChart, 60000);
});

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
   ✅ GAUGES
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
  strokeTicks: true,

  animationDuration: 800
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
  strokeTicks: true,

  highlights: [
    { from: 500, to: 900, color: "orange" },
    { from: 900, to: 1100, color: "green" },
    { from: 1100, to: 1600, color: "blue" }
  ]
}).draw();

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

    // ONLINE / OFFLINE CHECK
    const now = Date.now();
    let ts = data.updated_at;
    ts = ts.replace(/\.\d+/, "") + "Z";

    const updated = new Date(ts).getTime();

    if (isNaN(updated) || now - updated > 15000) {
      setOffline();
    } else {
      setOnline();
    }

    // --- UI ---
    document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
    document.getElementById("temperature").innerText = data.temperature_c ?? "-";
    document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";
    document.getElementById("wifi").innerText = data.wifi_rssi ?? "-";

    document.getElementById("relayState").innerText =
      data.relay ? "Įjungta" : "Išjungta";

    document.getElementById("lockdownState").innerText =
      data.lockdown ? "TAIP" : "NE";

    // ✅ GAUGES
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
  const el = document.getElementById("onlineStatus");
  el.innerText = "ONLINE";
  el.style.color = "#00ff00";
}

function setOffline() {
  const el = document.getElementById("onlineStatus");
  el.innerText = "OFFLINE";
  el.style.color = "#ffcc33";
}

/* -------------------------------
   COMMANDS
--------------------------------*/
async function sendRelayCommand(state) {
  await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
    method: "POST",
    headers: sbHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({ relay_state: state })
  });
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

  // ✅ INIT
  initGauges();

  document.getElementById("relayBtn").addEventListener("click", async () => {
    const isOn = document.getElementById("relayBtn").classList.contains("off");
    await sendRelayCommand(isOn ? "off" : "on");
    setTimeout(fetchStatus, 1000);
  });

  document.getElementById("btnReset").addEventListener("click", async () => {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
      method: "POST",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ reset_lockdown: true })
    });
  });

  // ✅ KICKSTART
  fetchStatus();
  updateMonthlyUsageUI();

  setInterval(fetchStatus, 2000);
  setInterval(updateMonthlyUsageUI, 60000);
});

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
   🔥 GAUGES SU SKALĖMIS
--------------------------------*/
let gaugeMoisture, gaugeTemp, gaugePressure;

function createGauge(canvasId, min, max, zones, labels) {
    const target = document.getElementById(canvasId);

    // ✅ safety (kad nelūžtų)
    if (!target || typeof Gauge === "undefined") {
        console.warn("Gauge missing:", canvasId);
        return null;
    }

    const opts = {
        angle: 0,
        lineWidth: 0.22,
        radiusScale: 0.85,

        pointer: {
            length: 0.5,
            strokeWidth: 0.04,
            color: "#ffffff"
        },

        staticZones: zones,

        staticLabels: {
            font: "7px sans-serif",
            labels: labels,
            color: "#ffffff",
            fractionDigits: 0
        }
    };

    const gauge = new Gauge(target).setOptions(opts);

    gauge.maxValue = max;
    gauge.setMinValue(min);
    gauge.animationSpeed = 32;

    return gauge;
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
        let ts = data.updated_at.replace(/\.\d+/, "") + "Z";
        const updated = new Date(ts).getTime();

        if (isNaN(updated) || now - updated > 60000) {
            setOffline();
        } else {
            setOnline();
        }

        // ✅ UI update
        document.getElementById("moisture").innerText = data.moisture_percent;
        document.getElementById("temperature").innerText = data.temperature_c;
        document.getElementById("pressure").innerText = data.pressure_hpa;
        document.getElementById("wifi").innerText = data.wifi_rssi;

        document.getElementById("relayState").innerText =
            data.relay ? "Įjungta" : "Išjungta";

        document.getElementById("lockdownState").innerText =
            data.lockdown ? "TAIP" : "NE";

        const usageBytes = data.usage_bytes || 0;
        const kb = usageBytes / 1024;
        const mb = kb / 1024;

        document.getElementById("usage").innerText =
            mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

        // ✅ GAUGES UPDATE
        if (gaugeMoisture) gaugeMoisture.set(data.moisture_percent);
        if (gaugeTemp) gaugeTemp.set(data.temperature_c);
        if (gaugePressure) gaugePressure.set(data.pressure_hpa);

        // ✅ RELAY UI
        const btn = document.getElementById("relayBtn");
        const status = document.getElementById("relayStatus");

        if (data.relay) {
            btn.innerText = "Išjungti";
            btn.classList.add("active");
            btn.classList.remove("off");
            if (status) status.classList.add("active");
        } else {
            btn.innerText = "Įjungti";
            btn.classList.remove("active");
            btn.classList.add("off");
            if (status) status.classList.remove("active");
        }

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
    el.style.color = "#00ff88";
}

function setOffline() {
    const el = document.getElementById("onlineStatus");
    el.innerText = "OFFLINE";
    el.style.color = "#ffcc33";
}

/* -------------------------------
   COMMAND
--------------------------------*/
async function sendRelayCommand(state) {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
        method: "POST",
        headers: sbHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ relay_state: state })
    });
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

    // ✅ DRĖGMĖ (0–100)
    gaugeMoisture = createGauge(
        "gaugeMoisture",
        0,
        100,
        [
            {strokeStyle: "#e53935", min: 0, max: 30},
            {strokeStyle: "#fbc02d", min: 30, max: 70},
            {strokeStyle: "#43a047", min: 70, max: 100}
        ],
        [0, 20, 40, 60, 80, 100]
    );

    // ✅ TEMP (0–60)
    gaugeTemp = createGauge(
        "gaugeTemp",
        0,
        60,
        [
            {strokeStyle: "#2196f3", min: 0, max: 20},
            {strokeStyle: "#4caf50", min: 20, max: 40},
            {strokeStyle: "#e53935", min: 40, max: 60}
        ],
        [0, 20, 40, 60]
    );

    // ✅ SLĖGIS (600–2000)
    gaugePressure = createGauge(
        "gaugePressure",
        600,
        2000,
        [
            {strokeStyle: "#2196f3", min: 600, max: 1000},
            {strokeStyle: "#4caf50", min: 1000, max: 1400},
            {strokeStyle: "#9c27b0", min: 1400, max: 2000}
        ],
        [600, 1000, 1400, 2000]
    );

    // ✅ RELAY CLICK
    document.getElementById("relayBtn").addEventListener("click", async () => {
        const btn = document.getElementById("relayBtn");
        const isOn = btn.classList.contains("active");

        btn.classList.toggle("active");
        btn.classList.toggle("off");

        const status = document.getElementById("relayStatus");
        if (status) status.classList.toggle("active");

        btn.innerText = isOn ? "Įjungti" : "Išjungti";

        await sendRelayCommand(isOn ? "off" : "on");

        setTimeout(fetchStatus, 800);
    });

    fetchStatus();
    updateMonthlyUsageUI();

    setInterval(fetchStatus, 1500);
    setInterval(updateMonthlyUsageUI, 60000);
});
``

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
   🔥 GAUGES
--------------------------------*/
let gaugeMoisture, gaugeTemp, gaugePressure;

function createGauge(canvasId, min, max) {
    const target = document.getElementById(canvasId);
    if (!target || typeof Gauge === "undefined") return null;

    const opts = {
        angle: 0,
        lineWidth: 0.15,
        radiusScale: 0.95,
        pointer: {
            length: 0.5,
            strokeWidth: 0.03,
            color: "#ffffff"
        },
        colorStart: "#3a8ed8",
        colorStop: "#6c757d",
        strokeColor: "#333"
    };

    const gauge = new Gauge(target).setOptions(opts);
    gauge.setMinValue(min);
    gauge.maxValue = max;
    gauge.set(0);

    return gauge;
}

/* -------------------------------
   🕒 ONLINE FORMAT
--------------------------------*/
function formatLastSeen(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    if (s < 60) return `Online prieš ${s}s`;
    if (m < 60) return `Online prieš ${m} min`;
    return `Online prieš ${h} val`;
}

/* -------------------------------
   📊 MĖNESIO ISTORIJA (FIXED)
--------------------------------*/
async function fetchMonthlyUsage() {
    try {
        const now = new Date();
        const firstDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        ).toISOString();

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/usage_history?created_at=gte.${firstDay}&select=*`,
            { headers: sbHeaders() }
        );

        return await res.json();
    } catch (e) {
        console.log("Monthly error:", e);
        return [];
    }
}

async function updateMonthlyUsageUI() {
    const data = await fetchMonthlyUsage();

    // ✅ FIX: jei nėra duomenų
    if (!data || !Array.isArray(data)) {
        document.getElementById("monthlyUsage").innerText =
            "Šio mėnesio sunaudota: 0 KB";
        return;
    }

    let total = 0;
    for (const row of data) {
        total += row.usage_bytes || 0;
    }

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
        const updated = new Date(
            data.updated_at.replace(/\.\d+/, "") + "Z"
        ).getTime();

        const diff = now - updated;

        if (isNaN(updated) || diff > 120000) {
            setOffline();
        } else {
            setOnline(diff);
        }

        // ✅ SENSORIAI
        document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = data.temperature_c ?? "-";
        document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";

        // ✅ WIFI
        const wifiEl = document.getElementById("wifi");
        if (wifiEl) wifiEl.innerText = data.wifi_rssi ?? "-";

        // ✅ LOCKDOWN
        const lockEl = document.getElementById("lockdownState");
        if (lockEl) lockEl.innerText = data.lockdown ? "TAIP" : "NE";

        // ✅ USAGE
        const usageBytes = data.usage_bytes || 0;
        const kb = usageBytes / 1024;
        const mb = kb / 1024;

        const usageEl = document.getElementById("usage");
        if (usageEl) {
            usageEl.innerText =
                mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";
        }

        // ✅ RELAY
        const btn = document.getElementById("relayBtn");
        const relayStateEl = document.getElementById("relayState");

        if (btn && relayStateEl) {
            if (data.relay) {
                btn.innerText = "Išjungti";
                btn.classList.add("active");
                btn.classList.remove("off");
                relayStateEl.innerText = "Įjungta";
            } else {
                btn.innerText = "Įjungti";
                btn.classList.remove("active");
                btn.classList.add("off");
                relayStateEl.innerText = "Išjungta";
            }
        }

        // ✅ GAUGES
        if (gaugeMoisture) gaugeMoisture.set(data.moisture_percent);
        if (gaugeTemp) gaugeTemp.set(data.temperature_c);
        if (gaugePressure) gaugePressure.set(data.pressure_hpa);

    } catch (err) {
        console.log("JS error:", err);
        setOffline();
    }
}

/* -------------------------------
   UI
--------------------------------*/
function setOnline(diff) {
    const el = document.getElementById("onlineStatus");
    el.innerText = formatLastSeen(diff);
    el.style.color = "#00ff88";
    el.style.textShadow = "0 0 8px #00ff88";
}

function setOffline() {
    const el = document.getElementById("onlineStatus");
    el.innerText = "OFFLINE";
    el.style.color = "#ffcc33";
}

/* -------------------------------
   RELAY COMMAND
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

    gaugeMoisture = createGauge("gaugeMoisture", 0, 100);
    gaugeTemp = createGauge("gaugeTemp", 0, 60);
    gaugePressure = createGauge("gaugePressure", 600, 2000);

    // ✅ RELAY BUTTON
    document.getElementById("relayBtn").addEventListener("click", async () => {
        const btn = document.getElementById("relayBtn");
        const isOn = btn.classList.contains("active");

        btn.classList.toggle("active");
        btn.classList.toggle("off");
        btn.innerText = isOn ? "Įjungti" : "Išjungti";

        await sendRelayCommand(isOn ? "off" : "on");

        setTimeout(fetchStatus, 1500);
    });

    fetchStatus();
    updateMonthlyUsageUI();

    setInterval(fetchStatus, 2000);
    setInterval(updateMonthlyUsageUI, 60000);
});

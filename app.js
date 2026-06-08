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

function createGradientGauge(canvasId, maxValue, colors) {
    const opts = {
        angle: 0,
        lineWidth: 0.25,
        radiusScale: 0.9,
        pointer: {
            length: 0.55,
            strokeWidth: 0.04,
            color: "#ffffff"
        },
        renderTicks: { divisions: 0 }
    };

    const target = document.getElementById(canvasId);
    const gauge = new Gauge(target).setOptions(opts);

    gauge.maxValue = maxValue;
    gauge.setMinValue(0);
    gauge.animationSpeed = 32;

    const ctx = target.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 100, 0);

    colors.forEach((c, i) => {
        gradient.addColorStop(i / (colors.length - 1), c);
    });

    opts.colorStart = gradient;
    opts.colorStop = gradient;

    gauge.set(0);
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
   STATUSO FUNKCIJA
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

        // ONLINE logika
        const now = Date.now();
        let ts = data.updated_at.replace(/\.\d+/, "") + "Z";
        const updated = new Date(ts).getTime();

        if (isNaN(updated) || now - updated > 60000) {
            setOffline();
        } else {
            setOnline();
        }

        // UI
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

        // 🔥 GAUGE UPDATE
        if (gaugeMoisture) gaugeMoisture.set(data.moisture_percent);
        if (gaugeTemp) gaugeTemp.set(data.temperature_c);
        if (gaugePressure) gaugePressure.set(data.pressure_hpa);

        // RELAY UI
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
   STATUS
--------------------------------*/
function setOnline() {
    const el = document.getElementById("onlineStatus");
    el.innerText = "ONLINE";
    el.style.color = "#00ff88";
    el.style.textShadow = "0 0 8px #00ff88";
}

function setOffline() {
    const el = document.getElementById("onlineStatus");
    el.innerText = "OFFLINE";
    el.style.color = "#ffcc33";
    el.style.textShadow = "0 0 5px #ffcc33";
}

/* -------------------------------
   KOMANDOS
--------------------------------*/
async function sendRelayCommand(state) {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
        method: "POST",
        headers: sbHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ relay_state: state })
    });
}

/* -------------------------------
   STARTAS
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

    // 🔥 CREATE GAUGES
    gaugeMoisture = createGradientGauge("gaugeMoisture", 100, [
        "#e53935", "#fbc02d", "#43a047"
    ]);

    gaugeTemp = createGradientGauge("gaugeTemp", 50, [
        "#2196f3", "#00e5ff", "#e53935"
    ]);

    gaugePressure = createGradientGauge("gaugePressure", 1100, [
        "#9c27b0", "#03a9f4"
    ]);

    // RELAY CLICK
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

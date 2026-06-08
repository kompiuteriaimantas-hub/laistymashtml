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
   WIFI
--------------------------------*/
function getWifiLabel(rssi) {
    if (rssi >= -55) return "puikus";
    if (rssi >= -65) return "labai geras";
    if (rssi >= -75) return "geras";
    if (rssi >= -85) return "silpnas";
    return "labai silpnas";
}

function getWifiColor(rssi) {
    if (rssi >= -65) return "#00ff88";
    if (rssi >= -75) return "#ffee33";
    if (rssi >= -85) return "#ff9933";
    return "#ff4444";
}

/* -------------------------------
   ONLINE FORMAT
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
   MĖNESIO ISTORIJA
--------------------------------*/
async function fetchMonthlyUsage() {
    try {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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
    const el = document.getElementById("monthlyUsage");
    if (!el) return;

    const data = await fetchMonthlyUsage();

    let total = 0;
    for (const row of data) {
        total += row.usage_bytes || 0;
    }

    const kb = total / 1024;
    const mb = kb / 1024;

    el.innerText =
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

        if (!data) return;

        const now = Date.now();

        const updated = new Date(
            data.updated_at.replace(/\.\d+/, "") + "Z"
        ).getTime();

        const diff = now - updated;
        const isOffline = diff > 120000;

        // ✅ SENSORIAI
        document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = data.temperature_c ?? "-";
        document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";

        // ✅ WIFI
        const wifiEl = document.getElementById("wifi");
        if (wifiEl && data.wifi_rssi != null) {
            const rssi = data.wifi_rssi;
            wifiEl.innerText = `${rssi} dBm (${getWifiLabel(rssi)})`;
            wifiEl.style.color = getWifiColor(rssi);
        }

        // ✅ DUOMENŲ NAUDOJIMAS
        const usageEl = document.getElementById("usage");
        if (usageEl) {
            const usageBytes = Number(data.usage_bytes);

            if (!isNaN(usageBytes)) {
                const kb = usageBytes / 1024;
                const mb = kb / 1024;

                usageEl.innerText =
                    mb >= 1
                        ? mb.toFixed(2) + " MB"
                        : kb.toFixed(1) + " KB";
            } else {
                usageEl.innerText = "-";
            }
        }

        // ✅ LOCKDOWN
        const lockEl = document.getElementById("lockdownState");
        if (lockEl) lockEl.innerText = data.lockdown ? "TAIP" : "NE";

        // ✅ RELAY
        const btn = document.getElementById("relayBtn");
        const stateEl = document.getElementById("relayState");

        if (btn && stateEl) {
            if (data.relay) {
                btn.innerText = "Išjungti";
                btn.classList.add("active");
                stateEl.innerText = "Įjungta";
            } else {
                btn.innerText = "Įjungti";
                btn.classList.remove("active");
                stateEl.innerText = "Išjungta";
            }
        }

        // ✅ STATUS (ONLINE/OFFLINE)
        const el = document.getElementById("onlineStatus");

        if (!el) return;

        if (data.lockdown) {
            el.innerText = "LOCKDOWN";
            el.style.color = "#ff4444";
        } else if (isOffline) {
            el.innerText = "OFFLINE";
            el.style.color = "#ffcc33";
        } else {
            el.innerText = formatLastSeen(diff);
            el.style.color = "#00ff88";
        }

    } catch (e) {
        console.log("Status error:", e);
    }
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

async function resetLockdown() {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
        method: "POST",
        headers: sbHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reset_lockdown: true })
    });
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

    document.getElementById("relayBtn")?.addEventListener("click", async () => {
        const btn = document.getElementById("relayBtn");
        const isOn = btn.classList.contains("active");

        btn.innerText = "...";
        await sendRelayCommand(isOn ? "off" : "on");
        setTimeout(fetchStatus, 1000);
    });

    const resetBtn = document.getElementById("btnReset");

    if (resetBtn) {
        resetBtn.addEventListener("click", async () => {
            resetBtn.innerText = "...";
            await resetLockdown();

            setTimeout(() => {
                fetchStatus();
                resetBtn.innerText = "Atstatyti sistemą";
            }, 2000);
        });
    }

    fetchStatus();
    updateMonthlyUsageUI();

    setInterval(fetchStatus, 1000);
    setInterval(updateMonthlyUsageUI, 60000);
});

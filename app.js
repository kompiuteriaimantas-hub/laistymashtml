const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";


/* ✅ be Authorization – svarbiausia */
function sbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        ...extra
    };
}

/* WIFI */
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

/* ONLINE */
function formatLastSeen(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    if (s < 60) return `Online prieš ${s}s`;
    if (m < 60) return `Online prieš ${m} min`;
    return `Online prieš ${h} val`;
}

/* STATUS */
async function fetchStatus() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
            { headers: sbHeaders() }
        );

        const data = (await res.json())[0];
        if (!data) return;

        const updated = new Date(data.updated_at).getTime();
        const diff = Date.now() - updated;
        const isOffline = diff > 120000;

        /* SENSORIAI */
        document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = data.temperature_c ?? "-";
        document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";

        /* WIFI */
        const wifiEl = document.getElementById("wifi");
        if (wifiEl && data.wifi_rssi != null) {
            wifiEl.innerText = `${data.wifi_rssi} dBm (${getWifiLabel(data.wifi_rssi)})`;
            wifiEl.style.color = getWifiColor(data.wifi_rssi);
        }

        /* ✅ DUOMENŲ NAUDOJIMAS */
        const usageEl = document.getElementById("usage");
        if (usageEl) {
            const usage = Number(data.usage_bytes);

            if (!isNaN(usage)) {
                const kb = usage / 1024;
                const mb = kb / 1024;

                usageEl.innerText =
                    mb >= 1
                        ? mb.toFixed(2) + " MB"
                        : kb.toFixed(1) + " KB";
            } else {
                usageEl.innerText = "-";
            }
        }

        /* LOCKDOWN */
        document.getElementById("lockdownState").innerText =
            data.lockdown ? "TAIP" : "NE";

        /* ONLINE STATUS */
        const el = document.getElementById("onlineStatus");

        if (data.lockdown) {
            el.innerText = "LOCKDOWN";
            el.style.color = "red";
        } else if (isOffline) {
            el.innerText = "OFFLINE";
            el.style.color = "orange";
        } else {
            el.innerText = formatLastSeen(diff);
            el.style.color = "lime";
        }

    } catch (e) {
        console.log("ERROR:", e);
    }
}

/* START */

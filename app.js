const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";


/* PAPRASTI HEADERS (be Authorization, be Content-Type GET) */
function sbHeaders() {
    return {
        apikey: SUPABASE_KEY
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

/* 🔥 PAGRINDINĖ FUNKCIJA */
async function fetchStatus() {
    try {
        console.log("FETCH START");

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
            {
                method: "GET",
                headers: sbHeaders()
            }
        );

        const data = await res.json();
        console.log("DATA:", data);

        if (!data || data.length === 0) return;

        const row = data[0];

        /* SENSORIAI */
        document.getElementById("moisture").innerText = row.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = row.temperature_c ?? "-";
        document.getElementById("pressure").innerText = row.pressure_hpa ?? "-";

        /* WIFI */
        const wifiEl = document.getElementById("wifi");
        if (wifiEl && row.wifi_rssi != null) {
            wifiEl.innerText = `${row.wifi_rssi} dBm (${getWifiLabel(row.wifi_rssi)})`;
            wifiEl.style.color = getWifiColor(row.wifi_rssi);
        }

        /* USAGE */
        const usageEl = document.getElementById("usage");
        if (usageEl) {
            const usage = Number(row.usage_bytes);

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
        const lockEl = document.getElementById("lockdownState");
        if (lockEl) {
            lockEl.innerText = row.lockdown ? "TAIP" : "NE";
        }

        /* ONLINE STATUS */
        const el = document.getElementById("onlineStatus");

        if (!row.updated_at) return;

        const updated = new Date(row.updated_at).getTime();
        const diff = Date.now() - updated;
        const isOffline = diff > 120000;

        if (row.lockdown) {
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
window.addEventListener("DOMContentLoaded", () => {
    fetchStatus();
    setInterval(fetchStatus, 2000);
});

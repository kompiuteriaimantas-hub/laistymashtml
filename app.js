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
        console.log("FETCH START");

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=*`,
            {
                headers: {
                    apikey: SUPABASE_KEY
                }
            }
        );

        console.log("STATUS:", res.status);

        const text = await res.text();
        console.log("RAW:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.log("JSON PARSE ERROR");
            return;
        }

        console.log("DATA:", data);

        if (!data || data.length === 0) {
            console.log("NO DATA FROM DB");
            return;
        }

        const row = data[0];

        document.getElementById("moisture").innerText =
            row.moisture_percent ?? "-";

        document.getElementById("temperature").innerText =
            row.temperature_c ?? "-";

        document.getElementById("pressure").innerText =
            row.pressure_hpa ?? "-";

        document.getElementById("usage").innerText =
            row.usage_bytes ?? "-";

        document.getElementById("onlineStatus").innerText = "OK";

    } catch (e) {
        console.log("ERROR:", e);
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

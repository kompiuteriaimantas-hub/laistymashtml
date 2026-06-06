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

        // --- ONLINE/OFFLINE ---
        const now = Date.now();
        let ts = data.updated_at;
        ts = ts.replace(/\.\d+/, "");
        ts = ts + "Z";

        const updated = new Date(ts).getTime();

        if (isNaN(updated) || now - updated > 15000) {
            setOffline();
        } else {
            setOnline();
        }

        // --- UI ---
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

        // Relay mygtukas
        const btn = document.getElementById("relayBtn");
        if (data.relay) {
            btn.innerText = "Išjungti";
            btn.classList.add("off");
        } else {
            btn.innerText = "Įjungti";
            btn.classList.remove("off");
        }

    } catch (err) {
        console.log("JS error:", err);
        setOffline();
    }
}

/* -------------------------------
   BŪSENOS FUNKCIJOS
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
    document.getElementById("relayBtn").addEventListener("click", async () => {
        const isOn = document.getElementById("relayBtn").classList.contains("off");
        await sendRelayCommand(isOn ? "off" : "on");
        setTimeout(fetchStatus, 1000);
    });

    fetchStatus();
    setInterval(fetchStatus, 5000);
});

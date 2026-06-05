const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";

function sbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        ...extra
    };
}

async function fetchStatus() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=moisture_percent,temperature_c,pressure_hpa,wifi_rssi,relay,lockdown,usage_bytes&order=id.desc&limit=1`,
            { 
                headers: sbHeaders(),
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        const arr = await res.json();
        const data = arr[0] || null;

        if (!data) {
            document.getElementById("onlineStatus").innerText = "OFFLINE";
            document.getElementById("onlineStatus").style.color = "#ffcc33";
            return;
        }

        document.getElementById("moisture").innerText = data.moisture_percent;
        document.getElementById("temperature").innerText = data.temperature_c;
        document.getElementById("pressure").innerText = data.pressure_hpa;
        document.getElementById("wifi").innerText = data.wifi_rssi;

        document.getElementById("relayState").innerText = data.relay ? "Įjungta" : "Išjungta";
        document.getElementById("lockdownState").innerText = data.lockdown ? "TAIP" : "NE";

        const usageBytes = data.usage_bytes || 0;
        const kb = usageBytes / 1024;
        const mb = kb / 1024;
        document.getElementById("usage").innerText =
            mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

        document.getElementById("onlineStatus").innerText = "ONLINE";
        document.getElementById("onlineStatus").style.color = "#00ff00";

    } catch (e) {
        document.getElementById("onlineStatus").innerText = "OFFLINE";
        document.getElementById("onlineStatus").style.color = "#ffcc33";
    }
}

// atsinaujina kas 5 sek
setInterval(fetchStatus, 5000);
fetchStatus();


        const arr = await res.json();
        const data = arr[0] || {};

        document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = data.temperature_c ?? "-";
        document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";
        document.getElementById("wifi").innerText = data.wifi_rssi ?? "-";

        document.getElementById("relayState").innerText = data.relay ? "Įjungta" : "Išjungta";
        document.getElementById("lockdownState").innerText = data.lockdown ? "TAIP" : "NE";

        const statusEl = document.getElementById("onlineStatus");
        const online = !!data.moisture_percent;
        statusEl.innerText = online ? "ONLINE" : "OFFLINE";
        statusEl.style.color = online ? "#00ff00" : "#ffcc33";

        const usageBytes = data.usage_bytes || 0;
        const kb = usageBytes / 1024;
        const mb = kb / 1024;
        document.getElementById("usage").innerText =
            mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

        const btn = document.getElementById("relayBtn");
        if (data.relay) {
            btn.innerText = "Išjungti";
            btn.classList.add("off");
        } else {
            btn.innerText = "Įjungti";
            btn.classList.remove("off");
        }
    } catch (e) {
        console.error("fetchStatus error", e);
    }
}

async function sendRelayCommand(state) {
    try {
        await fetch(
            `${SUPABASE_URL}/rest/v1/commands`,
            {
                method: "POST",
                headers: sbHeaders({ Prefer: "return=minimal" }),
                body: JSON.stringify({ relay_state: state })
            }
        );
    } catch (e) {
        console.error("sendRelayCommand error", e);
    }
}

async function calibrateDry() {
    await fetch(`${SUPABASE_URL}/rest/v1/config`, {
        method: "PATCH",
        headers: sbHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({ dry_value: 800 })
    });
}

async function calibrateWet() {
    await fetch(`${SUPABASE_URL}/rest/v1/config`, {
        method: "PATCH",
        headers: sbHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({ wet_value: 300 })
    });
}

async function resetLockdown() {
    await fetch(`${SUPABASE_URL}/rest/v1/status`, {
        method: "PATCH",
        headers: sbHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({ lockdown: false })
    });
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("relayBtn").addEventListener("click", async () => {
        const isOn = document.getElementById("relayBtn").classList.contains("off");
        await sendRelayCommand(isOn ? "off" : "on");
        setTimeout(fetchStatus, 1000);
    });

    document.getElementById("btnDry").addEventListener("click", calibrateDry);
    document.getElementById("btnWet").addEventListener("click", calibrateWet);
    document.getElementById("btnReset").addEventListener("click", resetLockdown);

    fetchStatus();
    setInterval(fetchStatus, 5000);
});

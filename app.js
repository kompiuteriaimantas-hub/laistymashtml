const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY =
    "TAVO_SUPABASE_KEY";

function sbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        ...extra
    };
}

async function fetchStatus() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
            { headers: sbHeaders() }
        );

        const arr = await res.json();
        const data = arr[0];

        if (!data) return setOffline();

        const now = Date.now();
        let ts = data.updated_at.replace(/\.\d+/, "") + "Z";
        const updated = new Date(ts).getTime();

        if (now - updated > 15000) setOffline();
        else setOnline();

        document.getElementById("moisture").innerText = data.moisture_percent;
        document.getElementById("temperature").innerText = data.temperature_c;
        document.getElementById("pressure").innerText = data.pressure_hpa;
        document.getElementById("wifi").innerText = data.wifi_rssi;

        document.getElementById("relayState").innerText =
            data.relay ? "Įjungta" : "Išjungta";

    } catch (err) {
        setOffline();
    }
}

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

async function sendRelayCommand(state) {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
        method: "POST",
        headers: sbHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ relay_state: state })
    });
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("relayBtn").addEventListener("click", async () => {
        const isOn = document.getElementById("relayBtn").classList.contains("off");
        await sendRelayCommand(isOn ? "off" : "on");
        setTimeout(fetchStatus, 1000);
    });

    fetchStatus();
    setInterval(fetchStatus, 5000);
});

const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";

function sbHeaders(extra = {}) {
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        ...extra
    };
}

let moistureChart, tempChart, pressureChart;

// STATUS: paskutinis įrašas iš status lentelės
async function fetchStatus() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=*&order=updated_at.desc&limit=1`,
            { headers: sbHeaders() }
        );
        const arr = await res.json();
        const data = arr[0] || {};

        document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = data.temperature_c ?? "-";
        document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";
        document.getElementById("wifi").innerText = data.wifi_rssi ?? "-";

        document.getElementById("relayState").innerText = data.relay ? "Įjungta" : "Išjungta";
        document.getElementById("lockdownState").innerText = data.lockdown ? "TAIP" : "NE";

        const status = document.getElementById("onlineStatus");
        const online = !!data.updated_at;
        status.innerText = online ? "ONLINE" : "OFFLINE";
        status.style.color = online ? "#00ff00" : "#ff4444";

        const usageBytes = data.usage_bytes || 0;
        let kb = usageBytes / 1024;
        let mb = kb / 1024;
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

// HISTORY: paskutiniai N įrašų grafams
async function fetchHistory() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/history?select=*&order=id.desc&limit=100`,
            { headers: sbHeaders() }
        );
        const itemsDesc = await res.json();
        const items = itemsDesc.reverse();

        const labels = items.map(i => i.time);
        const moist = items.map(i => i.moisture_percent);
        const temp = items.map(i => i.temperature_c);
        const press = items.map(i => i.pressure_hpa);

        moistureChart.data.labels = labels;
        moistureChart.data.datasets[0].data = moist;
        moistureChart.update();

        tempChart.data.labels = labels;
        tempChart.data.datasets[0].data = temp;
        tempChart.update();

        pressureChart.data.labels = labels;
        pressureChart.data.datasets[0].data = press;
        pressureChart.update();
    } catch (e) {
        console.error("fetchHistory error", e);
    }
}

// RELĖ: įrašom komandą į commands lentelę
async function sendRelayCommand(state) {
    try {
        await fetch(
            `${SUPABASE_URL}/rest/v1/commands`,
            {
                method: "POST",
                headers: sbHeaders({ "Prefer": "return=minimal" }),
                body: JSON.stringify({ relay_state: state })
            }
        );
    } catch (e) {
        console.error("sendRelayCommand error", e);
    }
}

document.getElementById("relayBtn").addEventListener("click", async () => {
    const isOn = document.getElementById("relayBtn").classList.contains("off");
    await sendRelayCommand(isOn ? "off" : "on");
});

// KALIBRACIJA: config lentelė
async function calibrateDry() {
    try {
        await fetch(
            `${SUPABASE_URL}/rest/v1/config`,
            {
                method: "PATCH",
                headers: sbHeaders({ "Prefer": "return=minimal" }),
                body: JSON.stringify({ dry_value: 800 })
            }
        );
    } catch (e) {
        console.error("calibrateDry error", e);
    }
}

async function calibrateWet() {
    try {
        await fetch(
            `${SUPABASE_URL}/rest/v1/config`,
            {
                method: "PATCH",
                headers: sbHeaders({ "Prefer": "return=minimal" }),
                body: JSON.stringify({ wet_value: 300 })
            }
        );
    } catch (e) {
        console.error("calibrateWet error", e);
    }
}

// RESET: nuimam lockdown iš status
async function resetLockdown() {
    try {
        await fetch(
            `${SUPABASE_URL}/rest/v1/status`,
            {
                method: "PATCH",
                headers: sbHeaders({ "Prefer": "return=minimal" }),
                body: JSON.stringify({ lockdown: false })
            }
        );
    } catch (e) {
        console.error("resetLockdown error", e);
    }
}

// CHART INIT
const ctxM = document.getElementById("moistureChart").getContext("2d");
const ctxT = document.getElementById("tempChart").getContext("2d");
const ctxP = document.getElementById("pressureChart").getContext("2d");

moistureChart = new Chart(ctxM, {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "Drėgmė %",
            data: [],
            borderColor: "#43a047",
            backgroundColor: "rgba(67,160,71,0.1)",
            tension: 0.25
        }]
    }
});

tempChart = new Chart(ctxT, {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "Temperatūra °C",
            data: [],
            borderColor: "#fb8c00",
            backgroundColor: "rgba(251,140,0,0.1)",
            tension: 0.25
        }]
    }
});

pressureChart = new Chart(ctxP, {
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label: "Slėgis hPa",
            data: [],
            borderColor: "#1e88e5",
            backgroundColor: "rgba(30,136,229,0.1)",
            tension: 0.25
        }]
    }
});

// AUTO REFRESH
setInterval(fetchStatus, 3000);
setInterval(fetchHistory, 15000);

fetchStatus();
fetchHistory();

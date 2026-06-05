const MICRO_URL = "https://tavo-micro.deta.dev";

let moistureChart;

async function fetchStatus() {
    const res = await fetch(MICRO_URL + "/ui/status");
    const data = await res.json();

    document.getElementById("moisture").innerText = data.moisturePercent ?? "-";
    document.getElementById("temperature").innerText = data.temperatureC ?? "-";
    document.getElementById("pressure").innerText = data.pressureHPa ?? "-";
    document.getElementById("wifi").innerText = data.wifiRssi ?? "-";

    document.getElementById("relayState").innerText = data.relay ? "Įjungta" : "Išjungta";
    document.getElementById("lockdownState").innerText = data.lockdown ? "TAIP" : "NE";

    // Online/offline
    const status = document.getElementById("onlineStatus");
    status.innerText = data.online ? "ONLINE" : "OFFLINE";
    status.style.color = data.online ? "#00ff00" : "#ff4444";

    // Duomenų naudojimas
    let kb = data.usageBytes / 1024;
    let mb = kb / 1024;
    document.getElementById("usage").innerText =
        mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

    // Relay button
    const btn = document.getElementById("relayBtn");
    if (data.relay) {
        btn.innerText = "Išjungti";
        btn.classList.add("off");
    } else {
        btn.innerText = "Įjungti";
        btn.classList.remove("off");
    }
}

async function fetchHistory() {
    const res = await fetch(MICRO_URL + "/ui/history");
    const items = await res.json();

    const labels = items.map(i => i.time);
    const moist = items.map(i => i.moisturePercent);

    moistureChart.data.labels = labels;
    moistureChart.data.datasets[0].data = moist;
    moistureChart.update();
}

// Relay toggle
document.getElementById("relayBtn").addEventListener("click", async () => {
    const isOn = document.getElementById("relayBtn").classList.contains("off");
    await fetch(MICRO_URL + "/ui/relay", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({state: isOn ? "off" : "on"})
    });
});

// Calibration
async function calibrateDry() {
    await fetch(MICRO_URL + "/ui/calibrate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({dry: 800})
    });
}

async function calibrateWet() {
    await fetch(MICRO_URL + "/ui/calibrate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({wet: 300})
    });
}

async function resetLockdown() {
    await fetch(MICRO_URL + "/ui/reset", {method: "POST"});
}

// Init chart
const ctx = document.getElementById("moistureChart").getContext("2d");
moistureChart = new Chart(ctx, {
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

// Auto refresh
setInterval(fetchStatus, 3000);
setInterval(fetchHistory, 15000);

fetchStatus();
fetchHistory();

const MICRO_URL = "https://tavo-micro.deta.dev";

let moistureChart, tempChart, pressureChart;


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
    const temp = items.map(i => i.temperatureC);
    const press = items.map(i => i.pressureHPa);

    moistureChart.data.labels = labels;
    moistureChart.data.datasets[0].data = moist;
    moistureChart.update();

    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = temp;
    tempChart.update();

    pressureChart.data.labels = labels;
    pressureChart.data.datasets[0].data = press;
    pressureChart.update();
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


// Auto refresh
setInterval(fetchStatus, 3000);
setInterval(fetchHistory, 15000);

fetchStatus();
fetchHistory();

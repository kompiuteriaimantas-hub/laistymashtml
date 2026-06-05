// Pakeisk į savo Deta Micro URL
const MICRO_URL = "https://tavo-micro.deta.dev";

let moistureChart, tempChart, pressureChart;

async function fetchStatus() {
    try {
        const res = await fetch(MICRO_URL + "/ui/status");
        const data = await res.json();

        // Pagrindiniai rodmenys
        document.getElementById("moistureValue").innerText =
            data.moisturePercent != null ? data.moisturePercent.toFixed(1) : "-";
        document.getElementById("tempValue").innerText =
            data.temperatureC != null ? data.temperatureC.toFixed(1) : "-";
        document.getElementById("pressureValue").innerText =
            data.pressureHPa != null ? data.pressureHPa.toFixed(1) : "-";

        document.getElementById("wifiRssi").innerText =
            data.wifiRssi != null ? data.wifiRssi : "-";

        // Online / offline
        const dot = document.getElementById("onlineDot");
        const text = document.getElementById("onlineText");
        if (data.online) {
            dot.style.background = "#4caf50";
            text.innerText = "ONLINE";
        } else {
            dot.style.background = "#e53935";
            text.innerText = "OFFLINE";
        }

        // Relė
        const relayState = data.relay ? "Įjungta" : "Išjungta";
        document.getElementById("relayState").innerText = relayState;
        const relayBtn = document.getElementById("relayToggleBtn");
        if (data.relay) {
            relayBtn.textContent = "Išjungti";
            relayBtn.classList.add("off");
        } else {
            relayBtn.textContent = "Įjungti";
            relayBtn.classList.remove("off");
        }

        // Lockdown
        document.getElementById("lockdownState").innerText =
            data.lockdown ? "AKTYVUS" : "NE";

        // Duomenų naudojimas
        let kb = data.usageBytes / 1024;
        let mb = kb / 1024;
        document.getElementById("usageText").innerText =
            mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";

    } catch (e) {
        console.error(e);
    }
}

async function fetchHistory() {
    try {
        const res = await fetch(MICRO_URL + "/ui/history");
        const items = await res.json();

        const labels = items.map(i => i.time);
        const moist = items.map(i => i.moisturePercent);
        const temp = items.map(i => i.temperatureC);
        const press = items.map(i => i.pressureHPa);

        updateChart(moistureChart, labels, moist);
        updateChart(tempChart, labels, temp);
        updateChart(pressureChart, labels, press);
    } catch (e) {
        console.error(e);
    }
}

function updateChart(chart, labels, data) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
}

// Komandos

async function relayOn() {
    await fetch(MICRO_URL + "/ui/relay", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({state: "on"})
    });
}

async function relayOff() {
    await fetch(MICRO_URL + "/ui/relay", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({state: "off"})
    });
}

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

// Relay toggle mygtukas

document.addEventListener("DOMContentLoaded", () => {
    const relayBtn = document.getElementById("relayToggleBtn");
    relayBtn.addEventListener("click", async () => {
        if (relayBtn.classList.contains("off")) {
            await relayOff();
        } else {
            await relayOn();
        }
    });

    // Inicijuojam grafikus
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
        },
        options: {responsive: true, scales: {x: {display: false}}}
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
        },
        options: {responsive: true, scales: {x: {display: false}}}
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
        },
        options: {responsive: true, scales: {x: {display: false}}}
    });

    // Pirmas užkrovimas
    fetchStatus();
    fetchHistory();

    // Periodinis atnaujinimas
    setInterval(fetchStatus, 3000);
    setInterval(fetchHistory, 15000);
});

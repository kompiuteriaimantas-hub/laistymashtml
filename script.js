const MICRO_URL = "https://tavo-micro.deta.dev";

async function fetchStatus() {
    const res = await fetch(MICRO_URL + "/ui/status");
    const data = await res.json();

    document.getElementById("moisture").innerText = data.moisturePercent;
    document.getElementById("temperature").innerText = data.temperatureC;
    document.getElementById("pressure").innerText = data.pressureHPa;
    document.getElementById("wifi").innerText = data.wifiRssi;
    document.getElementById("relayState").innerText = data.relay ? "Įjungta" : "Išjungta";
    document.getElementById("lockdownState").innerText = data.lockdown ? "TAIP" : "NE";

    // Online/offline
    document.getElementById("onlineStatus").innerText =
        data.online ? "ONLINE" : "OFFLINE";

    // Duomenų naudojimas
    let kb = data.usageBytes / 1024;
    let mb = kb / 1024;
    document.getElementById("usage").innerText =
        mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";
}

async function fetchHistory() {
    const res = await fetch(MICRO_URL + "/ui/history");
    const items = await res.json();

    let times = items.map(i => i.time);
    let moist = items.map(i => i.moisturePercent);
    let temp = items.map(i => i.temperatureC);
    let press = items.map(i => i.pressureHPa);

    drawChart("chartMoisture", "Drėgmė %", moist, times);
    drawChart("chartTemp", "Temperatūra °C", temp, times);
    drawChart("chartPressure", "Slėgis hPa", press, times);
}

function drawChart(id, label, data, labels) {
    new Chart(document.getElementById(id), {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: "green",
                fill: false
            }]
        }
    });
}

// ------------------ KOMANDOS ------------------

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

// ------------------ AUTO UPDATE ------------------

setInterval(fetchStatus, 3000);
setInterval(fetchHistory, 15000);

fetchStatus();
fetchHistory();

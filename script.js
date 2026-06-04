// ---------------------- API URL ----------------------
const API = "https://laistymassodas.onrender.com";

// ---------------------- DUOMENŲ UŽKROVIMAS ----------------------
async function loadLatest() {
    try {
        const res = await fetch(`${API}/api/sensors`);
        const data = await res.json();

        if (!data.length) return;

        const last = data[0];

        // Atnaujinam UI
        document.getElementById("moisture-value").innerText = last.moisture + "%";
        document.getElementById("temp-value").innerText = last.temperature + "°C";
        document.getElementById("pressure-value").innerText = (last.pressure || "---") + " hPa";

        document.getElementById("last-update").innerText =
            "Atnaujinta: " + new Date().toLocaleTimeString();

    } catch (err) {
        console.error("Klaida gaunant duomenis:", err);
        document.getElementById("system-status").innerText = "KLAIDA";
        document.getElementById("system-status").classList.remove("status-ok");
    }
}

// ---------------------- 7 DIENŲ GRAFIKAI ----------------------
async function loadHistory() {
    try {
        const res = await fetch(`${API}/api/sensors`);
        const data = await res.json();

        const labels = data.map(x => new Date(x.time).toLocaleDateString());
        const moist = data.map(x => x.moisture);
        const temp = data.map(x => x.temperature);
        const press = data.map(x => x.pressure || null);

        // Drėgmės grafikas
        new Chart(document.getElementById("moistureChart"), {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Drėgmė (%)",
                    data: moist,
                    borderColor: "#4CAF50",
                    tension: 0.3
                }]
            }
        });

        // Temperatūros grafikas
        new Chart(document.getElementById("tempChart"), {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Temperatūra (°C)",
                    data: temp,
                    borderColor: "#FF5722",
                    tension: 0.3
                }]
            }
        });

        // Slėgio grafikas
        new Chart(document.getElementById("pressureChart"), {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Slėgis (hPa)",
                    data: press,
                    borderColor: "#2196F3",
                    tension: 0.3
                }]
            }
        });

    } catch (err) {
        console.error("Klaida gaunant istoriją:", err);
    }
}

// ---------------------- SIURBLIO VALDYMAS ----------------------
document.getElementById("pump-btn").addEventListener("click", async () => {
    try {
        const res = await fetch(`${API}/api/watering`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "pump" })
        });

        const data = await res.json();
        document.getElementById("pump-status").innerText =
            "Siurblys: " + (data.status === "ON" ? "įjungtas" : "išjungtas");

    } catch (err) {
        console.error("Klaida valdant siurblį:", err);
    }
});

// ---------------------- KALIBRAVIMAS ----------------------
document.getElementById("calib-dry").addEventListener("click", () => {
    alert("Kalibravimas SAUSA dar neįdiegtas API pusėje.");
});

document.getElementById("calib-wet").addEventListener("click", () => {
    alert("Kalibravimas ŠLAPIA dar neįdiegtas API pusėje.");
});

// ---------------------- PERIODINIS ATNAUJINIMAS ----------------------
loadLatest();
loadHistory();
setInterval(loadLatest, 5000);

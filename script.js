const API = "https://laistymassodas.onrender.com";

// ---- Naujausių duomenų užkrovimas ----
async function loadLatest() {
    try {
        const res = await fetch(`${API}/api/sensors`);
        const data = await res.json();

        if (!data.length) return;

        const last = data[0];

        // UI atnaujinimas
        document.getElementById("moisture-value").innerText = last.moisture + "%";
        document.getElementById("temp-value").innerText = last.temperature + "°C";

        // Kadangi API neturi slėgio:
        document.getElementById("pressure-value").innerText = "--- hPa";

        document.getElementById("system-status").innerText = "OK";
        document.getElementById("system-status").classList.add("status-ok");

        document.getElementById("last-update").innerText =
            "Atnaujinta: " + new Date().toLocaleTimeString();

    } catch (err) {
        console.error("Klaida:", err);
        document.getElementById("system-status").innerText = "KLAIDA";
        document.getElementById("system-status").classList.remove("status-ok");
    }
}

// ---- Grafikai (kol kas tušti, nes API neturi istorijos) ----
async function loadHistory() {
    // API neturi time/pressure → grafikai neveiks
    // Palieku tuščius grafikus, kad UI nesulūžtų
}

// ---- Siurblio valdymas ----
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

// ---- Periodinis atnaujinimas ----
loadLatest();
setInterval(loadLatest, 5000);

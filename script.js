const API = "https://laistymassodas.onrender.com";

async function loadSensors() {
    const res = await fetch(`${API}/api/sensors`);
    const data = await res.json();

    let html = "";
    data.forEach(row => {
        html += `Zona ${row.zone}: ${row.moisture} (temp: ${row.temperature})<br>`;
    });

    document.getElementById("sensorData").innerHTML = html || "Nėra duomenų";
}

async function water(zone, duration) {
    await fetch(`${API}/api/watering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            zone,
            action: "ON",
            duration_seconds: duration
        })
    });

    alert(`Laistymas zonai ${zone} įjungtas ${duration}s`);
}

async function loadHistory() {
    const res = await fetch(`${API}/api/watering`);
    const data = await res.json();

    let html = "";
    data.forEach(row => {
        html += `Zona ${row.zone}: ${row.action} (${row.duration_seconds}s)<br>`;
    });

    document.getElementById("history").innerHTML = html || "Nėra istorijos";
}

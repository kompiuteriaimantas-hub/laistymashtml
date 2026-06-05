const API = "https://laistymassodas.onrender.com";

async function loadLatest() {
  try {
    const res = await fetch(`${API}/api/sensors/all`);
    const data = await res.json();
    if (!data.length) return;

    const last = data[0];

    document.getElementById("moisture-value").innerText = last.moisture + "%";
    document.getElementById("temp-value").innerText = last.temperature + "°C";
    document.getElementById("pressure-value").innerText = last.pressure + " hPa";

    document.getElementById("wifi-rssi").innerText = "WiFi: " + last.wifi + " dBm";
    document.getElementById("last-update").innerText =
      "Atnaujinta: " + new Date().toLocaleTimeString();

  } catch (err) {
    console.error("Klaida:", err);
  }
}

async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/sensors/all`);
    const data = await res.json();
    if (!data.length) return;

    const labels = data.map(x => new Date(x.time).toLocaleTimeString()).reverse();
    const moist = data.map(x => x.moisture).reverse();
    const temp = data.map(x => x.temperature).reverse();
    const press = data.map(x => x.pressure).reverse();

    new Chart(document.getElementById("moistureChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Drėgmė", data: moist }] }
    });

    new Chart(document.getElementById("tempChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Temperatūra", data: temp }] }
    });

    new Chart(document.getElementById("pressureChart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Slėgis", data: press }] }
    });

  } catch (err) {
    console.error("Klaida istorijoje:", err);
  }
}

loadLatest();
loadHistory();
setInterval(loadLatest, 5000);

let moistureChart, tempChart, pressureChart;

async function updateChart() {
  const raw = await fetchHistory();
  const data = groupByHour(raw);

  const labels = data.map(r => {
    const d = new Date(r.updated_at);
    return d.getHours() + ":00";
  });

  const moisture = data.map(r => r.moisture_percent);
  const temp = data.map(r => r.temperature_c);
  const pressure = data.map(r => r.pressure_hpa);

  // 💧 DRĖGMĖ
  const ctx1 = document.getElementById("moistureChart").getContext("2d");
  if (moistureChart) moistureChart.destroy();

  moistureChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Drėgmė %",
        data: moisture,
        borderColor: "#22c55e",
        tension: 0.3
      }]
    },
    options: basicChartOptions()
  });

  // 🌡️ TEMP
  const ctx2 = document.getElementById("tempChart").getContext("2d");
  if (tempChart) tempChart.destroy();

  tempChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Temperatūra °C",
        data: temp,
        borderColor: "#f97316",
        tension: 0.3
      }]
    },
    options: basicChartOptions()
  });

  // 🧭 SLĖGIS
  const ctx3 = document.getElementById("pressureChart").getContext("2d");
  if (pressureChart) pressureChart.destroy();

  pressureChart = new Chart(ctx3, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Slėgis hPa",
        data: pressure,
        borderColor: "#3b82f6",
        tension: 0.3
      }]
    },
    options: basicChartOptions()
  });
}

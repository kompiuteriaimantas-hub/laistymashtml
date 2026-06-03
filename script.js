// ===== API ENDPOINTAI (PASIKOREGUOK) =====
const API_BASE = ''; // pvz. '' jei tas pats domenas
const API_CURRENT = API_BASE + '/api/current';
const API_HISTORY_MOISTURE = API_BASE + '/api/history/moisture';
const API_HISTORY_TEMP = API_BASE + '/api/history/temperature';
const API_HISTORY_PRESSURE = API_BASE + '/api/history/pressure';
const API_CALIB_DRY = API_BASE + '/api/calibration/dry';
const API_CALIB_WET = API_BASE + '/api/calibration/wet';
const API_STATUS = API_BASE + '/api/status';
const API_UNLOCK = API_BASE + '/api/unlock';
const API_PUMP_ON = API_BASE + '/api/pump/on';
const API_PUMP_OFF = API_BASE + '/api/pump/off';

// ===== WEB DUOMENŲ SKAITIKLIS =====
let dataUsedBytes = Number(localStorage.getItem('dataUsedBytes') || 0);

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function updateDataUsageUI() {
  const el = document.getElementById('data-usage');
  if (el) el.textContent = `Web duomenys: ${formatMB(dataUsedBytes)} MB`;
}

// wrapinam fetch, kad skaičiuotume atsakymų dydį
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await originalFetch(...args);
  try {
    const clone = res.clone();
    const buf = await clone.arrayBuffer();
    dataUsedBytes += buf.byteLength;
    localStorage.setItem('dataUsedBytes', String(dataUsedBytes));
    updateDataUsageUI();
  } catch (e) {
    console.warn('Nepavyko pamatuoti atsakymo dydžio', e);
  }
  return res;
};

// ===== REŽIMAI: NERIBOTAS / TAUPUS =====
let updateIntervalMs = 10000; // default 10s
let updateTimer = null;
let currentMode = localStorage.getItem('mode') || 'neribotas';

function applyModeToUI() {
  const btnUnlimited = document.getElementById('mode-unlimited');
  const btnSaving = document.getElementById('mode-saving');
  if (!btnUnlimited || !btnSaving) return;

  if (currentMode === 'neribotas') {
    btnUnlimited.classList.add('active');
    btnSaving.classList.remove('active');
  } else {
    btnUnlimited.classList.remove('active');
    btnSaving.classList.add('active');
  }
}

function setMode(mode) {
  currentMode = mode;
  localStorage.setItem('mode', mode);

  if (mode === 'neribotas') {
    updateIntervalMs = 10000; // 10s
  } else {
    updateIntervalMs = 60000; // 60s
  }

  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(fetchAllData, updateIntervalMs);
  applyModeToUI();
}

// ===== CHART.JS =====
let moistureChart, tempChart, pressureChart;

function createCharts() {
  const ctxM = document.getElementById('moistureChart').getContext('2d');
  const ctxT = document.getElementById('tempChart').getContext('2d');
  const ctxP = document.getElementById('pressureChart').getContext('2d');

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: '#9e9e9e', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        ticks: { color: '#9e9e9e', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  moistureChart = new Chart(ctxM, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76,175,80,0.15)',
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: baseOptions
  });

  tempChart = new Chart(ctxT, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255,152,0,0.15)',
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: baseOptions
  });

  pressureChart = new Chart(ctxP, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33,150,243,0.15)',
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: baseOptions
  });
}

function updateChart(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

// ===== UI UPDATINIMAS =====
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateCurrentUI(data) {
  // tikiesi kažko tokio iš API_CURRENT:
  // { moisture: 28, temperature: 22.5, pressure: 1013, wifi_rssi: -65, raw: 512, moisture_percent: 28 }
  setText('moisture-value', data.moisture != null ? `${data.moisture}%` : '--%');
  setText('temp-value', data.temperature != null ? `${data.temperature.toFixed(1)}°C` : '--°C');
  setText('pressure-value', data.pressure != null ? `${data.pressure} hPa` : '---- hPa');
  setText('wifi-rssi', data.wifi_rssi != null ? `WiFi: ${data.wifi_rssi} dBm` : 'WiFi: -- dBm');
  setText('raw-value', data.raw != null ? data.raw : '--');
  setText('moisture-percent', data.moisture_percent != null ? `${data.moisture_percent}%` : '--%');

  const now = new Date();
  setText('last-update', `Atnaujinta: ${now.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}`);
}

function updateCalibrationUI(data) {
  // tikiesi iš status ar kito endpointo:
  // { dry: 342, wet: 780 }
  if (!data) return;
  if (data.dry != null) setText('dry-value', data.dry);
  if (data.wet != null) setText('wet-value', data.wet);
}

function updateLockUI(status) {
  // pvz. { locked: true, reason: 'Moisture did not increase' }
  const lockText = document.getElementById('lock-status');
  const unlockBtn = document.getElementById('unlock-btn');
  const systemStatus = document.getElementById('system-status');

  if (!lockText || !unlockBtn || !systemStatus) return;

  if (status.locked) {
    lockText.textContent = 'Sistema užrakinta! Klaida laistant';
    lockText.classList.add('status-error');
    unlockBtn.classList.remove('hidden');
    systemStatus.textContent = 'LOCKED';
    systemStatus.classList.remove('status-ok');
    systemStatus.classList.add('status-error');
  } else {
    lockText.textContent = 'Sistema: atrakinta';
    lockText.classList.remove('status-error');
    unlockBtn.classList.add('hidden');
    systemStatus.textContent = 'OK';
    systemStatus.classList.remove('status-error');
    systemStatus.classList.add('status-ok');
  }
}

function updatePumpUI(isOn) {
  const btn = document.getElementById('pump-btn');
  const status = document.getElementById('pump-status');
  if (!btn || !status) return;

  if (isOn) {
    btn.textContent = '🟢 Laisto...';
    status.textContent = 'Siurblys: įjungtas';
  } else {
    btn.textContent = '💧 Laistyti dabar';
    status.textContent = 'Siurblys: išjungtas';
  }
}

// ===== FETCHAI =====
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAllData() {
  try {
    const [current, moistHist, tempHist, pressHist, status] = await Promise.all([
      fetchJson(API_CURRENT),
      fetchJson(API_HISTORY_MOISTURE),
      fetchJson(API_HISTORY_TEMP),
      fetchJson(API_HISTORY_PRESSURE),
      fetchJson(API_STATUS)
    ]);

    updateCurrentUI(current);
    updateCalibrationUI(status.calibration);
    updateLockUI(status);
    updatePumpUI(status.pump_on);

    // history format pvz: { labels: ['Pr','A','T',...], values: [..] }
    if (moistHist && moistureChart) {
      updateChart(moistureChart, moistHist.labels || [], moistHist.values || []);
    }
    if (tempHist && tempChart) {
      updateChart(tempChart, tempHist.labels || [], tempHist.values || []);
    }
    if (pressHist && pressureChart) {
      updateChart(pressureChart, pressHist.labels || [], pressHist.values || []);
    }
  } catch (e) {
    console.error('Klaida gaunant duomenis:', e);
  }
}

// ===== VEIKSMAI =====
async function sendCalibration(type) {
  try {
    const url = type === 'dry' ? API_CALIB_DRY : API_CALIB_WET;
    await fetch(url, { method: 'POST' });
    // po kalibravimo – persikraunam statusą
    const status = await fetchJson(API_STATUS);
    updateCalibrationUI(status.calibration);
  } catch (e) {
    console.error('Kalibravimo klaida:', e);
  }
}

async function unlockSystem() {
  try {
    await fetch(API_UNLOCK, { method: 'POST' });
    const status = await fetchJson(API_STATUS);
    updateLockUI(status);
  } catch (e) {
    console.error('Unlock klaida:', e);
  }
}

let pumpOn = false;

async function togglePump() {
  try {
    pumpOn = !pumpOn;
    const url = pumpOn ? API_PUMP_ON : API_PUMP_OFF;
    await fetch(url, { method: 'POST' });
    updatePumpUI(pumpOn);
  } catch (e) {
    console.error('Siurblio klaida:', e);
    pumpOn = !pumpOn; // revert
  }
}

// ===== INIT =====
function initEvents() {
  const btnDry = document.getElementById('calib-dry');
  const btnWet = document.getElementById('calib-wet');
  const btnUnlock = document.getElementById('unlock-btn');
  const btnPump = document.getElementById('pump-btn');
  const btnModeUnlimited = document.getElementById('mode-unlimited');
  const btnModeSaving = document.getElementById('mode-saving');

  if (btnDry) btnDry.addEventListener('click', () => sendCalibration('dry'));
  if (btnWet) btnWet.addEventListener('click', () => sendCalibration('wet'));
  if (btnUnlock) btnUnlock.addEventListener('click', unlockSystem);
  if (btnPump) btnPump.addEventListener('click', togglePump);

  if (btnModeUnlimited) btnModeUnlimited.addEventListener('click', () => setMode('neribotas'));
  if (btnModeSaving) btnModeSaving.addEventListener('click', () => setMode('taupus'));
}

window.addEventListener('DOMContentLoaded', () => {
  updateDataUsageUI();
  createCharts();
  initEvents();
  applyModeToUI();
  fetchAllData();
  // paleidžiam intervalą pagal išsaugotą režimą
  if (currentMode === 'neribotas') {
    updateIntervalMs = 10000;
  } else {
    updateIntervalMs = 60000;
  }
  updateTimer = setInterval(fetchAllData, updateIntervalMs);
});

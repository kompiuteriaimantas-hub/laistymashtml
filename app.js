const SUPABASE_URL = "https://wbueugwhngtgtifuasvm.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWV1Z3dobmd0Z3RpZnVhc3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzY1ODYsImV4cCI6MjA5NjI1MjU4Nn0.sOcV5GRsoIhhApmHhFnSCZ6NmDPcnkGrE6mSyQchSmI";

function sbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        ...extra
    };
}
async function login() {
    const pw = document.getElementById("pwInput").value;

    const res = await fetch(
        `${SUPABASE_URL}/rest/v1/config?select=password&limit=1`,
        { headers: sbHeaders() }
    );

    const arr = await res.json();
    if (!arr.length) return;

    if (pw === arr[0].password) {
        // Sėkmingas prisijungimas
        localStorage.setItem("auth_ok", "1");
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "block";
    } else {
        document.getElementById("loginError").innerText = "Neteisingas slaptažodis";
    }
}

/* -------------------------------
   🕒 ONLINE FORMAT
--------------------------------*/
function formatLastSeen(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);

    if (s < 60) return `Online prieš ${s}s`;
    if (m < 60) return `Online prieš ${m} min`;
    return `Online prieš ${h} val`;
}

/* -------------------------------
   📊 MĖNESIO ISTORIJA
--------------------------------*/
async function fetchMonthlyUsage() {
    try {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/usage_history?created_at=gte.${firstDay}&select=*`,
            { headers: sbHeaders() }
        );

        return await res.json();
    } catch (e) {
        console.log("Monthly error:", e);
        return [];
    }
}

async function updateMonthlyUsageUI() {
    const data = await fetchMonthlyUsage();

    if (!data || !Array.isArray(data)) {
        document.getElementById("monthlyUsage").innerText =
            "Šio mėnesio sunaudota: 0 KB";
        return;
    }

    let total = 0;
    for (const row of data) {
        total += row.usage_bytes || 0;
    }

    const kb = total / 1024;
    const mb = kb / 1024;

    document.getElementById("monthlyUsage").innerText =
        mb >= 1
            ? `Šio mėnesio sunaudota: ${mb.toFixed(2)} MB`
            : `Šio mėnesio sunaudota: ${kb.toFixed(1)} KB`;
}

/* -------------------------------
   STATUS
--------------------------------*/
async function fetchStatus() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/status?select=*&order=id.desc&limit=1`,
            { headers: sbHeaders() }
        );

        const arr = await res.json();
        const data = arr[0];

        if (!data) {
            setOffline();
            return;
        }

        const now = Date.now();
        const updated = new Date(
            data.updated_at.replace(/\.\d+/, "") + "Z"
        ).getTime();

        const diff = now - updated;

        let isOffline = false;
        if (isNaN(updated) || diff > 120000) {
            isOffline = true;
        }

        // VISADA rodom paskutinius duomenis
        document.getElementById("moisture").innerText = data.moisture_percent ?? "-";
        document.getElementById("temperature").innerText = data.temperature_c ?? "-";
        document.getElementById("pressure").innerText = data.pressure_hpa ?? "-";

        const wifiEl = document.getElementById("wifi");
        if (wifiEl) wifiEl.innerText = data.wifi_rssi ?? "-";

        const lockEl = document.getElementById("lockdownState");
        if (lockEl) lockEl.innerText = data.lockdown ? "TAIP" : "NE";

        const usageBytes = data.usage_bytes || 0;
        const kb = usageBytes / 1024;
        const mb = kb / 1024;

        const usageEl = document.getElementById("usage");
        if (usageEl) {
            usageEl.innerText =
                mb >= 1 ? mb.toFixed(2) + " MB" : kb.toFixed(1) + " KB";
        }

        // RELAY
        const btn = document.getElementById("relayBtn");
        const relayStateEl = document.getElementById("relayState");

        if (btn && relayStateEl) {
            if (data.relay) {
                btn.innerText = "Išjungti";
                btn.classList.add("active");
                btn.classList.remove("off");
                relayStateEl.innerText = "Įjungta";
            } else {
                btn.innerText = "Įjungti";
                btn.classList.remove("active");
                btn.classList.add("off");
                relayStateEl.innerText = "Išjungta";
            }
        }

        // -------------------------------
        //   🔥 TEISINGA PRIORITETŲ TVARKA
        // -------------------------------
        const el = document.getElementById("onlineStatus");

        if (isOffline) {
            setOffline();
        } else if (data.lockdown) {
            el.innerText = "LOCKDOWN";
            el.style.color = "#ff4444";
            el.style.textShadow = "0 0 10px #ff4444";
        } else {
            setOnline(diff);
        }

    } catch (err) {
        console.log("JS error:", err);
        setOffline();
    }
}

/* -------------------------------
   UI
--------------------------------*/
function setOnline(diff) {
    const el = document.getElementById("onlineStatus");
    el.innerText = formatLastSeen(diff);
    el.style.color = "#00ff88";
    el.style.textShadow = "0 0 8px #00ff88";
}

function setOffline() {
    const el = document.getElementById("onlineStatus");
    el.innerText = "OFFLINE";
    el.style.color = "#ffcc33";
}

/* -------------------------------
   RELAY COMMAND
--------------------------------*/
async function sendRelayCommand(state) {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
        method: "POST",
        headers: sbHeaders({
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        }),
        body: JSON.stringify({ relay_state: state })
    });
}

/* -------------------------------
   🔥 RESET LOCKDOWN
--------------------------------*/
async function resetLockdown() {
    await fetch(`${SUPABASE_URL}/rest/v1/commands`, {
        method: "POST",
        headers: sbHeaders({
            "Content-Type": "application/json",
            Prefer: "return=minimal"
        }),
        body: JSON.stringify({ reset_lockdown: true })
    });
}

/* -------------------------------
   START
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {

    window.addEventListener("DOMContentLoaded", () => {

    // Tikrinam ar jau prisijungęs
    if (localStorage.getItem("auth_ok") === "1") {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("app").style.display = "block";
    } else {
        document.getElementById("loginBox").style.display = "block";
        document.getElementById("app").style.display = "none";
        return; // sustabdom UI veikimą kol neprisijungė
    }

    // tavo esamas kodas:
    fetchStatus();
    updateMonthlyUsageUI();
    setInterval(fetchStatus, 1000);
    setInterval(updateMonthlyUsageUI, 60000);
});

    // RELAY
    document.getElementById("relayBtn").addEventListener("click", async () => {
        const btn = document.getElementById("relayBtn");
        const isOn = btn.classList.contains("active");

        btn.classList.toggle("active");
        btn.classList.toggle("off");
        btn.innerText = isOn ? "Įjungti" : "Išjungti";

        await sendRelayCommand(isOn ? "off" : "on");

        setTimeout(fetchStatus, 1500);
    });

    // RESET BUTTON
    const resetBtn = document.getElementById("btnReset");

    if (resetBtn) {
        resetBtn.addEventListener("click", async () => {

            resetBtn.innerText = "...";

            await resetLockdown();

            setTimeout(() => {
                fetchStatus();
                resetBtn.innerText = "Atstatyti sistemą";
            }, 2500);
        });
    }

    fetchStatus();
    updateMonthlyUsageUI();

    setInterval(fetchStatus, 1000);
    setInterval(updateMonthlyUsageUI, 60000);
});

import { AstroEngine } from "./engine.js";

class AstroSholatApp {
  constructor() {
    this.state = {
      lat: -7.7956,
      lng: 110.3695,
      tz: 7,
      method: "KEMENAG",
      currentResult: null,
      deviceHeading: 0,
      compassActive: false,
      qiblaAzimuth: 294.72,
      qiblaDistance: 8342
    };

    this.el = {
      presetCity: document.getElementById("preset-city"),
      calcMethod: document.getElementById("calc-method"),
      btnGps: document.getElementById("btn-gps"),
      btnRecalc: document.getElementById("btn-recalc"),
      btnCompass: document.getElementById("btn-compass"),
      compassBadge: document.getElementById("compass-badge"),
      inputLat: document.getElementById("input-lat"),
      inputLng: document.getElementById("input-lng"),
      inputTz: document.getElementById("input-tz"),
      gpsStatus: document.getElementById("gps-status"),
      prayerGrid: document.getElementById("prayer-grid"),
      nextPrayerName: document.getElementById("next-prayer-name"),
      countdownTimer: document.getElementById("countdown-timer"),
      liveDate: document.getElementById("live-date"),
      liveClock: document.getElementById("live-clock"),
      qiblaCanvas: document.getElementById("qibla-canvas"),
      qiblaDeg: document.getElementById("qibla-deg"),
      qiblaDist: document.getElementById("qibla-dist"),
      moonCanvas: document.getElementById("moon-canvas"),
      moonPhaseName: document.getElementById("moon-phase-name"),
      moonIllum: document.getElementById("moon-illum"),
      ephJd: document.getElementById("eph-jd"),
      ephDecl: document.getElementById("eph-decl"),
      ephEot: document.getElementById("eph-eot"),
      ephTransit: document.getElementById("eph-transit"),
      ephLngCorr: document.getElementById("eph-lng-corr")
    };

    this.prayerLabels = [
      { key: "imsak", label: "Imsak" },
      { key: "subuh", label: "Subuh" },
      { key: "terbit", label: "Terbit" },
      { key: "dhuha", label: "Dhuha" },
      { key: "zuhur", label: "Zuhur" },
      { key: "asar", label: "Asar" },
      { key: "maghrib", label: "Maghrib" },
      { key: "isya", label: "Isya" }
    ];
  }

  init() {
    this.bindEvents();
    this.recalculate();
    this.startClockLoop();
  }

  bindEvents() {
    this.el.presetCity.addEventListener("change", (e) => {
      const [lat, lng, tz] = e.target.value.split(",").map(Number);
      this.state.lat = lat;
      this.state.lng = lng;
      this.state.tz = tz;
      this.syncInputs();
      this.el.gpsStatus.textContent = "Preset Kota";
      this.recalculate();
    });

    this.el.calcMethod.addEventListener("change", (e) => {
      this.state.method = e.target.value;
      this.recalculate();
    });

    this.el.btnRecalc.addEventListener("click", () => {
      const lat = parseFloat(this.el.inputLat.value);
      const lng = parseFloat(this.el.inputLng.value);
      const tz = parseFloat(this.el.inputTz.value);
      if (!isNaN(lat) && !isNaN(lng) && !isNaN(tz)) {
        this.state.lat = lat;
        this.state.lng = lng;
        this.state.tz = tz;
        this.el.gpsStatus.textContent = "Koordinat Manual";
        this.recalculate();
      }
    });

    this.el.btnGps.addEventListener("click", () => this.detectGPS());
    this.el.btnCompass.addEventListener("click", () => this.initCompassSensor());
  }

  syncInputs() {
    this.el.inputLat.value = this.state.lat.toFixed(4);
    this.el.inputLng.value = this.state.lng.toFixed(4);
    this.el.inputTz.value = this.state.tz;
  }

  detectGPS() {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung fitur Geolocation.");
      return;
    }

    this.el.gpsStatus.textContent = "Mencari Satelit...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.state.lat = pos.coords.latitude;
        this.state.lng = pos.coords.longitude;
        this.state.tz = -new Date().getTimezoneOffset() / 60;
        this.syncInputs();
        this.el.gpsStatus.textContent = "GPS Aktif Akurat";
        this.recalculate();
      },
      () => {
        this.el.gpsStatus.textContent = "GPS Gagal";
        alert("Gagal mengakses GPS: Pastikan izin lokasi diaktifkan di browser HP.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async initCompassSensor() {
    if (this.state.compassActive) return;

    // Penanganan izin khusus untuk perangkat iOS 13+
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientation", (e) => this.handleOrientation(e), true);
          this.setCompassActiveUI();
        } else {
          alert("Izin akses sensor kompas ditolak.");
        }
      } catch (err) {
        alert("Gagal meminta izin sensor kompas: " + err.message);
      }
    } else if ("ondeviceorientationabsolute" in window) {
      // Standar Android Chrome (Absolute Magnetic North)
      window.addEventListener("deviceorientationabsolute", (e) => this.handleOrientation(e), true);
      this.setCompassActiveUI();
    } else if ("ondeviceorientation" in window) {
      window.addEventListener("deviceorientation", (e) => this.handleOrientation(e), true);
      this.setCompassActiveUI();
    } else {
      alert("Perangkat atau browser ini tidak memiliki sensor magnetometer.");
    }
  }

  setCompassActiveUI() {
    this.state.compassActive = true;
    this.el.compassBadge.textContent = "Live Magnetik";
    this.el.compassBadge.classList.remove("pill-warn");
    this.el.btnCompass.textContent = "✓ Sensor Kompas Aktif (Putar HP)";
    this.el.btnCompass.style.opacity = "0.7";
  }

  handleOrientation(event) {
    let heading = null;

    if (typeof event.webkitCompassHeading === "number") {
      // iOS Safari: langsung derajat terhadap Utara Magnetik
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android: alpha berlawanan arah jarum jam, konversi ke searah jarum jam
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null && !isNaN(heading)) {
      this.state.deviceHeading = heading;
      this.renderQibla();
    }
  }

  recalculate() {
    const now = new Date();
    const res = AstroEngine.calculatePrayerTimes(
      now,
      this.state.lat,
      this.state.lng,
      this.state.tz,
      this.state.method
    );
    this.state.currentResult = res;

    const qibla = AstroEngine.calculateQibla(this.state.lat, this.state.lng);
    this.state.qiblaAzimuth = qibla.azimuth;
    this.state.qiblaDistance = qibla.distanceKm;

    this.renderEphemeris(res.ephemeris);
    this.renderQibla();
    this.renderMoon(now);
    this.updateActivePrayerAndCountdown();
  }

  renderPrayerCards(activeKey) {
    const times = this.state.currentResult.times;
    this.el.prayerGrid.innerHTML = "";

    this.prayerLabels.forEach((item) => {
      const card = document.createElement("div");
      card.className = `prayer-card ${item.key === activeKey ? "active" : ""}`;
      card.innerHTML = `
        <div class="prayer-name">${item.label}</div>
        <div class="prayer-time">${times[item.key]}</div>
      `;
      this.el.prayerGrid.appendChild(card);
    });
  }

  renderEphemeris(eph) {
    this.el.ephJd.textContent = eph.jd;
    this.el.ephDecl.textContent = `${eph.declination}°`;
    const sign = Number(eph.eotMinutes) >= 0 ? "+" : "";
    this.el.ephEot.textContent = `${sign}${eph.eotMinutes} mnt`;
    this.el.ephTransit.textContent = eph.transit;
    this.el.ephLngCorr.textContent = `${eph.lngCorrection} mnt`;
  }

  renderQibla() {
    const azimuth = this.state.qiblaAzimuth;
    const heading = this.state.deviceHeading;

    this.el.qiblaDeg.textContent = `${azimuth.toFixed(1)}° / ${Math.round(heading)}°`;
    this.el.qiblaDist.textContent = `${this.state.qiblaDistance.toLocaleString("id-ID")} km`;

    // Cek apakah arah HP sudah lurus dengan arah Kiblat (toleransi ±3.5 derajat)
    const diff = Math.abs(((azimuth - heading + 540) % 360) - 180);
    const isAligned = this.state.compassActive && diff <= 3.5;

    if (this.state.compassActive) {
      this.el.compassBadge.textContent = isAligned ? "★ Lurus Kiblat!" : "Live Magnetik";
    }

    const canvas = this.el.qiblaCanvas;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 88;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Indikator Panah Statis di Puncak Atas (Penanda Arah Hadap HP)
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 15);
    ctx.lineTo(cx - 7, cy - r - 4);
    ctx.lineTo(cx + 7, cy - r - 4);
    ctx.closePath();
    ctx.fillStyle = isAligned ? "#10b981" : "#d4af37";
    ctx.fill();

    // Putar Piringan Kompas Sebesar -deviceHeading
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(AstroEngine.dtr(-heading));

    // Lingkaran Luar Kompas
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = isAligned ? "#10b981" : "rgba(212, 175, 55, 0.38)";
    ctx.lineWidth = isAligned ? 3.5 : 2;
    ctx.stroke();

    // Garis Derajat Kompas
    for (let i = 0; i < 360; i += 15) {
      const rad = AstroEngine.dtr(i - 90);
      const inner = i % 90 === 0 ? r - 12 : r - 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rad) * inner, Math.sin(rad) * inner);
      ctx.lineTo(Math.cos(rad) * r, Math.sin(rad) * r);
      ctx.strokeStyle = i === 0 ? "#ff2a5f" : (i % 90 === 0 ? "#d4af37" : "rgba(255,255,255,0.2)");
      ctx.lineWidth = i % 90 === 0 ? 2 : 1;
      ctx.stroke();
    }

    // Huruf Mata Angin
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff2a5f";
    ctx.fillText("U", 0, -r + 22);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("T", r - 22, 0);
    ctx.fillText("S", 0, r - 22);
    ctx.fillText("B", -r + 22, 0);

    // Jarum Arah Kiblat (Ikut berputar bersama piringan kompas)
    const qRad = AstroEngine.dtr(azimuth - 90);
    ctx.save();
    ctx.rotate(qRad);

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(r - 16, 0);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fillStyle = isAligned ? "#10b981" : "#d4af37";
    ctx.fill();

    ctx.restore();
    ctx.restore();

    // Titik Poros Tengah
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = isAligned ? "#10b981" : "#d4af37";
    ctx.fill();
  }

  renderMoon(date) {
    const moon = AstroEngine.calculateMoonPhase(date);
    this.el.moonPhaseName.textContent = moon.phaseName;
    this.el.moonIllum.textContent = `${moon.illumination}% (${moon.ageDays} hr)`;

    const canvas = this.el.moonCanvas;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = 72;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#0f2922";
    ctx.fill();
    ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const phase = moon.phaseRatio;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, phase > 0.5);
    const terminatorX = Math.cos(phase * 2 * Math.PI) * r;
    ctx.ellipse(cx, cy, Math.abs(terminatorX), r, 0, Math.PI / 2, -Math.PI / 2, phase < 0.25 || phase > 0.75);
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx - 15, cy - 15, 10, cx, cy, r);
    grad.addColorStop(0, "#fffbeb");
    grad.addColorStop(1, "#d4af37");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  startClockLoop() {
    this.updateActivePrayerAndCountdown();
    setInterval(() => {
      this.updateActivePrayerAndCountdown();
    }, 1000);
  }

  updateActivePrayerAndCountdown() {
    const now = new Date();
    this.el.liveDate.textContent = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    this.el.liveClock.textContent = now.toLocaleTimeString("id-ID", { hour12: false });

    if (!this.state.currentResult) return;

    const currentDec = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const raw = this.state.currentResult.rawDecimal;

    let nextKey = "imsak";
    let nextLabel = "Imsak (Besok)";
    let nextDec = raw.imsak + 24.0;

    for (const item of this.prayerLabels) {
      const pDec = AstroEngine.fixHour(raw[item.key]);
      if (pDec > currentDec) {
        nextKey = item.key;
        nextLabel = item.label;
        nextDec = pDec;
        break;
      }
    }

    const diffHours = nextDec - currentDec;
    const totalSec = Math.max(0, Math.floor(diffHours * 3600));
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");

    this.el.nextPrayerName.textContent = nextLabel;
    this.el.countdownTimer.textContent = `${hh}:${mm}:${ss}`;
    this.renderPrayerCards(nextKey);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new AstroSholatApp().init();
});

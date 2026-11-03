import { AstroEngine } from "./engine.js";

const DOCS_DATA = {
  readme: {
    filename: "README.md",
    content: `# 🕌 AstroSholat PRO — Astronomical Prayer Times & Qibla Engine

Dikembangkan oleh: fatur62 (https://github.com/fatur62)

AstroSholat PRO adalah aplikasi web observatorium astronomi Islam modern yang menghitung jadwal waktu salat presisi, arah geodesi Kiblat, data solar ephemeris, dan fase iluminasi bulan secara mandiri 100% di sisi klien (Zero External API) menggunakan algoritma astronomi Jean Meeus.

---

## ✨ FITUR UNGGULAN
1. Perhitungan Ephemeris Matahari Murni (Zero API):
   - Menghitung Julian Date (JD), Deklinasi Matahari, dan Equation of Time (EoT).
   - Mendukung 5 metode hisab: Kemenag RI, MWL, ISNA, Umm al-Qura, dan Mesir.
2. Kompas Kiblat Interaktif (Live Magnetometer Sensor):
   - Menggunakan Great Circle Bearing dan rumus jarak Haversine.
   - Terintegrasi dengan sensor kompas HP (DeviceOrientation API).
   - Fitur Qibla Lock-On: Menyala hijau zamrud saat lurus menghadap Ka'bah.
3. Visualisasi Fase & Iluminasi Bulan di atas HTML5 Canvas 2D.

---

## 📖 MANUAL PENGGUNAAN SINGKAT

1. PENGATURAN LOKASI:
   - Ketuk tombol "📍 Gunakan GPS" di bagian atas untuk mengunci koordinat otomatis, atau pilih kota pada menu "Lokasi Cepat".
2. KOMPAS KIBLAT LIVE:
   - Ketuk tombol "🧭 Aktifkan Sensor Kompas HP".
   - Pegang ponsel mendatar sejajar lantai dan jauhkan dari benda bermagnet.
   - Putar badan Anda hingga ujung Jarum Emas tepat bertemu segitiga di puncak atas lingkaran (status berubah menjadi "★ Lurus Kiblat!").
   - Jika kompas kurang akurat, gerakkan HP membentuk angka 8 di udara selama 5 detik.`
  },
  license: {
    filename: "LICENSE",
    content: `MIT License

Copyright (c) 2026 fatur62

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
  }
};

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
      qiblaDistance: 8342,
      activeDocKey: "readme"
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
      ephLngCorr: document.getElementById("eph-lng-corr"),

      // Elemen Modal Baca Saya (Docs)
      btnOpenDocs: document.getElementById("btn-open-docs"),
      modalDocs: document.getElementById("modal-docs"),
      btnCloseDocs: document.getElementById("btn-close-docs"),
      tabReadme: document.getElementById("tab-readme"),
      tabLicense: document.getElementById("tab-license"),
      docFilename: document.getElementById("doc-filename"),
      docViewer: document.getElementById("doc-viewer"),
      btnCopyDoc: document.getElementById("btn-copy-doc")
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
    this.renderDocContent("readme");
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

    // Event Listener Menu "Baca Saya"
    this.el.btnOpenDocs.addEventListener("click", () => {
      this.renderDocContent("readme");
      this.el.modalDocs.showModal();
    });

    this.el.btnCloseDocs.addEventListener("click", () => {
      this.el.modalDocs.close();
    });

    this.el.tabReadme.addEventListener("click", () => this.renderDocContent("readme"));
    this.el.tabLicense.addEventListener("click", () => this.renderDocContent("license"));

    this.el.btnCopyDoc.addEventListener("click", async () => {
      const currentDoc = DOCS_DATA[this.state.activeDocKey];
      if (!currentDoc) return;
      try {
        await navigator.clipboard.writeText(currentDoc.content);
        const originalText = this.el.btnCopyDoc.textContent;
        this.el.btnCopyDoc.textContent = "✓ Berhasil Disalin!";
        setTimeout(() => {
          this.el.btnCopyDoc.textContent = originalText;
        }, 1800);
      } catch (err) {
        alert("Gagal menyalin teks ke clipboard.");
      }
    });
  }

  renderDocContent(docKey) {
    const docItem = DOCS_DATA[docKey] || DOCS_DATA.readme;
    this.state.activeDocKey = docKey;

    this.el.tabReadme.classList.toggle("active", docKey === "readme");
    this.el.tabLicense.classList.toggle("active", docKey === "license");

    this.el.docFilename.textContent = `File: ${docItem.filename}`;
    this.el.docViewer.textContent = docItem.content;
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
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
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

    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 15);
    ctx.lineTo(cx - 7, cy - r - 4);
    ctx.lineTo(cx + 7, cy - r - 4);
    ctx.closePath();
    ctx.fillStyle = isAligned ? "#10b981" : "#d4af37";
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(AstroEngine.dtr(-heading));

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = isAligned ? "#10b981" : "rgba(212, 175, 55, 0.38)";
    ctx.lineWidth = isAligned ? 3.5 : 2;
    ctx.stroke();

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

    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ff2a5f";
    ctx.fillText("U", 0, -r + 22);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("T", r - 22, 0);
    ctx.fillText("S", 0, r - 22);
    ctx.fillText("B", -r + 22, 0);

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

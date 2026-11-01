# 🕌 AstroSholat PRO — Astronomical Prayer Times & Qibla Engine

![JavaScript ES6+](https://img.shields.io/badge/JavaScript-ES6%2B-d4af37?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas_2D-10b981?style=for-the-badge&logo=html5&logoColor=white)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero_(Pure_Math)-0284c7?style=for-the-badge)

**AstroSholat PRO** adalah aplikasi web observatorium astronomi Islam modern yang menghitung jadwal waktu salat presisi, arah geodesi Kiblat, data *solar ephemeris*, dan fase iluminasi bulan secara **mandiri 100% di sisi klien (Zero External API)** menggunakan algoritma astronomi **Jean Meeus**.

Dikembangkan oleh **[@fatur62](https://github.com/fatur62)**.

---

## ✨ Fitur Unggulan

1. **Perhitungan Ephemeris Matahari Murni (Zero API):**
   * Menghitung *Julian Date (JD)*, Deklinasi Matahari ($\delta$), dan *Equation of Time (EoT)* secara langsung menggunakan persamaan posisi matahari.
   * Mendukung 5 standar metode hisab internasional: **Kemenag RI**, **Muslim World League (MWL)**, **ISNA**, **Umm al-Qura (Makkah)**, dan **Egyptian General Authority**.
2. **Kompas Kiblat Interaktif (Live Magnetometer Sensor):**
   * Menghitung sudut Azimuth Kiblat menggunakan trigonometri bola (*Great Circle Bearing*) dan jarak ke Ka'bah dengan rumus geodesi *Haversine*.
   * Terintegrasi dengan `DeviceOrientation API` (`deviceorientationabsolute` & `webkitCompassHeading`) yang memutar piringan kompas `<canvas>` secara *real-time* mengikuti arah hadap perangkat.
   * Fitur **Qibla Lock-On**: Lingkaran dan jarum kompas otomatis berubah warna menjadi hijau zamrud saat ponsel lurus menghadap Ka'bah (toleransi $\pm 3.5^\circ$).
3. **Visualisasi Fase & Iluminasi Bulan:**
   * Merender bentuk lengkung bayangan bulan (*terminator line*) secara prosedural di atas *HTML5 Canvas* berdasarkan siklus bulan sinodis ($29.530588$ hari).
4. **Arsitektur Modular & Desain Luxury Glassmorphism:**
   * Menggunakan pemisahan *concern* (*Separation of Concerns*) berbasis *Native ES6 Modules* tanpa ketergantungan *framework* atau *library* pihak ketiga.

---

## 📐 Landasan Matematika & Algoritma

### 1. Sudut Jam Matahari (*Solar Hour Angle*)
Waktu salat ditentukan berdasarkan sudut depresi/elevasi matahari ($\alpha$) terhadap ufuk lokal dengan rumus trigonometri bola:

$$\cos(H) = \frac{\sin(\alpha) - \sin(\phi) \cdot \sin(\delta)}{\cos(\phi) \cdot \cos(\delta)}$$

Di mana:
* $H$ = Sudut jam matahari (*Hour Angle*)
* $\phi$ = Lintang pengamat (*Latitude*)
* $\delta$ = Deklinasi matahari (*Solar Declination*)
* $\alpha$ = Sudut ketinggian matahari (Contoh Kemenag RI: Subuh $= -20^\circ$, Isya $= -18^\circ$, Magrib/Terbit $= -0.8333^\circ$)

### 2. Azimuth Kiblat (*Great Circle*)
Sudut arah kiblat ($Q$) dari koordinat pengguna $(\phi, \lambda)$ menuju Ka'bah $(\phi_K = 21.4225^\circ, \lambda_K = 39.8262^\circ)$:

$$Q = \text{atan2}\left(\sin(\lambda_K - \lambda), \cos(\phi)\tan(\phi_K) - \sin(\phi)\cos(\lambda_K - \lambda)\right)$$

---

## 📂 Struktur Direktori

```text
├── index.html   # Struktur DOM Semantik & Elemen Canvas
├── style.css    # Tema Luxury Emerald-Gold, Glassmorphism & Animasi
├── engine.js    # Mesin Matematika Astronomi Jean Meeus & Geodesi
├── app.js       # Pengendali UI, GPS Geolocation & Sensor Magnetometer
└── README.md    # Dokumentasi Teknis Proyek

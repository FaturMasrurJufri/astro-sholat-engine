/**
 * AstroEngine: Perhitungan Astronomi Waktu Salat, Kiblat & Fase Bulan
 * Berdasarkan Algoritma Astronomi Jean Meeus
 */
export class AstroEngine {
  static METHODS = {
    KEMENAG: { name: "Kemenag RI", fajr: 20, isha: 18 },
    MWL: { name: "Muslim World League", fajr: 18, isha: 17 },
    ISNA: { name: "ISNA", fajr: 15, isha: 15 },
    MAKKAH: { name: "Umm al-Qura", fajr: 18.5, isha: "90min" },
    EGYPT: { name: "Egyptian Authority", fajr: 19.5, isha: 17.5 }
  };

  static dtr(deg) { return (deg * Math.PI) / 180.0; }
  static rtd(rad) { return (rad * 180.0) / Math.PI; }
  static fixAngle(a) { return a - 360.0 * Math.floor(a / 360.0); }

  // Konversi Tanggal Masehi ke Julian Date (JD)
  static getJulianDate(year, month, day) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) +
           Math.floor(30.6001 * (month + 1)) +
           day + B - 1524.5;
  }

  // Menghitung Deklinasi Matahari & Equation of Time (EoT)
  static computeSunPosition(jd) {
    const D = jd - 2451545.0;
    const g = this.fixAngle(357.529 + 0.98560028 * D);
    const q = this.fixAngle(280.459 + 0.98564736 * D);
    const L = this.fixAngle(q + 1.915 * Math.sin(this.dtr(g)) + 0.020 * Math.sin(this.dtr(2 * g)));

    const e = 23.439 - 0.00000036 * D;
    const RA = this.rtd(Math.atan2(Math.cos(this.dtr(e)) * Math.sin(this.dtr(L)), Math.cos(this.dtr(L)))) / 15.0;
    
    const decl = this.rtd(Math.asin(Math.sin(this.dtr(e)) * Math.sin(this.dtr(L))));
    let eqt = q / 15.0 - this.fixHour(RA);
    if (eqt > 12) eqt -= 24;
    if (eqt < -12) eqt += 24;

    return {
      declination: decl,
      equationOfTime: eqt // dalam satuan jam
    };
  }

  static fixHour(a) {
    return a - 24.0 * Math.floor(a / 24.0);
  }

  // Menghitung Sudut Jam (Hour Angle) untuk sudut zenit tertentu
  static computeHourAngle(lat, decl, angle) {
    const latRad = this.dtr(lat);
    const declRad = this.dtr(decl);
    const angleRad = this.dtr(angle);

    const cosH = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(declRad)) /
                 (Math.cos(latRad) * Math.cos(declRad));

    if (cosH > 1 || cosH < -1) return null; // Matahari ekstrem (kutub)
    return this.rtd(Math.acos(cosH)) / 15.0;
  }

  // Menghitung Waktu Salat Lengkap + Ihtiyat (2 menit)
  static calculatePrayerTimes(date, lat, lng, tz, methodKey = "KEMENAG") {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const jd = this.getJulianDate(year, month, day) - lng / (15.0 * 24.0);
    const sun = this.computeSunPosition(jd + 0.5);
    const decl = sun.declination;
    const eot = sun.equationOfTime;

    const method = this.METHODS[methodKey] || this.METHODS.KEMENAG;

    // Transit Matahari (Zuhur Murni)
    const dhuhrBase = 12.0 + tz - (lng / 15.0) - eot;

    // Sudut masing-masing waktu salat
    const hFajr = this.computeHourAngle(lat, decl, -method.fajr);
    const hSunrise = this.computeHourAngle(lat, decl, -0.8333);
    const hDhuha = this.computeHourAngle(lat, decl, 4.5);

    // Asar (Syafi'i: bayangan = 1x tinggi benda + bayangan zuhur)
    const asrAlt = this.rtd(Math.atan(1.0 / (1.0 + Math.tan(this.dtr(Math.abs(lat - decl))))));
    const hAsr = this.computeHourAngle(lat, decl, asrAlt);

    const hMaghrib = this.computeHourAngle(lat, decl, -0.8333);

    let ishaTime;
    if (method.isha === "90min") {
      ishaTime = dhuhrBase + hMaghrib + 1.5;
    } else {
      const hIsha = this.computeHourAngle(lat, decl, -method.isha);
      ishaTime = dhuhrBase + hIsha;
    }

    const ihtiyat = 2.0 / 60.0; // Tambahan kehati-hatian 2 menit standar hisab

    const rawTimes = {
      imsak: (dhuhrBase - hFajr) - (10.0 / 60.0) + ihtiyat,
      subuh: (dhuhrBase - hFajr) + ihtiyat,
      terbit: (dhuhrBase - hSunrise),
      dhuha: (dhuhrBase - hDhuha),
      zuhur: dhuhrBase + ihtiyat,
      asar: (dhuhrBase + hAsr) + ihtiyat,
      maghrib: (dhuhrBase + hMaghrib) + ihtiyat,
      isya: ishaTime + ihtiyat
    };

    const formatted = {};
    for (const [key, val] of Object.entries(rawTimes)) {
      formatted[key] = this.decimalToTime(val);
    }

    return {
      times: formatted,
      rawDecimal: rawTimes,
      ephemeris: {
        jd: (jd + 0.5).toFixed(4),
        declination: decl.toFixed(4),
        eotMinutes: (eot * 60).toFixed(2),
        transit: this.decimalToTime(dhuhrBase, true),
        lngCorrection: ((tz * 15 - lng) * 4).toFixed(2)
      }
    };
  }

  static decimalToTime(dec, withSeconds = false) {
    if (dec === null || isNaN(dec)) return "--:--";
    let h = this.fixHour(dec);
    let hours = Math.floor(h);
    let m = (h - hours) * 60.0;
    let minutes = Math.floor(m);
    let seconds = Math.round((m - minutes) * 60.0);

    if (seconds >= 60) {
      seconds = 0;
      minutes += 1;
    }
    if (minutes >= 60) {
      minutes = 0;
      hours = (hours + 1) % 24;
    }

    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return withSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  }

  // Perhitungan Azimuth Kiblat & Jarak Geodesi Haversine ke Ka'bah
  static calculateQibla(lat, lng) {
    const kaabaLat = 21.422487;
    const kaabaLng = 39.826206;

    const phiK = this.dtr(kaabaLat);
    const lambdaK = this.dtr(kaabaLng);
    const phi = this.dtr(lat);
    const lambda = this.dtr(lng);

    const dLambda = lambdaK - lambda;
    const y = Math.sin(dLambda);
    const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(dLambda);

    let qibla = this.rtd(Math.atan2(y, x));
    qibla = (qibla + 360.0) % 360.0;

    // Jarak Haversine (km)
    const R = 6371.0;
    const dLat = phiK - phi;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(phi) * Math.cos(phiK) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return {
      azimuth: qibla,
      distanceKm: Math.round(distance)
    };
  }

  // Perhitungan Fase Bulan & Persentase Iluminasi
  static calculateMoonPhase(date = new Date()) {
    const synodicMonth = 29.53058867;
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    
    const phaseRatio = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth / synodicMonth;
    const ageDays = phaseRatio * synodicMonth;
    const illumination = (1 - Math.cos(phaseRatio * 2 * Math.PI)) / 2 * 100;

    let phaseName = "Bulan Baru (Hilal)";
    if (phaseRatio > 0.03 && phaseRatio < 0.22) phaseName = "Sabit Awal";
    else if (phaseRatio >= 0.22 && phaseRatio <= 0.28) phaseName = "Perbani Awal";
    else if (phaseRatio > 0.28 && phaseRatio < 0.47) phaseName = "Cembung Awal";
    else if (phaseRatio >= 0.47 && phaseRatio <= 0.53) phaseName = "Purnama Penuh";
    else if (phaseRatio > 0.53 && phaseRatio < 0.72) phaseName = "Cembung Akhir";
    else if (phaseRatio >= 0.72 && phaseRatio <= 0.78) phaseName = "Perbani Akhir";
    else if (phaseRatio > 0.78 && phaseRatio < 0.97) phaseName = "Sabit Akhir";

    return {
      phaseRatio,
      ageDays: ageDays.toFixed(1),
      illumination: illumination.toFixed(1),
      phaseName
    };
  }
}

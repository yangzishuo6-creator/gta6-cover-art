"use strict";

// Each sample is painted from geometric shapes and seeded texture on a local canvas.
function sampleScene(name) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  const themes = {
    skyline: ["#443273", "#c56c92", "#ffae7f", 685, 370, 102, 45],
    palms: ["#513670", "#ec777e", "#ffc689", 505, 407, 121, 73],
    motel: ["#28294f", "#9d4278", "#ee8b95", 670, 394, 88, 321],
    highway: ["#422851", "#c06088", "#ffb584", 517, 411, 112, 118],
  };
  const [top, mid, low, sunX, sunY, radius, seed] = themes[name];
  let randomState = seed;
  const random = () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  };
  function rect(color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function poly(color, ...points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
  }
  function sun() {
    const glow = ctx.createRadialGradient(sunX, sunY, radius * .2, sunX, sunY, radius * 2.4);
    glow.addColorStop(0, "#ffd396b0");
    glow.addColorStop(1, "#ffc18a00");
    rect(glow, 0, 0, 960, 650);
    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
    ctx.clip();
    const gradient = ctx.createLinearGradient(0, sunY - radius, 0, sunY + radius);
    gradient.addColorStop(0, "#fff2bc");
    gradient.addColorStop(1, "#ff946d");
    rect(gradient, sunX - radius, sunY - radius, radius * 2, radius * 2);
    for (let i = 1; i < 7; i++) rect("#df70809c", sunX - radius, sunY + i * radius / 7, radius * 2, i * 1.6);
    ctx.restore();
  }
  function palm(x, ground, size, flip) {
    ctx.save();
    ctx.translate(x, ground);
    ctx.scale(size * flip, size);
    poly("#21172e", [-10, 0], [6, 0], [18, -107], [43, -244], [36, -246], [5, -125]);
    ctx.translate(40, -244);
    for (let i = 0; i < 15; i++) {
      const angle = -.74 + i * .31 + random() * .2;
      const length = 46 + random() * 78;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = i % 3 ? "#24182e" : "#3b2440";
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.quadraticCurveTo(length * .46, -42, length, 2);
      for (let j = 9; j > 0; j--) {
        const t = j / 10;
        ctx.lineTo(length * t, -18 * Math.sin(t * Math.PI) + 9);
        ctx.lineTo(length * t - 7, -20 * Math.sin(t * Math.PI) + 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  function city() {
    for (let layer = 0; layer < 3; layer++) {
      const base = 535 + layer * 31;
      for (let x = -12; x < 960;) {
        const width = 24 + random() * 68;
        const height = 24 + random() ** 1.7 * (layer === 1 ? 244 : 120);
        const y = base - height;
        rect(["#98577f", "#583556", "#34233e"][layer], x, y, width, height);
        rect("#ffc09d60", x, y, width, 2);
        if (height > 90) rect("#49324f", x + width * .39, y - height * .17, 3, height * .17);
        for (let row = y + 11; row < base - 7; row += 11) {
          for (let column = x + 6; column < x + width - 5; column += 11) {
            if (random() > .62) rect(random() > .36 ? "#ffbf8daa" : "#f082b18a", column, row, 4, 3);
          }
        }
        x += width + random() * 9;
      }
    }
  }
  function water() {
    const gradient = ctx.createLinearGradient(0, 490, 0, 760);
    gradient.addColorStop(0, "#b96b8b");
    gradient.addColorStop(1, "#24213e");
    rect(gradient, 0, 510, 960, 250);
    for (let i = 0; i < 460; i++) {
      const y = 512 + random() * 248;
      const x = random() * 960;
      const color = Math.abs(x - sunX) < (y - 440) * .7 ? "#ffd39878" : "#c47f9b62";
      rect(color, x, y, 4 + random() * (y - 490) * .38, .5 + random() * 2);
    }
  }
  function motel() {
    poly("#4c2946", [0, 502], [630, 429], [960, 504], [960, 760], [0, 760]);
    poly("#271e35", [0, 521], [583, 465], [725, 553], [725, 760], [0, 760]);
    poly("#f787ac", [0, 532], [584, 473], [726, 558], [726, 567], [584, 484], [0, 543]);
    for (let i = 0; i < 8; i++) {
      const x = 15 + i * 74;
      const y = 580 - i * 5;
      rect("#673858", x, y, 60, 94);
      rect(i % 3 ? "#e6859b" : "#ffbb86", x + 5, y + 7, 43, 31);
      rect("#2d2038", x + 25, y + 7, 3, 31);
      rect("#2d2038", x + 5, y + 21, 43, 3);
    }
    rect("#3b2b47", 416, 258, 15, 353);
    rect("#231a2b", 207, 235, 348, 110);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ff94b8";
    ctx.strokeRect(214, 242, 334, 96);
    ctx.fillStyle = "#ffe2bf";
    ctx.font = "900 57px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MOTEL", 381, 313);
  }
  function highway() {
    poly("#865379", [0, 490], [89, 422], [191, 453], [312, 414], [434, 478], [597, 425], [781, 445], [960, 397], [960, 760], [0, 760]);
    poly("#442740", [0, 543], [259, 516], [462, 500], [655, 523], [960, 479], [960, 760], [0, 760]);
    poly("#29243a", [449, 503], [535, 502], [960, 760], [34, 760]);
    poly("#f3af83", [449, 503], [453, 503], [49, 760], [34, 760]);
    poly("#f3af83", [532, 502], [536, 502], [960, 760], [944, 760]);
    for (let i = 0; i < 6; i++) {
      const y = 505 + i * i * 10;
      poly("#ffce9e", [492, y], [498, y], [501 + i, y + 6 + i * 8], [491 - i, y + 6 + i * 8]);
    }
    ctx.save();
    ctx.translate(521, 580);
    poly("#1d1728", [-104, 47], [-96, 10], [-68, -3], [-36, -38], [44, -35], [81, -5], [114, 12], [121, 49]);
    poly("#925572", [-68, -4], [-31, -30], [40, -28], [73, -4]);
    poly("#c74d78", [-98, 11], [-67, -2], [79, -2], [111, 13], [96, 31], [-84, 31]);
    rect("#ff877c", -91, 18, 48, 8);
    rect("#ff877c", 52, 18, 48, 8);
    rect("#ebc0ae", -14, 27, 33, 10);
    rect("#161422", -75, 46, 30, 22);
    rect("#161422", 67, 46, 30, 22);
    ctx.restore();
  }

  const sky = ctx.createLinearGradient(0, 0, 0, 590);
  sky.addColorStop(0, top);
  sky.addColorStop(.57, mid);
  sky.addColorStop(1, low);
  rect(sky, 0, 0, 960, 760);
  for (let i = 0; i < 40; i++) {
    const x = random() * 1100 - 120;
    const y = 164 + random() * 322;
    const w = 30 + random() * 330;
    poly(i % 2 ? "#ffb39b31" : "#9d54844a", [x, y], [x + w * .31, y - 5], [x + w, y + 2], [x + w * .62, y + 6]);
  }
  sun();
  if (name === "skyline") {
    city();
    ctx.save();
    ctx.translate(0, 80);
    water();
    ctx.restore();
    palm(86, 765, 1.58, 1);
  } else if (name === "palms") {
    water();
    poly("#30213b", [0, 676], [288, 650], [579, 693], [960, 630], [960, 760], [0, 760]);
    palm(218, 757, 1.86, 1);
    palm(635, 757, 1.67, -1);
    palm(758, 740, .82, 1);
  } else if (name === "motel") {
    motel();
    palm(805, 755, 1.72, -1);
  } else {
    highway();
    palm(159, 667, 1.28, 1);
    palm(827, 640, 1.14, -1);
  }
  const pixels = ctx.getImageData(0, 0, 960, 760);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const grain = (random() - .5) * 17;
    for (let channel = 0; channel < 3; channel++) pixels.data[offset + channel] += grain;
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/jpeg", .91);
}

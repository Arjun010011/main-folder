/**
 * Builds a downloadable PNG: school name (top), scan instructions, QR, footer text.
 * Uses HTML canvas (browser only).
 */
// import QRCode from "qrcode";

export function getInstituteNameFromStorage() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    if (u && u.institute_details && u.institute_details.name) {
      return String(u.institute_details.name).trim();
    }
  } catch (e) {
    /* ignore */
  }
  return "";
}

const POSTER_THEMES = {
  application: {
    gradTop: ["#2563eb", "#9333ea"],
    bodyTop: "#eef2ff",
    bodyBottom: "#faf5ff",
    headlineColor: "#4338ca",
    sublineColor: "#6d28d9",
    qrBorder: "#6366f1",
    qrCardBg: "#ffffff",
    footerColor: "#57534e",
  },
  enquiry: {
    gradTop: ["#0d9488", "#059669"],
    bodyTop: "#ecfdf5",
    bodyBottom: "#f0fdfa",
    headlineColor: "#0f766e",
    sublineColor: "#047857",
    qrBorder: "#14b8a6",
    qrCardBg: "#ffffff",
    footerColor: "#57534e",
  },
};

function wrapLines(ctx, text, maxWidth) {
  if (!text) return [];
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * @param {string} targetUrl - encoded in QR
 * @param {object} options
 * @param {string} [options.schoolName]
 * @param {string} [options.headline]
 * @param {string} [options.subline]
 * @param {string} [options.footer]
 * @param {number} [options.qrWidth=280]
 * @param {'application'|'enquiry'} [options.theme='application']
 * @param {(err: Error|null, dataUrl?: string) => void} callback
 */
export function buildQrPosterDataUrl(targetUrl, options, callback) {
  const {
    schoolName = "",
    headline = "",
    subline = "",
    footer = "",
    qrWidth = 280,
    theme: themeKey = "application",
  } = options || {};

  const theme = POSTER_THEMES[themeKey] || POSTER_THEMES.application;

  // QRCode.toDataURL(targetUrl, { width: qrWidth, margin: 2, errorCorrectionLevel: "M" }, (err, qrDataUrl) => {
//     if (err) {
//       callback(err);
//       return;
//     }
//     const img = new Image();
//     img.onload = () => {
//       const padX = 28;
//       const padY = 20;
//       const innerW = Math.max(380, qrWidth + padX * 2);
//       const ctxProbe = document.createElement("canvas").getContext("2d");

//       ctxProbe.font = "bold 22px system-ui, -apple-system, Segoe UI, sans-serif";
//       const titleLines = schoolName ? wrapLines(ctxProbe, schoolName, innerW - padX * 2) : [];
//       const bannerH = titleLines.length ? Math.max(76, titleLines.length * 30 + 28) : 0;

//       ctxProbe.font = "600 17px system-ui, -apple-system, Segoe UI, sans-serif";
//       const headLines = headline ? wrapLines(ctxProbe, headline, innerW - padX * 2) : [];
//       const headBlock = headLines.length ? headLines.length * 24 + 12 : 0;

//       ctxProbe.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
//       const subLines = subline ? wrapLines(ctxProbe, subline, innerW - padX * 2) : [];
//       const subBlock = subLines.length ? subLines.length * 22 + 10 : 0;

//       const qrCardPad = 18;
//       const qrCardW = qrWidth + qrCardPad * 2;
//       const qrCardH = qrWidth + qrCardPad * 2;
//       const qrCardRadius = 16;

//       ctxProbe.font = "13px system-ui, -apple-system, Segoe UI, sans-serif";
//       const footText = footer || "";
//       const footLines = footText
//         ? footText.split("\n").flatMap((para) => wrapLines(ctxProbe, para, innerW - padX * 2))
//         : [];
//       const footBlock = footLines.length ? footLines.length * 20 + 16 : 28;

//       const gapAfterBanner = bannerH ? 18 : 8;
//       const w = innerW;
//       const h =
//         padY +
//         bannerH +
//         gapAfterBanner +
//         headBlock +
//         subBlock +
//         14 +
//         qrCardH +
//         22 +
//         footBlock +
//         padY;

//       const canvas = document.createElement("canvas");
//       canvas.width = w;
//       canvas.height = h;
//       const ctx = canvas.getContext("2d");

//       const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
//       bgGrad.addColorStop(0, theme.bodyTop);
//       bgGrad.addColorStop(1, theme.bodyBottom);
//       ctx.fillStyle = bgGrad;
//       ctx.fillRect(0, 0, w, h);

//       let y = padY;

//       if (titleLines.length && bannerH) {
//         const barGrad = ctx.createLinearGradient(0, y, w, y);
//         barGrad.addColorStop(0, theme.gradTop[0]);
//         barGrad.addColorStop(1, theme.gradTop[1]);
//         ctx.fillStyle = barGrad;
//         ctx.fillRect(0, y, w, bannerH);

//         ctx.textAlign = "center";
//         ctx.fillStyle = "#ffffff";
//         ctx.font = "bold 22px system-ui, -apple-system, Segoe UI, sans-serif";
//         let ty = y + 36;
//         titleLines.forEach((ln) => {
//           ctx.fillText(ln, w / 2, ty);
//           ty += 30;
//         });
//         y += bannerH + gapAfterBanner;
//       } else {
//         y += 4;
//       }

//       ctx.textAlign = "center";
//       if (headLines.length) {
//         ctx.font = "600 17px system-ui, -apple-system, Segoe UI, sans-serif";
//         ctx.fillStyle = theme.headlineColor;
//         headLines.forEach((ln) => {
//           ctx.fillText(ln, w / 2, y + 18);
//           y += 24;
//         });
//         y += 8;
//       }

//       if (subLines.length) {
//         ctx.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
//         ctx.fillStyle = theme.sublineColor;
//         subLines.forEach((ln) => {
//           ctx.fillText(ln, w / 2, y + 16);
//           y += 22;
//         });
//         y += 6;
//       }

//       const cardX = (w - qrCardW) / 2;
//       ctx.shadowColor = "rgba(79, 70, 229, 0.18)";
//       ctx.shadowBlur = 12;
//       ctx.shadowOffsetY = 4;
//       ctx.fillStyle = theme.qrCardBg;
//       roundRectPath(ctx, cardX, y, qrCardW, qrCardH, qrCardRadius);
//       ctx.fill();
//       ctx.shadowColor = "transparent";
//       ctx.shadowBlur = 0;
//       ctx.shadowOffsetY = 0;

//       ctx.strokeStyle = theme.qrBorder;
//       ctx.lineWidth = 3;
//       roundRectPath(ctx, cardX, y, qrCardW, qrCardH, qrCardRadius);
//       ctx.stroke();

//       const qrX = cardX + qrCardPad;
//       const qrY = y + qrCardPad;
//       ctx.drawImage(img, qrX, qrY, qrWidth, qrWidth);
//       y += qrCardH + 20;

//       ctx.font = "13px system-ui, -apple-system, Segoe UI, sans-serif";
//       ctx.fillStyle = theme.footerColor;
//       footLines.forEach((ln) => {
//         ctx.fillText(ln, w / 2, y + 16);
//         y += 20;
//       });

//       callback(null, canvas.toDataURL("image/png"));
//     };
//     img.onerror = () => callback(new Error("Failed to load QR image"));
//     img.src = qrDataUrl;
//   });
}

export function triggerQrPosterDownload(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

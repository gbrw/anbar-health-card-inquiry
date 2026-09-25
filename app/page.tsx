"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type Result = {
  السكن: string;
  "الرقم التسلسلي": string;
  "رقم بطاقة الضمان الصحي": string;
  "الرقم الوطني": string;
  "الاسم الكامل": string;
  "رقم الحزمة": string;
  التسلسل: string;
  "تاريخ المراجعة": string;
  اللجنة: string;
  "مكان المراجعة": string;
  "ملاحظة اللجنة": string;
};

type PreviewState = {
  url: string;
  blob: Blob;
  file: File;
  filename: string;
  text: string;
  purpose: "share" | "print";
};

const fields: Array<[keyof Result, string]> = [
  ["الرقم الوطني", "الرقم الوطني"],
  ["التسلسل", "التسلسل"],
  ["رقم الحزمة", "رقم الحزمة"],
  ["الرقم التسلسلي", "الرقم التسلسلي"],
  ["رقم بطاقة الضمان الصحي", "رقم بطاقة الضمان الصحي"],
  ["السكن", "عنوان السكن"],
  ["تاريخ المراجعة", "موعد المراجعة"],
  ["اللجنة", "اللجنة / جهة المراجعة"],
  ["مكان المراجعة", "مكان المراجعة"],
  ["ملاحظة اللجنة", "ملاحظة اللجنة"]
];

function formatUpdatedAt(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Baghdad"
  }).format(date);
}

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /(FBAN|FBAV|Instagram|WhatsApp|Telegram|Line\/|Twitter|; wv\b|\bwv\))/i.test(ua);
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const source = (text || "").trim();
  if (!source) return [""];

  const words = source.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [source];
}

function drawWrappedLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number
) {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذر تحميل الشعار."));
    img.src = src;
  });
}

function resultToText(row: Result) {
  const lines = [
    "هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار",
    "بيانات استلام بطاقة الضمان الصحي",
    "",
    `اسم المستفيد / المعاق : ${row["الاسم الكامل"] || "-"}`
  ];

  for (const [key, label] of fields) {
    if (row[key]) lines.push(`${label}: ${row[key]}`);
  }

  return lines.join("\n");
}

async function createShareImage(row: Result) {
  const logo = await loadImage("/anbar-authority-logo.png");
  const width = 1240;
  const outer = 54;
  const contentWidth = width - outer * 2;
  const gap = 18;
  const halfWidth = (contentWidth - gap) / 2;

  const canvas = document.createElement("canvas");
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d")!;
  if (!measure) throw new Error("تعذر تجهيز الصورة.");

  measure.direction = "rtl";
  measure.textAlign = "right";

  type ShareItem = {
    label: string;
    value: string;
    emphasis?: boolean;
  };

  const compactRows: ShareItem[][] = [];
  const pushRow = (...items: Array<ShareItem | null>) => {
    const available = items.filter((item): item is ShareItem => Boolean(item?.value));
    if (available.length) compactRows.push(available);
  };

  pushRow({
    label: "اسم المستفيد / المعاق :",
    value: row["الاسم الكامل"] || "-",
    emphasis: true
  });

  pushRow(
    row["الرقم الوطني"] ? { label: "الرقم الوطني", value: row["الرقم الوطني"] } : null,
    row["التسلسل"] ? { label: "التسلسل", value: row["التسلسل"] } : null
  );

  pushRow(
    row["رقم الحزمة"] ? { label: "رقم الحزمة", value: row["رقم الحزمة"] } : null,
    row["الرقم التسلسلي"] ? { label: "الرقم التسلسلي", value: row["الرقم التسلسلي"] } : null
  );

  pushRow(
    row["رقم بطاقة الضمان الصحي"]
      ? { label: "رقم بطاقة الضمان الصحي", value: row["رقم بطاقة الضمان الصحي"] }
      : null
  );

  pushRow(
    row["السكن"] ? { label: "عنوان السكن", value: row["السكن"] } : null,
    row["تاريخ المراجعة"] ? { label: "موعد المراجعة", value: row["تاريخ المراجعة"] } : null
  );

  pushRow(row["اللجنة"] ? { label: "اللجنة / جهة المراجعة", value: row["اللجنة"] } : null);
  pushRow(row["مكان المراجعة"] ? { label: "مكان المراجعة", value: row["مكان المراجعة"] } : null);
  pushRow(row["ملاحظة اللجنة"] ? { label: "ملاحظة اللجنة", value: row["ملاحظة اللجنة"] } : null);

  function valueLines(item: ShareItem, boxWidth: number) {
    measure.font = item.emphasis ? "700 39px Tahoma, Arial" : "700 31px Tahoma, Arial";
    return wrapCanvasText(measure, item.value, boxWidth - 36);
  }

  function boxHeight(item: ShareItem, boxWidth: number) {
    const lines = valueLines(item, boxWidth);
    const lineHeight = item.emphasis ? 54 : 45;
    return Math.max(item.emphasis ? 132 : 116, 57 + lines.length * lineHeight + 18);
  }

  const headerHeight = 390;
  let contentHeight = 0;
  for (const rowItems of compactRows) {
    const boxWidth = rowItems.length === 2 ? halfWidth : contentWidth;
    const rowHeight = Math.max(...rowItems.map((item) => boxHeight(item, boxWidth)));
    contentHeight += rowHeight + 16;
  }

  const notes = [
    "البطاقة الوطنية الموحدة للمعين والشخص ذي الإعاقة أصلية ومستنسخة.",
    "يجب طباعة صفحة النشر التي يظهر فيها: [اسم الشخص ذوي الإعاقة، التسلسل، رقم الحزمة، الرقم التسلسلي، رقم بطاقة الضمان الصحي، عنوان السكن، موعد المراجعة].",
    "يرجى الالتزام بموعد ومكان المراجعة المحددين."
  ];

  measure.font = "600 24px Tahoma, Arial";
  let notesHeight = 70;
  for (const note of notes) {
    const lines = wrapCanvasText(measure, `• ${note}`, contentWidth - 42);
    notesHeight += lines.length * 36 + 8;
  }
  notesHeight += 30;

  const footerHeight = 60;
  const height = headerHeight + contentHeight + notesHeight + footerHeight + 76;
  const scale = 2;

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d")!;
  if (!ctx) throw new Error("تعذر تجهيز الصورة.");

  ctx.scale(scale, scale);
  ctx.direction = "rtl";
  ctx.textAlign = "right";

  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d5bd7a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(22, 22, width - 44, height - 44, 26);
  ctx.fill();
  ctx.stroke();

  // Logo sits in its own clear area so it never overlaps the title.
  ctx.drawImage(logo, width / 2 - 58, 50, 116, 116);

  const headerBandY = 184;
  const headerBandH = 118;
  ctx.fillStyle = "#0b2f4f";
  ctx.beginPath();
  ctx.roundRect(42, headerBandY, width - 84, headerBandH, 16);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Tahoma, Arial";
  ctx.textAlign = "center";
  const authorityLines = wrapCanvasText(
    ctx,
    "هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار",
    width - 160
  );
  const authorityStart = headerBandY + 48 - ((authorityLines.length - 1) * 22);
  authorityLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, authorityStart + index * 43);
  });

  ctx.fillStyle = "#b51e23";
  ctx.font = "700 33px Tahoma, Arial";
  ctx.fillText("بيانات استلام بطاقة الضمان الصحي", width / 2, 350);

  let y = headerHeight;
  ctx.textAlign = "right";

  function drawField(item: ShareItem, x: number, top: number, boxWidth: number, heightValue: number) {
    ctx.fillStyle = item.emphasis ? "#fff3db" : "#fff8ea";
    ctx.strokeStyle = item.emphasis ? "#d7b45d" : "#ead5a0";
    ctx.lineWidth = item.emphasis ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, top, boxWidth, heightValue, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#76550d";
    ctx.font = item.emphasis ? "700 27px Tahoma, Arial" : "700 23px Tahoma, Arial";
    ctx.fillText(item.label, x + boxWidth - 18, top + 35);

    ctx.fillStyle = "#0f172a";
    ctx.font = item.emphasis ? "700 39px Tahoma, Arial" : "700 31px Tahoma, Arial";
    const lines = wrapCanvasText(ctx, item.value, boxWidth - 36);
    const lineHeight = item.emphasis ? 54 : 45;
    drawWrappedLines(ctx, lines, x + boxWidth - 18, top + 83, lineHeight);
  }

  for (const rowItems of compactRows) {
    const isPair = rowItems.length === 2;
    const boxWidth = isPair ? halfWidth : contentWidth;
    const rowHeight = Math.max(...rowItems.map((item) => boxHeight(item, boxWidth)));

    if (isPair) {
      // Right box first for natural RTL reading order.
      drawField(rowItems[0], outer + halfWidth + gap, y, halfWidth, rowHeight);
      drawField(rowItems[1], outer, y, halfWidth, rowHeight);
    } else {
      drawField(rowItems[0], outer, y, contentWidth, rowHeight);
    }

    y += rowHeight + 16;
  }

  ctx.fillStyle = "#eef8f1";
  ctx.strokeStyle = "#b9dbc4";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(outer, y + 4, contentWidth, notesHeight, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#176b3a";
  ctx.font = "700 28px Tahoma, Arial";
  ctx.fillText("تنويه مهم", width - outer - 18, y + 46);

  let noteY = y + 88;
  ctx.fillStyle = "#18222e";
  ctx.font = "600 24px Tahoma, Arial";
  for (const note of notes) {
    const lines = wrapCanvasText(ctx, `• ${note}`, contentWidth - 42);
    drawWrappedLines(ctx, lines, width - outer - 18, noteY, 36);
    noteY += lines.length * 36 + 8;
  }

  ctx.fillStyle = "#6b7280";
  ctx.font = "500 19px Tahoma, Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    "خدمة الاستعلام عن بطاقات الضمان الصحي - محافظة الأنبار",
    width / 2,
    height - 48
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 1)
  );

  if (!blob) throw new Error("تعذر إنشاء الصورة.");
  return blob;
}

function sanitizeFilename(name: string) {
  const cleaned = (name || "مستفيد")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
  return cleaned || "مستفيد";
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

export default function Home() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [workingIndex, setWorkingIndex] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [printRow, setPrintRow] = useState<Result | null>(null);

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const query = q.trim();
    if (query.length < 2) {
      setError("اكتب حرفين على الأقل من الاسم.");
      return;
    }

    setLoading(true);
    setError("");
    setShareStatus("");
    setSearched(false);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "تعذر تنفيذ البحث.");
      }

      setRows(data.results || []);
      setUpdatedAt(data.updatedAt || "");
      setSearched(true);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "حدث خطأ.");
    } finally {
      setLoading(false);
    }
  }

  function directPrint(row: Result) {
    setPrintRow(row);
    document.documentElement.classList.remove("printImageMode");
    document.documentElement.classList.add("directPrintMode");

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const cleanup = () => {
      document.documentElement.classList.remove("directPrintMode");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup, { once: true });

    // Safari on iPhone needs the dedicated print DOM to be committed before
    // opening the native print sheet. Two animation frames avoid the blank page.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    document.documentElement.classList.remove("printImageMode");
  }

  async function preparePreview(row: Result, index: number, purpose: "share" | "print") {
    setShareStatus("");
    setWorkingIndex(index);

    try {
      const blob = await createShareImage(row);
      if (preview) URL.revokeObjectURL(preview.url);

      const filename = `بيانات-${sanitizeFilename(row["الاسم الكامل"])}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const url = URL.createObjectURL(blob);

      setPreview({
        url,
        blob,
        file,
        filename,
        text: resultToText(row),
        purpose
      });
    } catch (err) {
      setShareStatus(err instanceof Error ? err.message : "تعذر تجهيز الصورة.");
    } finally {
      setWorkingIndex(null);
    }
  }

  async function printResult(row: Result, index: number) {
    if (isInAppBrowser()) {
      await preparePreview(row, index, "print");
      return;
    }

    directPrint(row);
  }

  async function nativeSharePreview() {
    if (!preview) return;

    try {
      if (typeof navigator.share === "function") {
        const canShareFiles =
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [preview.file] });

        if (canShareFiles) {
          await navigator.share({
            files: [preview.file],
            title: "بيانات استلام بطاقة الضمان الصحي",
            text: "بيانات المستفيد من هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار"
          });
        } else {
          await navigator.share({
            title: "بيانات استلام بطاقة الضمان الصحي",
            text: preview.text
          });
        }
        setShareStatus("تم فتح خيارات المشاركة.");
      } else {
        await copyText(preview.text);
        setShareStatus("المتصفح لا يدعم المشاركة المباشرة، تم نسخ المعلومات ويمكن لصقها في التطبيق المطلوب.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setShareStatus("لم يتمكن المتصفح الداخلي من فتح المشاركة. استخدم فتح الصورة أو نسخ المعلومات.");
    }
  }

  async function copyPreviewText() {
    if (!preview) return;
    try {
      await copyText(preview.text);
      setShareStatus("تم نسخ معلومات المستفيد.");
    } catch {
      setShareStatus("تعذر النسخ من هذا المتصفح. استخدم فتح الصورة بالحجم الكامل.");
    }
  }

  async function printPreviewImage() {
    if (!preview) return;

    // داخل متصفحات التطبيقات نحاول أولاً فتح لوحة النظام بالصورة نفسها؛
    // على iPhone وAndroid تظهر منها خيارات الطباعة/المشاركة عندما يدعمها WebView.
    if (isInAppBrowser() && typeof navigator.share === "function") {
      try {
        const canShareFiles =
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [preview.file] });

        if (canShareFiles) {
          await navigator.share({
            files: [preview.file],
            title: "طباعة بيانات استلام بطاقة الضمان الصحي",
            text: "اختر الطباعة من خيارات النظام، أو أرسل الصورة إلى المكتبة."
          });
          setShareStatus("تم فتح خيارات النظام. اختر الطباعة إن كانت متاحة، أو أرسل الصورة إلى المكتبة.");
          return;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    document.documentElement.classList.remove("directPrintMode");
    document.documentElement.classList.add("printImageMode");
    const cleanup = () => {
      document.documentElement.classList.remove("printImageMode");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 7000);
    window.setTimeout(() => window.print(), 60);
  }

  return (
    <>
      <main className="wrap">
        <header className="officialHeader">
          <img
            className="officialLogo"
            src="/anbar-authority-logo.png"
            alt="شعار هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة - قسم الأنبار"
          />
          <div className="headerText">
            <div className="authority">هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار</div>
            <div className="province">خدمة الاستعلام عن بطاقات الضمان الصحي</div>
          </div>
        </header>

        <section className="hero">
          <h1>الاستعلام عن بطاقة الضمان الصحي</h1>
          <p>اكتب اسم المستفيد / المعاق أو جزءًا منه لعرض البيانات.</p>
        </section>

        <form className="searchBox noPrint" onSubmit={search}>
          <label className="inputLabel" htmlFor="beneficiary-name">
            اسم المستفيد / المعاق
          </label>
          <div className="searchRow">
            <input
              id="beneficiary-name"
              value={q}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
              placeholder="مثال: محمد أحمد أو نور الدين"
              autoComplete="off"
              inputMode="search"
            />
            <button disabled={loading} type="submit">
              {loading ? "جاري البحث..." : "بحث"}
            </button>
          </div>

          {error && (
            <div className="status error" role="alert">
              {error}
            </div>
          )}

          {!error && searched && (
            <div className="status" aria-live="polite">
              {rows.length
                ? `تم العثور على ${rows.length} نتيجة مطابقة.`
                : "الاسم غير موجود ضمن البيانات المنشورة حاليًا. قد يظهر ضمن وجبة لاحقة."}
              {updatedAt && (
                <span className="updated">آخر تحديث للبيانات: {formatUpdatedAt(updatedAt)}</span>
              )}
              {!!shareStatus && <span className="updated shareStatus">{shareStatus}</span>}
            </div>
          )}
        </form>

        <section className="results" aria-live="polite">
          {rows.map((row, index) => (
            <article
              className="card"
              key={`${row["الرقم التسلسلي"]}-${row["الرقم الوطني"]}-${index}`}
              data-result-index={index}
            >
              <div className="printHeader onlyPrint">
                <img
                  className="printLogo"
                  src="/anbar-authority-logo.png"
                  alt="شعار هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة - قسم الأنبار"
                />
                <strong>هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار</strong>
                <span>بيانات استلام بطاقة الضمان الصحي</span>
              </div>

              <div className="name">اسم المستفيد / المعاق : {row["الاسم الكامل"] || "بدون اسم"}</div>

              <div className="grid">
                {fields.map(([key, label]) =>
                  row[key] ? (
                    <div className="field" key={key}>
                      <span className="label">{label}</span>
                      <span className="value">{row[key]}</span>
                    </div>
                  ) : null
                )}
              </div>

              <div className="requirements">
                <strong>المستمسكات المطلوبة عند المراجعة:</strong>
                <span>البطاقة الوطنية الموحدة للمعين والشخص ذي الإعاقة أصلية ومستنسخة.</span>
                <span>يجب طباعة صفحة النشر التي يظهر فيها: [اسم الشخص ذوي الإعاقة، التسلسل، رقم الحزمة، الرقم التسلسلي، رقم بطاقة الضمان الصحي، عنوان السكن، موعد المراجعة].</span>
                <span>يكون الحضور للمعين المتفرغ أو أحد أقارب الشخص ذي الإعاقة من الدرجة الأولى.</span>
                <span>يرجى الالتزام بموعد ومكان المراجعة المحددين وعدم مراجعة اللجنة قبل الموعد.</span>
              </div>

              <div className="actions noPrint">
                <button
                  className="printButton"
                  type="button"
                  onClick={() => printResult(row, index)}
                  disabled={workingIndex === index}
                >
                  {workingIndex === index ? "جاري التجهيز..." : "طباعة بيانات المستفيد"}
                </button>
                <button
                  className="shareButton"
                  type="button"
                  onClick={() => preparePreview(row, index, "share")}
                  disabled={workingIndex === index}
                >
                  {workingIndex === index ? "جاري التجهيز..." : "مشاركة / حفظ كصورة"}
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="notice noPrint">
          <h2>تنويه مهم</h2>
          <p>
            ستُنشر الوجبات اللاحقة تباعًا للأسماء التي لم تظهر ضمن البيانات الحالية. يرجى
            الالتزام بالموعد ومكان المراجعة المحددين لتجنب الزخم وضمان انسيابية تسليم
            بطاقات الضمان الصحي.
          </p>
        </section>
      </main>

      {printRow && (
        <section className="iosPrintSheet" aria-label="نسخة الطباعة">
          <div className="iosPrintHeader">
            <img src="/anbar-authority-logo.png" alt="" />
            <strong>هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار</strong>
            <span>بيانات استلام بطاقة الضمان الصحي</span>
          </div>

          <div className="iosPrintName">
            <span>اسم المستفيد / المعاق :</span>
            <strong>{printRow["الاسم الكامل"] || "-"}</strong>
          </div>

          <div className="iosPrintGrid">
            {fields.map(([key, label]) =>
              printRow[key] ? (
                <div className="iosPrintField" key={key}>
                  <span>{label}</span>
                  <strong>{printRow[key]}</strong>
                </div>
              ) : null
            )}
          </div>

          <div className="iosPrintNotes">
            <strong>تنويه مهم</strong>
            <span>البطاقة الوطنية الموحدة للمعين والشخص ذي الإعاقة أصلية ومستنسخة.</span>
            <span>يكون الحضور للمعين المتفرغ أو أحد أقارب الشخص ذي الإعاقة من الدرجة الأولى.</span>
            <span>يرجى الالتزام بموعد ومكان المراجعة المحددين وعدم مراجعة اللجنة قبل الموعد.</span>
          </div>
        </section>
      )}

      {preview && (
        <div className="previewOverlay noPrint" role="dialog" aria-modal="true" aria-label="معاينة بيانات المستفيد">
          <div className="previewModal">
            <div className="previewTop">
              <div>
                <strong>{preview.purpose === "print" ? "نسخة جاهزة للطباعة" : "صورة جاهزة للمشاركة"}</strong>
                <span>
                  تعمل هذه الطريقة حتى داخل متصفحات فيسبوك وإنستغرام وواتساب وتيليجرام.
                </span>
              </div>
              <button className="closeButton" type="button" onClick={closePreview} aria-label="إغلاق">
                ×
              </button>
            </div>

            <div className="previewHint">
              إذا منع المتصفح الداخلي المشاركة أو الطباعة المباشرة، افتح الصورة بالحجم الكامل أو احفظها ثم أرسلها للمكتبة.
            </div>

            <div className="previewImageWrap">
              <img className="previewImage" src={preview.url} alt="صورة بيانات المستفيد" />
            </div>

            <div className="previewActions">
              <button type="button" className="shareButton" onClick={nativeSharePreview}>
                مشاركة الصورة / المعلومات
              </button>
              <button type="button" className="printButton" onClick={printPreviewImage}>
                طباعة الآن
              </button>
              <a className="actionLink" href={preview.url} target="_blank" rel="noreferrer">
                فتح الصورة بالحجم الكامل
              </a>
              <a className="actionLink" href={preview.url} download={preview.filename}>
                حفظ الصورة
              </a>
              <button type="button" className="secondaryButton" onClick={copyPreviewText}>
                نسخ المعلومات كنص
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="previewPrintSheet" aria-hidden="true">
          <img src={preview.url} alt="" />
        </div>
      )}
    </>
  );
}

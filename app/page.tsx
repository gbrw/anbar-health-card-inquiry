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

  const canvas = document.createElement("canvas");
  const width = 1240;
  const horizontalPadding = 72;
  const contentWidth = width - horizontalPadding * 2;

  const tempCtx = canvas.getContext("2d");
  if (!tempCtx) throw new Error("تعذر تجهيز الصورة.");

  tempCtx.direction = "rtl";
  tempCtx.textAlign = "right";

  const entries: Array<[string, string]> = [["اسم المستفيد / المعاق :", row["الاسم الكامل"] || "-"]];
  for (const [key, label] of fields) {
    if (row[key]) entries.push([label, row[key]]);
  }

  const notes = [
    "المستمسكات المطلوبة: البطاقة الوطنية الموحدة للمعين والشخص ذي الإعاقة أصلية ومستنسخة.",
    "يمكن إرسال هذه الصورة أو طباعتها عند الحاجة بدل طباعة الصفحة من الموقع.",
    "يرجى الالتزام بموعد ومكان المراجعة المحددين."
  ];

  let height = 300;
  tempCtx.font = "700 34px Tahoma, Arial";

  for (const [, value] of entries) {
    const lines = wrapCanvasText(tempCtx, value, contentWidth - 32);
    const lineHeight = 52;
    height += 48 + lines.length * lineHeight + 30;
  }

  tempCtx.font = "500 28px Tahoma, Arial";
  for (const note of notes) {
    const lines = wrapCanvasText(tempCtx, note, contentWidth - 40);
    height += lines.length * 42 + 16;
  }
  height += 80;

  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر تجهيز الصورة.");

  ctx.scale(scale, scale);
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = "#f7f9fb";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d5bd7a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(24, 24, width - 48, height - 48, 26);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0b2f4f";
  ctx.fillRect(42, 42, width - 84, 176);
  ctx.drawImage(logo, width / 2 - 60, 55, 120, 120);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 38px Tahoma, Arial";
  ctx.textAlign = "center";
  ctx.fillText("هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار", width / 2, 186);

  ctx.fillStyle = "#b51e23";
  ctx.font = "700 34px Tahoma, Arial";
  ctx.fillText("بيانات استلام بطاقة الضمان الصحي", width / 2, 242);

  ctx.textAlign = "right";
  let y = 282;

  for (const [label, value] of entries) {
    ctx.font = label === "اسم المستفيد / المعاق :" ? "700 40px Tahoma, Arial" : "600 34px Tahoma, Arial";
    const valueLines = wrapCanvasText(ctx, value, contentWidth - 32);
    const lineHeight = label === "اسم المستفيد / المعاق :" ? 58 : 52;
    const boxHeight = 50 + valueLines.length * lineHeight + 28;

    ctx.fillStyle = "#fff7e8";
    ctx.strokeStyle = "#ead7a7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(horizontalPadding, y, contentWidth, boxHeight, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#7a5a12";
    ctx.font = "700 26px Tahoma, Arial";
    ctx.fillText(label, width - horizontalPadding - 16, y + 38);

    ctx.fillStyle = "#0f172a";
    ctx.font = label === "اسم المستفيد / المعاق :" ? "700 40px Tahoma, Arial" : "600 34px Tahoma, Arial";
    drawWrappedLines(ctx, valueLines, width - horizontalPadding - 16, y + 88, lineHeight);

    y += boxHeight + 16;
  }

  ctx.fillStyle = "#eef7f1";
  ctx.strokeStyle = "#c8dfcf";
  ctx.beginPath();
  ctx.roundRect(horizontalPadding, y, contentWidth, height - y - 76, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#176b3a";
  ctx.font = "700 28px Tahoma, Arial";
  ctx.fillText("تنويه مهم", width - horizontalPadding - 18, y + 42);

  let noteY = y + 88;
  ctx.fillStyle = "#1f2937";
  ctx.font = "500 28px Tahoma, Arial";
  for (const note of notes) {
    const lines = wrapCanvasText(ctx, `• ${note}`, contentWidth - 36);
    drawWrappedLines(ctx, lines, width - horizontalPadding - 18, noteY, 42);
    noteY += lines.length * 42 + 14;
  }

  ctx.fillStyle = "#6b7280";
  ctx.font = "500 20px Tahoma, Arial";
  ctx.textAlign = "center";
  ctx.fillText("خدمة الاستعلام عن بطاقات الضمان الصحي - الأنبار", width / 2, height - 38);

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

  function directPrint(index: number) {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("article[data-result-index]")
    );
    const target = cards.find((card) => card.dataset.resultIndex === String(index));
    if (!target) return;

    cards.forEach((card) => card.classList.remove("printTarget"));
    target.classList.add("printTarget");

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    void target.offsetHeight;

    const cleanup = () => {
      target.classList.remove("printTarget");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 6000);
    window.print();
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
    directPrint(index);
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
          <p>اكتب اسم المستفيد أو جزءًا منه لعرض بيانات المراجعة المنشورة رسميًا.</p>
        </section>

        <form className="searchBox noPrint" onSubmit={search}>
          <label className="inputLabel" htmlFor="beneficiary-name">
            اسم المستفيد
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
                <span>يمكن طباعة البيانات أو إرسال صورتها إلى المكتبة عند الحاجة.</span>
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

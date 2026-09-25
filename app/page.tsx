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

export default function Home() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const query = q.trim();
    if (query.length < 2) {
      setError("اكتب حرفين على الأقل من الاسم.");
      return;
    }

    setLoading(true);
    setError("");
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

  function printResult(index: number) {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("article[data-result-index]"));
    const target = cards.find((card) => card.dataset.resultIndex === String(index));

    cards.forEach((card) => card.classList.remove("printTarget"));
    target?.classList.add("printTarget");

    window.print();

    target?.classList.remove("printTarget");
  }

  return (
    <main className="wrap">
      <header className="officialHeader">
        <div className="ministry">وزارة العمل والشؤون الاجتماعية</div>
        <div className="authority">هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة</div>
        <div className="province">قسم الأنبار</div>
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
            placeholder="مثال: محمد أحمد"
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
              <span className="updated"> آخر تحديث للبيانات: {formatUpdatedAt(updatedAt)}</span>
            )}
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
              <strong>وزارة العمل والشؤون الاجتماعية</strong>
              <span>هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة – قسم الأنبار</span>
              <span>بيانات استلام بطاقة الضمان الصحي</span>
            </div>

            <div className="name">{row["الاسم الكامل"] || "بدون اسم"}</div>

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
              <span>طباعة هذه الصفحة التي تتضمن بيانات المستفيد وموعد ومكان المراجعة.</span>
              <span>يكون الحضور للمعين المتفرغ أو أحد أقارب الشخص ذي الإعاقة من الدرجة الأولى.</span>
              <span>يرجى الالتزام بموعد ومكان المراجعة المحددين وعدم مراجعة اللجنة قبل الموعد.</span>
            </div>

            <button
              className="printButton noPrint"
              type="button"
              onClick={() => printResult(index)}
            >
              طباعة بيانات المستفيد
            </button>
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
  );
}

import { parseCsv } from "./csv";
import { matchesName } from "./normalize";
import { committeeFromResidence } from "./committee";

const SHEET_ID = "1NDqKDCvqPd9sr5dHMLlmVWujAid4M5KK";
const SHEET_NAME = "جميع الدفعات";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 60_000;

export type ResultRow = {
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

type SheetCache = {
  rows: ResultRow[];
  updatedAt: string;
  expiresAt: number;
};

let memoryCache: SheetCache | null = null;

const aliases: Record<keyof ResultRow, string[]> = {
  السكن: ["السكن", "عنوان السكن", "محل السكن"],
  "الرقم التسلسلي": ["الرقم التسلسلي", "رقم تسلسلي"],
  "رقم بطاقة الضمان الصحي": [
    "رقم بطاقة الضمان الصحي",
    "رقم بطاقةالضمان الصحي",
    "رقم بطاقة الضمان"
  ],
  "الرقم الوطني": ["الرقم الوطني", "رقم البطاقة الوطنية", "الرقم الوطني الموحد"],
  "الاسم الكامل": ["الاسم الكامل", "الاسم", "اسم الشخص ذوي الإعاقة", "اسم المستفيد"],
  "رقم الحزمة": ["رقم الحزمة", "الحزمة", "رقم الوجبة"],
  التسلسل: ["تسلسل", "التسلسل", "الرقم"],
  "تاريخ المراجعة": ["تاريخ المراجعة", "موعد المراجعة", "موعد المراجعه"],
  اللجنة: ["اللجنة", "اللجنة الفرعية", "لجنة المراجعة", "جهة المراجعة"],
  "مكان المراجعة": ["مكان المراجعة", "عنوان المراجعة", "موقع المراجعة"],
  "ملاحظة اللجنة": ["ملاحظة اللجنة", "ملاحظات اللجنة", "ملاحظة المراجعة"]
};

function clean(v: unknown) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(v: unknown) {
  return clean(v)
    .replace(/[ـ]/g, "")
    .replace(/\s*[:：]\s*$/g, "")
    .trim();
}

function indexOfHeader(headers: string[], names: string[]) {
  const normalized = headers.map(normalizeHeader);
  for (const name of names) {
    const i = normalized.findIndex((x) => x === normalizeHeader(name));
    if (i >= 0) return i;
  }
  return -1;
}

function dedupe(rows: ResultRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row["الرقم الوطني"],
      row["الرقم التسلسلي"],
      row["رقم بطاقة الضمان الصحي"],
      row["الاسم الكامل"],
      row["رقم الحزمة"],
      row["تاريخ المراجعة"]
    ]
      .map(clean)
      .join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchSheetRows(): Promise<SheetCache> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache;
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Google Sheets returned ${res.status}`);
    }

    const csv = await res.text();
    const rows = parseCsv(csv);

    if (rows.length < 2) {
      const emptyCache: SheetCache = {
        rows: [],
        updatedAt: new Date().toISOString(),
        expiresAt: Date.now() + CACHE_TTL_MS
      };
      memoryCache = emptyCache;
      return emptyCache;
    }

    const headers = rows[0].map(normalizeHeader);

    const indexes = Object.fromEntries(
      Object.entries(aliases).map(([key, names]) => [
        key,
        indexOfHeader(headers, names)
      ])
    ) as Record<keyof ResultRow, number>;

    const required: Array<keyof ResultRow> = ["الاسم الكامل"];
    const missing = required.filter((key) => indexes[key] < 0);

    if (missing.length) {
      throw new Error(`أعمدة مطلوبة مفقودة: ${missing.join("، ")}`);
    }

    const value = (row: string[], key: keyof ResultRow) => {
      const i = indexes[key];
      return i >= 0 ? clean(row[i]) : "";
    };

    const parsed = rows
      .slice(1)
      .map((row) => {
        const residence = value(row, "السكن");
        const inferred = committeeFromResidence(residence);

        return {
          السكن: residence,
          "الرقم التسلسلي": value(row, "الرقم التسلسلي"),
          "رقم بطاقة الضمان الصحي": value(row, "رقم بطاقة الضمان الصحي"),
          "الرقم الوطني": value(row, "الرقم الوطني"),
          "الاسم الكامل": value(row, "الاسم الكامل"),
          "رقم الحزمة": value(row, "رقم الحزمة"),
          التسلسل: value(row, "التسلسل"),
          "تاريخ المراجعة": value(row, "تاريخ المراجعة"),
          اللجنة: value(row, "اللجنة") || inferred.اللجنة,
          "مكان المراجعة": value(row, "مكان المراجعة") || inferred["مكان المراجعة"],
          "ملاحظة اللجنة": value(row, "ملاحظة اللجنة") || inferred["ملاحظة اللجنة"]
        } satisfies ResultRow;
      })
      .filter((row) => row["الاسم الكامل"]);

    const cache: SheetCache = {
      rows: dedupe(parsed),
      updatedAt: new Date().toISOString(),
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    memoryCache = cache;
    return cache;
  } catch (error) {
    // إذا تعذر الوصول إلى Google مؤقتًا، استخدم آخر نسخة ناجحة في الذاكرة.
    if (memoryCache?.rows) return memoryCache;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchSheet(query: string) {
  const cache = await fetchSheetRows();
  const results = cache.rows.filter((row) => matchesName(row["الاسم الكامل"], query));

  return {
    results,
    total: results.length,
    updatedAt: cache.updatedAt
  };
}

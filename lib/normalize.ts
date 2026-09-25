/**
 * تطبيع مرن للأسماء العربية لأغراض البحث فقط.
 * لا يغيّر الاسم الأصلي المعروض للمستخدم.
 */
export function normalizeArabic(value: string) {
  return String(value ?? "")
    // تفكيك أشكال الحروف والـ ligatures المتوافقة يونيكودياً.
    .normalize("NFKD")
    // حذف التشكيل والعلامات القرآنية والتطويل والمحارف غير المرئية.
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200B-\u200D\u2060\uFEFF]/g, "")
    // توحيد أشكال الألف والهمزة الشائعة.
    .replace(/[أإآٱ]/g, "ا")
    // توحيد الياء والألف المقصورة وأشكال الياء الفارسية/الأردية.
    .replace(/[ىیے]/g, "ي")
    // توحيد الواو والياء المهموزتين لأغراض البحث المرن.
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    // توحيد التاء المربوطة والهاء في البحث: فاطمة = فاطمه.
    .replace(/[ةۀ]/g, "ه")
    // توحيد الكاف الفارسية مع العربية.
    .replace(/ک/g, "ك")
    // توحيد بعض أشكال الهاء المستخدمة في لوحات المفاتيح المختلفة.
    .replace(/[ھہ]/g, "ه")
    // علامات الفصل لا ينبغي أن تمنع العثور على الاسم.
    .replace(/[\-–—_/\\.,،؛;:!?؟(){}\[\]"'«»<>|+*=~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * نسخة بلا مسافات لمعالجة الأسماء المركبة المكتوبة بطريقتين:
 * نور الدين = نورالدين، عبد الله = عبدالله، زين العابدين = زينالعابدين.
 */
export function compactArabic(value: string) {
  return normalizeArabic(value).replace(/\s+/g, "");
}

export function matchesName(name: string, query: string) {
  const normalizedName = normalizeArabic(name);
  const normalizedQuery = normalizeArabic(query);

  if (!normalizedName || !normalizedQuery) return false;

  const compactName = normalizedName.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  // 1) مطابقة العبارة كاملة بعد حذف المسافات.
  // مثال: "نورالدين" يطابق "نور الدين" والعكس صحيح.
  if (compactName.includes(compactQuery)) return true;

  // 2) المحافظة على البحث المرن القديم عند كتابة أكثر من جزء من الاسم
  // حتى لو كانت بينها أسماء أخرى: "محمد علي" يطابق "محمد حسن علي".
  const parts = normalizedQuery.split(" ").filter(Boolean);
  return parts.length > 0 && parts.every((part) => compactName.includes(part));
}

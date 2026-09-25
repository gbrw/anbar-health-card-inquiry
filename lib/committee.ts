import { normalizeArabic } from "./normalize";

export type CommitteeInfo = {
  اللجنة: string;
  "مكان المراجعة": string;
  "ملاحظة اللجنة": string;
};

type Rule = {
  names: string[];
  committee: string;
  place: string;
  note?: string;
};

const RULES: Rule[] = [
  {
    names: ["الرمادي", "رمادي"],
    committee: "مقر قسم هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة في الرمادي",
    place: "مقابل المحكمة – بناية الضمان الاجتماعي"
  },
  {
    names: ["الفلوجة", "فلوجة", "فلوجه"],
    committee: "اللجنة الفرعية في الفلوجة",
    place: "حي نزال – مجاور مستوصف حي نزال"
  },
  {
    names: ["هيت"],
    committee: "اللجنة الفرعية في هيت",
    place: "بناية مركز الشباب",
    note: "المراجعة يومي الثلاثاء والأربعاء من كل أسبوع"
  },
  {
    names: ["حديثة", "حديثه"],
    committee: "اللجنة الفرعية في حديثة",
    place: "بناية القائمقامية"
  },
  {
    names: ["عنه", "عانة", "عنه القضاء"],
    committee: "اللجنة الفرعية في عنه",
    place: "بناية القائمقامية",
    note: "المراجعة يوم الأربعاء فقط"
  },
  {
    names: ["راوة", "راوه"],
    committee: "اللجنة الفرعية في راوة",
    place: "بناية المكتبة العامة"
  },
  {
    names: ["القائم", "قائم"],
    committee: "اللجنة الفرعية في القائم",
    place: "بناية مركز شباب القائم"
  },
  {
    names: ["الرطبة", "رطبة", "رطبه"],
    committee: "اللجنة الفرعية في الرطبة",
    place: "بناية المكتبة"
  },
  {
    names: ["الكرمة", "كرمة", "الكرمه", "كرمه"],
    committee: "اللجنة الفرعية في الكرمة",
    place: "بناية الوقف السني"
  },
  {
    names: ["العامرية", "عامرية", "العامريه", "عامريه"],
    committee: "اللجنة الفرعية في العامرية",
    place: "بناية الحضانة"
  }
];

export function committeeFromResidence(residence: string): CommitteeInfo {
  const normalizedResidence = normalizeArabic(residence);

  for (const rule of RULES) {
    const matched = rule.names.some((name) =>
      normalizedResidence.includes(normalizeArabic(name))
    );

    if (matched) {
      return {
        اللجنة: rule.committee,
        "مكان المراجعة": rule.place,
        "ملاحظة اللجنة": rule.note || ""
      };
    }
  }

  return {
    اللجنة: "",
    "مكان المراجعة": "",
    "ملاحظة اللجنة": ""
  };
}

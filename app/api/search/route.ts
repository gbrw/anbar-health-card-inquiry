import { NextResponse } from "next/server";
import { searchSheet } from "@/lib/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateLimited(request: Request) {
  const now = Date.now();
  const key = clientIp(request);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  buckets.set(key, current);
  return current.count > MAX_REQUESTS;
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  };
}

export async function POST(request: Request) {
  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "عدد طلبات البحث كبير جدًا. حاول مرة أخرى بعد قليل." },
      { status: 429, headers: responseHeaders() }
    );
  }

  let q = "";

  try {
    const body = await request.json();
    q = String(body?.q || "").trim();
  } catch {
    return NextResponse.json(
      { error: "طلب البحث غير صالح." },
      { status: 400, headers: responseHeaders() }
    );
  }

  if (q.length < 2) {
    return NextResponse.json(
      { error: "اكتب حرفين على الأقل من الاسم." },
      { status: 400, headers: responseHeaders() }
    );
  }

  if (q.length > 120) {
    return NextResponse.json(
      { error: "نص البحث أطول من الحد المسموح." },
      { status: 400, headers: responseHeaders() }
    );
  }

  try {
    const data = await searchSheet(q);

    return NextResponse.json(data, {
      headers: responseHeaders()
    });
  } catch (error) {
    console.error("Sheet search failed", error);
    return NextResponse.json(
      { error: "تعذر قراءة بيانات الشيت حاليًا. يرجى المحاولة لاحقًا." },
      { status: 500, headers: responseHeaders() }
    );
  }
}

import "./globals.css";

export const metadata = {
  title: "الاستعلام عن بطاقة الضمان الصحي | هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار",
  description: "خدمة الاستعلام عن بيانات بطاقات الضمان الصحي لمستفيدي هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة / محافظة الأنبار"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

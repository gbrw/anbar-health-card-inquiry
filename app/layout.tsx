import "./globals.css";

export const metadata = {
  title: "الاستعلام عن بطاقة الضمان الصحي | قسم الأنبار",
  description: "الاستعلام عن بيانات بطاقات الضمان الصحي المنشورة لمستفيدي هيئة حقوق ذوي الإعاقة والاحتياجات الخاصة في محافظة الأنبار"
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

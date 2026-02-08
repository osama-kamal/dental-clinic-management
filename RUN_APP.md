# كيف تشغل التطبيق

## الطريقة الأولى: تشغيل كامل (مع Hot Reload)

افتح Terminal في فولدر المشروع واكتب:

```bash
npm run dev
```

هيشغل:
- ✅ Vite dev server (الواجهة)
- ✅ TypeScript compiler (الـ backend)
- ✅ Electron window (التطبيق)

**ملحوظة:** استنى شوية (10-15 ثانية) لحد ما يفتح شباك Electron

---

## الطريقة التانية: لو Electron مفتحش تلقائياً

1. شغل الـ dev server:
```bash
npm run dev
```

2. افتح Terminal تاني واكتب:
```bash
npm start
```

---

## بيانات تسجيل الدخول

- **Username:** admin
- **Password:** admin123

---

## لو حصل مشكلة

### المشكلة: "Cannot find module"
**الحل:**
```bash
npm install
```

### المشكلة: "Port 3000 already in use"
**الحل:** اقفل أي برنامج تاني شغال على Port 3000

### المشكلة: Database error
**الحل:** شغل السكريبت ده تاني:
```bash
node scripts/init-database.js
```

---

## عشان تعمل Build للإنتاج

```bash
npm run build
```

## عشان تعمل Package (ملف تثبيت)

```bash
npm run package:win
```

---

## ملاحظات مهمة

- ✅ الـ Database موجود في: `%APPDATA%\dental-clinic-management\database\clinic.db`
- ✅ كل التعديلات في الكود هتظهر تلقائياً (Hot Reload)
- ✅ لو عايز توقف التطبيق: اضغط `Ctrl+C` في الـ Terminal

---

**جاهز للتشغيل! 🚀**

# 🚀 Quick Start Guide - Dental Clinic Management System

## تشغيل الـ Application للتجربة

### الطريقة الأسرع (Development Mode)

#### 1️⃣ تثبيت الـ Dependencies (مرة واحدة فقط)

افتح Terminal/Command Prompt في مجلد المشروع واكتب:

```bash
npm install
```

⏱️ **انتظر 2-3 دقائق** لحد ما التثبيت يخلص.

---

#### 2️⃣ تشغيل الـ Application

```bash
npm run dev
```

⏱️ **انتظر 10-15 ثانية** لحد ما تشوف:

```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

🎉 **Electron window هيفتح تلقائياً!**

---

### 🔐 تسجيل الدخول

عند فتح الـ Application:

```
Username: admin
Password: admin123
```

⚠️ **مهم:** غير الـ password بعد أول تسجيل دخول!

---

## 🎯 Features للتجربة

### 1. Dashboard 📊
- شوف الـ KPIs (Revenue, Appointments, Patients)
- Analytics للـ 30 يوم الأخيرة

### 2. Patients 👥
- اضغط "Add Patient"
- املأ البيانات
- جرب البحث والفلترة

### 3. Appointments 📅
- شوف الـ Calendar (Day/Week/Month views)
- اضغط "New Appointment"
- جرب Conflict Detection

### 4. Treatments 🦷
- شوف الـ **Tooth Chart** التفاعلي
- اضغط على الأسنان لاختيارها
- شوف الألوان المختلفة للحالات

### 5. Billing 💰
- اعمل Invoice جديد
- سجل Payment
- Export PDF

### 6. Inventory 📦
- شوف Low Stock Warnings
- Adjust Stock
- شوف Transaction History

### 7. Reports 📈
- Generate تقارير مختلفة
- Export PDF/CSV

---

## 🛑 إيقاف الـ Application

في الـ Terminal اضغط:
```
Ctrl + C
```

---

## 🔄 إعادة التشغيل

```bash
npm run dev
```

---

## 🐛 حل المشاكل الشائعة

### Problem 1: "npm: command not found"
**الحل:** ثبت Node.js من https://nodejs.org/

### Problem 2: "Port 5173 already in use"
**الحل:** 
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F

# أو غير الـ port في vite.config.ts
```

### Problem 3: "Cannot find module"
**الحل:**
```bash
rm -rf node_modules
npm install
```

### Problem 4: TypeScript errors
**الحل:**
```bash
npm run build:main
```

### Problem 5: Database errors
**الحل:** امسح الـ database القديم:
```bash
# Windows
del %APPDATA%\dental-clinic-management\database\clinic.db

# أو من الـ app: Settings → Database → Reset
```

---

## 📁 مكان الملفات

### Database
```
%APPDATA%\dental-clinic-management\database\clinic.db
```

### Backups
```
%APPDATA%\dental-clinic-management\backups\
```

### Logs
```
%APPDATA%\dental-clinic-management\logs\
```

---

## 🎨 User Roles للتجربة

### Administrator (admin/admin123)
- ✅ كل الصلاحيات
- ✅ User Management
- ✅ System Settings
- ✅ Backups

### Dentist (إنشاء من User Management)
- ✅ Patients
- ✅ Appointments
- ✅ Treatments
- ✅ Clinical Notes
- ❌ Billing
- ❌ System Settings

### Receptionist (إنشاء من User Management)
- ✅ Basic Patient Info
- ✅ Appointments
- ✅ Billing
- ❌ Treatments
- ❌ System Settings

---

## 🧪 Testing Features

### 1. Patient Management
```
1. اضغط "Patients" من الـ sidebar
2. اضغط "Add Patient"
3. املأ:
   - First Name: John
   - Last Name: Doe
   - Phone: 01234567890
   - Email: john@example.com
4. Save
5. جرب البحث عن "John"
```

### 2. Appointment Scheduling
```
1. اضغط "Appointments"
2. اضغط على تاريخ في الـ Calendar
3. اختار Patient
4. اختار Dentist
5. اختار Time
6. Save
7. شوف الـ appointment في الـ calendar
```

### 3. Tooth Chart
```
1. اضغط "Treatments"
2. شوف الـ Tooth Chart
3. اضغط على أي سن (tooth)
4. شوف اللون يتغير (أزرق = selected)
5. Hover على أي سن لشوف التفاصيل
```

### 4. Invoice Creation
```
1. اضغط "Billing"
2. اضغط "New Invoice"
3. اختار Patient
4. اضغط "Add Item"
5. املأ Description, Quantity, Price
6. شوف الـ Total يتحسب تلقائياً
7. Save
8. اضغط على الـ invoice لشوف Preview
9. Export PDF
```

### 5. Inventory Management
```
1. اضغط "Inventory"
2. اضغط "Add Item"
3. املأ:
   - Item Name: Dental Gloves
   - Category: Consumables
   - Quantity: 50
   - Min Threshold: 20
   - Unit Cost: 5.00
   - Unit: boxes
4. Save
5. جرب Adjust Stock
6. شوف Transaction History
```

---

## 📊 Sample Data للتجربة

### Patients
- John Doe - 01234567890
- Jane Smith - 01234567891
- Ahmed Ali - 01234567892

### Appointments
- Today 10:00 AM - John Doe - Checkup
- Today 2:00 PM - Jane Smith - Cleaning
- Tomorrow 9:00 AM - Ahmed Ali - Filling

### Treatments
- Tooth #14 - Cavity - Needs filling
- Tooth #30 - Missing - Consider implant
- Tooth #8 - Root Canal - Completed

---

## 🎓 Next Steps

بعد ما تجرب الـ Application:

1. **اقرأ الـ Documentation:**
   - [DEPLOYMENT.md](DEPLOYMENT.md) - للـ Production
   - [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) - للـ Deployment
   - [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) - للـ Development

2. **Run Tests:**
   ```bash
   npm test
   ```

3. **Build للـ Production:**
   ```bash
   npm run package:win
   ```

4. **Customize:**
   - غير الـ colors في `src/renderer/App.tsx`
   - أضف features جديدة
   - عدل الـ database schema

---

## 💡 Tips

- **Hot Reload:** أي تغيير في الـ code هيظهر فوراً
- **DevTools:** اضغط `Ctrl+Shift+I` لفتح Chrome DevTools
- **Reload:** اضغط `Ctrl+R` لإعادة تحميل الـ page
- **Console:** شوف الـ errors في DevTools Console

---

## 📞 Support

لو واجهت أي مشكلة:
1. شوف الـ [Troubleshooting](#-حل-المشاكل-الشائعة) أعلاه
2. اقرأ الـ [DEPLOYMENT.md](DEPLOYMENT.md)
3. افتح Issue على GitHub

---

## ✅ Checklist للتجربة

- [ ] تثبيت Dependencies (`npm install`)
- [ ] تشغيل الـ App (`npm run dev`)
- [ ] تسجيل الدخول (admin/admin123)
- [ ] إضافة Patient
- [ ] إنشاء Appointment
- [ ] تجربة Tooth Chart
- [ ] إنشاء Invoice
- [ ] إضافة Inventory Item
- [ ] Generate Report
- [ ] Export PDF
- [ ] Test Backup/Restore

---

**استمتع بتجربة الـ Application! 🎉**

**أي سؤال؟ اقرأ الـ [README.md](README.md) للتفاصيل الكاملة.**

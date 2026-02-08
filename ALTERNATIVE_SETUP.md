# 🔄 Setup بديل - بدون better-sqlite3

## المشكلة
Node.js 24 جديد جداً و better-sqlite3 مش شغال معاه.

## ✅ الحل الموصى به
**نزل Node.js 20 LTS** من https://nodejs.org/

---

## 🚀 حل بديل: استخدام sql.js

### 1. امسح better-sqlite3
```bash
npm uninstall better-sqlite3
```

### 2. ثبت sql.js
```bash
npm install sql.js
```

### 3. غير DatabaseManager
هتحتاج تعدل `src/database/DatabaseManager.ts` عشان يستخدم sql.js بدل better-sqlite3.

---

## ⚠️ ملحوظة مهمة

**sql.js** أبطأ من **better-sqlite3** لكن:
- ✅ يشتغل مع أي Node.js version
- ✅ مش محتاج build tools
- ✅ سهل التثبيت

**better-sqlite3** أسرع لكن:
- ❌ محتاج Visual Studio Build Tools
- ❌ مش شغال مع Node.js 24
- ✅ أفضل للـ production

---

## 🎯 التوصية النهائية

**للتطوير والتجربة:**
```bash
# نزل Node.js 20 LTS
# ثم:
npm install
```

**Node.js 20 LTS هو الإصدار المستقر والموصى به حالياً.**

Node.js 24 لسه في مرحلة Current (مش LTS) وكتير من الـ packages مش متوافقة معاه.

---

## 📞 خطوات سريعة

1. **نزل Node.js 20 LTS**: https://nodejs.org/
2. **ثبته** (هيستبدل 24 تلقائياً)
3. **افتح Terminal جديد**
4. **تأكد**: `node --version` → لازم `v20.x.x`
5. **امسح**: `rmdir /s /q node_modules` و `del package-lock.json`
6. **ثبت**: `npm install`
7. **شغل**: `npm run dev`

🎉 **هيشتغل 100%!**

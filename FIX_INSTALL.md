# 🔧 حل مشكلة التثبيت - better-sqlite3

## المشكلة
`better-sqlite3` محتاج Visual Studio Build Tools عشان يعمل compile.

---

## ✅ الحل السريع (جرب ده الأول)

### 1. امسح node_modules
```bash
rmdir /s /q node_modules
del package-lock.json
```

### 2. ثبت تاني
```bash
npm install
```

---

## 🔧 الحل البديل 1: تثبيت Build Tools

### خطوة واحدة (كـ Administrator):
```bash
npm install --global windows-build-tools
```

⏱️ **هياخد 10-15 دقيقة**

بعدين:
```bash
npm install
```

---

## 🚀 الحل البديل 2: استخدام Node.js أقدم

Node.js 24 جديد جداً. جرب Node.js 20 LTS:

### 1. نزل Node.js 20 LTS
https://nodejs.org/en/download/

### 2. ثبته

### 3. تأكد من الإصدار
```bash
node --version
```
لازم يطلع: `v20.x.x`

### 4. ثبت المشروع
```bash
npm install
```

---

## 🎯 الحل البديل 3: استخدام Pre-built Binary

### 1. ثبت better-sqlite3 مع pre-built binary
```bash
npm install better-sqlite3@11.0.0 --build-from-source=false
```

### 2. ثبت باقي الـ dependencies
```bash
npm install
```

---

## 🔍 تحقق من التثبيت

بعد أي حل، جرب:

```bash
node -e "const db = require('better-sqlite3'); console.log('✅ better-sqlite3 works!');"
```

لو طلع `✅ better-sqlite3 works!` يبقى تمام!

---

## 📝 الحل الموصى به

**للتطوير:**
- استخدم Node.js 20 LTS (الأكثر استقراراً)
- ثبت windows-build-tools

**للتجربة السريعة:**
- استخدم better-sqlite3@11.0.0 مع pre-built binary

---

## 🆘 لو لسه في مشكلة

### جرب الأوامر دي بالترتيب:

```bash
# 1. امسح كل حاجة
rmdir /s /q node_modules
del package-lock.json

# 2. نضف الـ cache
npm cache clean --force

# 3. ثبت better-sqlite3 لوحده
npm install better-sqlite3@11.0.0

# 4. ثبت الباقي
npm install
```

---

## ✅ بعد ما التثبيت ينجح

```bash
npm run dev
```

🎉 **الـ Application هيشتغل!**

---

## 📞 Support

لو لسه في مشكلة، ابعت الـ error log كامل.

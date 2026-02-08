# 🚀 كيف ترفع المشروع على GitHub

## الخطوات:

### 1️⃣ روح على GitHub
- افتح: https://github.com
- اعمل حساب لو معندكش
- اضغط **New Repository**

### 2️⃣ إعدادات الـ Repository
- **Repository name:** dental-clinic-management
- **Description:** Dental Clinic Management Desktop App
- اختار **Private** (عشان محدش يشوفه)
- **لا تختار** "Add README" أو ".gitignore"
- اضغط **Create repository**

### 3️⃣ ارفع المشروع
افتح Terminal في فولدر المشروع واكتب:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dental-clinic-management.git
git push -u origin main
```

**ملحوظة:** غير `YOUR_USERNAME` باسم المستخدم بتاعك على GitHub

### 4️⃣ شوف الـ Build
- روح على الـ repository على GitHub
- اضغط على تاب **Actions**
- هتلاقي الـ build شغال
- استنى 5-10 دقائق لحد ما يخلص

### 5️⃣ حمل الـ exe
- لما الـ build يخلص (علامة ✅ خضرا)
- اضغط على الـ workflow
- تحت في **Artifacts** هتلاقي `dental-clinic-setup`
- حمله - جواه الـ exe! 🎉

---

## 🔄 لو عايز تعمل build تاني:

```bash
git add .
git commit -m "Update"
git push
```

GitHub هيبني تلقائياً! ✅

---

## ⚠️ مشاكل محتملة:

### لو قالك "git not found":
حمل Git من: https://git-scm.com/download/win

### لو طلب منك username/password:
استخدم **Personal Access Token** بدل الـ password:
1. روح Settings > Developer settings > Personal access tokens
2. اعمل token جديد
3. استخدمه بدل الـ password

---

**بالتوفيق! 🚀**

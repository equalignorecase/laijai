# รายจ่าย - Laijai (Personal Expense Tracker AI)

เว็บแอปพลิเคชันบันทึกและวิเคราะห์รายจ่ายส่วนบุคคล พร้อมระบบอ่านสลิปโอนเงินธนาคารไทยด้วย **Tesseract.js OCR (Client-side WASM)** และสำรองด้วย **Gemini 2.5 Flash AI** เชื่อมต่อฐานข้อมูล **Firebase (Firestore + Authentication)** พัฒนาด้วย Next.js 16 (App Router), TypeScript, Tailwind CSS และ Recharts

---

## ฟีเจอร์หลัก (Key Features)

1. **Dashboard สรุปการเงินเรียลไทม์**:
   - รายรับรวม, รายจ่ายรวม, เงินสุทธิคงเหลือ
   - กราฟแท่งเปรียบเทียบรายรับ-รายจ่ายรายวันตลอดทั้งเดือน
   - แผนภูมิวงกลม (Pie Chart) สัดส่วนรายจ่ายแยกตามหมวดหมู่
   - เปรียบเทียบแนวโน้มค่าใช้จ่ายกับเดือนก่อนหน้า (Month-over-Month %)
   - รายการธุรกรรม 5 รายการล่าสุด

2. **ระบบอ่านสลิปธนาคารด้วย Gemini 1.5 Flash AI (OCR)**:
   - อัปโหลดสลิปธนาคาร (JPG, PNG, WebP)
   - สกัดข้อมูลอัตโนมัติ: ยอดเงิน, วันที่, เวลา, ผู้รับ, ผู้โอน, ธนาคาร, เลขอ้างอิง
   - AI ช่วยจับคู่หมวดหมู่ที่เหมาะสมที่สุดให้ล่วงหน้า
   - นโยบายความเป็นส่วนตัว: **ประมวลผลชั่วคราว (Ephemeral 100%)** ไม่มีการเก็บไฟล์รูปภาพสลิปลงบนเซิร์ฟเวอร์
   - ตรวจสอบและแก้ไขข้อมูลในฟอร์มได้ 100% ก่อนกดยืนยันบันทึก

3. **ระบบป้องกันและตรวจจับรายการซ้ำ (Duplicate Detection)**:
   - ตรวจสอบเลขอ้างอิงสลิป (Reference Number) ซ้ำ
   - ตรวจจับรายการในวันเดียวกัน จำนวนเงินและผู้รับเงินตรงกัน
   - แสดง Modal เปรียบเทียบข้อมูลเดิมกับรายการใหม่ พร้อมปุ่มยืนยันบันทึกต่อหรือยกเลิก

4. **การจัดการงบประมาณรายเดือน (Budgeting)**:
   - ตั้งเพดานงบประมาณแยกตามหมวดหมู่รายจ่ายในแต่ละเดือน
   - แถบแสดงความคืบหน้า (Progress Bar) พร้อมระบบแจ้งเตือนเมื่อใช้เกิน 80% และเกิน 100%

5. **ระบบรายการประจำ (Recurring Transactions)**:
   - ตั้งค่ารายจ่าย/รายรับประจำ เช่น ค่าเช่า ค่าน้ำ ค่าไฟ ค่าอินเทอร์เน็ต เงินเดือน
   - กำหนดความถี่: รายสัปดาห์, รายเดือน, รายปี
   - แบนเนอร์แจ้งเตือนเมื่อถึงกำหนดชำระ พร้อมปุ่มกดยืนยันบันทึกเป็นธุรกรรมจริงในคลิกเดียว

6. **ระบบหมวดหมู่ที่ปรับแต่งได้ (Categories)**:
   - Seed หมวดหมู่ภาษาไทยเริ่มต้นอัตโนมัติ (รายจ่าย 12 หมวดหมู่, รายรับ 5 หมวดหมู่)
   - เพิ่มหมวดหมู่เอง พร้อมเลือกไอคอนและสีได้อิสระ
   - ซ่อนหมวดหมู่ (Archive) และป้องกันการลบหมวดหมู่ที่มีธุรกรรมผูกอยู่

7. **การส่งออกรายงาน (Reports & Export)**:
   - กรองตามช่วงวันที่, ประเภท, หมวดหมู่
   - ส่งออกเป็นไฟล์ **CSV ภาษาไทย** (รองรับ UTF-8 BOM เปิดใน Microsoft Excel ได้ถูกต้อง ไม่เป็นภาษาต่างดาว)
   - ส่งออกเป็นไฟล์ **Excel (.xlsx)** จัดรูปแบบตารางและสรุปยอดเงินสวยงาม

8. **ความปลอดภัยและการยืนยันตัวตน**:
   - ใช้ **Firebase Anonymous Authentication** อัตโนมัติ (ไม่ต้องสมัครสมาชิก แต่ข้อมูลถูกแยกตาม UID ปลอดภัย)
   - Firestore Security Rules จำกัดการอ่าน/เขียนเฉพาะเจ้าของ UID (`request.auth.uid == userId`)
   - ไม่มี API Key หลุดไปยัง Client Bundle (Gemini API Key ทำงานเฉพาะฝั่ง Server-side Route Handler)

---

## ขั้นตอนการติดตั้งและรันบนเครื่อง Local

### ขั้นตอนที่ 1: ตรวจสอบเครื่องมือที่จำเป็น

- **Node.js**: เวอร์ชัน 18.17 หรือใหม่กว่า (แนะนำ Node.js v20+)
- **npm**: เวอร์ชัน 9+
- **Java (JRE/JDK)**: จำเป็นเฉพาะเมื่อต้องการรัน Firebase Local Emulator Suite

ตรวจสอบเวอร์ชัน:
```bash
node -v
npm -v
java -version
```

### ขั้นตอนที่ 2: ติดตั้ง Dependencies

```bash
npm install --legacy-peer-deps
```

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env.local`:
```bash
cp .env.example .env.local
```

แก้ไขค่าใน `.env.local`:

```dotenv
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=local-emulator-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-laijai.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-laijai
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-laijai.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:demo

# Gemini API Key (รับได้ฟรีจาก https://aistudio.google.com/)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# ตั้งเป็น true เมื่อต้องการเชื่อมต่อ Firebase Local Emulator Suite
USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

> **หมายเหตุ**: หากต้องการใช้ Firebase Cloud จริง ให้ใส่ค่า Config จาก Firebase Console และเปลี่ยน `USE_FIREBASE_EMULATOR=false`

---

### ขั้นตอนที่ 4: การรัน Firebase Emulator (ทางเลือกสำหรับการทดสอบในเครื่อง)

ติดตั้ง Firebase CLI (หากยังไม่มี):
```bash
npm install -g firebase-tools
```

เริ่ม Firebase Emulator Suite:
```bash
firebase emulators:start
```
- Emulator UI: `http://localhost:4000`
- Firestore Emulator: `localhost:8080`
- Auth Emulator: `localhost:9099`

---

### ขั้นตอนที่ 5: เริ่มรัน Next.js Web Application

เปิดอีกหน้าต่าง Terminal แล้วรันคำสั่ง:
```bash
npm run dev
```

เปิดเว็บเบราว์เซอร์ไปที่:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## คำสั่งสำหรับตรวจสอบและทดสอบระบบ

1. **รัน Unit Tests (Vitest)**:
   ```bash
   npm test
   ```

2. **ตรวจสอบ TypeScript Types**:
   ```bash
   npx tsc --noEmit
   ```

3. **ตรวจสอบ Code Quality & Linter (ESLint)**:
   ```bash
   npm run lint
   ```

4. **ทดสอบ Production Build**:
   ```bash
   npm run build
   ```



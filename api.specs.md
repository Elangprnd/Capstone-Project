# VOLETRA API Documentation

Selamat datang di dokumentasi API VOLETRA! Platform ini dirancang untuk menghubungkan lembaga kemanusiaan dengan relawan secara efisien. Dokumentasi ini ditujukan bagi tim frontend (Next.js) untuk mempermudah integrasi.

---
Base URL: `http://localhost:3000`

Interactive docs: `http://localhost:3000/docs`

## Authentication

API menggunakan JWT dengan RS256. Token disimpan di **HttpOnly Cookie**.

Untuk testing via Postman, kirim di header:
```
Authorization: Bearer <token>
```

---

## Error Format

Semua error menggunakan format yang sama:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Pesan yang readable untuk user"
}
```

---
## Quick Start

Ikuti 5 langkah mudah ini untuk mulai menggunakan API:

1.  **Register:** Buat akun relawan baru via `/api/auth/register/volunteer`.
2.  **Login:** Masuk melalui `/api/auth/login` untuk mendapatkan session cookie.
3.  **Create Mission:** Sebagai lembaga, buat misi pertama Anda di `/api/misi`.
4.  **Apply:** Sebagai relawan, daftar ke misi yang tersedia via `/api/apply`.
5.  **Status Check:** Pantau status pendaftaran di dashboard pendaftaran saya `/api/apply/me`.

**Contoh Login via URL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "budi.santoso@email.com", "password": "Password123"}'
```

---

## Base URL & Environments

| Environment | URL |
| :--- | :--- |
| **Development** | `http://localhost:3000` |
| **Staging** | `(TBA)` |
| **Production** | `(TBA)` |

---

## Authentication Guide

### 🔐 Bagaimana JWT Bekerja
Proyek ini menggunakan **JWT RS256** untuk keamanan. Token disimpan melalui **HttpOnly Cookie** untuk mencegah serangan XSS.

1.  **Session Cookie:** Setelah login sukses, server mengirim header `Set-Cookie: access_token=...`. Browser akan otomatis mengirim cookie ini pada setiap request berikutnya.
2.  **Bearer Fallback:** Untuk keperluan testing (Postman/Mobile), sistem juga menerima header `Authorization: Bearer <JWT_TOKEN>`.
3.  **Expiry:** Token berlaku selama **24 jam**.
4.  **Unauthorized:** Jika token expired atau tidak valid, server mengembalikan status `401 Unauthorized`.

### Role-Based Access Control (RBAC)

| Role | Hak Akses |
| :--- | :--- |
| **volunteer** | Mencari misi, mendaftar misi (apply), membatalkan pendaftaran, kelola profil. |
| **lembaga** | Membuat misi, edit misi, approve/reject relawan, update status pengerjaan misi. |
| **super_admin** | Kelola user, moderasi konten, akses penuh ke semua resource. |

---

## Request & Response Format

Semua request body menggunakan format **JSON** (kecuali upload file menggunakan `multipart/form-data`).

**✅ Standard Success Response:**
```json
{
  "success": true,
  "message": "Pesan keberhasilan",
  "data": { ... }
}
```
*Catatan: Beberapa endpoint mungkin mengembalikan data langsung (seperti array) jika berupa list.*

**❌ Standard Error Response:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Pesan error dalam bahasa Indonesia"
}
```


---

## Rate Limiting

Sistem keamanan **Brute Force Protection** aktif pada endpoint Login:
*   **Limit:** Maksimal 5 kali percobaan gagal.
*   **Window:** Dalam kurun waktu 10 menit.
*   **Penalty:** IP akan diblokir selama **15 menit**.

---

## Endpoints
### 🔐 Auth

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/register/volunteer` | ❌ | Register relawan |
| POST | `/api/auth/register/lembaga` | ❌ | Register lembaga |
| POST | `/api/auth/login` | ❌ | Login semua role |
| POST | `/api/auth/logout` | ✅ | Logout |
| POST | `/api/auth/google` | ❌ | Google OAuth (volunteer only) |
| POST | `/api/auth/forgot-password` | ❌ | Request reset password |
| POST | `/api/auth/reset-password` | ❌ | Konfirmasi reset password |

---

### 🗺️ Misi

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| GET | `/api/misi` | ❌ | Public | Get semua misi aktif + filter |
| POST | `/api/misi` | ✅ | lembaga | Buat misi baru |
| GET | `/api/misi/:id` | ❌ | Public | Detail misi |
| PUT | `/api/misi/:id` | ✅ | lembaga | Update misi |
| DELETE | `/api/misi/:id` | ✅ | lembaga | Soft delete misi |
| PATCH | `/api/misi/:id/status` | ✅ | lembaga | Update status misi |

**Query params untuk GET /api/misi:**
- `lat` — Latitude user
- `lng` — Longitude user  
- `radius` — Radius pencarian (km)
- `kategori` — Filter kategori (Bencana/Pendidikan/Medis/Logistik)

---

### 📋 Apply

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| POST | `/api/misi/:mission_id/apply` | ✅ | volunteer | Apply misi |
| GET | `/api/apply/me` | ✅ | volunteer | Riwayat apply saya |
| DELETE | `/api/apply/:id` | ✅ | volunteer | Batalkan lamaran |
| PATCH | `/api/apply/:id/approve` | ✅ | lembaga | Approve relawan |
| PATCH | `/api/apply/:id/reject` | ✅ | lembaga | Reject relawan |

**Apply Error Codes:**
- `MISSION_NOT_FOUND` → 404
- `MISSION_CLOSED` → 409
- `QUOTA_FULL` → 409
- `ALREADY_APPLIED` → 409

---
---

### ENDPOINT & BODY
### 🔐 Auth (`/api/auth`)

#### `POST /register/volunteer`
Mendaftarkan relawan baru.
*   **Body:** `name`, `email`, `password`, `confirm_password`, `role: "volunteer"`.

#### `POST /register/lembaga`
Mendaftarkan institusi/pelapor baru.
*   **Body:** `institution_name`, `email`, `password`, `confirm_password`, `role: "lembaga"`.

#### `POST /login`
Autentikasi user. Mengembalikan cookie `access_token`.

#### `POST /google`
Login/Register menggunakan Google ID Token.
*   **Body:** `{ "id_token": "..." }`

---

### 🗺️ Misi (`/api/misi`)

#### `GET /`
Mencari misi publik.
*   **Query:** `lat`, `lng`, `radius` (km), `kategori` (`Bencana`, `Pendidikan`, `Medis`, `Logistik`).

#### `POST /`
Membuat misi baru.
*   **Auth:** `lembaga`
*   **Body (multipart):** `judul`, `deskripsi`, `kategori`, `alamat`, `jumlah_relawan`, `foto` (array file).

#### `GET /pelapor/me` 📋
Melihat daftar misi yang dibuat oleh institusi saya.
*   **Auth:** `lembaga`

#### `PATCH /:id/status`
Update status misi secara manual.
*   **Status Map:** `berjalan` (sedang berjalan), `selesai` (selesai).
*   **Diagram:** `menunggu_relawan` ──► `relawan_terkumpul` ──► `sedang_berjalan` ──► `selesai`.

---

### 📋 Apply (`/api/apply`)

#### `POST /`
Mendaftar ke sebuah misi.
*   **Auth:** `volunteer`
*   **Body:** `{ "misi_id": "UUID_MISI" }`
*   **Safety:** Menggunakan *database lock* untuk mencegah kuota bocor.

#### `GET /me`
Melihat status pendaftaran saya (Volunteer).

#### `PATCH /:id/approve`
Menyetujui relawan (Lembaga).
*   **⚠️ PERHATIAN:** `coordinator_whatsapp` hanya muncul di detail misi jika pendaftaran relawan berstatus `approved`.


---

## Error Codes Reference

| HTTP | Error Code | Meaning |
| :--- | :--- | :--- |
| 400 | `VALIDATION_ERROR` | Input tidak sesuai schema (Zod validation). |
| 400 | `LOKASI_TIDAK_VALID` | Alamat tidak ditemukan oleh sistem geocoding. |
| 400 | `INVALID_STATUS` | Transisi status misi atau aplikasi tidak diizinkan. |
| 401 | `UNAUTHORIZED` | Belum login atau token tidak valid. |
| 403 | `FORBIDDEN` | Tidak memiliki role yang sesuai atau bukan pemilik data. |
| 404 | `MISSION_NOT_FOUND` | ID Misi tidak ditemukan atau sudah dihapus. |
| 409 | `ALREADY_APPLIED` | Relawan sudah terdaftar di misi ini (dan tidak dibatalkan). |
| 409 | `MISSION_CLOSED` | Misi sudah penuh, sedang berjalan, atau sudah selesai. |
| 409 | `DUPLICATE_EMAIL` | Email sudah digunakan oleh akun lain. |
| 410 | `TOKEN_EXPIRED` | Link reset password sudah kadaluwarsa atau sudah digunakan. |
| 429 | `TOO_MANY_REQUESTS` | Terlalu banyak percobaan login (Rate limit). |
| 500 | `Server error` | Server error / code error

---





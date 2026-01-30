Aquí tienes el **`.md` actualizado**, ya **alineado con tu arquitectura real (single container, same-origin, dominio estable)**.
Puedes **reemplazar todo el contenido** del archivo por esto.

---

```md
# KELEDON Deployment Configuration Guide (PRODUCTION)

This guide describes the **current production deployment model** for KELEDON.

KELEDON is deployed as a **single container** (frontend + backend) behind **one stable public domain**.

---

## 🌐 Production Base URL (Source of Truth)

```

[https://keledon.tuyoisaza.com](https://keledon.tuyoisaza.com)

````

All configuration derives from this URL.

---

## 🧱 Architecture Overview

- Frontend (React / Vite)
- Backend (NestJS)
- Nginx reverse proxy

All run **inside the same Cloud Run service**.

### Key consequences

- No separate frontend deployment
- No `VITE_API_URL`
- No hardcoded backend URLs
- All requests use **same-origin**
- Nginx proxies:
  - `/api/*`
  - `/socket.io/*`
  - `/listen/*`

---

## 1️⃣ Frontend Configuration (`landing/`)

### Environment variables

Frontend **does NOT need a backend URL**.

Only Supabase variables are required.

`landing/.env.production`:

```env
VITE_SUPABASE_URL=https://isoyzcvjoevyphnaznkl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
````

### Important notes

* Do **NOT** set `VITE_API_URL`
* Do **NOT** set `VITE_WEBSOCKET_URL`
* The app uses `window.location.origin`

### Build

```bash
cd landing
npm run build
```

The output is bundled into the Docker image and served by Nginx.

---

## 2️⃣ Backend Configuration (`cloud/`)

Backend configuration is injected via environment variables at deploy time.

### `cloud/.env` (production)

```env
NODE_ENV=production

CORS_ORIGINS=https://keledon.tuyoisaza.com,chrome-extension://*

SUPABASE_URL=https://isoyzcvjoevyphnaznkl.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Notes

* **Do NOT set `PORT`**

  * Cloud Run injects it automatically
  * Nginx listens on `8080`
  * Backend listens internally on `3001`
* CORS must include the public domain

---

## 3️⃣ Supabase Configuration (CRITICAL)

Supabase **must know the public domain**.

### Auth Settings

Go to:

```
Supabase Dashboard → Auth → Settings
```

#### Site URL

```
https://keledon.tuyoisaza.com
```

#### Redirect URLs

Add:

```
https://keledon.tuyoisaza.com
https://keledon.tuyoisaza.com/**
```

(Optional fallback during debugging)

```
https://keledon-1062969561553.us-central1.run.app/**
```

Save changes.

---

## 4️⃣ Chrome Agent Configuration

The agent **must point to the stable domain**.

Preferred value:

```
https://keledon.tuyoisaza.com
```

The agent supports runtime configuration via `chrome.storage.local`.

No hardcoded Cloud Run URLs should remain.

---

## 5️⃣ Deployment (Google Cloud Run)

Deployment is handled by the existing script:

```powershell
.\deploy.ps1
```

### Important

* The deploy script does **not** change when the domain changes
* Domains are configured externally (Cloud Run + DNS)
* The service URL remains stable across revisions

---

## ✅ Verification Checklist

After deployment, verify:

* [ ] `https://keledon.tuyoisaza.com` loads
* [ ] Google OAuth redirects correctly
* [ ] `/api/health` returns 200
* [ ] WebSocket connections succeed
* [ ] No CORS errors in console
* [ ] No `localhost` references in production

---

## 🧠 Rules to Remember

* **One service, one domain**
* **Same-origin everywhere**
* **No API URLs in frontend**
* **Supabase must match the domain**
* **Deploy script stays unchanged**

---

## 🚀 Summary

KELEDON production is **domain-driven**, not deployment-driven.

Once the domain is stable:

* Code does not change
* Deploy script does not change
* Only environment variables and Supabase settings matter

```

---

Si quieres, en el próximo mensaje puedo:
- convertir esto en **README.md final**
- o generar una **versión corta para onboarding**
```

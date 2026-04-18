# KELEDON DEPLOYMENT CANON

## Status
**IMMUTABLE LAW — Deployment**

Fecha: 2026-03-24

---

## 1. RAILWAY DEPLOYMENT — PUSH-BASED ONLY

### Canon Law

> **Railway MUST only deploy what is pushed to git. No CLI commands from local machine.**

### Implementation

1. **Git Push is the Single Source of Truth**
   - Railway debe estar configurado con GitHub Integration
   - Cada push a `main` dispara automáticamente el deploy
   - No usar `railway up`, `railway deploy`, ni ningún comando Railway CLI local para producción

2. **Auto-Deploy Setup (Railway Dashboard)**
   ```
   Railway Dashboard → Project → Service → Settings → Git
   Enable: "Deploy on Push"
   Branch: main
   ```

3. **Forbidden Commands**
   - `railway up` - PROHIBIDO en producción
   - `railway deploy` - PROHIBIDO en producción
   - Cualquier comando Railway que no sea `railway status` o `railway logs`

4. **Allowed Commands (Only for Debug)**
   - `railway status` - Ver estado
   - `railway logs` - Ver logs
   - `railway connect` - Debug temporal

5. **Version Management**
   - Version bump en package.json (cloud + landing)
   - Version en: LoginPage.tsx, Dockerfile, start.sh
   - Commit message: `v0.0.X: description`
   - Push a main → Railway detecta y despliega automáticamente

### Verification

```bash
# After push, verify Railway picked it up:
railway logs --service keledon | grep "v0.0.X"
```

---

## 2. DOCKERFILE-BASED BUILD

### Canon Law

> **Single Dockerfile builds everything. No multi-repo deployments.**

### Implementation

- `Dockerfile` en raíz del proyecto
- Build stages: frontend → backend → nginx
- Produce imagen única lista para Railway
- No hay builds parciales ni despliegues independientes

---

## 3. VERSIONING

### Canon Law

> **Una versión = Un commit = Un deploy**

### Format

```
v0.0.{N}
```

### Files to Update on Version Bump

1. `cloud/package.json` - version
2. `landing/package.json` - version
3. `landing/src/pages/LoginPage.tsx` - APP_VERSION, BUILD_TIME
4. `Dockerfile` - comentario de versión
5. `start.sh` - mensaje de boot

---

## 4. DEPLOYMENT CHECKLIST

- [ ] Version bump en package.json (cloud + landing)
- [ ] Version update en LoginPage.tsx, Dockerfile, start.sh
- [ ] `git add -A`
- [ ] `git commit -m "v0.0.X: description"`
- [ ] `git push`
- [ ] Esperar ~2-3 min para Railway auto-deploy
- [ ] Verificar: `railway logs | grep "v0.0.X"`

---

## 5. EMERGENCY ROLLBACK

Si algo sale mal:

1. **Railway Dashboard** → Deploys → Seleccionar commit anterior → Redeploy
2. O hacer `git revert` y pushear

---

## 6. PROHIBIDO

- Deploys manuales desde CLI
- Cambios directos en Railway dashboard que no estén en git
- Saltarse el version bump
- Hacer deploy sin push

---

## 7. RELajación

Este canon puede relajarse SOLO si:
- Estamos en modo debug local
- Testing en staging diferente a producción

**Producción = Push Only**

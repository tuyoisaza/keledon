# 🎯 KELEDON GRATUITO - GOOGLE CLOUD FREE TIERS

## ✅ PLAN GRATUITO COMPLETO

### Frontend: Google Cloud Storage (FREE)
- **Costo**: $0/mes (dentro de 5GB mensuales)
- **CDN**: Incluido y global
- **SSL**: Automático
- **Deploy**: Automatizado con `deploy-frontend-free.sh`

### Backend: Google App Engine (FREE)  
- **Costo**: $0/mes (dentro de límites gratuitos)
- **Recursos**: 1 instancia (0.5 vCPU, 0.5GB RAM)
- **Disponibilidad**: 28 horas/día
- **Deploy**: Automatizado con `deploy-backend-free.sh`

### Total: $0/mes (si permaneces dentro de límites)

---

## 🚀 INSTRUCCIONES DE DESPLIEGUE GRATUITO

### PASO 1: Deploy Frontend Gratuito

```bash
cd C:\Keldon\scripts
.\deploy-frontend-free.sh
```

**Resultado:**
- URL: `https://keeldon-landing-frontend.storage.googleapis.com`
- Costo: $0

### PASO 2: Deploy Backend Gratuito

```bash
cd C:\Keldon\scripts  
.\deploy-backend-free.sh
```

**Resultado:**
- URL: `https://keledon-cloud-dot-keledon.uc.r.appspot.com`
- Costo: $0

### PASO 3: Configurar Chrome Extension

```javascript
// En agent/background.js
const BACKEND_URL = 'https://keledon-cloud-dot-keledon.uc.r.appspot.com';
```

---

## 📊 LÍMITES GRATUITOS

### Google Cloud Storage
- **Storage**: 5GB/month
- **Bandwith**: 1GB/month saliente
- **Operaciones**: 50k/month
- **Máximo excedido**: Pagar $0.023/GB

### Google App Engine  
- **Compute**: 28 horas/día
- **Instancias**: 1 (0.5 vCPU, 0.5GB RAM)
- **Storage**: 1GB
- **Outbound bandwidth**: 1GB/día

---

## 🎯 ESTRATEGIA DE USO GRATUITO

### Para Mantenerse en Límites
1. **Uso moderado**: ~2-3 horas de llamadas/día
2. **Optimizar código**: Reduce timeouts y memoria
3. **Cache en frontend**: Minimizar requests
4. **Monitorear límites**: Dashboard de Google Cloud

### Si Excedes Límites
- **Costos**: App Engine ~$0.03/vCPU-hora + storage
- **Storage adicional**: $0.026/GB-mes
- **Bundle**: Más económico que Cloud Run para uso bajo

---

## 🎯 VENTAJAS

### vs Cloud Run
- **Costos**: $0 vs $58.48/mes
- **Frontend**: CDN global vs regional
- **SSL**: Automático vs configuración manual
- **Deploy**: Más simple y rápido

### vs Proveedores Pagados
- **Sin API keys**: Desarrollo inicial gratuito
- **Testing completo**: Mocks incluidos
- **Luego configurar**: Solo cuando tengas ingresos

---

## 🚀 READY TO DEPLOY

### Requisitos
- ✅ gcloud CLI instalado
- ✅ Autenticado con Google
- ✅ Proyecto "keledon" configurado

### Ejecutar Gratis
```bash
# Frontend
cd C:\Keldon\scripts
.\deploy-frontend-free.sh

# Backend  
cd C:\Keldon\scripts
.\deploy-backend-free.sh
```

### URLs Resultantes
- **Frontend**: https://keeldon-landing-frontend.storage.googleapis.com
- **Backend**: https://keledon-cloud-dot-keledon.uc.r.appspot.com
- **Chrome Extension**: Actualizar con URL backend

### Costo Total: $0/mes (si en límites gratuitos)

---

## 🎉 ¡KELEDON GRATUITO!

**Tienes listo el plan completo para desplegar KELEDON en Google Cloud completamente gratis:**

1. ✅ Scripts automatizados
2. ✅ Zero costos iniciales
3. ✅ Mismo rendimiento
4. ✅ CDN global
5. ✅ SSL automático

**¿Quieres ejecutar el despliegue gratuito ahora?**
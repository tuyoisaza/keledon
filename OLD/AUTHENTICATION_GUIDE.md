# 🔑 GUÍA COMPLETA DE AUTENTICACIÓN GOOGLE CLOUD

## 📋 Estado Actual
- ✅ gcloud CLI: INSTALADO (v553.0.0)
- ✅ Python: CONFIGURADO
- ❌ Autenticación: NECESARIA

## 🚀 MÉTODOS DE AUTENTICACIÓN

### Método 1: Autenticación Personal (Recomendado)

#### Paso 1: Abrir navegador y autenticar
```bash
# Ejecutar este comando en tu terminal local
cd /path/to/KELEDON/scripts
export PATH="/c/Users/TuyoIsaza/google-cloud-sdk/bin:$PATH"
export CLOUDSDK_PYTHON="/c/Python314/python"
gcloud auth login
```

Esto abrirá tu navegador:
1. **Inicia sesión** con tu cuenta de Google
2. **Selecciona el proyecto**: `keledon` (ID: 1062969561553)
3. **Otorga permisos** necesarios

#### Paso 2: Configurar proyecto
```bash
gcloud config set project keledon
```

#### Paso 3: Verificar autenticación
```bash
gcloud auth list
gcloud config list
```

### Método 2: Service Account (Para Producción)

#### Paso 1: Crear Service Account en Google Cloud Console
1. Ir a: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Proyecto: `keledon`
3. Crear nuevo service account:
   - Nombre: `keledon-deployer`
   - Rol: `Cloud Run Admin` + `Cloud Build Admin`

#### Paso 2: Descargar clave JSON
1. Crear y descargar clave JSON
2. Guardar como: `service-account-key.json`

#### Paso 3: Autenticar con Service Account
```bash
gcloud auth activate-service-account --key-file=service-account-key.json
gcloud config set project keledon
```

## 🎯 EJECUTAR DESPLIEGUE

Una vez autenticado, ejecutar:

```bash
# En tu terminal local
cd /path/to/KELEDON/scripts
chmod +x deploy-all.sh
./deploy-all.sh

# O con región específica
./deploy-all.sh us-west1
```

## ⚡ COMANDOS RÁPIDOS

### Para testing local (Windows PowerShell):
```powershell
cd C:\Keldon\scripts
$env:PATH = "C:\Users\TuyoIsaza\google-cloud-sdk\bin;" + $env:PATH
$env:CLOUDSDK_PYTHON = "C:\Python314\python"
gcloud auth login
```

### Para producción:
```bash
# Después de autenticación
cd scripts
./deploy-all.sh us-central1
```

## 🔍 VERIFICAR ANTES DE DESPLEGAR

Ejecuta estos comandos para verificar:

```bash
# 1. Verificar autenticación
gcloud auth list

# 2. Verificar proyecto
gcloud config get-value project

# 3. Verificar APIs habilitadas
gcloud services list --enabled | grep -E "(run|cloudbuild|artifactregistry)"

# 4. Verificar permisos
gcloud projects get-iam-policy keledon
```

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problema: "No credentialed accounts"
```bash
# Solución 1: Reautenticar
gcloud auth login

# Solución 2: Limpiar y reautenticar
gcloud auth revoke --all
gcloud auth login

# Solución 3: Usar service account
gcloud auth activate-service-account --key-file=service-account-key.json
```

### Problema: "Project not found"
```bash
# Verificar project ID correcto
gcloud projects list

# Configurar proyecto correcto
gcloud config set project keledon
```

### Problema: "Insufficient permissions"
```bash
# Verificar permisos actuales
gcloud projects get-iam-policy keledon

# Asegurar tener estos roles:
# - Cloud Run Admin
# - Cloud Build Admin  
# - Artifact Registry Admin
# - Service Account User
```

## 🎪 ALTERNATIVA: USAR GOOGLE CLOUD CONSOLE

Si la CLI tiene problemas, puedes:

1. Ir a: https://console.cloud.google.com/run
2. Proyecto: `keledon`
3. "Create Service" → "Container"
4. Subir manualmente los Dockerfiles

## 📋 PRÓXIMO PASO DESPUÉS DE AUTENTICACIÓN

Una vez autenticado, el despliegue tomará 10-15 minutos y generará:

- ✅ Backend: `https://keledon-cloud-xxxxx.a.run.app`
- ✅ Frontend: `https://keledon-landing-xxxxx.a.run.app`
- ✅ Documentación completa en `cloudconf.md`

---

## 🚀 ¿LISTO PARA DESPLEGAR?

Cuando estés autenticado, ejecuta:

```bash
cd scripts
./deploy-all.sh
```

**KELEDON estará funcionando en producción en minutos! 🎉**
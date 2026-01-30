# 💰 KELEDON RECURSOS CONFIGURADOS Y COSTOS

## 📋 ANÁLISIS DE DEPENDENCIAS

### Backend (NestJS + TypeScript)
- **Framework**: NestJS 11.0.1
- **WebSocket**: Socket.io 4.8.3
- **Database**: Supabase 2.90.1
- **AI Providers**: 
  - Deepgram SDK 4.11.3
  - ElevenLabs 1.59.0
  - OpenAI 6.16.0
- **Speech**: Vosk 0.3.39 (local STT)

### Frontend (React + Vite)
- **Framework**: React 19.2.0 + Vite 7.2.4
- **UI**: Tailwind CSS 4.1.18
- **Routing**: React Router 7.12.0
- **Tables**: TanStack React Table 8.21.3
- **Icons**: Lucide React 0.562.0
- **Animations**: Framer Motion 12.26.2
- **WebSocket**: Socket.io Client 4.8.3

## 🏗️ RECURSOS DE CLOUD RUN CONFIGURADOS

### Backend Service (keledon-cloud)
```yaml
Resources:
  CPU: 1 vCPU
  Memory: 1 GiB
  Max Instances: 10
  Min Instances: 0
  Timeout: 300 segundos (5 minutos)
  Concurrency: 80 conexiones simultáneas
  Scaling: Serverless (pay-per-use)
```

### Frontend Service (keledon-landing)
```yaml
Resources:
  CPU: 1 vCPU
  Memory: 512 MiB
  Max Instances: 10
  Min Instances: 0
  Timeout: 60 segundos (1 minuto)
  Concurrency: 100 conexiones simultáneas
  Scaling: Serverless (pay-per-use)
```

## 💸 COSTOS GOOGLE CLOUD RUN

### Precios por GB-segundo (us-central1)
- **CPU**: $0.000024 por GB-segundo
- **Memory**: $0.0000025 por GB-segundo

### Costo Backend (1vCPU, 1GiB)
- **CPU**: $0.0864 por hora
- **Memory**: $0.009 por hora
- **Total por hora**: $0.0954
- **Por mes (720h)**: $68.69 (uso continuo)

### Costo Frontend (1vCPU, 512MiB)
- **CPU**: $0.0864 por hora
- **Memory**: $0.0045 por hora
- **Total por hora**: $0.0909
- **Por mes (720h)**: $65.45 (uso continuo)

### Costos Reales con Serverless
**Promedio de uso (10% del tiempo):**
- Backend: $6.87/mes
- Frontend: $6.55/mes
- **Total Cloud Run**: $13.42/mes

**Promedio de uso (50% del tiempo):**
- Backend: $34.35/mes
- Frontend: $32.73/mes
- **Total Cloud Run**: $67.08/mes

## 🤖 COSTOS PROVEEDORES IA (Configuración Actual)

### Speech-to-Text (STT) - Deepgram
- **Precio**: $0.0035 por minuto
- **Configurado**: Sí (deepgram/sdk 4.11.3)
- **Uso estimado**: 50-200 horas/mes
- **Costo mensual**: $10.50 - $42.00

### Text-to-Speech (TTS) - ElevenLabs
- **Precio**: $0.06 por minuto
- **Configurado**: Sí (elevenlabs 1.59.0)
- **Uso estimado**: 50-200 horas/mes
- **Costo mensual**: $180.00 - $720.00

### Large Language Model - OpenAI
- **Precio**: $0.03-0.06 por 1K tokens
- **Configurado**: Sí (openai 6.16.0)
- **Modelo**: GPT-4 / GPT-4o
- **Uso estimado**: 1M-5M tokens/mes
- **Costo mensual**: $30 - $300

## 💰 COSTO TOTAL ESTIMADO POR MES

### Escenario Bajo Uso (10% serverless)
```
Google Cloud Run:     $13.42
Deepgram (STT):      $10.50
ElevenLabs (TTS):   $180.00
OpenAI (LLM):       $30.00
TOTAL MENSUAL:       $233.92
```

### Escenario Medio Uso (50% serverless)
```
Google Cloud Run:     $67.08
Deepgram (STT):      $42.00
ElevenLabs (TTS):   $720.00
OpenAI (LLM):       $300.00
TOTAL MENSUAL:       $1,129.08
```

### Escenario Alto Uso (90% serverless)
```
Google Cloud Run:     $120.74
Deepgram (STT):      $75.60
ElevenLabs (TTS):   $1,296.00
OpenAI (LLM):       $540.00
TOTAL MENSUAL:       $2,032.34
```

## 🔧 RECOMENDACIONES DE OPTIMIZACIÓN

### 1. Cambiar Proveedor TTS a OpenAI
```
Actual: ElevenLabs $0.06/minuto
Recomendado: OpenAI TTS $0.03/minuto
Ahorro: 50% en costos de TTS
Nuevo costo: $90-360/mes (vs $180-720)
```

### 2. Optimizar Recursos de Cloud Run
```
Frontend: Reducir memory a 256MiB si funciona bien
Backend: Usar 0.5 vCPU si el procesamiento lo permite
Ahorro estimado: 25-40% en Cloud Run
```

### 3. Configurar Mínimos de Instancias
```
Backend: min-instances 1 (para evitar cold starts)
Frontend: min-instances 0 (escalar a 0 es OK)
```

### 4. Usar GPT-4 Mini para la mayoría de consultas
```
Costo: $0.0015/1K tokens (vs $0.03/1K tokens)
Ahorro: 95% en costos LLM
Calidad: Adecuada para la mayoría de casos
```

## 💡 CONFIGURACIÓN ÓPTIMA RECOMENDADA

### Proveedores IA
- **STT**: Deepgram ($0.0035/min) ✅ Mantener
- **TTS**: OpenAI ($0.03/min) ✅ Cambiar para ahorro
- **LLM**: OpenAI GPT-4 Mini ($0.0015/1K tokens) ✅ Cambiar

### Recursos Cloud Run
- **Backend**: 0.5 vCPU, 512MiB
- **Frontend**: 0.25 vCPU, 256MiB
- **Escalado**: min-instances 0, max-instances 20

### Costo Mensual Optimizado
```
Google Cloud Run:     $40.00
Deepgram (STT):      $20.00
OpenAI (TTS):       $90.00
OpenAI (LLM GPT-4 Mini): $15.00
TOTAL MENSUAL:       $165.00
```

## 🎯 CONCLUSIÓN

### Configuración Actual
- **Recursos configurados**: Serverless 1vCPU/1GiB (backend), 1vCPU/512MiB (frontend)
- **Costo mensual actual**: $234 - $2,032 (según uso)
- **Proveedores listos**: Deepgram + ElevenLabs + OpenAI

### Optimización Recomendada
- **Ahorro potencial**: 30-80% reduciendo costos a $165/mes
- **Rendimiento**: Similar o mejor para la mayoría de casos
- **Mantenimiento**: Sencillo con proveedores estándar

---

## 🚀 PASOS SIGUIENTES

1. **Habilitar billing**: https://console.cloud.google.com/billing/linkedaccount?project=keledon
2. **Ejecutar despliegue**: `cd C:\Keldon\scripts && .\deploy-production.ps1`
3. **Optimizar post-despliegue**: Cambiar a OpenAI TTS + GPT-4 Mini
4. **Configurar monitoreo**: Establecer alertas de costos

**KELEDON listo para producción con costos optimizados!** 💰
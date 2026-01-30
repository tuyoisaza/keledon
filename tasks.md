# 📋 KELEDON - Plan de Acción Basado en Análisis Product-Owner

## 🎯 **Prioridades Críticas (V1.0)**

### 1. **Hacer Visible el Estado del Agente** 
**Problema:** Usuario no sabe si el agente está funcionando
**Solución:**
- Indicadores visuales claros: `ready`, `listening`, `processing`, `error`
- Estado visible en Side Panel en tiempo real
- Historial de actividad reciente

### 2. **Implementar Loop de Agente Inteligente**
**Problema:** El agente no completa el ciclo escuchar→pensar→actuar
**Solución:**
- Conexión real con backend/cloud
- Sistema de eventos: `audio-input → brain → decision → action`
- Feedback al usuario de cada etapa del loop

### 3. **Procesamiento Inteligente de Transcripción**
**Problema:** Se muestra texto crudo, daña percepción de calidad
**Solución:**
- Formateo automático de transcripción
- Indicadores de confianza/confianza
- Opciones de editar/corregir

### 4. **Infraestructura para Múltiples Interfaces Futuras**
**Problema:** Arquitectura no preparada para integración con Genesys/Salesforce
**Solución:**
- Sistema de adapters/plug-ins
- Abstracción por proveedor (GenesysAdapter, SalesforceAdapter)
- Configuración por cliente

## 🚀 **Fases de Implementación**

### **Sprint 1: Estado Visible y Loop Básico**
- Status indicators funcionando
- Conexión WebSocket real con backend  
- Básico listen→process→speak
- 2 semanas

### **Sprint 2: Transcripción Inteligente**
- Procesamiento de texto de entrada
- Indicadores de confianza
- Modo debug vs. modo producción
- 1 semana

### **Sprint 3: Base para Flujos**
- Estructura de RPA executor
- Flujos predefinidos básicos
- Sistema de estado por flow
- 2 semanas

### **Backlog V1.5: Studio de Flujos**
- Interface grabación de flujos
- Generación automática de pasos
- Guardado/carga de flujos personalizados
- 3-4 semanas

## 🔍 **Validación Técnica**

### **Arquitectura Requerida:**
```
Side Panel ←→ Background Service ←→ Cloud Brain ←→ RPA Executor
     ↑                    ↑              ↑           ↑
  Estado Real        Loop          Decisión     Acciones
```

### **Contratos a Implementar:**
- `event.schema.json` - audio→brain events
- `command.schema.json` - brain→agent commands  
- `step.schema.json` - RPA flow steps
- `result.schema.json` - execution results

## 💡 **Decisiones Arquitectónicas**

### **Decision 1: Side Panel es Development Grande**
✅ **Correcto** - Requiere planificación explícita
- Estado distribuido
- Multi-tab synchronization
- Audio processing
- RPA control

### **Decision 2: Validar Antes de Construir**
✅ **Crítico** - Auditaremos el código existente contra estas hipótesis
- ¿Qué está implementado vs. qué se imaginó?
- Priorizar gaps vs. nuevas features
- Usar contrato como fuente de verdad

### **Decision 3: Abstracción por Proveedor**
⚠️ **Cuidadosa** - No toda abstracción es viable en browser
- **Viable:** GenesysAdapter, SalesforceAdapter (API calls)
- **No viable:** Playwright/Selenium drivers (security sandbox)

---

## 📝 **Próximos Pasos**

1. **Auditoría de Código:** Comparar cada hipótesis con implementación real
2. **Definir MVP:** Versión mínima que demuestre el loop completo  
3. **Plan de Sprints:** Desglosar en chunks desarrollables
4. ** Métricas:** Definir qué significa "éxito" para cada componente

---
**Este documento evolucionará con el desarrollo real.** 🚀

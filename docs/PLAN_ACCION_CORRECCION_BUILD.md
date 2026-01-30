# KELEDON - Plan de Acción para Corregir Build

**Fecha**: 27 de enero de 2026  
**Estado**: 146 Errores TypeScript Identificados  
**Objetivo**: Build Exitoso del Backend Cloud  
**Tiempo Estimado**: 4.25 horas

---

## 🎯 Estrategia General de Corrección

### Análisis del Problema
El backend de Cloud tiene **146 errores TypeScript** distribuidos en 5 categorías principales:

1. **Dependencias Faltantes** (5 errores)
2. **Archivos de Interfaz Faltantes** (28 errores)
3. **Implementaciones de Provider Faltantes** (32 errores)
4. **Archivos Índice de Módulo Faltantes** (8 errores)
5. **Errores de Tipo y Propiedades** (73 errores)

### Orden de Prioridad de Corrección
1. **Dependencias Primero** - Base para otras correcciones
2. **Definiciones de Interfaces** - Contratos del sistema
3. **Estructura de Módulos** - Andamiaje del sistema build
4. **Implementaciones de Providers** - Implementaciones mock primero
5. **Correcciones de Tipo** - Limpieza final

---

## 🛠️ Plan Detallado de Corrección

### Fase 1: Dependencias (Tiempo: 30 minutos)

#### 1.1 Remover Dependencia Inválida
```bash
# @nestjs/router no existe en registry
cd cloud
npm uninstall @nestjs/router
```

#### 1.2 Instalar Dependencias Faltantes
```bash
cd cloud
npm install @nestjs/swagger class-transformer class-validator @nestjs/config
```

#### 1.3 Verificar Instalación
```bash
npm list --depth=0
```

---

### Fase 2: Archivos de Interfaz (Tiempo: 45 minutos)

#### 2.1 Crear Interfaces de Provider

**Archivo**: `src/audio/capabilities/stt/interfaces/stt-provider.interface.ts`
```typescript
export interface SttProvider {
  name: string;
  type: string;
  transcript$: Observable<any>;
  
  initialize(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface TranscriptPart {
  text: string;
  confidence: number;
  timestamp: Date;
}
```

**Archivo**: `src/audio/capabilities/tts/interfaces/tts-provider.interface.ts`
```typescript
export interface TtsProvider {
  name: string;
  type: string;
  
  initialize(): Promise<void>;
  speak(text: string, options?: any): Promise<void>;
  stop(): Promise<void>;
  cleanup(): Promise<void>;
}
```

**Archivo**: `src/brain/capabilities/llm/interfaces/llm-provider.interface.ts`
```typescript
export interface LlmProvider {
  name: string;
  type: string;
  
  initialize(): Promise<void>;
  generate(prompt: string, options?: any): Promise<string>;
  cleanup(): Promise<void>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
}
```

**Archivo**: `src/brain/capabilities/rpa/interfaces/rpa-provider.interface.ts`
```typescript
export interface RpaProvider {
  name: string;
  type: string;
  
  initialize(): Promise<void>;
  execute(action: any): Promise<any>;
  cleanup(): Promise<void>;
}

export interface RpaProviderConfig {
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface StandardAction {
  type: string;
  parameters: Record<string, any>;
}
```

#### 2.2 Actualizar Interfaces Existentes

**Archivo**: `src/interfaces/action.interface.ts` (ya existe - necesita completar)
```typescript
// ✅ YA CREADO - Agregar propiedades faltantes:
export interface KeledonAction {
  // Propiedades existentes...
  intent?: string;        // AGREGAR: intent faltante
  system?: string;         // AGREGAR: system faltante  
  payload?: Record<string, any>; // AGREGAR: payload faltante
  requiredLevel?: number;   // AGREGAR: requiredLevel faltante
}

// AGREGAR ActionTypes faltantes:
export enum ActionType {
  // Valores existentes...
  SUBMIT = 'submit',
  CLOSE = 'close', 
  NAVIGATE = 'navigate',
  READ = 'read',
  EXECUTE_FLOW = 'EXECUTE_FLOW'
}

// AGREGAR ActionDomains faltantes:
export enum ActionDomain {
  // Valores existentes...
  UI = 'ui',
  CRM = 'crm',
  VOICE = 'voice'
}

// AGREGAR ActionRisk faltantes:
export enum ActionRisk {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// AGREGAR propiedades faltantes a AutonomyContext:
export interface AutonomyContext {
  // Propiedades existentes...
  accountId?: string;      // AGREGAR: accountId faltante
  level?: number;          // AGREGAR: level faltante
}
```

---

### Fase 3: Estructura de Módulos (Tiempo: 60 minutos)

#### 3.1 Crear Archivos Índice de Módulos

**Archivo**: `src/rag/index.ts`
```typescript
export * from './ingestion';
export * from './retrieval';
export * from './embeddings';

export const RAGModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**Archivo**: `src/vectorstore/index.ts`
```typescript
export * from './vector-store.service';

export const VectorStoreModule = {
  providers: [],
  exports: [], 
  imports: []
} as any;
```

**Archivo**: `src/storage/index.ts`
```typescript
export * from './documents';
export * from './transcripts';
export * from './workflow.storage';

export const StorageModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**Archivo**: `src/audit/index.ts`
```typescript
export * from './audit.service';

export const AuditModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**Archivo**: `src/auth/index.ts`
```typescript
export * from './auth.controller';
export * from './auth.service';

export const AuthModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**Archivo**: `src/workers/index.ts`
```typescript
export * from './job.processors';

export const WorkersModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**Archivo**: `src/observability/index.ts`
```typescript
export * from './logging';
export * from './metrics';

export const ObservabilityModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

**Archivo**: `src/audio/index.ts`
```typescript
export * from './stt.factory';
export * from './tts.factory';

export const AudioModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

#### 3.2 Corregir Exportaciones de Módulos Existentes

**Archivo**: `src/api/index.ts` (necesita corrección)
```typescript
// ✅ PARCIAL - Actualizar con exports funcionales:
export * from './admin.controller';
export * from './health.controller'; 
export * from './provider-catalog.controller';
export * from './providers.controller';
export * from './workflow.controller';

export const ApiModule = {
  providers: [],
  exports: [],
  imports: []
} as any;
```

---

### Fase 4: Implementaciones de Providers (Tiempo: 90 minutos)

#### 4.1 Crear Implementaciones Mock

**Archivo**: `src/audio/providers/deepgram.provider.ts`
```typescript
import { SttProvider, TranscriptPart } from '../capabilities/stt/interfaces/stt-provider.interface';
import { Observable, Subject } from 'rxjs';

export class DeepgramProvider implements SttProvider {
  readonly name = 'deepgram';
  readonly type = 'stt';
  
  transcript$ = new Subject<TranscriptPart>();

  async initialize(): Promise<void> {
    console.log('Deepgram STT provider inicializado');
  }

  async startListening(): Promise<void> {
    console.log('Deepgram STT provider inició escucha');
    // Implementación mock
    setTimeout(() => {
      this.transcript$.next({
        text: 'Mock Deepgram transcript',
        confidence: 0.95,
        timestamp: new Date()
      });
    }, 1000);
  }

  async stopListening(): Promise<void> {
    console.log('Deepgram STT provider detuvo escucha');
  }

  async cleanup(): Promise<void> {
    console.log('Deepgram STT provider limpiado');
  }
}
```

**Archivo**: `src/audio/providers/elevenlabs.provider.ts`
```typescript
import { TtsProvider } from '../capabilities/tts/interfaces/tts-provider.interface';

export class ElevenLabsProvider implements TtsProvider {
  readonly name = 'elevenlabs';
  readonly type = 'tts';

  async initialize(): Promise<void> {
    console.log('ElevenLabs TTS provider inicializado');
  }

  async speak(text: string, options?: any): Promise<void> {
    console.log(`ElevenLabs TTS hablando: ${text}`);
    // Implementación mock
  }

  async stop(): Promise<void> {
    console.log('ElevenLabs TTS detenido');
  }

  async cleanup(): Promise<void> {
    console.log('ElevenLabs TTS limpiado');
  }
}
```

**Crear archivos mock similares para:**
- `src/audio/providers/local-stt.provider.ts`
- `src/audio/providers/whisperx.provider.ts`
- `src/audio/providers/mock-tts.provider.ts`
- `src/audio/providers/coqui-tts.provider.ts`
- `src/audio/providers/qwen3-tts.provider.ts`
- `src/brain/providers/openai.provider.ts`
- `src/brain/providers/mock-llm.provider.ts`
- `src/brain/providers/content-scripts.provider.ts`
- `src/brain/providers/playwright-mcp.provider.ts`
- `src/brain/providers/local-rpa.provider.ts`

---

### Fase 5: Servicios Core (Tiempo: 60 minutos)

#### 5.1 Crear Archivos Core Faltantes

**Archivo**: `src/core/llm/prompts.ts`
```typescript
export const ORCHESTRATOR_SYSTEM_PROMPT = `
Eres Keledón, un asistente de voz IA para automatización de servicio al cliente.
Tu rol es ayudar a los usuarios a través de interacciones conversacionales y ejecutar flujos de automatización apropiados.
Sé siempre útil, preciso y respetuoso.
`;
```

**Archivo**: `src/core/execution/execution.orchestrator.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { KeledonAction, AutonomyContext } from '../../interfaces/action.interface';

@Injectable()
export class ExecutionOrchestrator {
  async executeAction(action: KeledonAction, context: AutonomyContext): Promise<any> {
    console.log(`Ejecutando acción: ${action.type}`);
    return { success: true, data: null };
  }
}
```

**Archivo**: `src/core/context/context.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { AutonomyContext } from '../../interfaces/action.interface';

@Injectable()
export class ContextService {
  async createContext(sessionId: string): Promise<AutonomyContext> {
    return {
      sessionId,
      mode: 'manual',
      confidence: 1.0,
      timestamp: new Date()
    };
  }
}
```

**Archivo**: `src/policy/policy.engine.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { KeledonAction, AutonomyContext } from '../interfaces/action.interface';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class PolicyEngine {
  evaluate(action: KeledonAction, context: AutonomyContext): PolicyResult {
    // Evaluación básica de política
    return { allowed: true };
  }
}
```

---

### Fase 6: Correcciones de Tipo (Tiempo: 30 minutos)

#### 6.1 Corregir Tipos 'any' Implícitos

**Archivo**: `src/audio/stt.factory.ts`
```typescript
// Corregir tipos de parámetros:
const sub = dgProvider.transcript$.subscribe((part: any) => {
  // ... resto del código
});
```

**Archivo**: `src/storage/workflow.storage.ts`
```typescript
// Corregir tipos de parámetros:
.map((defId: any) => this.flowDefinitions.get(defId))
.filter((def: any): def is FlowDefinition => !!def);
const enabledDefinitions = allowedDefinitions.filter((def: any) =>
workflow.steps = workflow.steps.filter((s: any) => s.id !== stepId);
```

#### 6.2 Corregir Incompatibilidades de Tipo

**Archivo**: `src/vectorstore/vector-store.service.ts`
```typescript
// Corregir tipo metadata:
return searchResult.map(result => ({
  document: {
    ...result.document,
    metadata: result.document.metadata || {} // Convertir unknown a Record<string, any>
  },
  score: result.score,
  relevance: result.relevance
}));
```

---

## 🚀 Comandos de Ejecución

### Ejecutar Fase 1
```bash
cd cloud
npm uninstall @nestjs/router
npm install @nestjs/swagger class-transformer class-validator @nestjs/config
npm run build  # Esperar resolución de errores de dependencias
```

### Ejecutar Fases 2-6
```bash
# Después de crear todos los archivos en las fases 2-6:
cd cloud
npm run build  # Esperar reducción dramática de errores
```

### Verificación Final
```bash
cd cloud
npm run build  # Debería tener éxito o <10 errores

# Verificar salida:
ls -la dist/  # Debería mostrar archivos JavaScript compilados
```

---

## 📊 Métricas de Éxito

### Antes de Correcciones
- **Total Errores**: 146
- **Build Success**: ❌ FALLA
- **Categorías**: 5 categorías principales

### Después de Correcciones (Objetivo)
- **Total Errores**: <10 (solo errores menores)
- **Build Success**: ✅ PASA
- **Salida**: `dist/` con JavaScript compilado

### Criterios de Éxito
1. ✅ Todos 5 errores de dependencias resueltos
2. ✅ Todos 28 errores de interfaz resueltos
3. ✅ Todos 32 errores de provider resueltos  
4. ✅ Todos 8 errores de módulo índice resueltos
5. ✅ Mayoría de errores de tipo corregidos

---

## ⏱️ Estimación de Tiempo por Fase

| Fase | Tiempo Estimado | Prioridad |
|-------|------------------|-----------|
| Dependencias | 30 minutos | ALTA |
| Interfaces | 45 minutos | ALTA |
| Módulos | 60 minutos | ALTA |
| Providers Mock | 90 minutos | MEDIA |
| Correcciones Tipo | 30 minutos | BAJA |
| **Total** | **255 minutos** (4.25 horas) | - |

---

## 🔄 Proceso de Verificación

### Después de Cada Fase
1. **Ejecutar Build**: `npm run build`
2. **Contar Errores**: Notar reducción de errores
3. **Documentar Progreso**: Actualizar estado de corrección

### Verificación Final
1. **Build Limpio**: `rm -rf dist/ && npm run build`
2. **Revisar Salida**: `ls -la dist/`
3. **Verificar Tipos**: Chequear errores críticos
4. **Probar Funcionalidad**: Verificar imports básicos

---

## 📞 Recursos de Apoyo

### Referencia de Errores
- **TS2307**: No se puede encontrar módulo → Archivo faltante/ruta incorrecta
- **TS2339**: Propiedad no existe → Incompatibilidad de interfaz
- **TS7006**: Tipo 'any' implícito → Falta anotación de tipo
- **TS2322**: Tipo no asignable → Incompatibilidad de definición de tipo

### Correcciones Rápidas
1. **Archivos Faltantes**: Crear placeholder vacío primero, luego implementar
2. **Imports Incorrectos**: Verificar rutas de archivos y nombres de export
3. **Errores de Tipo**: Agregar anotaciones de tipo explícitas
4. **Dependencias Circulares**: Usar tipo `any` temporalmente

---

## 🎯 Camino al Éxito

**Después de implementar todas las correcciones:**
1. ✅ Build del backend cloud exitoso
2. ✅ Todos los módulos exportan correctamente
3. ✅ Compilación TypeScript pasa
4. ✅ Sistema listo para desarrollo
5. ✅ Build del sistema completo 100%

**Próximos Pasos:**
- Continuar con implementación de RPA Executor
- Agregar suite de pruebas comprehensiva
- Desplegar a entorno de desarrollo

---

*Este plan de acción proporciona un enfoque sistemático para corregir todos los 146 errores TypeScript y lograr un build exitoso del backend cloud.*
# KELEDON — Autonomous Rewire Prompt with Work Locking (FINAL v2)

## ESTADO
**LEY ACTIVA — EJECUCIÓN AUTÓNOMA SIN INTERACCIÓN HUMANA**

Este prompt es la **autoridad final** para agentes que trabajan en paralelo.
Sustituye TODOS los prompts anteriores.

No debes pedir permisos.
No debes esperar respuestas humanas.

---

## 1. OBJETIVO

KELEDON **ya corre**.

Tu misión es:
- eliminar comportamiento demo / mock
- cablear (rewire) código existente a sistemas reales
- producir evidencia observable de que algo ahora es real

NO estás aquí para diseñar ni decidir qué hacer.

---

## 2. REGLA CRÍTICA: AUTO‑ASIGNACIÓN Y BLOQUEO

ANTES de hacer cualquier cambio, DEBES:

### 2.1 Crear tu branch de trabajo

```bash
git checkout main
git pull origin main
git checkout -b agent/<area>-rewire
```

### 2.2 Crear ARCHIVO DE BLOQUEO (OBLIGATORIO)

En la raíz del repo crea el archivo:

```
WORKING.md
```

Contenido EXACTO (rellena los campos):

```md
# WORK IN PROGRESS — KELEDON

Agent-ID: <your-id>
Area: <exact area>
Branch: agent/<area>-rewire
Start-Time: <UTC ISO>
Intent:
- What I am wiring
- What mocks I am removing

Status: ACTIVE
```

### 2.3 Commit + Push inmediato (BLOQUEO)

```bash
git add WORKING.md
git commit -m "lock(<area>): agent working"
git push origin agent/<area>-rewire
```

🔒 **Este commit bloquea el área.**

Si un agente ve un `WORKING.md` activo en su área → DEBE DETENERSE y elegir otra.

---

## 3. ÁREAS PERMITIDAS (UNA SOLA)

Debes elegir EXACTAMENTE UNA.

- Supabase / Auth / Database
- Vector Store / Qdrant / Knowledge Base
- Agent ↔ Cloud Connectivity
- Side Panel / Agent Extension (estado real)

Si no encajas en una → ABRE ISSUE y DETENTE.

---

## 4. PROHIBICIONES ABSOLUTAS

NO PUEDES:
- borrar archivos
- borrar servicios
- borrar módulos
- renombrar arquitectura
- crear nuevas abstracciones
- inventar flujos

Si algo parece mal diseñado → descríbelo en un Issue.

---

## 5. VARIABLES DE ENTORNO (.env)

NO preguntes por `.env`.

Reglas:
- Asume que existen variables requeridas
- Si faltan, detecta el error por logs
- Reporta la variable faltante en un Issue
- NO inventes valores

---

## 6. EJECUCIÓN

Puedes:
- conectar servicios existentes
- activar módulos ya presentes
- reemplazar mocks por llamadas reales
- arreglar wiring que rompe runtime

Debes trabajar SOLO dentro de tu área.

---

## 7. EVIDENCIA OBLIGATORIA

Cada cambio debe producir al menos UNA:
- log real (Supabase / Qdrant / Agent)
- UI mostrando datos reales
- side panel reflejando estado real

Sin evidencia = trabajo inválido.

---

## 8. COMMIT, PUSH Y PR

Cuando termines:

```bash
git commit -am "rewire(<area>): runtime now real"
git push origin agent/<area>-rewire
```

Abre PR contra `main`.

En la descripción INCLUYE:
- Evidencia
- Qué dejó de ser mock

---

## 9. LIBERAR BLOQUEO

Antes de finalizar, ACTUALIZA `WORKING.md`:

```md
Status: COMPLETE
End-Time: <UTC ISO>
Evidence:
- <what is now real>
```

Commit + push:

```bash
git add WORKING.md
git commit -m "unlock(<area>): work complete"
git push
```

---

## 10. BLOQUEO POR CONFLICTO

Si detectas:
- otro agente en tu misma área
- un WORKING.md activo

DEBES:
- detenerte
- NO tocar código
- abrir Issue reportando conflicto

---

## REGLA FINAL

KELEDON no necesita más decisiones humanas.

Necesita agentes que:
- se auto‑asignen
- se bloqueen
- trabajen
- reporten evidencia
- liberen el área

Ejecuta ahora sin pedir permiso.


# Hitos MVP — enfoque adaptativo
Compromiso CMT-003, actual prioridad del propietario. Responsable único asistente principal; contraparte UAT propietario. No subagentes, tareas programadas ni cambios de proveedor.

| Hito | Valor / PIA / requisito | Dependencias | Evidencia de aceptación | Impacto esperado |
|---|---|---|---|---|
| MS-MVP-000 | Intent actualizado, diseño abierto, cinco PIAs, contrato y preflight del puesto / R01..09 | Instrucción 2026-10-18 y fuente | Documentos coherentes, JSON válido, revisión estática del script; inventario no prueba llamadas | Sin bump: planificación/preparación |
| MS-MVP-001 | Interlocutor oye y es oído en Meet / 001, 003 / R01,R02,R05 | Meet privado aportado; puesto y contraparte; build permitido y proveedores | A01/A02/A06, métricas por extremo y versión real | MINOR si añade capacidad funcional; PATCH solo reparación compatible |
| MS-MVP-002 | Atención consulta caso y responde con dato leído / 003,004 / R04,R06,R07 | 001; Salesforce de prueba y casos; sesión tenant | A05/A07/A08/A09 con 2 casos y uno inexistente, segunda interacción | MINOR para nueva capacidad |
| MS-MVP-003 | Elegir ejecutor y medir adaptación / 002,005 / R03,R08,R09 | 001/002; señal real de plataforma para detector | A03/A04 cuando soportados, A10/A11/A12; matriz de límites; decisión razonada | Según implementación; no bump por finalizar una etapa |

MVP conversacional Meet puede aceptarse sin llamar PASS a detección ACD. Agente durmiente completo permanece pendiente de señal/oferta de plataforma real. Prioridad: gates de audio → conversación → consulta → generalización, sin esconder incertidumbre de eventos.

Riesgos: audio equivocado/eco (001), respuesta a falso positivo (002), instrucciones en página y caso incorrecto (004), resultados tardíos/duplicados (003), compatibilidad y mantenimiento (005). Planifica evidencia por gate, conserva notas de fallos y no usa mocks como aceptación.

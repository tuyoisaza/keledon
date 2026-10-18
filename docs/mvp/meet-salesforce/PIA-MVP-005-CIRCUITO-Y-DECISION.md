# PIA MVP-005 — circuito completo y decisión del ejecutor
Estado: NOT RUN; depende de 001/003/004; 002 conserva su aceptación específica de alertas. Requisitos MVP-R01..R09.

## Ejecución por hitos
1. MS-MVP-001: audio real en Meet, A01/A02 y un corte A06 en ambos candidatos viables; si uno carece de canal saliente soportado, se descarta de manera documentada sin fingir la comparación.
2. MS-MVP-002: conversación → consulta de caso ficticio en Salesforce → respuesta, A05–A09. Repetir segunda interacción tras cierre.
3. MS-MVP-003: evaluación del ejecutor y generalización, A10/A11/A12; fase posterior de oferta/aceptación de llamada real para A03/A04 (Genesys u otro entorno aportado). No bloquear el corte Meet por una señal que Meet no ofrece.

## Aceptación y decisión
Primero gates duros: el extremo remoto oye, se captura su voz, corte real al interrumpir, datos correctos y aislamiento. Un candidato que falla un gate no gana por facilidad de UI o menor código.
Después comparar latencia medida, intervenciones humanas, cambios por layout, memoria/CPU si observable, instalación/actualización, compatibilidad de login, permisos y recuperación. Registrar NOT MEASURED donde no haya medición; no poner números inventados.
A11: mismo objetivo/contrato ejecutado con adaptadores intercambiables, sin cambiar guion/Brain por marca de CRM/telefonía; evidencia de alcance y límites, sin afirmar compatibilidad con todos los clientes.

## Evidencia y publicación
Usar evidence-template.json para cada sesión, sin enlaces Meet, credenciales, transcripciones o identificadores reales. Confirmación humana en extremo remoto es evidencia admitida y debe etiquetarse; no fabricar grabación/medición automatizada.
Cada capacidad funcional integrada se entrega con versión según impacto, revisión de diff, PR, main verificado y UAT productivo. Este corte documental conserva versión 5.2.21. Instalador experimental debe tener fuente/tag verificables; versión web/API no demuestra la del ejecutable.
Reutilizar Cloud/identidad/RAG/roles validados. Arquitectura final OPEN hasta pruebas; no reescribir plataforma completa por una comparación no ejecutada.

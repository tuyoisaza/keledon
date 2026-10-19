# Speaches — reparación operativa autorizada

El propietario autorizó reparar reinicios/memoria, mantener proveedor, fijar diez
CPU/diez GB y desactivar serverless. No se inspeccionaron valores de secretos.

- Baseline observado: 3 CPU/3 GB, suspensión activada, límite de memoria alcanzado;
  hipótesis de presión de memoria, sin prueba concluyente de terminación OOM.
- Primer ajuste a 8 GB omitió CPU y Railway asignó 24; el readback lo detectó y se
  corrigió inmediatamente a 3 CPU/8 GB mientras el servicio estaba dormido.
- Instrucción posterior exacta: 10 CPU/10 GB/suspensión desactivada. La escritura
  fue confirmada y se redesplegó la misma imagen, despliegue f84c9099-0e93-4a19-a185-42f368c46858.
- Relectura de esta continuación: CPU 10 y memoria 10000000000 bytes, sin cambios
  pendientes; el despliegue anterior figuró SLEEPING. Por ello no se da por probada
  la permanencia despierta a partir de aquella escritura o de un Online inicial.
- Se reaplicaron explícitamente `sleepApplication:false`, `vCPUs:10`, `memoryGB:10`
  y el mismo build. Nuevo despliegue 07ad0766-f6f1-4a1e-9297-b53615f6ea05,
  creado 2026-10-19T20:39:18.303Z; SUCCESS a 20:39:25.025Z. Railway reportó
  Online, 1/1 réplicas, cero fallos recientes y sin trabajo pendiente.

Se conserva `ghcr.io/speaches-ai/speaches:0.9.0-rc.3-cpu`, una réplica y volumen
existente. La serialización de configuración omite el flag false; el conector
confirmó la escritura. La ausencia del flag no se usa como prueba independiente
de suspensión desactivada. Persistencia del estado despierto y funcionamiento STT
siguen separados: no se envió audio ni se ejecutó una prueba durante esta reparación.
No cambios de claves, proveedor, modelo, roles, cuentas o asignaciones.

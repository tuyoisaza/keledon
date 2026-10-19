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
- A los diez minutos, 07ad0766 volvió a SLEEPING. La API pública consultada con la
  sesión CLI ya existente confirmó de forma independiente `sleepApplication:false`.
  La escritura era real, pero ese contenedor no demostraba aplicar el ajuste.
- Se creó un despliegue nuevo con la operación documentada `serviceInstanceDeployV2`,
  sin cambiar fuente/imagen/proveedor: 0f48dadd-9238-4390-80c7-dbf8f1405779,
  creado 2026-10-19T20:50:38.470Z. La relectura directa confirmó SUCCESS y
  `sleepApplication:false`. Los límites siguen 10 CPU/10000000000 bytes.
  No se hizo login nuevo ni se leyeron/exportaron credenciales de la CLI.

Se conserva `ghcr.io/speaches-ai/speaches:0.9.0-rc.3-cpu`, una réplica y volumen
existente. La serialización del conector omite false; la consulta directa de
`serviceInstance.sleepApplication` ya verifica false, sin inferirlo de esa ausencia.
Se usa un despliegue nuevo desde la configuración vigente. Persistencia del estado
despierto y funcionamiento STT siguen separados: no se envió audio ni se ejecutó
una prueba durante esta reparación.
No cambios de claves, proveedor, modelo, roles, cuentas o asignaciones.

La comparación staged de los mismos valores creó un borrador vacío
86dec657-7c40-4f8d-8752-a07e912120fe (cero cambios). La herramienta rechazó su
cierre por falta de aprobación y confirmó que no hizo cambios. Se deja intacto;
no se usa otro transporte para eludir ese rechazo. No contiene ajustes pendientes.

[Railway: aplicación del ajuste al crear el contenedor](https://docs.railway.com/deployments/serverless)
y [operación oficial de despliegue](https://docs.railway.com/integrations/api/manage-services).

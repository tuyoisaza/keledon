# Sub-PIA CMT-003B — egress DNS/CIDR y CRM privado por tenant

Estado: PLAN READY / IMPLEMENTATION NOT STARTED · Prioridad: CMT-003, gate 2 · Baseline productivo KELEDON 5.2.10 en main `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; Railway Web/API SUCCESS. Los cortes 5.2.8–5.2.10 solo afectan el HTML/metadata público y localización 404; Browser egress source no cambia desde revalidación 5.2.6 (`e7257a7d0c66c8b34e6bbb7028c30be092f33102`). Revisión estática de fuente: 2026-10-17.

## Hallazgo y objetivo

La revisión actual de `browser/src/security-policy.ts` y `browser/src/tab-manager.ts` encontró allowlist de origen exacto aplicada a navegación y requests Electron, pero no validación de IP resuelta, pinning al socket ni defensa frente a DNS rebinding. Los handlers `will-redirect` y `onBeforeRequest` comparan orígenes; no son un broker de egress y no prueban a qué IP conecta Chromium. La política aprobada permite CRM en redes privadas configurados por el cliente, con validación y allowlist por tenant. Por eso un bloqueo general de RFC1918 rompería integraciones aprobadas; una allowlist de hostname por sí sola deja abierta SSRF por DNS y redirects. El componente seguro faltante es enforcement en el punto de conexión (broker/proxy con DNS validado y redirects revalidados), sujeto a confirmar compatibilidad de TLS/SNI y despliegue del Browser.

Aplicar una sola política de egress para cada paso Browser/API/Cloud que contacta destino configurado. La política conserva destinos privados solo cuando ese tenant autorizó hostname/puerto/esquema y CIDR/host privado exactos; no convierte el hostname permitido en permiso global de red.

## Contrato propuesto

1. Validar la URL al guardar configuración: solo `http`/`https`; host canonicalizado; puerto y path dentro del contrato del adaptador; sin userinfo/credenciales embebidas, IP literal no aprobada, fragmento ni esquema alternativo. Normalizar Unicode/IDNA, trailing dots y representación IPv4/IPv6 antes de comparar la allowlist.
2. Resolver A y AAAA en el momento de conexión y validar **cada** respuesta. Rechazar loopback, link-local, unspecified, multicast, broadcast, metadata/cloud control-plane y rangos reservados. RFC1918/ULA solo se admite dentro del CIDR/host explícito aprobado por owner y ligado al tenant; no admitir todo el rango privado por defecto. Si el DNS devuelve mezcla permitida/prohibida, rechazar toda la resolución.
3. Fijar la conexión al conjunto de IPs ya validado para esa solicitud (con validación TLS/SNI del hostname original), o hacer el fetch por un egress proxy que resuelva, valide y conecte en un límite de confianza equivalente. Revalidar toda nueva conexión; no validar DNS en un proceso y volver a resolver sin pin al conectar. Documentar comportamiento ante rotación DNS.
4. No seguir redirects automáticamente. Resolver y validar cada `Location` como destino nuevo contra allowlist de ese tenant, CIDR aprobado y límites de red; rechazar downgrade HTTPS→HTTP, cambio de puerto no autorizado, redirects a metadata/no permitidos y loops. No reenviar Authorization/cookies/credenciales a otro origen. Reaplicar límite de hops, bytes y timeout.
5. Aplicar la misma política a navegación, subrecursos, XHR/fetch, WebSocket (solo `wss` si el adaptador lo exige) y descargas en Browser; el modelo nunca puede ampliar host, CIDR, puerto ni acción. No aceptar `file:`, `ftp:`, `data:` u otros esquemas como destinos CRM.
6. Registrar por tenant la declaración y quién aprobó host/puerto/CIDR, fecha, vigencia y propósito; redactar paths/query sensibles y nunca registrar URL completa con token. Cambios de allowlist requieren autorización del admin/superadmin según política ya aprobada y quedan auditados.
7. Si la infraestructura Browser no permite pinning fiable o enforcement equivalente para **cada** socket/redirect, no habilitar el destino privado en Browser todavía. Mantener función cerrada hasta desplegar un proxy/guard correcto; no simular seguridad con chequeo previo de DNS.

## Casos de aceptación

| Caso | Resultado exigido | Canal/evidencia |
|---|---|---|
| NET-DNS-01 | DNS estable que resuelve dentro del CIDR exacto del tenant aprobado se conecta conservando TLS/SNI. | Producción con tenant y CRM sandbox sintéticos aprobados. |
| NET-REBIND-02 | DNS que alterna entre IP aprobada y loopback/link-local/metadata se rechaza antes de conectar en todos los intentos. | Producción; DNS/sandbox bajo control, sin consultar servicio metadata real. |
| NET-ADDR-03 | IPv4/IPv6 literal, esquema inválido, userinfo, IDNA/trailing-dot ambiguo o puerto fuera de allowlist se rechaza. | UI/API de configuración de tenant sintético y verificación de no persistencia insegura. |
| NET-REDIR-04 | Redirect a otro origen o IP privada no aprobada se valida como nuevo destino y se bloquea; no se reenvían credenciales. | Producción; servidor sandbox sintético y captura redacted de status/hops. |
| NET-TENANT-05 | CIDR aprobado por tenant A no habilita el mismo host/CIDR para tenant B. | Dos tenants sintéticos autorizados, con resultado allow/deny. |
| NET-PRIVATE-06 | CRM privado explícitamente permitido funciona solo para el tenant dueño y se rechaza tras revocar el permiso. | Producción con sandbox privado sintético y aprobación documentada del owner. |

## Invariantes, privacidad y límites

- No llamar redes privadas, destinos cloud metadata, CRM reales ni hosts tomados de navegación de cliente. Un endpoint privado solo se prueba si el owner entrega sandbox sintético y aprueba CIDR/host/puerto exactos.
- No hacer pruebas de aplicación locales; acceptance de red/Browser debe ocurrir en candidato desplegado con destinos sintéticos aislados y cleanup confirmado.
- Nunca retornar DNS/IP interna, query, credencial o URL privada en respuesta normal, diagnóstico, error al usuario ni logs accesibles al tenant. Evidencia solo identifica clase/rango redacted y resultado.
- El proxy/pinning debe cubrir el punto real que abre el socket; una validación que solo observa el DOM/API no cierra SSRF.
- Mantener el egress privado BLOCKED hasta que se despliegue el enforcement de conexión y pasen NET-DNS-01..06 en UAT productivo. La aceptación de un cliente real necesita su propia selección y autorización.
- Para seguir con aceptación de producción, cerrar PIA CMT-003C y proveer un DNS/CRM sandbox sintético controlado, hostname/puerto/CIDR exactos y aprobación del owner. Ningún host de cliente existente se reutiliza como fixture.

## Entregables y salida

Política versionada host/port/CIDR por tenant; resolvedor y conexión fijada o egress proxy; validación de redirects/cada conexión; aplicación uniforme al Browser; UI/API/auditoría de aprobación; límites de transferencia/timeouts; runbook y cleanup de UAT; evidencia de los seis casos. Mantener CMT-003B PARTIAL hasta que los casos privados positivos y SSRF negativos pasen en el candidato desplegado.

# Meet AudioPort experiment (Windows Chrome/Edge)

## Current v0.3.0 candidate — explicit Brain link

Open a dedicated meeting window from the production Brain Meet panel, click
**Conectar con Brain** in that child, explicitly authorize the selected team in
Brain, then click **Iniciar audio Brain** in Meet after joining. The exact
opener/child and origins are bound to a per-link session. Only ephemeral remote
PCM audio, generated TTS bytes and cancellation events cross windows. Credentials
stay in Brain; its same-origin API revalidates team authority on each request.
Stop releases owned resources; maximum two minutes/six turns. Reload the existing
extension after source changes. Host patterns/permissions are unchanged. This
is a source candidate until actual production conversation acceptance is recorded
in docs/meet-brain-5.6.0; historical transport acceptance does not prove STT/Brain.
The adapter makes no provider HTTP calls itself. Receiver audio is processed
in memory and explicitly sent to the configured STT via Brain; no persistent
recording. The older standalone sample controls remain available separately.

Historical v0.2.x transport documentation follows; its “no Brain bridge” statements
describe that earlier baseline, not the new opt-in link.

Implementation candidate, **not functionally accepted or selected as executor**.
Plain MV3 JavaScript: no local build, dependency installation, native driver,
microphone recording or Salesforce surrogate. The Meet adapter itself makes no
provider requests. The separately authorized production Brain companion exports
a fixed Spanish sample using the selected team's actual TTS. Load this directory
as an unpacked extension in a dedicated owner-controlled browser profile. Enable
it only for the coordinated Meet session. Reload Meet before joining so the
document-start hooks precede PeerConnection/getUserMedia creation.

Current owner-required location:
`C:\Users\tboar\OneDrive\Documentos\GitHub\KELEDON\experiments\meet-audio`.
Remove an extension loaded from the rejected auxiliary worktree before loading
this directory. Do not use the other copy for development or acceptance.

The included `transport-probe.wav` is an offline Windows speech-generated fixture,
not a recording or a Brain response. `prepare-transport-probe.ps1` documents its
generation from the installed OS voice, without playback or network. Select this
file in the experiment panel for the first real Meet transport trial. No local
application tests/build/lint were run to prepare this asset.

## What is implemented

- Explicit **Armar audio** creates a running renderer AudioContext. Until armed,
  getUserMedia retains native behavior. Arming replaces subsequent requested audio
  tracks with the generated stream; physical microphone is excluded. Native video
  constraints and permission errors are preserved. Do not enable the camera for
  this experiment. Real Meet retained its pre-arm microphone in v0.1.1/0.1.2,
  even after a mic toggle; a page reload also resets arm state.
- v0.1.3 adds explicit **Conectar salida** after arm: it replaces existing audio
  senders observed in this document with generated audio tracks and disables the
  previous physical tracks. It never touches video senders, other pages or Windows
  defaults. Meet's mic transmission control must be on for generated audio to
  leave the meeting; that does not mean the physical mic is part of the stream.
  On release these generated tracks stop; a physical microphone is never restored
  automatically. Reselect it explicitly only after the experiment.
- Remote RTCRtpReceiver audio is observed separately and mixed only for capture/VAD.
  `captureRemote()` returns an owned clone for later STT integration. No application
  audio, physical mic or TTS feeds this stream. Native Meet receiver tracks remain
  owned by Meet and are not stopped on release.
- `sendSpeech(ArrayBuffer, generation)` decodes actual audio into the generated
  outgoing stream, with ordered playback and a maximum 60-second queue. It does
  not connect to local speakers. UI accepts a spoken test audio file up to 8 MiB;
  it is read in memory, not uploaded or saved. This file is only a transport input,
  not proof of Brain/STT/script/RAG integration.
- Three roughly 40ms hot remote frames trigger cancellation (120ms accumulated
  RMS above 0.032); this is a heuristic, not verified speech classification or
  measured interruption latency. A notification may cause a false interruption.
- Manual/remote interruption stops and disconnects all active/scheduled sources,
  resets queue time, increments generation, and fences pending decodes. Audio
  producers must retain the original generation on every chunk; never relabel
  old chunks after cancellation. Release stops supplied output/capture clones,
  disconnects the graph and closes its context. Re-arming creates a new context.
- **Medir transporte** reads sanitized RTP byte/packet counters on explicit demand
  (five-second bound). Only senders whose tracks match this adapter's output are
  counted. A zero match is inconclusive if Meet cloned a supplied track. No SDP,
  addresses, device IDs or meeting URL are returned. Counters do not pass A01/A02.
- **Copiar logs** copies the current allowlisted state and last 80 diagnostic
  events. No raw console/error text, stacks, credentials, meeting URL, track/device
  labels, filenames, audio or transcript are collected. Clipboard failure is shown
  on the button. Version in copied diagnostics identifies the loaded candidate.

The MAIN-world Meet surface is an experimental in-page API, **not a privileged bridge**.
Meet page scripts can inspect it. Never supply credentials, tenant claims or
privileged commands through this object. It has no extension storage, external
messaging, arbitrary-site execution or privileged cross-origin network API.

## Spanish sample from the configured production TTS

v0.2.0 added `brain-tts-sample.js` for the exact production `/brain` page, with
explicit owner authorization for this authenticated-site access. Select the
authorized context in Brain and click **Generar y descargar muestra española**.
It sends only the fixed synthetic Spanish text and selected team ID using the
existing session. v0.2.1 uses the web's existing same-origin `/tts/speak` proxy;
the initial direct-public-API attempt failed, without an established root cause.
No provider configuration, privileges, secrets or server settings are changed.
Auth stays in the production page/API request; it is never sent to Meet, logs or
extension storage. No LLM call or remote-mic recording is performed by this tool.

The response must be audio, 44 bytes to 8 MiB, and the selected team must remain
unchanged before downloading. Requests have a 30-second timeout, reject redirects,
and display only sanitized stage/HTTP errors. The generated file is downloaded
for explicit selection in Meet, without local playback or automatic cross-site
relay. This manual step is not the STT→Brain/script/RAG→TTS conversation loop.

## Real acceptance still required

1. Owner loads extension and joins from the dedicated browser plus second device
   with headphones. Arm, then explicitly connect output if Meet cached its input.
   Panel track counts only show local
   observations; they do not prove transmission or intelligibility.
2. Remote speaks a fresh fictitious phrase; observe input, then integrate the
   returned remote stream with the authenticated production Brain's configured STT.
3. Send spoken audio with agent physical microphone excluded. **Only the remote
   participant's confirmation** can pass A02. No local playback substitutes.
4. Interrupt during speech three times; remote confirms silence and absence of
   delayed speech. Exercise manual stop, release, re-arm/rejoin and second turn.
5. Brain integration, script/knowledge, recovery and real Salesforce remain pending.

No raw audio or meeting URL should be committed. Remove the extension after the
session. On release/rejoin explicitly select the intended microphone in Meet;
this experiment does not change Windows defaults or silently restore a live mic.

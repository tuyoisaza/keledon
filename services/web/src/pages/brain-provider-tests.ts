import { apiFetch } from '@/lib/api-fetch';
import { brainChat, type Brand, type Company, type Team } from '@/lib/crud-api';
import type { Dispatch, SetStateAction } from 'react';
type ProviderTestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warn';

type CreateBrainProviderTestsScope = {
  selectedTeamId: string;
  testingLLM: boolean;
  setTestingLLM: Dispatch<SetStateAction<boolean>>;
  setLlmTestStatus: Dispatch<SetStateAction<ProviderTestStatus>>;
  selectedTeam: Team | undefined;
  addLog: (msg: string) => void;
  llmProvider: string | null;
  selectedCompany: Company | undefined;
  selectedBrand: Brand | undefined;
  testingTTS: boolean;
  setTestingTTS: Dispatch<SetStateAction<boolean>>;
  setTtsTestStatus: Dispatch<SetStateAction<ProviderTestStatus>>;
  ttsProvider: string | null;
  resolveBrainCloudConfig: () => Promise<{ apiBase: string; wsBase: string; }>;
  testingSTT: boolean;
  setTestingSTT: Dispatch<SetStateAction<boolean>>;
  setSttTestStatus: Dispatch<SetStateAction<ProviderTestStatus>>;
  sttProvider: string | null;
  appendSpeachesTranscriptionFields: (formData: FormData) => { language: "es" | "en"; model: string; };
};

export function createBrainProviderTests(scope: CreateBrainProviderTestsScope) {
function makeTestWavBlob(): Blob {
    const sampleRate = 16000;
    const durationSeconds = 0.5;
    const sampleCount = Math.floor(sampleRate * durationSeconds);
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++)
        view.setUint8(offset + i, value.charCodeAt(i));
    };
    writeString(0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, sampleCount * 2, true);
    for (let i = 0; i < sampleCount; i++) {
      const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.25;
      view.setInt16(
        44 + i * 2,
        Math.max(-1, Math.min(1, sample)) * 0x7fff,
        true,
      );
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

async function testLLMProvider() {
    if (!scope.selectedTeamId || scope.testingLLM) return;
    scope.setTestingLLM(true);
    scope.setLlmTestStatus("running");
    const testMsg = "Reply with exactly one word: WORKING";
    const tid = scope.selectedTeam?.id || scope.selectedTeamId || "(none)";
    scope.addLog(`[TEST] LLM: sending to ${scope.llmProvider || "?"} teamId=${tid}...`);
    try {
      const response = await brainChat({
        message: testMsg,
        history: [],
        companyId: scope.selectedCompany?.id,
        companyName: scope.selectedCompany?.name,
        brandId: scope.selectedBrand?.id,
        brandName: scope.selectedBrand?.name,
        teamId: tid,
        teamName: scope.selectedTeam?.name,
        language: "en",
      });
      const reply = (response.reply || "").trim();
      scope.addLog(
        `[TEST] LLM: response (${reply.length} chars): "${reply.substring(0, 120)}"`,
      );
      if (reply.toLowerCase().includes("working")) {
        scope.setLlmTestStatus("pass");
        scope.addLog(
          `[TEST] LLM: PASS ✅ reply contains "WORKING" - configured provider is responding`,
        );
      } else if (reply.startsWith("I understand")) {
        scope.setLlmTestStatus("fail");
        scope.addLog(
          `[TEST] LLM: FAIL ❌ fallback response detected - configured provider did not answer`,
        );
      } else {
        scope.setLlmTestStatus("warn");
        scope.addLog(`[TEST] LLM: WARN ⚠️ response received but unexpected content`);
      }
    } catch (err) {
      scope.setLlmTestStatus("fail");
      scope.addLog(
        `[TEST] LLM: FAIL ❌ ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      scope.setTestingLLM(false);
    }
  }

async function testTTSProvider() {
    if (!scope.selectedTeamId || scope.testingTTS) return;
    scope.setTestingTTS(true);
    scope.setTtsTestStatus("running");
    scope.addLog(`[TEST] TTS: testing ${scope.ttsProvider || "?"}...`);
    try {
      const { apiBase } = await scope.resolveBrainCloudConfig();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await apiFetch(`${apiBase}/tts/speak`, {
        method: "POST",
        body: JSON.stringify({
          text: "Hello, this is a TTS test.",
          teamId: scope.selectedTeamId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const blob = await res.blob();
        scope.addLog(`[TEST] TTS: HTTP ${res.status} blob=${blob.size} bytes`);
        if (blob.size > 200) {
          scope.setTtsTestStatus("pass");
          scope.addLog(`[TEST] TTS: PASS ✅ audio content received`);
        } else {
          scope.setTtsTestStatus("fail");
          scope.addLog(
            `[TEST] TTS: FAIL ❌ empty/small audio blob (${blob.size} bytes)`,
          );
        }
      } else {
        const text = await res.text().catch(() => "");
        scope.setTtsTestStatus("fail");
        scope.addLog(
          `[TEST] TTS: FAIL ❌ HTTP ${res.status}: ${text.substring(0, 300)}`,
        );
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        scope.setTtsTestStatus("fail");
        scope.addLog(`[TEST] TTS: FAIL ❌ timeout (30s) - server did not respond`);
      } else {
        scope.setTtsTestStatus("fail");
        scope.addLog(
          `[TEST] TTS: FAIL ❌ ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } finally {
      scope.setTestingTTS(false);
    }
  }

async function testSTTProvider() {
    if (!scope.selectedTeamId || scope.testingSTT) return;
    scope.setTestingSTT(true);
    scope.setSttTestStatus("running");
    scope.addLog(`[TEST] STT: testing ${scope.sttProvider || "?"}...`);
    try {
      if (scope.sttProvider === "vosk") {
        const { apiBase } = await scope.resolveBrainCloudConfig();
        const res = await apiFetch(`${apiBase}/listening-sessions`, {
          method: "POST",
          body: JSON.stringify({
            source: "brain-test",
            tabUrl: window.location.href,
            tabTitle: document.title,
          }),
        });
        if (res.ok) {
          await res.json();
          scope.setSttTestStatus("pass");
          scope.addLog('[TEST] STT: PASS ✅ Vosk session created');
        } else {
          const text = await res.text().catch(() => "");
          scope.setSttTestStatus("fail");
          scope.addLog(
            `[TEST] STT: FAIL ❌ Vosk session failed HTTP ${res.status}: ${text.substring(0, 300)}`,
          );
        }
      } else if (scope.sttProvider === "webspeech") {
        const SR =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        if (SR) {
          scope.setSttTestStatus("pass");
          scope.addLog(`[TEST] STT: PASS ✅ Web Speech API available`);
        } else {
          scope.setSttTestStatus("fail");
          scope.addLog(
            `[TEST] STT: FAIL ❌ Web Speech API not available in this browser`,
          );
        }
      } else if (scope.sttProvider === "speaches") {
        const formData = new FormData();
        formData.append("file", makeTestWavBlob(), "brain-stt-test.wav");
        const sttRequest = scope.appendSpeachesTranscriptionFields(formData);
        scope.addLog(
          `[TEST] STT: Speaches request lang=${sttRequest.language} model=${sttRequest.model}`,
        );
        const res = await apiFetch(
          `/api/teams/${scope.selectedTeamId}/speaches/transcriptions`,
          {
            method: "POST",
            body: formData,
          },
        );
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          scope.setSttTestStatus("pass");
          scope.addLog(
            `[TEST] STT: PASS ✅ Speaches proxy transcription OK (${(data.text || "").substring(0, 80) || "no speech text from synthetic test audio"})`,
          );
        } else {
          const txt = await res.text().catch(() => "");
          scope.setSttTestStatus("fail");
          scope.addLog(
            `[TEST] STT: FAIL ❌ Speaches proxy HTTP ${res.status}: ${txt.substring(0, 300)}`,
          );
        }
      } else if (scope.sttProvider) {
        scope.setSttTestStatus("warn");
        scope.addLog(`[TEST] STT: WARN ⚠️ no automated test for ${scope.sttProvider}`);
      } else {
        scope.setSttTestStatus("fail");
        scope.addLog(`[TEST] STT: FAIL ❌ no STT provider configured`);
      }
    } catch (err) {
      scope.setSttTestStatus("fail");
      scope.addLog(
        `[TEST] STT: FAIL ❌ ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      scope.setTestingSTT(false);
    }
  }

  return { testLLMProvider, testTTSProvider, testSTTProvider };
}

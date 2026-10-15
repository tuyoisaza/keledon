import { toast } from 'sonner';
import { brainChat, type BrainChatMessage } from '@/lib/crud-api';
import type { ChatLine } from './brain-types';
import type { User } from '@/context/AuthContext';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Brand, Company, Team } from '@/lib/crud-api';
import type { SpeechRecognitionLike } from './speech-recognition';

type CreateBrainChatActionsScope = {
  draft: string;
  addLog: (msg: string) => void;
  sending: boolean;
  configReady: boolean;
  isListening: boolean;
  recognitionRef: RefObject<SpeechRecognitionLike | null>;
  setIsListening: Dispatch<SetStateAction<boolean>>;
  messages: ChatLine[];
  setMessages: Dispatch<SetStateAction<ChatLine[]>>;
  setDraft: Dispatch<SetStateAction<string>>;
  setSending: Dispatch<SetStateAction<boolean>>;
  conversationModeRef: RefObject<boolean>;
  selectedCompany: Company | undefined;
  selectedBrand: Brand | undefined;
  selectedTeam: Team | undefined;
  user: User | null;
  autoSpeak: boolean;
  speakReply: (text: string, messageId: string) => Promise<void>;
  stopSpeaking: () => void;
};

export function createBrainChatActions(scope: CreateBrainChatActionsScope) {
async function handleSend(overrideText?: string) {
    const trimmed = (overrideText ?? scope.draft).trim();
    scope.addLog(
      'handleSend() trimmed="' +
        trimmed +
        '" sending=' +
        scope.sending +
        " configReady=" +
        scope.configReady +
        " override=" +
        (overrideText ? "yes" : "no"),
    );
    if (!trimmed || scope.sending) return;
    if (!scope.configReady) {
      toast.error("Select a company, brand, and team first");
      return;
    }

    // Stop listening before sending
    if (scope.isListening) {
      scope.recognitionRef.current?.stop();
      scope.setIsListening(false);
    }

    const userMessage: ChatLine = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory: BrainChatMessage[] = [...scope.messages, userMessage].map(
      (m) => ({
        role: m.role,
        content: m.content,
      }),
    );

    scope.setMessages((cur) => [...cur, userMessage]);
    scope.setDraft("");
    scope.setSending(true);

    const chatMessage = scope.conversationModeRef.current
      ? `VOICE MODE INSTRUCTION: Answer like a live phone conversation. Keep it brief: one short sentence unless I explicitly ask for detail. Do not explain your reasoning. User said:\n${trimmed}`
      : trimmed;

    try {
      const response = await brainChat({
        message: chatMessage,
        history: nextHistory.slice(-12),
        companyId: scope.selectedCompany?.id,
        companyName: scope.selectedCompany?.name,
        brandId: scope.selectedBrand?.id,
        brandName: scope.selectedBrand?.name,
        teamId: scope.selectedTeam?.id,
        teamName: scope.selectedTeam?.name,
        language: scope.user?.role ? "en" : undefined,
      });
      scope.addLog(
        "brainChat OK, replyLen=" +
          (response.reply?.length ?? 0) +
          " autoSpeak=" +
          scope.autoSpeak,
      );

      const replyId = `assistant-${Date.now()}`;
      scope.setMessages((cur) => [
        ...cur,
        {
          id: replyId,
          role: "assistant",
          content: response.reply,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (scope.autoSpeak) {
        void scope.speakReply(response.reply, replyId);
      }
    } catch (error) {
      scope.addLog(
        "brainChat ERROR: " +
          (error instanceof Error ? error.message : String(error)),
      );
      console.error("Brain chat failed", error);
      toast.error("Could not reach the Brain right now");
      scope.setMessages((cur) => [
        ...cur,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "I could not reach the Brain service. Check the cloud API and try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      scope.setSending(false);
    }
  }

function resetChat() {
    scope.stopSpeaking();
    scope.setMessages([
      {
        id: `brain-reset-${Date.now()}`,
        role: "assistant",
        content:
          "Brain context ready. Send me a message and I will answer as the selected company, brand, and team.",
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  return { handleSend, resetChat };
}

# KELEDON — Developer Reference

## Architecture Prime Law
**Cloud decides. Browser executes. Browser is BLIND — never decides.**

## LLM Provider Configuration
AI provider auto-selects from first key present:

| Priority | Env var | Default model |
|----------|---------|---------------|
| 1 | `ANTHROPIC_API_KEY` | `claude-sonnet-4-5` |
| 2 | `GOOGLE_AI_API_KEY` | `gemini-1.5-pro` |
| 3 | `OPENAI_API_KEY` | `gpt-4o` |
| 4 | `OLLAMA_URL` | `llama3` (from `OLLAMA_MODEL`) |

Set `LLM_PROVIDER=anthropic|google|openai|ollama` to force a specific provider.  
If no provider is configured, the cloud service fails loudly at startup.

Override the model per-provider with `ANTHROPIC_MODEL`, `GOOGLE_AI_MODEL`, `OPENAI_MODEL`, or `OLLAMA_MODEL`.

## TTS Provider Configuration
TTS auto-selects: ElevenLabs → OpenAI → mock.  
Force with `TTS_PROVIDER=elevenlabs|openai|mock`.

## Hard Guardrails
1. No decision logic in `browser/` — Cloud decides
2. Never modify `docs/specs/` without a governance Issue
3. All commit messages must start with `vX.X.X:` (e.g. `v0.2.5: fix ...`)
4. Never declare completion without a PR
5. Never simulate success — fail loudly

# Scoped TTS role matrix — 5.4.3

| Persona | Identity | Expected access |
| --- | --- | --- |
| Operator | Existing authenticated administrator | Explicit create/reuse/retire only; never TTS test subject |
| Synthetic platform superadmin | Newly generated .invalid user, no company/team, manifest-bound | /tts/speak selected approved team, <=250 chars; generic admin and other real teams denied |
| Synthetic ordinary user A | New user in synthetic Company Co A | Own team intersection; Company Co B denied |
| Synthetic ordinary user B | New user in synthetic Company Co B | Own team intersection; Company Co A denied |
| Anonymous | No bearer | /tts/speak 401 |
| Expired | Genuine five-second signed synthetic probe | /tts/speak 401 after expiry |
| Retired | Same genuine run session after audited retire | /tts/speak 401 |

Paired-device authentication code unchanged; no device credentials created by this bootstrap. Tenant/role claims checked against DB, never UI flags. Exact generated IDs and observed outcomes will be appended only after real production execution.

Final observed results: all listed denials and elevated selected-team sample PASS, retirement/reuse 401 PASS. Exact run IDs and artifact/remote acceptance in UAT_REPORT.md; no raw tokens or personal account details persisted.

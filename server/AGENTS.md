# server/AGENTS.md

## Module Context

Bun 런타임에서 실행되는 AI API 프록시 서버(server/index.ts). 브라우저는 이 서버를 거쳐서만 Anthropic/Google API를 호출한다 (Vite dev proxy: vite.config.ts:9-14, `/api` → `http://localhost:3002`).

## Tech Stack & Constraints

- `Bun.serve` 저수준 API만 사용한다 (server/index.ts:138) — Express 등 별도 프레임워크 없음.
- 외부 API 호출은 `fetch`만 사용한다 (server/index.ts:69, 101) — axios 등 추가 HTTP 클라이언트 의존성을 도입하지 않는다.

## Implementation Patterns

- AI 응답 텍스트를 다루는 순수 변환 로직은 `generator.ts`에 함수로 추가한다 (부수효과 없이, `Bun.serve` 핸들러와 분리 — server/generator.ts:1-2 주석 참고). 새 프로바이더의 재시도 로직은 `fallback.ts`의 `withModelFallback`을 재사용한다 (server/fallback.ts:3-20).
- 새 프로바이더 추가 시 `Provider` 타입(server/index.ts:57)과 `ENV_KEYS`(server/index.ts:59-62)에 함께 등록해야 `resolveApiKey`(server/index.ts:64-66)가 해당 프로바이더의 서버 키를 인식한다.

## Testing Strategy

- 테스트 명령: `bun run test` (server/**/*.test.ts는 vitest.config의 vite.config.ts:20 `include`에 포함됨).
- `generator.ts`/`fallback.ts` 같은 순수 함수만 단위 테스트 대상이다. `index.ts`의 `Bun.serve` 핸들러 자체는 테스트가 없다 — 새 응답 가공 로직은 핸들러에 직접 넣지 말고 순수 함수로 뽑아 `generator.ts`나 신규 모듈에 추가하고 테스트를 작성한다.

## Local Golden Rules

- **Security Boundary**: `resolveApiKey(provider, clientKey)` (server/index.ts:64-66)는 `clientKey || ENV_KEYS[provider] || null` 순서로 평가한다. 클라이언트가 보낸 키가 있으면 서버 `.env` 키보다 우선한다 — 이 우선순위를 바꾸거나, 어느 한쪽 경로에서 키 값을 응답 바디에 포함시키지 않는다.
- **Hard Constraint**: `SYSTEM_PROMPT`(server/index.ts:7-49)는 생성 코드에 import 금지, TypeScript 문법 금지, 마지막에 `render(<X />)` 호출을 강제한다. `react-live`의 `noInline` 모드(src/components/LivePreview.tsx:14)가 모듈 시스템 없이 문자열을 그대로 실행하기 때문이다. 이 프롬프트를 수정할 때는 `LivePreview.tsx`의 렌더링 방식과 반드시 함께 맞춘다.
- **Asymmetry**: Google 경로만 `withModelFallback`으로 여러 모델을 순차 시도한다(server/index.ts:5, 134-136). Anthropic 경로는 단일 모델 하드코딩(server/index.ts:68-96)이다. 의도된 차이이므로 "정리"하지 않는다.

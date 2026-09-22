# AGENTS.md

Root governance file for AI coding agents working in this repository.

## Operational Commands

- Package manager: `bun` only. Do not use `npm`, `yarn`, or `pnpm` — only `bun.lock` is committed.
- Install: `bun install`
- Run dev (API server + Vite frontend together): `bun run dev`
- Run only the API server (auto-restart on change): `bun run server`
- Build: `bun run build` (`tsc -b && vite build`)
- Lint: `bun run lint`
- Test: `bun run test` (runs `vitest run`). Do **not** run bare `bun test` — that invokes Bun's own native test runner, not Vitest, and will not correctly execute the project's tests, which import `describe`/`it`/`expect` from `'vitest'` (server/generator.test.ts:1).
- Test watch mode: `bun run test:watch`

## Golden Rules

### Immutable / Security Boundary

- `ANTHROPIC_API_KEY` and `GOOGLE_API_KEY` are read only from server-side `process.env` (server/index.ts:59-62) and must never be sent to the client. `/api/config` (server/index.ts:147-157) exposes only booleans (`envKeys.anthropic`, `envKeys.google`), never the key values. Do not add code that logs, echoes, or returns raw key values in any response body.
- A client-supplied key travels only in the `/api/generate` request body for that single call (src/hooks/useComponentGenerator.ts:26) and is never persisted (no localStorage/cookie write in src/App.tsx). Do not add persistence for the API key input.

### Hard Constraints

- `tsconfig.app.json:14` sets `verbatimModuleSyntax: true`. Type-only imports must use `import type { ... }` (see src/hooks/useComponentGenerator.ts:2). A plain `import { SomeType }` for a type-only symbol breaks the build.
- `tsconfig.app.json:23` sets `erasableSyntaxOnly: true`. Do not introduce TS `enum`, parameter properties, or namespaces — use string-literal union types instead (see `Provider` in src/types/index.ts:1).

### Test Boundary

- Only pure/stateless logic has unit tests: server/generator.ts (server/generator.test.ts), server/fallback.ts (server/fallback.test.ts), and src/components/PromptInput.tsx (src/components/PromptInput.test.tsx).
- server/index.ts (the `Bun.serve` handler — network calls, API key resolution), src/App.tsx, src/hooks/useComponentGenerator.ts, and src/components/LivePreview.tsx / ComponentCard.tsx / CodeView.tsx have no tests. When adding new logic in this area, extract it into a pure function (following the generator.ts/fallback.ts pattern) so it stays testable, rather than growing the untested `fetch` handler.

### Asymmetry

- The Google provider path retries across `GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash']` via `withModelFallback` (server/index.ts:5, 134-136; server/fallback.ts:3-20). The Anthropic path (`callAnthropic`, server/index.ts:68-96) calls a single hardcoded model with no fallback. This is intentional, not an oversight — do not "simplify" by removing Google's fallback, and if Anthropic gains multiple model options, reuse `withModelFallback` rather than writing new retry logic.

### Double Defense

- Missing-API-key is checked twice: client-side before the request is sent (src/App.tsx:34, blocks with an `alert`) and server-side on every request (server/index.ts:169-174, returns 400). The client check is UX only, not the security boundary — keep the server check even if the client check seems redundant.
- AI-generated code text is normalized in two sequential steps before being sent to the browser (server/index.ts:188): `stripCodeFences` removes stray markdown fences, then `ensureRenderCall` injects a `render(<X />)` call if the model omitted it (server/generator.ts:5-24). Both steps exist because `react-live`'s `noInline` mode (src/components/LivePreview.tsx:14) renders nothing and fails silently without a `render()` call, and fails to parse if fences remain. Do not remove either step independently.

## Project Context

프롬프트를 입력하면 AI가 React 컴포넌트를 즉시 생성하고, 실시간 미리보기와 코드를 제공하는 도구.

Tech stack: React 19, TypeScript, Vite, Bun (API proxy server), react-live, Vitest + Testing Library, ESLint (flat config) + typescript-eslint.

## Standards & References

- 설치·실행·기능 소개는 README.md 참고 (중복 작성하지 않음).
- 커밋 메시지: 한국어, `<type>: <요약>` 형식 (`chore:`, `feat:`, `fix:` 등). 저장소 관례는 `git log`로 확인.
- **Maintenance Policy**: 이 파일의 규칙이 실제 코드와 어긋난 것을 발견하면, 조용히 무시하지 말고 규칙 업데이트를 제안할 것.

## Context Map

- **[API 프록시 서버 작업](./server/AGENTS.md)** — server/ 하위 파일(API 키 처리, AI 프로바이더 호출, 생성 코드 후처리) 수정 시.

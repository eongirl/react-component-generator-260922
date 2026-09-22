---
name: create-pr
description: |
  현재 브랜치의 커밋된 변경사항을 분석해 base 브랜치(main/master) 대비 diff와 커밋 이력을 근거로 PR 제목·본문을 작성하고, references/pr-template.md 템플릿에 맞춰 채운 뒤 `gh pr create`로 PR을 발행한다.
  "PR 만들어줘", "PR 생성해줘", "풀리퀘 만들어줘", "create a PR", "open a pull request", "/create-pr" 같은 요청에 활성화한다.
  커밋되지 않은 변경사항이 남아 있으면 PR을 만들지 않고 먼저 커밋할 것을 안내한다 — 커밋 자체는 이 스킬의 책임이 아니다.
context: fork
allowed-tools: Read Glob Grep Bash
---

# create-pr: 브랜치 변경사항으로 GitHub PR 생성

현재 git 저장소의 현재 브랜치를 base 브랜치로 향하는 PR로 발행한다. 코드를 수정하지 않으므로 Read/Glob/Grep/Bash만으로 동작한다.

## 사전 확인

- `git rev-parse --is-inside-work-tree`로 git 저장소인지 확인한다. 아니면 사용자에게 알리고 종료한다.
- `gh auth status`로 GitHub 인증을 확인한다. 인증되어 있지 않으면 사용자에게 알리고 종료한다(로그인은 사용자 몫).
- `git status`로 uncommitted 변경사항(untracked 포함, `-uall` 금지)을 확인한다. 하나라도 있으면 **PR을 만들지 말고** 먼저 커밋하라고 안내한 뒤 종료한다.

## 절차

### 1. base 브랜치와 현재 브랜치 확정

- `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`으로 리포지토리 기본 브랜치를 확인한다. 실패하면 `main`, 없으면 `master` 순으로 로컬에 존재하는 브랜치를 사용한다.
- `git branch --show-current`으로 현재 브랜치를 확인한다. base 브랜치와 같으면 PR을 만들 수 없으므로 사용자에게 알리고 종료한다.

### 2. 변경 이력 분석

다음을 모두 확인해 PR 내용의 근거로 삼는다:

- `git log <base>..HEAD --oneline` — base 이후 커밋 목록.
- `git diff <base>...HEAD` — base에서 분기한 시점 기준 전체 변경 내용(마지막 커밋만 보지 않는다).
- 원격 추적 여부: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` (실패하면 아직 push되지 않은 브랜치).

### 3. 원격에 브랜치 반영

- 원격 추적 브랜치가 없으면 `git push -u origin <현재 브랜치>`로 push한다.
- 이미 추적 중이면 `git status`로 ahead 여부를 확인하고, ahead면 `git push`로 반영한다.

### 4. PR 본문 작성

- `references/pr-template.md`를 Read로 읽는다.
- 템플릿의 각 섹션을 2단계에서 파악한 실제 diff/커밋 내용으로 채운다. 채울 근거가 없는 섹션(`Notes` 등)은 통째로 생략한다 — 템플릿 placeholder를 그대로 남기지 않는다.
- 제목은 70자 이내로, 본문이 아니라 제목에서 "무엇을 바꿨는지"가 드러나게 간결히 쓴다.
- 현재 세션에 attribution 지침(예: `Generated with Claude Code` 푸터)이 있으면 본문 맨 끝에 그대로 포함한다. 없으면 추가하지 않는다.

### 5. PR 생성

- 본문은 줄바꿈이 포함되므로 heredoc으로 전달한다:

```bash
gh pr create --base <base 브랜치> --title "<제목>" --body "$(cat <<'EOF'
<채운 본문>
EOF
)"
```

- 이미 해당 브랜치로 열린 PR이 있으면(`gh pr view` 성공) 새로 만들지 말고 기존 PR URL을 사용자에게 알린다.

### 6. 결과 보고

- 생성된 PR URL을 사용자에게 보여준다. 그 외 부가 설명은 하지 않는다.

## 주의사항

- `--draft`, `--web` 등 사용자가 명시적으로 요청한 `gh pr create` 옵션은 그대로 반영한다.
- push, PR 생성 모두 공유 상태에 영향을 주는 행동이므로, 이미 활성화된 git 안전 수칙(force-push 금지, `--no-verify` 금지 등)을 동일하게 따른다.
- 리포지토리 루트에 `AGENTS.md`(없으면 `CLAUDE.md`)가 있고 PR 본문/커밋 컨벤션을 별도로 정의하면 그 지침을 이 스킬의 기본 형식보다 우선한다.

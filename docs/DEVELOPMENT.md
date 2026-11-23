# 개발·CI 안내

루트 디렉토리(`/Feed`)에서 `FeedCore`, `ArcaFeed`, `RuliFeed` 전체의 설치·검증·개발 서버·빌드·릴리즈를 수행하는 방법을 정리합니다.

## 요구 환경

- Node.js `^22.13.0 || >=24.0.0`
- npm `>=10.9.0`

## 의존성 설치

```bash
npm run install:all
```

`ArcaFeed`와 `RuliFeed` 각각에서 `npm ci`를 실행하며, 두 프로젝트의 `node_modules/@feed/core`가 `../FeedCore`로 자동 연결됩니다.

## 루트 검증·빌드 명령

```bash
npm run format            # 루트 + FeedCore + ArcaFeed + RuliFeed Prettier 포맷
npm run format:check      # 전체 포맷 검사
npm run lint              # FeedCore + ArcaFeed + RuliFeed ESLint 검사 (루트 eslint.config.js)
npm run typecheck         # FeedCore + ArcaFeed + RuliFeed TypeScript 타입 검증
npm test                  # FeedCore + ArcaFeed + RuliFeed 전체 테스트
npm run test:architecture # 아키텍처·순환 참조 회귀 검증
npm run test:performance  # 네트워크·저장·초기화 성능 회귀 검증
npm run dev               # ArcaFeed + RuliFeed 개발 빌드 (dist/*.dev.user.js)
npm run build             # ArcaFeed + RuliFeed 프로덕션 빌드 (dist/*.user.js)
npm run check             # format:check + lint + typecheck + test + build 일괄 실행
```

개별 패키지만 실행하려면 `:core`, `:arca`, `:ruli` 접미사 스크립트를 사용합니다.

```bash
npm run lint:core
npm run typecheck:core
npm run test:core
npm run build:arca
npm run build:ruli
npm run dev:live:arca
npm run dev:live:ruli
npm run dev:ui:arca
npm run dev:ui:ruli
```

## 루트 Webpack 설정과 빌드 산출물

Webpack 설정은 루트의 단일 [`webpack.config.js`](../webpack.config.js) 파일로 통합되어 있으며, 모든 빌드 결과물은 루트 `dist/`에 생성됩니다.

- `--mode development` (기본): `dist/ArcaFeed.dev.user.js`, `dist/RuliFeed.dev.user.js` 개발 번들 생성
- `--mode production`: `dist/ArcaFeed.user.js`, `dist/RuliFeed.user.js` 프로덕션 번들 생성

`--env APP=arcafeed` 또는 `--env APP=rulifeed`를 지정하면 특정 앱만 빌드하고, 생략하면 두 앱을 함께 빌드합니다.

## UI 미리보기

모달 UI는 `npm run dev:ui:arca` 또는 `npm run dev:ui:ruli` 실행 후 <http://127.0.0.1:4317>에서 반복 확인할 수 있습니다.
상세 사용법과 Playwright MCP 검사 절차는 [UI_TESTING.md](./UI_TESTING.md)를 참고하세요.

## 실시간 개발 (`dev:live`)

개발 중에는 `npm run dev:live:arca` 또는 `npm run dev:live:ruli`를 실행하고,
각 앱의 개발 로더(<http://127.0.0.1:3000/ArcaFeed.live.user.js> 또는 <http://127.0.0.1:3000/RuliFeed.live.user.js>)를 TamperMonkey·ViolentMonkey에 **한 번만 설치**합니다.
기존 정식/개발 스크립트는 끄고 live 로더만 켠 뒤 페이지를 새로고침하면 `src/`·`css/` 저장 후 약 1초 안에 탭이 자동 새로고침됩니다.

안드로이드 기기에서 확인하려면 각 앱 디렉토리에서 `npm run dev:live:mobile`을 실행합니다(`0.0.0.0:3000` 바인딩, eruda 포함).
특정 주소·포트는 `HOST=<PC 주소>`, `PORT=3001` 환경 변수로 지정합니다. 기본 로더는 `GM_xmlhttpRequest`를 사용하며 `@connect`에 접속할 PC 주소만 지정합니다.

## 저장소 검증

영속 데이터는 IndexedDB(`ArcaFeed` / `RuliFeed`, 버전 2)의 `settings`·`channelFilters`·`navigationSessions`·`resumeSessions`·`progress`·`lists`·`meta`에서 확인합니다.
`node ArcaFeed/tests/indexed-storage.test.mjs` 및 `node RuliFeed/tests/indexed-storage.test.mjs`는 실제 소스와 `fake-indexeddb`로 이전·롤백·선택적 로드·레코드별 병합·보관 한도·동시 준비와 커밋 대기를 검증합니다. 실제 브라우저 검증 절차는 [UI_TESTING.md](./UI_TESTING.md)를 참고하세요.

## ADB로 Rui Browser에서 확인 (RuliFeed)

연결된 기기에서 Rui Browser의 유저스크립트를 활성화한 뒤, 의존성을 포함한 개발 번들을 생성해 설치합니다.

```bash
npm run dev:ruli -- --env BUNDLE=true
python3 ../Soul/patches/adb_userscript.py dist/RuliFeed.dev.user.js
adb shell am start -a android.intent.action.VIEW -d https://m.ruliweb.com/community/board/300143 -p com.mycompany.app.soulbrowser.memoryfix
```

`BUNDLE=true`는 브라우저가 외부 `@require` 라이브러리를 따로 읽지 않아도 실행할 수 있도록 Swiper와 Toastify를 번들에 포함합니다.

## GitHub Actions

루트 [`.github/workflows/`](../.github/workflows)에 두 개의 워크플로가 정의되어 있습니다.

### 1. CI ([`ci.yml`](../.github/workflows/ci.yml))

- `main` 푸시, `main` 대상 PR, 수동 실행(`workflow_dispatch`) 시 동작합니다.
- `npm run install:all` 후 `format:check` → `lint` → `typecheck` → `test` → `build`를 순차 실행합니다.
- 빌드가 성공하면 루트 `dist/ArcaFeed.user.js`와 `dist/RuliFeed.user.js`를 아티팩트로 업로드합니다.

### 2. Release ([`release.yml`](../.github/workflows/release.yml))

- `main` 푸시 또는 수동 실행(`workflow_dispatch`) 시 동작합니다.
- 루트 `package.json` 버전(`v{version}`)이 기존 태그에 없으면 `npm run install:all` → `npm run check`로 두 유저스크립트를 검증·빌드한 뒤, 하나의 GitHub Release에 `dist/ArcaFeed.user.js`와 `dist/RuliFeed.user.js`를 함께 첨부해 배포합니다.

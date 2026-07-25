# ArcaFeed 프로젝트 가이드

> 이 문서는 현재 코드 구조와 유지보수 규칙을 설명하는 살아있는 문서입니다.
> 구조, 상태 스키마, 이벤트, 빌드 또는 의존성이 바뀌면 함께 갱신합니다.

최종 갱신: 2026-07-25

## 1. 프로젝트 개요

ArcaFeed는 아카라이브(`arca.live`) 게시글을 Shorts 형태로 연속 탐색할 수 있게
하는 TamperMonkey/ViolentMonkey 유저스크립트입니다.

- 패키지 버전: `2.5.0`
- 런타임: 브라우저 유저스크립트
- 개발 환경: Node.js 22.13+, npm 10.9+, TypeScript 5.9, Webpack 5
- 주요 런타임 의존성: jQuery, Swiper, Toastify
- 빌드 출력: `dist/ArcaFeed.user.js`

핵심 기능은 채널·게시글·스크랩·홈 페이지 감지, 게시글 목록 필터링, Swiper
탐색, 시리즈/스크랩 시리즈, 여러 채널을 합친 홈 시리즈, UI 설정 및 상태
복원입니다.

## 2. 디렉터리 구조

```text
ArcaFeed/
├── .github/workflows/
│   ├── ci.yml                    # PR/main 전체 품질 검사
│   └── release.yml               # v* 태그 검증 후 GitHub Release
├── css/                          # 기능별 스타일
├── scripts/
│   └── release.mjs              # 크로스플랫폼 수동 태그 릴리즈
├── src/
│   ├── index.ts                 # 브라우저 진입점
│   ├── core/
│   │   ├── events.ts            # 전체 이벤트 이름의 단일 소스
│   │   ├── event-bus.ts         # 타입 안전 Pub/Sub
│   │   ├── event.ts             # 이벤트별 Step 파이프라인
│   │   ├── step-runner.ts       # 순차/병렬 단계 실행기
│   │   └── index.ts             # ArcaFeed, 직렬 이벤트 큐
│   ├── feature/
│   │   ├── article/             # 목록 요청·링크·페이지 이동
│   │   ├── modal/               # 필터/UI/구독 설정 모달
│   │   ├── swiper/              # Swiper 생성과 이동
│   │   ├── filter-rules.ts      # DOM 비의존 필터 규칙
│   │   ├── filter.ts            # DOM 목록 추출과 필터 적용
│   │   ├── keyEvent.ts          # 키보드 입력
│   │   ├── series.ts            # 시리즈 DOM 처리
│   │   └── ui.ts                # 레이아웃/UI 설정
│   ├── types/                   # 도메인 타입
│   ├── utils/
│   │   ├── async.ts             # 제한 동시성 매핑
│   │   ├── fetch.ts             # 타임아웃·HTTP 오류 처리
│   │   ├── regex.ts             # URL 기반 라우트/ID 파서
│   │   └── url.ts               # 쿼리 병합
│   └── vault/
│       ├── schema.ts            # 저장 데이터 기본값·정규화
│       ├── repository.ts        # 안전한 localStorage 접근
│       ├── config.ts            # 직렬화·역직렬화
│       ├── store.ts             # 불변 AppState 저장소
│       └── index.ts             # 기능 계층용 VaultAdapter
├── tests/                        # Node 내장 test runner 단위 테스트
├── CHANGELOG.md                  # 사용자 관점 변경 기록
├── tsconfig.json                 # 제품 코드 타입 검사
├── tsconfig.test.json            # 테스트 타입 검사
└── webpack.config.*.js           # 개발/프로덕션 번들 설정
```

## 3. 실행 아키텍처

### 3.1 초기화

```text
src/index.ts
  → ArcaFeed 생성
  → VaultAdapter가 URL과 저장 상태 로드
  → 지원 라우트인지 판별
  → EventManager와 이벤트 핸들러 연결
  → init 이벤트 발행
```

`OTHER` 라우트에서는 기능 CSS와 이벤트를 초기화하지 않습니다. 생성자가 두 번
호출되어도 이벤트 핸들러를 중복 등록하지 않습니다.

### 3.2 이벤트 처리

`src/core/events.ts`의 `APP_EVENT_NAMES`가 이벤트 이름의 단일 소스입니다.
`AppEventName` 타입, `EventBus`, 이벤트-파이프라인 매핑이 이 목록을 공유하므로
오타나 누락을 타입 검사에서 잡습니다.

주요 이벤트:

| 이벤트                              | 역할                                  |
| ----------------------------------- | ------------------------------------- |
| `init`                              | 링크, 버튼, 키보드, UI, Swiper 초기화 |
| `toNextPage`, `toPrevPage`          | Swiper 이동                           |
| `renderNextPage`, `renderPrevPage`  | 선택된 게시글 URL로 이동              |
| `enableSeries`, `enableScrapSeries` | 시리즈 세션 생성                      |
| `showModal`, `closeModal`           | 설정 모달 수명 주기                   |
| `checkFilterModal`, `checkUIModal`  | 설정 저장·재적용                      |
| `checkSubscribeModal`               | 홈 시리즈 채널 저장·첫 피드 생성      |
| `toggleSwiper`                      | 채널별 Swiper 활성 상태 전환          |

모든 이벤트는 `ArcaFeed.eventQueue`에서 직렬 처리합니다. 실행 중 들어온 키 입력을
버리지 않으며, 한 이벤트가 실패해도 다음 이벤트를 계속 처리합니다.

### 3.3 StepRunner

`Step`은 단일 함수 또는 함수 배열입니다.

- Step 사이: 선언 순서대로 실행
- 같은 배열 안: `Promise.allSettled`로 모든 형제 작업 종료까지 대기
- 오류: 남은 Step을 중단하고 이벤트 큐에 전달
- 저장: 성공/실패와 관계없이 `finally`에서 `flushSave()`

서로 의존하는 작업은 반드시 별도 Step으로 나눕니다. 같은 배열에는 독립 작업만
넣습니다.

## 4. 상태와 영속화

`Store`는 읽기 전용 상태 스냅샷과 부분 패치를 사용합니다. `VaultAdapter`는
기능 코드가 사용하는 getter/setter와 배열 추가 같은 의도 기반 메서드를
제공합니다.

```typescript
interface AppState {
  href: HrefImpl;
  activeIndex: number;
  articleKey: string;
  articleList: string[];
  articleFilterConfig: ArticleFilterConfigImpl;
  seriesSource: 'none' | 'article' | 'scrap' | 'home';
  homeSeriesState: HomeSeriesState;
  searchQuery: string;
  lastActiveIndex: number;
  uiSettings: UISettings;
}
```

`VaultAdapter`는 빠른 연속 변경을 300ms 디바운스로 묶습니다. 페이지 이동이나
Step 완료 시에는 `flushSave()`로 즉시 기록하며 `activeIndex`도 별도 복원 키에
저장합니다. 동일한 상태 패치는 생략하고 배열은 복사·중복 제거 후 저장합니다.

### 4.1 저장 스키마

전역 키:

| 키                             | 내용                |
| ------------------------------ | ------------------- |
| `arcaFeed:articleFilterConfig` | 채널별 필터         |
| `arcaFeed:uiSettings`          | 전역 UI 설정        |
| `arcaFeed:recentArticleKeys`   | 최근 세션 캐시 목록 |

세션 키:

| 패턴                                    | 내용                   |
| --------------------------------------- | ---------------------- |
| `arcaFeed:{articleKey}:articleList`     | 탐색할 게시글 URL      |
| `arcaFeed:{articleKey}:seriesMode`      | 레거시 시리즈 호환 값  |
| `arcaFeed:{articleKey}:seriesSource`    | 시리즈 유형            |
| `arcaFeed:{articleKey}:homeSeriesState` | 홈 채널·커서·소진 상태 |
| `arcaFeed:{articleKey}:searchQuery`     | 전달할 검색 파라미터   |
| `arcaFeed:{articleKey}:lastActiveIndex` | 마지막 위치            |
| `arcaFeed:{articleKey}:lastAccess`      | 캐시 최근 접근 시각    |

`schema.ts`는 외부 입력인 localStorage를 `unknown`으로 취급합니다. 누락/손상된
JSON, 잘못된 불리언·배열·인덱스를 기본값으로 복구하고 문자열 배열을
trim/dedupe하며 콘텐츠 너비를 700~1400px로 제한합니다. 저장소 접근 실패는 기능
초기화를 중단시키지 않습니다.

### 4.2 도메인 설정

```typescript
interface ArticleFilterImpl {
  tab: string[];
  title: string[];
  disableSwiper: boolean;
  onlyBest: boolean;
}

interface UISettings {
  hideScrollbar: boolean;
  hideBlur: boolean;
  hideNavControl: boolean;
  hideArticleTitle: boolean;
  hideArticleAuthor: boolean;
  hideArticleTime: boolean;
  hideArticleView: boolean;
  lastModalTab: 'filter' | 'ui' | 'subscribe';
  hiddenChannels: string[];
  contentWidth: number;
}

interface HomeSeriesState {
  channels: string[];
  cursors: Record<string, number>;
  exhaustedChannels: string[];
}
```

## 5. URL과 게시글 목록

### 5.1 라우트 판별

라우트는 문자열 포함 여부가 아니라 `URL.pathname` 세그먼트로 판별합니다.
외부 호스트는 항상 `OTHER`입니다.

| 모드      | 경로                                |
| --------- | ----------------------------------- |
| `HOME`    | `/`                                 |
| `CHANNEL` | `/b/{channelId}`                    |
| `ARTICLE` | `/b/{channelId}/{numericArticleId}` |
| `SCRAP`   | `/u/scrap_list`                     |
| `OTHER`   | 나머지 경로/외부 호스트             |

게시글 비교에는 숫자 ID의 정확한 일치를 사용합니다. 쿼리는
`URLSearchParams`로 병합해 `?` 중복과 기존 파라미터 손실을 막습니다.

### 5.2 필터링

`filter-rules.ts`는 DOM과 분리된 순수 규칙 계층입니다.

- 탭 필터가 비어 있으면 모든 탭 허용
- 제목 필터가 비어 있으면 어떤 제목도 차단하지 않음
- 탭 필터와 제목 차단을 독립적으로 결합
- 공백 토큰 제거, 중복 제거
- 레거시 `노탭` 값을 이미지 유무 두 범주로 확장
- 일반/하이브리드/스크랩 목록에서 동일한 링크 정규화 적용

### 5.3 네트워크

`fetchUrl()`은 기본 8초 타임아웃, same-origin 자격 증명, HTTP `ok` 확인,
구조화된 `FetchUrlError`를 제공합니다.

목록 페이징은 다음 안전장치를 둡니다.

- 한 작업당 최대 10페이지
- 이미 방문한 페이지 URL 재방문 중단
- 기존 목록과 현재 배치의 URL 중복 제거
- 요청이 겹쳐도 정확히 유지되는 로더 참조 카운트
- 오류 시 사용자 토스트와 다음 동작 가능 상태 유지

홈 시리즈는 채널 요청을 최대 4개씩 병렬 처리합니다. 채널 하나가 실패해도 다른
결과를 유지하고, 병합 후 정확한 숫자 ID 기준으로 정렬·중복 제거합니다. 각
채널의 가장 오래 확인한 ID와 소진 여부는 세션에 저장합니다. 한 번의 연장에서는
채널당 한 페이지만 읽고, 필터 결과가 비어도 다음 스와이프에서 저장한 커서부터
이어가므로 긴 순차 요청으로 초기화를 막지 않습니다.

## 6. UI 수명 주기

동적 UI 초기화는 여러 번 호출되어도 결과가 하나만 남도록 설계합니다.

- 이벤트 핸들러는 네임스페이스로 기존 핸들러를 제거한 뒤 등록
- 버튼/모달/로더/리사이즈 핸들은 고유 ID 또는 클래스 사용
- 입력/버튼/링크, modifier, contenteditable, IME 조합, 키 반복 중에는 방향키
  탐색 무시
- 모달은 `role="dialog"`, 접근성 레이블, 포커스 트랩, Escape/배경 닫기,
  포커스 복원 제공
- 동적 시리즈 버튼은 실제 `button` 요소와 키보드 접근성 제공
- 드래그 리사이즈는 animation frame당 한 번만 레이아웃을 갱신
- 시리즈에서는 채널별 `disableSwiper`와 관계없이 탐색을 유지
- ArcaFeed CSS 선택자와 애니메이션 이름은 기능 범위로 한정

## 7. 빌드와 검증

### 7.1 명령

```bash
npm ci
npm run dev          # 개발 유저스크립트 1회 빌드
npm run dev:watch    # 개발 빌드 감시
npm run dev:mobile   # Eruda를 포함한 모바일 개발 빌드
npm run build        # dist/ArcaFeed.user.js
npm run check        # 아래 전체 품질 게이트
```

`npm run check` 순서:

1. Prettier 검사
2. ESLint
3. 제품 TypeScript 검사
4. 테스트 TypeScript 검사
5. Node 단위 테스트
6. 프로덕션 Webpack 빌드

CI는 Ubuntu 24.04 + Node.js 22.13에서 `npm ci`와 `npm run check`를
수행합니다. 개발 Webpack 설정은 Git 해시와 UTC 빌드 시간을 Node API로
계산하므로 셸 종류에 의존하지 않습니다. 기본 개발 빌드는 종료되며 감시는
명시적으로 선택합니다.

### 7.2 유저스크립트 외부 의존성

프로덕션 번들은 아래 고정 버전을 `@require`로 로드합니다.

| 라이브러리 | URL 버전                     |
| ---------- | ---------------------------- |
| jQuery     | `3.7.1`                      |
| Swiper     | `12.2.0`                     |
| Toastify   | `1.12.0`                     |
| Eruda      | `3.4.3` (모바일 개발 빌드만) |

### 7.3 릴리즈

`npm run release`는 다음을 확인한 뒤 `package.json` 버전의 태그를 원격에
푸시합니다.

1. 작업 트리가 깨끗한가
2. 현재 브랜치가 `main`인가
3. 현재 브랜치에 원격 upstream이 있는가
4. `fetch` 후 upstream과 ahead/behind가 모두 0인가
5. 같은 버전 태그가 로컬/원격에 없는가
6. `npm run check`가 통과하는가

`release.yml`은 `v*` 태그 푸시에서 실행됩니다. 태그 이름과 패키지 버전이
같고 태그 커밋이 `origin/main`에 포함되는지 확인한 뒤 `npm ci`와
`npm run check`를 다시 수행합니다. 이후 `dist/ArcaFeed.user.js`가 포함된
GitHub Release를 생성하거나 실패한 기존 실행을 재시도합니다.

## 8. 테스트 범위

현재 단위 테스트는 다음 핵심 계약을 검증합니다.

- 제목 전용/탭 전용/빈 토큰 필터 규칙
- 지원/비지원 URL과 정확한 게시글·채널 ID
- 쿼리 파라미터 병합
- 저장 스키마 기본값, 정규화, 범위 제한
- 레거시 다중 채널 홈 시리즈 마이그레이션
- 제한 동시성의 순서와 최대 동시 실행 수
- EventBus 구독 해제와 StepRunner 실행/실패/flush
- localStorage 오류 격리, 중복 쓰기 방지, 최근 캐시 정리
- 네트워크 성공, HTTP 오류, 타임아웃

실제 아카라이브 DOM과 유저스크립트 관리자까지 연결하는 브라우저 E2E는 아직
없으므로 호스트 마크업 변경은 라이브 페이지에서 별도 확인해야 합니다.

## 9. 유지보수 규칙

- 새 이벤트는 `APP_EVENT_NAMES`, `EventManager`, `wireEventBus()`를 함께
  갱신합니다.
- 독립 작업만 같은 Step 배열에 배치합니다.
- localStorage 필드를 추가하면 타입, 기본값, 정규화, 로드/저장, 테스트를 함께
  추가합니다.
- 사용자 입력, URL, 저장 데이터는 신뢰하지 말고 파싱 경계에서 정규화합니다.
- DOM 핸들러는 재초기화를 고려해 멱등적으로 작성합니다.
- 목록 비교는 URL 부분 문자열이 아니라 정규화된 경로나 정확한 ID를 사용합니다.
- 병렬 요청에는 상한, 부분 실패 처리, 결과 중복 제거를 둡니다.
- 변경 후 `npm run check`를 통과시키고 `CHANGELOG.md`를 갱신합니다.

## 10. 알려진 제한

- 실제 사이트 DOM 선택자는 아카라이브 마크업 변경의 영향을 받습니다.
- 일반/스크랩 목록 작업은 무한 요청을 막기 위해 최대 10페이지까지만
  탐색합니다. 홈 시리즈는 지연을 제한하기 위해 한 번에 채널당 한 페이지씩
  확장합니다.
- 라이브 사이트를 대상으로 하는 자동 브라우저 E2E/유저스크립트 설치 테스트는
  아직 없습니다.
- Swiper 초기화 직전의 원본 콘텐츠 재배치에서 짧은 시각적 깜빡임이 발생할 수
  있습니다.

## 11. 변경 이력

- 2026-07-25: 이벤트·상태·URL·네트워크·필터·홈 시리즈·UI·빌드/CI를 전면
  리팩터링하고 회귀 테스트를 추가했습니다. 자세한 내용은
  [CHANGELOG.md](./CHANGELOG.md)를 참고하세요.
- 2026-07-02: 프로젝트 구조 문서, UI 설정, 시리즈/Swiper 구조와 초기
  릴리즈 자동화를 정리했습니다.

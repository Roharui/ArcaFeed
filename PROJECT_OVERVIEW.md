# ArcaFeed — 프로젝트 총정리 문서

> **⚠️ 중요: 이 문서는 프로젝트의 "살아있는 지식 베이스"입니다.**
>
> 코드를 수정할 때마다 이 문서의 해당 섹션을 반드시 업데이트하세요.
> 구조 변경, 새 기능 추가, 의존성 변경, 아키텍처 결정 등 모든 변경사항을 여기에 기록합니다.
> 이 문서는 AI 에이전트(및 새로운 기여자)가 프로젝트를 빠르게 이해할 수 있도록 하는 것이 목적입니다.

---

## 1. 프로젝트 개요

**ArcaFeed**는 아카라이브(arca.live) 커뮤니티 사이트를 TikTok/Shorts처럼 스와이프로 게시글을 넘겨볼 수 있게 해주는 **TamperMonkey / ViolentMonkey 유저스크립트**입니다.

- **저장소**: `github.com/Roharui/ArcaFeed`
- **버전**: `3.1.0` (`package.json` 기준)
- **대상 사이트**: `https://arca.live/*`
- **기술 스택**: TypeScript + Webpack → 유저스크립트 번들

### 핵심 기능

| 기능                   | 설명                                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| 🎬 **슬라이드 게시글** | Swiper.js 기반 스와이프 내비게이션 (좌/우)                                |
| 🔍 **게시글 필터링**   | 탭(카테고리) 필터, 제목 차단 필터 (채널별 설정 저장)                      |
| ⌨️ **키보드 이벤트**   | 좌우 화살표 키로 게시글 이동                                              |
| 📚 **시리즈 등록**     | 게시글 시리즈를 새 탭으로 열어 연속 탐색                                  |
| 📦 **스크랩 시리즈**   | 스크랩 목록에서도 시리즈 모드 지원                                        |
| ⚙️ **모달 설정**       | 필터/UI 설정을 위한 모달 UI                                               |
| 📌 **Navbar 고정**     | Swiper 슬라이드 전환 시 navbar가 움직이지 않도록 `.navbar-wrapper`로 분리 |
| 🖥️ **PC 리사이즈**     | 콘텐츠 영역 드래그로 너비 조절 (1024px 이상, 포인터 장치 only)            |

---

## 2. 디렉토리 구조

```
ArcaFeed/
├── src/
│   ├── index.ts                    # 진입점 (중복 실행 방지, 초기화)
│   ├── global.d.ts                 # CSS 모듈, Toastify 타입 선언
│   ├── core/                       # 핵심 인프라 (이벤트 시스템, 스텝 실행기)
│   │   ├── index.ts                # ArcaFeed 싱글톤 + EventBus 바인딩
│   │   ├── event-bus.ts            # Pub/Sub 이벤트 버스
│   │   ├── app-events.ts           # 타입이 지정된 이벤트 계약/공용 버스 (기능 모듈의 의존 대상)
│   │   ├── event-queue.ts          # 명령 순차 실행 + 대기/실행 중 같은 이벤트 중복 제거
│   │   ├── event.ts                # EventManager: 이벤트 → Step[] 매핑
│   │   ├── step-runner.ts          # StepRunner: 순차/병렬 함수 실행기
│   │   └── store.ts                # Store re-export (from vault/)
│   ├── feature/                    # 기능 모듈
│   │   ├── index.ts                # barrel export
│   │   ├── button.ts               # 내비게이션 바 버튼 (모드별 빌더 → BUTTON_BUILDERS 디스패치)
│   │   ├── filter.ts               # 게시글 필터링 로직
│   │   ├── keyEvent.ts             # 키보드 이벤트 (MODE_KEY_HANDLERS 디스패치)
│   │   ├── search.ts               # 검색 쿼리 파싱
│   │   ├── series.ts               # 시리즈 모드 관련
│   │   ├── ui.ts                   # UI 조정 (MODE_UI_INIT 디스패치, toggleClass)
│   │   ├── version.ts              # 개발 버전 정보 표시
│   │   ├── article/                # 게시글 관련
│   │   │   ├── fetch.ts            # AsyncGenerator 기반 페칭 + fetchFirstBatch/fetchAllBatches
│   │   │   ├── prefetch.ts         # 다음 게시글 1개의 브라우저 문서 prefetch
│   │   │   └── link.ts             # 링크 초기화 (LINK_HANDLERS 디스패치), 활성화, 페이지 전환
│   │   ├── modal/                  # 모달 UI
│   │   │   ├── index.ts            # 모달 생성/제거 (series/normal 모드별 빌더)
│   │   │   ├── filterUi.ts         # 필터 탭 UI
│   │   │   ├── uiTab.ts            # UI 설정 탭
│   │   │   └── subscribeTab.ts     # 홈 시리즈 구독 채널 설정 탭
│   │   └── swiper/                 # Swiper 관련
│   │       ├── swiper.ts           # Swiper 인스턴스 생성/제어 (SLIDE_NEXT_EVENT 디스패치)
│   │       └── page.ts             # 페이지 이동 로직
│   ├── types/                      # 공통 타입 정의
│   │   ├── func.ts                 # PromiseFunc, Condition 등 함수 타입
│   │   └── vault.ts                # HrefImpl, ArticleFilter, UISettings 등 도메인 타입
│   ├── utils/                      # 유틸리티 함수
│   │   ├── article-key.ts          # articleKey 생성/파싱
│   │   ├── fetch.ts                # 네트워크 요청 (fetch + 타임아웃)
│   │   ├── func.ts                 # sleep 등 함수 유틸
│   │   ├── regex.ts                # URL 파싱 (모드 감지, ID 추출)
│   │   ├── toast.ts                # Toast 팝업
│   │   ├── type.ts                 # 타입 가드 (checkNotNull, isPromiseFuncResult, getArrayItem, getRegexMatchByIndex)
│   │   └── url.ts                  # URL 파라미터 조작
│   └── vault/                      # 상태 저장소 (Store 패턴 + localStorage)
│       ├── vault.ts                # Vault → VaultAdapter re-export
│       ├── index.ts                # VaultAdapter: 호환성 레이어
│       ├── store.ts                # Store: 불변 상태 관리 (Flux-like)
│       ├── config.ts               # ConfigService: 설정 로드/저장 (getJSON 사용)
│       ├── config-schema.ts        # 저장 데이터 형식 검증과 기본값/게시글 URL 정규화
│       ├── article-session.ts      # 비동기 조회가 현재 세션에 속하는지 확인
│       └── repository.ts           # StorageRepository: localStorage 추상화
├── css/                            # 스타일시트
│   ├── arcalive.css                # 아카라이브 기본 UI 오버라이드
│   ├── swiper.css                  # Swiper 컨테이너 + 로딩 인디케이터
│   ├── filter.css                  # 필터 모달 UI
│   ├── modal.css                   # 모달 공통 스타일
│   ├── series.css                  # 시리즈 버튼 스타일
│   └── ui.css                      # UI 설정 탭 스타일
├── package.json                    # 의존성 및 스크립트
├── tsconfig.json                   # TypeScript 설정
├── webpack.config.dev.js           # 개발 빌드 설정
├── webpack.config.prod.js          # 프로덕션 빌드 설정
├── eslint.config.js                # ESLint 설정
├── prettier.config.js              # Prettier 설정
├── README.md                       # 사용자용 설명서
```

---

## 3. 아키텍처

### 3.1 전체 흐름

```
index.ts (진입점)
  └→ ArcaFeed 싱글톤 생성
       ├→ VaultAdapter 생성 (Store + ConfigService)
       ├→ EventManager 생성 (StepRunner 포함)
       └→ wireEventBus(): Record<string, () => Step[]>로 이벤트명 → Step[] 매핑
            └→ eventBus.emit('init') 호출
```

### 3.2 이벤트 드리븐 아키텍처

모든 기능은 **EventBus**를 통해 발행/구독 방식으로 동작합니다. 기능 모듈은 조립 모듈인 `@/core` 대신 `@/core/app-events`에 의존하여 순환 참조를 피합니다. 이벤트 이름은 `AppEvent` 타입으로 제한합니다.

```
EventBus.emit('이벤트명')
  └→ ArcaFeed.wireEventBus() 에서 등록된 핸들러 실행
       └→ EventQueue에서 명령을 순서대로 실행 (같은 대기/실행 중 이벤트는 실행 공유)
            └→ stepGetters[이벤트명]() → Step[] 반환
                 └→ StepRunner.run(p, steps)
                 ├→ Step 1: [fn1, fn2]  (병렬 실행)
                 ├→ Step 2: fn3         (순차 실행)
                 └→ Step 3: [fn4, fn5]  (병렬 실행)
```

**이벤트 목록:**

| 이벤트명            | 발행 주체             | 설명                          |
| ------------------- | --------------------- | ----------------------------- |
| `init`              | `index.ts`            | 초기 실행                     |
| `toNextPage`        | 키보드 (→)            | 다음 게시글로 Swiper 슬라이드 |
| `toPrevPage`        | 키보드 (←)            | 이전 게시글로 Swiper 슬라이드 |
| `toNextLinkForce`   | 키보드 (→) in CHANNEL | 채널에서 강제 다음 페이지     |
| `renderNextPage`    | Swiper 전환 완료      | 다음 게시글 렌더링            |
| `renderPrevPage`    | Swiper 전환 완료      | 이전 게시글 렌더링            |
| `enableSeries`      | 시리즈 버튼 클릭      | 시리즈 모드 활성화            |
| `enableScrapSeries` | 스크랩 시리즈 버튼    | 스크랩 시리즈 모드 활성화     |
| `showModal`         | 필터 버튼 클릭        | 설정 모달 표시                |
| `checkFilterModal`  | 모달 확인 버튼        | 필터 설정 저장                |
| `checkUIModal`      | UI 모달 확인 버튼     | UI 설정 저장                  |
| `closeModal`        | 모달 취소/외부 클릭   | 모달 닫기                     |
| `toggleSwiper`      | 토글 버튼 클릭        | Swiper 활성화/비활성화        |

### 3.3 StepRunner — 순차/병렬 실행기

`StepRunner`는 이전 `PromiseManager`의 복잡성을 제거한 간소화된 실행기입니다.

- **`Step` 타입**: `PromiseFunc` (단일 함수) 또는 `PromiseFunc[]` (병렬 함수 배열)
- 각 Step은 순차적으로 실행되고, 배열 내 함수들은 `Promise.allSettled()`로 병렬 실행됨
- 각 함수의 반환값에서 follow-up 함수를 추출하여 추가 실행 (하위 호환성)
- 동기/비동기 오류 모두 실행 중인 병렬 작업의 완료를 기다린 뒤 전달하며, 실패한 단계의 follow-up과 다음 단계는 실행하지 않음. 개발/프로덕션에 같은 오류 정책 적용

### 3.4 상태 관리 (Store 패턴)

**Flux-like** 단방향 데이터 흐름을 사용합니다.

```
Store (불변 상태)
  ├→ VaultAdapter (getter/setter 제공, 호환성 레이어)
  │    ├→ 상태 변경 시 자동 debounce 저장 (300ms), 변경된 항목만 직렬화/저장
  │    └→ 명시적 flushSave() 지원
  ├→ ConfigService (localStorage 로드/저장)
  │    └→ StorageRepository (localStorage 추상화, 캐시 정리)
  └→ 구독 시스템: subscribe() 로 상태 변경 리액티브 처리
```

동일 값의 `Store.setState()`는 알림을 생략합니다. `articleList`, `href`, 설정 객체는 새 참조로 갱신해야 저장 변경 감지가 동작합니다. UI 설정 구독은 한 번만 설치하며, 게시글 목록/인덱스 변경에는 UI 전체를 다시 적용하지 않습니다. 이동 직전에는 다음 인덱스를 포함해 `flushSave()`합니다.

여러 필드가 함께 바뀌는 시리즈/필터 설정은 `VaultAdapter.updateState()`로 한 번에 반영합니다. 목록 초기화는 활성 인덱스를 함께 초기화하고 조회 revision을 증가시킵니다. `captureArticleSession()`은 revision과 세션/페이지/필터/검색/모드/홈 시리즈 채널 목록을 캡처하여 이전 조회의 목록·인덱스·페이지 이동 반영을 막습니다. 저장 데이터는 `config-schema.ts`에서 타입을 검증하고 기본값을 채웁니다. 상세한 실행 보장과 한계는 [아키텍처 문서](docs/ARCHITECTURE.md)에 기록합니다.

**AppState 구조:**

```typescript
interface AppState {
  href: HrefImpl; // URL 파싱 결과 (모드, 채널ID, 게시글ID 등)
  activeIndex: number; // 현재 게시글 인덱스
  articleKey: string; // 세션 식별 키 (UUID 기반)
  articleList: string[]; // 게시글 URL 목록
  articleFilterConfig: ArticleFilterConfigImpl; // 채널별 필터 설정
  isSeriesMode: boolean; // 시리즈 모드 여부
  searchQuery: string; // 검색 쿼리
  lastActiveIndex: number; // 마지막 활동 인덱스
  uiSettings: UISettings; // UI 표시/숨김 설정
}
```

**UISettings 구조:**

```typescript
interface UISettings {
  hideScrollbar: boolean; // 스크롤바 숨기기
  hideBlur: boolean; // 스포일러 블러 제거
  hideNavControl: boolean; // 게시글 내비게이션 숨기기
  hideArticleTitle: boolean; // 게시글 목록에서 제목 숨기기
  hideArticleAuthor: boolean; // 게시글 목록에서 작성자 숨기기
  hideArticleTime: boolean; // 게시글 목록에서 작성일 숨기기
  hideArticleView: boolean; // 게시글 목록에서 조회수 숨기기
  lastModalTab: 'filter' | 'ui'; // 마지막으로 열었던 모달 탭
  contentWidth: number; // 콘텐츠 너비 (px, 기본 700)
}
```

**HrefImpl (URL 파싱 결과):**

```typescript
interface HrefImpl {
  mode: 'HOME' | 'CHANNEL' | 'ARTICLE' | 'SCRAP' | 'OTHER' | 'NOT_CHECKED';
  channelId: string; // 채널 ID (예: "bluearchive")
  articleId: string; // 게시글 ID (예: "149927310")
  articleKey: string; // URL의 articleKey 파라미터
  search: string; // URL 쿼리스트링
}
```

**ArticleFilterImpl (채널별 필터):**

```typescript
interface ArticleFilterImpl {
  tab: string[]; // 허용할 탭 카테고리
  title: string[]; // 차단할 제목 키워드
  disableSwiper: boolean; // Swiper 비활성화 여부
}
```

### 3.5 localStorage 키 구조

| 키                                          | 용도                               |
| ------------------------------------------- | ---------------------------------- |
| `arcaFeed:articleFilterConfig`              | 글로벌 필터 설정                   |
| `arcaFeed:uiSettings`                       | UI 설정                            |
| `arcaFeed:{articleKey}:articleList`         | 게시글 목록                        |
| `arcaFeed:{articleKey}:seriesMode`          | 시리즈 모드 여부                   |
| `arcaFeed:{articleKey}:searchQuery`         | 검색 쿼리                          |
| `arcaFeed:{articleKey}:lastActiveIndex`     | 마지막 인덱스                      |
| `arcaFeed:{articleKey}:articleFilterConfig` | (레거시) 필터 설정                 |
| `arcaFeed:recentArticleKeys`                | 최근 articleKey 목록 (캐시 정리용) |

---

## 4. URL 파싱 (페이지 모드 감지)

`src/utils/regex.ts`의 정규식으로 현재 페이지 모드를 판단합니다.

| 모드      | URL 패턴                     | 예시                       |
| --------- | ---------------------------- | -------------------------- |
| `ARTICLE` | `/b/{channelId}/{articleId}` | `/b/bluearchive/149927310` |
| `CHANNEL` | `/b/{channelId}`             | `/b/bluearchive`           |
| `SCRAP`   | `/u/scrap_list`              | `/u/scrap_list`            |
| `HOME`    | `arca.live` (루트)           | `arca.live`                |
| `OTHER`   | 기타                         | 로그인, 설정 등            |

정규식:

- `channelPageRegex`: `b\/[a-zA-Z0-9]+(\?|\?.+)?$`
- `articlePageRegex`: `b\/([A-Za-z0-9])+\/[0-9]+(\?|\?.+)?$`
- `scrapPageRegex`: `\/u\/scrap_list(?:\/?|\?.+)?$`
- `channelAndArticleIdRegex`: `/\/b\/([A-Za-z0-9]+)(?:\/([0-9]+))?(\?.+)?`

---

## 5. 빌드 시스템

### 개발 빌드 (`npm run dev`)

- `webpack.config.dev.js` 사용
- `mode: 'development'`
- `GIT_HASH`, `BUILD_DATE`, `DEVICE` 환경 변수 주입
- Webpack 파일시스템 캐시로 변경되지 않은 모듈의 재빌드 비용 절감
- `dist/ArcaFeed.dev.js` 출력
- `DEVICE=mobile` 일 때 `eruda` 디버거 포함 + `UserscriptPlugin` 사용
- 워치 모드 활성화 (mobile 제외)

### 프로덕션 빌드 (`npm run prod`)

- `webpack.config.prod.js` 사용
- `mode: 'production'`
- `dist/ArcaFeed.user.js` 출력 (`clean: true`로 이전 빌드 제거)
- `package.json`의 `version` 필드 사용
- Webpack 파일시스템 캐시 사용, 빌드 설정 및 `package.json` 변경 시 캐시 무효화
- UserscriptPlugin으로 TamperMonkey 헤더 생성

### Externals (외부 의존성)

jQuery, Swiper, Toastify, eruda는 번들에 포함되지 않고 CDN에서 로드됩니다.
(유저스크립트 메타데이터 `@require` 사용)

### 릴리즈 파이프라인

```
git push origin main → GitHub Actions 트리거
  └→ package.json 버전과 최신 태그 비교
       └→ 새 버전이면 태그 생성/푸시 → npm ci → npm run prod → GitHub Release 생성
```

GitHub Actions (`.github/workflows/release.yml`):

- `main` 브랜치 푸시 시 트리거, 새 버전의 태그와 릴리즈를 자동 생성
- `npm ci` → `npm run prod` → `softprops/action-gh-release`로 `ArcaFeed.user.js` 첨부
- `generate_release_notes: true`로 자동 릴리즈 노트 생성

### 에이전트 검증 (`npm run agent:check`)

- `tsc --noEmit`: JS 출력 없이 타입 체크만 수행, 리팩토링 후 빠른 검증용

---

## 6. 주요 의존성

### Runtime (CDN)

| 패키지                 | 용도                          |
| ---------------------- | ----------------------------- |
| **jQuery** `^3.7.1`    | DOM 조작, 이벤트 핸들링       |
| **Swiper** `^12.0.2`   | 터치/스와이프 슬라이더        |
| **Toastify** `^1.12.0` | 토스트 알림                   |
| **Eruda** `^3.4.3`     | 모바일 개발자 콘솔 (dev only) |

### Dev

| 패키지                           | 용도                   |
| -------------------------------- | ---------------------- |
| **TypeScript** `^5.9.3`          | 타입 시스템            |
| **Webpack** `^5.93.0`            | 번들링                 |
| **ts-loader**                    | TypeScript → JS        |
| **css-loader + style-loader**    | CSS → JS 인라인 스타일 |
| **webpack-userscript** `^3.2.3`  | 유저스크립트 헤더 생성 |
| **ESLint + Prettier**            | 코드 품질              |
| **@types/jquery, @types/swiper** | 타입 정의              |

---

## 7. 코딩 컨벤션

- **Prettier**: single quote, semicolons, trailing comma `all`, tab width 2
- **ESLint**: semicolons required, `prefer-const`
- **모듈 시스템**: ESM (`"type": "module"`)
- **경로 별칭**:
  - `@/` → `src/`
  - `@css/` → `css/`
- **barrel export**: 각 디렉토리의 `index.ts`에서 re-export
- **전략 패턴 (Strategy Pattern)**: 페이지 모드 기반 분기는 `Record<mode, handler>` 매핑 테이블을 사용하고, if/else-if 체인을 피함
- **AsyncGenerator**: 페이징 등 반복 페칭은 `yield` 기반 제너레이터로 분리하여 소비자가 제어 흐름을 결정

---

## 8. 주요 동작 흐름

### 8.1 초기화 (`init` 이벤트)

```
1. addVersionInfo       — 개발 버전 표시 (DEV only)
2. checkPageMode        — URL 파싱, 상태 설정
3. [initLink, initButton, initEvent, initSeriesContent, initUi] (병렬)
   ├→ initLink: LINK_HANDLERS[mode] 디스패치 → 게시글 목록 로드 / 필터링
   ├→ initButton: BUTTON_BUILDERS[mode] 디스패치 → 내비게이션 바 버튼 추가
   ├→ initEvent: MODE_KEY_HANDLERS[mode] 디스패치 → 키보드 이벤트 등록
   ├→ initSeriesContent: 시리즈 콘텐츠 파싱
   └→ initUi: MODE_UI_INIT[mode] 디스패치, toggleClass, navbar wrapping
4. initSwiper           — Swiper 인스턴스 생성 (.root-container 내부에 삽입, .content-wrapper만 슬라이드로 이동)
5. initArticlePrefetch  — 지원 브라우저에서 다음 게시글 문서 1개 prefetch
```

`initLink`는 초기 HTML/저장 목록을 우선 사용하고 필요한 네트워크 요청은 백그라운드에서 수행합니다. 목록이 비어 있어도 초기화는 즉시 끝나며, 응답이 도착하면 Swiper 구독이 이동 가능 여부를 갱신합니다. 활성 인덱스는 게시글의 정확한 경로로 찾습니다.

### 8.2 게시글 내비게이션 (`renderNextPage`)

```
1. Swiper slideNextTransitionEnd → SLIDE_NEXT_EVENT[mode] 디스패치
2. toLink('NEXT') 또는 nextLinkForce 실행
   └→ p.activeIndex + 1 게시글 URL로 window.location.replace()
   └→ 신규 페이지에서 다시 init() 실행
```

전환 시간은 기존과 같은 300ms입니다. 설정 적용 시 기존 Swiper 인스턴스를 재사용하며, 이동 전에 대상 인덱스를 저장합니다. 보이지 않는 빈 슬라이드의 로더 애니메이션은 실행하지 않습니다.

**Swiper DOM 구조:**

```
.root-container
  .navbar-wrapper > nav.navbar   ← Swiper 외부 → 슬라이드 시 움직이지 않음
  .swiper                         ← .root-container 안, .content-wrapper 자리에 삽입
    .swiper-wrapper
      .swiper-slide.slide-active
        .content-wrapper           ← 게시글 콘텐츠만 슬라이드
  footer / #bottom                ← 정상 흐름 유지
```

### 8.3 필터링 적용 (`checkFilterModal`)

```
1. initCheckFilterModal — 모달에서 선택된 탭/제목을 articleFilterConfig에 저장
2. [initLink, initCloseModal] — 새 필터로 링크 재적용 및 모달 제거
3. initSwiperPage       — 기존 Swiper의 이동 가능 여부/활성 상태 갱신
```

### 8.4 시리즈 모드 (`enableSeries`)

```
1. initEnableSeries     — 시리즈 링크 파싱, articleKey 복사
   └→ 새 탭에서 시리즈 전용 세션 열기
2. [initSeriesBtnCss, initSwiperPage] (병렬)
```

### 8.5 게시글 페칭 (AsyncGenerator)

```
fetchArticlePages(p, articleId)    ← AsyncGenerator, 페이지마다 yield newLinks
  ├→ fetchFirstBatch(p, id)        ← 소비자: 첫 배치에서 break (채널/게시글 모드)
  └→ fetchAllBatches(p, id)        ← 소비자: 모든 페이지 수집 (스크랩 시리즈 모드)
```

페이지 수는 최대 10개이며, 반복되는 페이지 URL에서 종료합니다. URL 중복 검사는 `Set`으로 수행하고, 원격 HTML은 `DOMParser`로 파싱합니다. 같은 URL/타임아웃의 동시 GET은 하나의 요청을 공유하되 완료 응답을 영구 캐시하지 않습니다. 홈 시리즈 요청은 최대 4개씩 병렬 실행하고 한 번만 합쳐 정렬하며, 읽은 목록과 현재 인덱스는 유지합니다. 요청 도중 필터/세션이 바뀌면 이전 결과를 버립니다.

성능 회귀 검증은 `npm run test:performance`, 합성 벤치마크는 `npm run bench:performance`로 실행합니다. 시나리오와 측정 한계는 [docs/PERFORMANCE.md](docs/PERFORMANCE.md)를 참고하세요.

---

## 9. 알려진 이슈 / TODO

- **게시글 스킵 버그**: 게시물이 종종 스킵되는 현상
- **검색 쿼리 표시**: 게시글 상단에 검색 쿼리 아이콘화
- **시리즈 새 탭**: 시리즈 URL을 base64 인코딩하여 전달
- **동적 Pre-Rendering**: 성능 개선을 위한 실시간 기능 강화
- **함수 병렬 실행**: 데코레이터 패턴으로 조건부 병렬 실행
- **새로고침 렉 방지**: Swiper 래퍼로 컨텐츠 깜빡임 방지
- **로딩 페이지**: Swiper 초기화 전 클릭 방지
- **리사이즈 핸들 모바일**: 1024px 미만 + 터치 장치에서 CSS/JS로 차단됨

---

## 10. 변경 기록

> **이 섹션은 코드 수정 시마다 업데이트하세요.**

2026-10-09: 본 글 표시·건너뛰기와 최근 본 글·이어보기 추가. `src/vault/reading-history.ts`가 브라우저 공용 방문 기록 1,000개 및 탐색 위치 20개를 `arcaFeed:readingHistory`에 저장하며, 각 탐색 위치는 최대 2,000개 링크를 보관한다. `src/feature/reading.ts`가 게시글 접속 즉시 방문 기록 저장, 목록 제목 오른쪽의 본 글 표시 및 스크롤 복원을 담당한다. 읽음·안 읽음 상태, 시간 판정 및 수동 상태 변경은 제공하지 않고 방문 기록만으로 본 글을 판단한다. 기존 방문 기록도 별도 읽음 상태와 관계없이 모두 본 글로 처리한다. 최근 본 글은 `src/feature/modal/historyTab.ts`, 이어보기는 `src/feature/modal/resumeTab.ts`의 독립된 설정 탭으로 제공하며, 상단이나 본문에 별도의 최근 본 글 버튼을 추가하지 않는다. 다음 글 이동 및 prefetch는 본 글 건너뛰기 설정을 적용하고, 이전 이동은 유지한다. 홈 피드의 채널 목록은 세션별 `seriesChannels`로 저장하여 일반 시리즈/스크랩과 분리한다. 요청에 따라 테스트 추가는 보류했다.

2026-10-10: 본 글 건너뛰기를 게시글 제목 오른쪽의 ⏭️ 이모지 토글 버튼으로 제공하며, UI 설정에서는 해당 항목을 제거했다. 버튼의 활성 스타일·툴팁·aria-pressed로 켜짐 상태를 표시한다. 최근 본 글 탭은 검색·채널 필터와 날짜별 방문 목록으로, 이어보기 탭은 마지막 글 제목·탐색 종류·이어보기 버튼을 갖춘 카드로 재구성했다. 두 탭에 공통 헤더, 기록 수, 닫기 버튼 및 스크롤 영역을 적용하고, 설정 탭에 아이콘과 이름을 함께 표시한다. 제목 영역의 토글 버튼은 방문 기록의 제목에서 제외한다.

2026-10-10: 최근 본 글·이어보기 탭의 검색창을 공통 UI로 정리했다. 전체 너비 검색창, 검색어 지우기, 한글 조합 중 갱신 보류, 대소문자·공백 정규화 및 여러 단어 검색을 적용한다. 이어보기에서도 채널·시리즈 이름과 마지막 게시글 제목을 검색할 수 있다.

2026-10-10: 제목과 스킵 버튼을 별도 요소로 분리하고 제목 영역 오른쪽 끝에 버튼을 고정했다. 이모지는 CSS로 표시하여 제목 텍스트에 포함되지 않는다. 기존 탐색 테스트를 세션별 채널 목록과 현재 탐색 API에 맞추고, 방문 기록·탭 간 병합·삭제·건너뛰기·이어보기 복원·한글 검색 및 본 글만 있는 페이지의 추가 탐색에 대한 회귀 테스트를 추가했다. 다음 글이 3개 이상 남았을 때 불필요하게 추가 요청하지 않도록 기존 탐색 임계값을 유지한다.

| 날짜       | 변경 내용                                                                                                                                                                                                                         | 관련 파일                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-09 | 초기화 네트워크 대기 제거, 채널 요청 4개 병렬화/중복 GET 통합, 다음 문서 prefetch, 필터·목록 Set 중복 제거, 변경 항목만 저장, UI 구독 중복 제거 및 프레임 단위 리사이즈, Swiper 재사용/120ms 전환, 성능 회귀 검증과 벤치마크 추가 | `src/core/`, `src/feature/`, `src/utils/`, `src/vault/`, `css/swiper.css`, `webpack.config.*.js`, `tests/`, `scripts/`, `docs/PERFORMANCE.md`                         |
| 2026-07-02 | 프로젝트 총정리 문서 최초 작성                                                                                                                                                                                                    | `PROJECT_OVERVIEW.md`                                                                                                                                                 |
| 2026-08-23 | 실제 모듈 구조, 버전, 빌드 출력 및 릴리즈 흐름에 맞게 문서와 검증 스크립트 정리                                                                                                                                                   | `README.md`, `PROJECT_OVERVIEW.md`, `package.json`                                                                                                                    |
| 2026-07-02 | GitHub Actions 릴리즈 워크플로우 추가 (git tag → Actions → GitHub Release), `agent:check` 명령어 추가                                                                                                                             | `.github/workflows/release.yml`, `package.json`                                                                                                                       |
| 2026-07-02 | UI 설정 토글 기능 추가 (사이드바, 스크롤바, 블러, 게시글 목록, 게시판 버튼)                                                                                                                                                       | `types/vault.ts`, `vault/store.ts`, `vault/index.ts`, `vault/config.ts`, `feature/ui.ts`, `feature/modal/uiTab.ts`, `core/event.ts`, `css/arcalive.css`, `css/ui.css` |
| 2026-07-02 | 모달 마지막 탭 기억 기능 추가 (`lastModalTab`)                                                                                                                                                                                    | `types/vault.ts`, `vault/store.ts`, `feature/modal/index.ts`                                                                                                          |
| 2026-07-02 | PC에서 content-wrapper 드래그 리사이즈 기능 추가 (`contentWidth`)                                                                                                                                                                 | `types/vault.ts`, `vault/store.ts`, `feature/ui.ts`, `css/arcalive.css`, `css/ui.css`                                                                                 |
| 2026-07-02 | 리사이즈 핸들 좌측 추가, 위치 기반 계산으로 변경, 글로우 제거 (보더 라인), 최소 너비 650 제한                                                                                                                                     | `feature/ui.ts`, `css/ui.css`                                                                                                                                         |
| 2026-07-02 | Store uiSettings 깊은 병합 (기존 localStorage 호환성)                                                                                                                                                                             | `vault/store.ts`                                                                                                                                                      |
| 2026-07-02 | Swiper 구조 변경: `.root-container` 전체 대신 `.content-wrapper`만 슬라이드로 이동, `.swiper`를 `.root-container` 내부에 삽입                                                                                                     | `feature/swiper/swiper.ts`                                                                                                                                            |
| 2026-07-02 | `.navbar-wrapper` 추가: navbar를 Swiper 외부에 고정 (sticky)                                                                                                                                                                      | `feature/ui.ts`, `css/arcalive.css`                                                                                                                                   |
| 2026-07-02 | UI 토글: `hideIncludedArticleList`, `hideBtnsBoard` 제거, `hideSidebar`, `hideAd` 추가                                                                                                                                            | `types/vault.ts`, `vault/store.ts`, `feature/modal/uiTab.ts`, `feature/ui.ts`, `css/arcalive.css`                                                                     |
| 2026-07-02 | 리사이즈 핸들 모바일 차단: `max-width: 1023px` + `pointer: coarse` CSS/JS 가드                                                                                                                                                    | `feature/ui.ts`, `css/ui.css`                                                                                                                                         |
| 2026-07-02 | **대규모 리팩토링**: if 분기 → 전략 패턴 (Record 매핑 테이블)                                                                                                                                                                     | 아래 상세                                                                                                                                                             |
| 2026-07-02 | `keyEvent.ts`: `if (CHANNEL) ... else if (ARTICLE)` → `MODE_KEY_HANDLERS[mode]`                                                                                                                                                   | `feature/keyEvent.ts`                                                                                                                                                 |
| 2026-07-02 | `button.ts`: 다중 if 체인 → `BUTTON_BUILDERS` (SCRAP/CHANNEL/ARTICLE별 빌더)                                                                                                                                                      | `feature/button.ts`                                                                                                                                                   |
| 2026-07-02 | `link.ts`: `initLink` if 체인 → `LINK_HANDLERS` 디스패치, `initLinkChannel` 제거                                                                                                                                                  | `feature/article/link.ts`                                                                                                                                             |
| 2026-07-02 | `swiper.ts`: 삼항 연산자 → `SLIDE_NEXT_EVENT[mode]` 매핑                                                                                                                                                                          | `feature/swiper/swiper.ts`                                                                                                                                            |
| 2026-07-02 | `modal/index.ts`: `if (isSeriesMode)` → `buildModal` 함수 선택 패턴                                                                                                                                                               | `feature/modal/index.ts`                                                                                                                                              |
| 2026-07-02 | `ui.ts`: `if (isSeriesMode)` → `toggleClass()`, `if (ARTICLE)` → `MODE_UI_INIT[mode]`, resizeHandle 가드 조건 결합                                                                                                                | `feature/ui.ts`                                                                                                                                                       |
| 2026-07-02 | `core/index.ts`: `as any` 배열 → `Record<string, () => Step[]>` 타입 안전 매핑                                                                                                                                                    | `core/index.ts`                                                                                                                                                       |
| 2026-07-02 | `utils/type.ts`: `isString`, `isNotNull` 제거, `getRegexMatchByIndex` 옵셔널 체이닝, `getArrayItem` `arr.at()`, `isPromiseFuncResult` throw 제거                                                                                  | `utils/type.ts`                                                                                                                                                       |
| 2026-07-02 | `fetch.ts`: `isScrap` → `endless` → AsyncGenerator (`fetchArticlePages` + `fetchFirstBatch`/`fetchAllBatches`)                                                                                                                    | `feature/article/fetch.ts`, `feature/article/link.ts`                                                                                                                 |
| 2026-07-02 | `vault/config.ts`: 수동 try-catch(JSON.parse) → `getJSON()` 사용                                                                                                                                                                  | `vault/config.ts`                                                                                                                                                     |
| 2026-07-02 | `version.ts`: 불필요한 `return;`, `search.ts`: 이중 할당, `filterUi.ts`: 불필요한 삼항, `series.ts`: 불필요한 삼항, `index.ts`: 중복 `typeof window` 제거                                                                         | 각 파일                                                                                                                                                               |
| 2026-07-02 | UISettings 업데이트: `hideSidebar/hideAd/hideLeftSidebar` → `hideNavControl/hideArticleTitle/hideArticleAuthor/hideArticleTime/hideArticleView`                                                                                   | `types/vault.ts`, `vault/store.ts`, `feature/modal/uiTab.ts`                                                                                                          |
| 2026-07-02 | PROJECT_OVERVIEW.md 최신 코드베이스 반영 업데이트                                                                                                                                                                                 | `PROJECT_OVERVIEW.md`                                                                                                                                                 |

---

## 11. 개발 가이드라인

### 새 기능 추가 방법

1. `src/feature/{기능명}.ts` 또는 `src/feature/{기능명}/` 디렉토리 생성
2. 새로운 이벤트가 필요하면:
   - `EventBus` 이벤트명 결정
   - `EventManager`에 메서드 추가 (`Step[]` 반환)
   - `ArcaFeed.wireEventBus()`의 `stepGetters` Record에 추가
3. 페이지 모드별로 다른 동작이 필요하면 `Record<mode, handler>` 매핑 테이블 사용 (if 체인 대신)
4. 반복 페칭이 필요하면 `AsyncGenerator` 사용 (소비자가 `break`로 제어)
5. `src/feature/index.ts`에서 export 추가
6. `PROJECT_OVERVIEW.md` 업데이트

### 상태 추가 방법

1. `src/vault/store.ts`의 `AppState`에 필드 추가
2. `createInitialState()`에 기본값 추가
3. `VaultAdapter`에 getter/setter 추가
4. `ConfigService`의 `loadConfig()` / `saveConfig()`에 직렬화/역직렬화 추가
5. `PROJECT_OVERVIEW.md`의 AppState 구조 업데이트

### 디버깅

- 개발 빌드 시 `process.env.NODE_ENV === 'development'` 조건 사용
- 모바일 디버깅: `npm run dev:mobile` → Eruda 콘솔 활성화
- footer에 버전 정보 표시 (dev 모드)

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
- **버전**: `2.2.1`
- **대상 사이트**: `https://arca.live/*`
- **기술 스택**: TypeScript + Webpack → 유저스크립트 번들

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 🎬 **슬라이드 게시글** | Swiper.js 기반 스와이프 내비게이션 (좌/우) |
| 🔍 **게시글 필터링** | 탭(카테고리) 필터, 제목 차단 필터 (채널별 설정 저장) |
| ⌨️ **키보드 이벤트** | 좌우 화살표 키로 게시글 이동 |
| 📚 **시리즈 등록** | 게시글 시리즈를 새 탭으로 열어 연속 탐색 |
| 📦 **스크랩 시리즈** | 스크랩 목록에서도 시리즈 모드 지원 |
| ⚙️ **모달 설정** | 필터/UI 설정을 위한 모달 UI |
| 📌 **Navbar 고정** | Swiper 슬라이드 전환 시 navbar가 움직이지 않도록 `.navbar-wrapper`로 분리 |
| 🖥️ **PC 리사이즈** | 콘텐츠 영역 드래그로 너비 조절 (1024px 이상, 포인터 장치 only) |

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
│   │   ├── event.ts                # EventManager: 이벤트 → Step[] 매핑
│   │   ├── step-runner.ts          # StepRunner: 순차/병렬 함수 실행기
│   │   └── store.ts                # Store re-export (from vault/)
│   ├── feature/                    # 기능 모듈
│   │   ├── index.ts                # barrel export
│   │   ├── button.ts               # 내비게이션 바 버튼 (토글, 필터)
│   │   ├── filter.ts               # 게시글 필터링 로직
│   │   ├── keyEvent.ts             # 키보드 이벤트 (좌우 화살표)
│   │   ├── search.ts               # 검색 쿼리 파싱
│   │   ├── series.ts               # 시리즈 모드 관련
│   │   ├── ui.ts                   # UI 조정 (좌측 바 숨김, 광고 이동 등)
│   │   ├── version.ts              # 개발 버전 정보 표시
│   │   ├── article/                # 게시글 관련
│   │   │   ├── fetch.ts            # 게시글 목록 fetch & parse
│   │   │   └── link.ts             # 링크 초기화, 활성화, 페이지 전환
│   │   ├── modal/                  # 모달 UI
│   │   │   ├── index.ts            # 모달 생성/제거
│   │   │   ├── filterUi.ts         # 필터 탭 UI
│   │   │   └── uiTab.ts            # UI 설정 탭
│   │   └── swiper/                 # Swiper 관련
│   │       ├── swiper.ts           # Swiper 인스턴스 생성/제어
│   │       └── page.ts             # 페이지 이동 로직
│   ├── types/                      # 공통 타입 정의
│   │   ├── func.ts                 # PromiseFunc, Condition 등 함수 타입
│   │   └── vault.ts                # HrefImpl, ArticleFilter 등 도메인 타입
│   ├── utils/                      # 유틸리티 함수
│   │   ├── article-key.ts          # articleKey 생성/파싱
│   │   ├── fetch.ts                # 네트워크 요청 (fetch + 타임아웃)
│   │   ├── func.ts                 # sleep 등 함수 유틸
│   │   ├── regex.ts                # URL 파싱 (모드 감지, ID 추출)
│   │   ├── toast.ts                # Toast 팝업
│   │   ├── type.ts                 # 타입 가드, 배열 접근
│   │   └── url.ts                  # URL 파라미터 조작
│   └── vault/                      # 상태 저장소 (Store 패턴 + localStorage)
│       ├── vault.ts                # Vault → VaultAdapter re-export
│       ├── index.ts                # VaultAdapter: 호환성 레이어
│       ├── store.ts                # Store: 불변 상태 관리 (Flux-like)
│       ├── config.ts               # ConfigService: 설정 로드/저장
│       └── repository.ts           # StorageRepository: localStorage 추상화
├── css/                            # 스타일시트
│   ├── arcalive.css                # 아카라이브 기본 UI 오버라이드
│   ├── swiper.css                  # Swiper 컨테이너 + 로딩 인디케이터
│   ├── filter.css                  # 필터 모달 UI
│   ├── modal.css                   # 모달 공통 스타일
│   ├── series.css                  # 시리즈 버튼 스타일
│   └── ui.css                      # UI 설정 탭 스타일
├── dist/                           # 빌드 출력 (gitignore)
├── package.json                    # 의존성 및 스크립트
├── tsconfig.json                   # TypeScript 설정
├── webpack.config.dev.js           # 개발 빌드 설정
├── webpack.config.prod.js          # 프로덕션 빌드 설정
├── eslint.config.js                # ESLint 설정
├── prettier.config.js              # Prettier 설정
├── README.md                       # 사용자용 설명서
└── .logic.md                       # 개발자 노트 (버그, 기능 계획)
```

---

## 3. 아키텍처

### 3.1 전체 흐름

```
index.ts (진입점)
  └→ ArcaFeed 싱글톤 생성
       ├→ VaultAdapter 생성 (Store + ConfigService)
       ├→ EventManager 생성 (StepRunner 포함)
       └→ wireEventBus(): 이벤트명 → EventManager 메서드 매핑
            └→ eventBus.emit('init') 호출
```

### 3.2 이벤트 드리븐 아키텍처

모든 기능은 **EventBus**를 통해 발행/구독 방식으로 동작합니다.

```
EventBus.emit('이벤트명')
  └→ ArcaFeed.wireEventBus() 에서 등록된 핸들러 실행
       └→ EventManager.{이벤트명}() → Step[] 반환
            └→ StepRunner.run(p, steps)
                 ├→ Step 1: [fn1, fn2]  (병렬 실행)
                 ├→ Step 2: fn3         (순차 실행)
                 └→ Step 3: [fn4, fn5]  (병렬 실행)
```

**이벤트 목록:**

| 이벤트명 | 발행 주체 | 설명 |
|----------|-----------|------|
| `init` | `index.ts` | 초기 실행 |
| `toNextPage` | 키보드 (→) | 다음 게시글로 Swiper 슬라이드 |
| `toPrevPage` | 키보드 (←) | 이전 게시글로 Swiper 슬라이드 |
| `toNextLinkForce` | 키보드 (→) in CHANNEL | 채널에서 강제 다음 페이지 |
| `renderNextPage` | Swiper 전환 완료 | 다음 게시글 렌더링 |
| `renderPrevPage` | Swiper 전환 완료 | 이전 게시글 렌더링 |
| `enableSeries` | 시리즈 버튼 클릭 | 시리즈 모드 활성화 |
| `enableScrapSeries` | 스크랩 시리즈 버튼 | 스크랩 시리즈 모드 활성화 |
| `showModal` | 필터 버튼 클릭 | 설정 모달 표시 |
| `checkFilterModal` | 모달 확인 버튼 | 필터 설정 저장 |
| `checkUIModal` | UI 모달 확인 버튼 | UI 설정 저장 |
| `closeModal` | 모달 취소/외부 클릭 | 모달 닫기 |
| `toggleSwiper` | 토글 버튼 클릭 | Swiper 활성화/비활성화 |

### 3.3 StepRunner — 순차/병렬 실행기

`StepRunner`는 이전 `PromiseManager`의 복잡성을 제거한 간소화된 실행기입니다.

- **`Step` 타입**: `PromiseFunc` (단일 함수) 또는 `PromiseFunc[]` (병렬 함수 배열)
- 각 Step은 순차적으로 실행되고, 배열 내 함수들은 `Promise.all()`로 병렬 실행됨
- 각 함수의 반환값에서 follow-up 함수를 추출하여 추가 실행 (하위 호환성)

### 3.4 상태 관리 (Store 패턴)

**Flux-like** 단방향 데이터 흐름을 사용합니다.

```
Store (불변 상태)
  ├→ VaultAdapter (getter/setter 제공, 호환성 레이어)
  │    ├→ 상태 변경 시 자동 debounce 저장 (300ms)
  │    └→ 명시적 flushSave() 지원
  ├→ ConfigService (localStorage 로드/저장)
  │    └→ StorageRepository (localStorage 추상화, 캐시 정리)
  └→ 구독 시스템: subscribe() 로 상태 변경 리액티브 처리
```

**AppState 구조:**

```typescript
interface AppState {
  href: HrefImpl;              // URL 파싱 결과 (모드, 채널ID, 게시글ID 등)
  activeIndex: number;          // 현재 게시글 인덱스
  articleKey: string;           // 세션 식별 키 (UUID 기반)
  articleList: string[];        // 게시글 URL 목록
  articleFilterConfig: ArticleFilterConfigImpl;  // 채널별 필터 설정
  isSeriesMode: boolean;        // 시리즈 모드 여부
  searchQuery: string;          // 검색 쿼리
  lastActiveIndex: number;      // 마지막 활동 인덱스
  uiSettings: UISettings;       // UI 표시/숨김 설정
}
```

**UISettings 구조:**

```typescript
interface UISettings {
  hideLeftSidebar: boolean;          // 왼쪽 사이드바 숨기기
  hideScrollbar: boolean;            // 스크롤바 숨기기
  hideBlur: boolean;                 // 스포일러 블러 제거
  hideSidebar: boolean;              // 사이드바(.sidebar) 숨기기
  hideAd: boolean;                   // 광고(.ad) 숨기기
  lastModalTab: 'filter' | 'ui';     // 마지막으로 열었던 모달 탭
  contentWidth: number;              // 콘텐츠 너비 (px, 기본 700)
}
```

**HrefImpl (URL 파싱 결과):**

```typescript
interface HrefImpl {
  mode: 'HOME' | 'CHANNEL' | 'ARTICLE' | 'SCRAP' | 'OTHER' | 'NOT_CHECKED';
  channelId: string;    // 채널 ID (예: "bluearchive")
  articleId: string;    // 게시글 ID (예: "149927310")
  articleKey: string;   // URL의 articleKey 파라미터
  search: string;       // URL 쿼리스트링
}
```

**ArticleFilterImpl (채널별 필터):**

```typescript
interface ArticleFilterImpl {
  tab: string[];           // 허용할 탭 카테고리
  title: string[];         // 차단할 제목 키워드
  disableSwiper: boolean;  // Swiper 비활성화 여부
}
```

### 3.5 localStorage 키 구조

| 키 | 용도 |
|----|------|
| `arcaFeed:articleFilterConfig` | 글로벌 필터 설정 |
| `arcaFeed:{articleKey}:articleList` | 게시글 목록 |
| `arcaFeed:{articleKey}:seriesMode` | 시리즈 모드 여부 |
| `arcaFeed:{articleKey}:searchQuery` | 검색 쿼리 |
| `arcaFeed:{articleKey}:lastActiveIndex` | 마지막 인덱스 |
| `arcaFeed:{articleKey}:articleFilterConfig` | (레거시) 필터 설정 |
| `arcaFeed:recentArticleKeys` | 최근 articleKey 목록 (캐시 정리용) |

---

## 4. URL 파싱 (페이지 모드 감지)

`src/utils/regex.ts`의 정규식으로 현재 페이지 모드를 판단합니다.

| 모드 | URL 패턴 | 예시 |
|------|---------|------|
| `ARTICLE` | `/b/{channelId}/{articleId}` | `/b/bluearchive/149927310` |
| `CHANNEL` | `/b/{channelId}` | `/b/bluearchive` |
| `SCRAP` | `/u/scrap_list` | `/u/scrap_list` |
| `HOME` | `arca.live` (루트) | `arca.live` |
| `OTHER` | 기타 | 로그인, 설정 등 |

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
- `dist/dist.js` 출력
- `DEVICE=mobile` 일 때 `eruda` 디버거 포함 + `UserscriptPlugin` 사용
- 워치 모드 활성화 (mobile 제외)

### 프로덕션 빌드 (`npm run prod`)

- `webpack.config.prod.js` 사용
- `mode: 'production'`
- `dist/ArcaFeed.user.js` 출력 (`clean: true`로 이전 빌드 제거)
- `package.json`의 `version` 필드 사용
- UserscriptPlugin으로 TamperMonkey 헤더 생성

### Externals (외부 의존성)

jQuery, Swiper, Toastify, eruda는 번들에 포함되지 않고 CDN에서 로드됩니다.
(유저스크립트 메타데이터 `@require` 사용)

---

## 6. 주요 의존성

### Runtime (CDN)

| 패키지 | 용도 |
|--------|------|
| **jQuery** `^3.7.1` | DOM 조작, 이벤트 핸들링 |
| **Swiper** `^12.0.2` | 터치/스와이프 슬라이더 |
| **Toastify** `^1.12.0` | 토스트 알림 |
| **Eruda** `^3.4.3` | 모바일 개발자 콘솔 (dev only) |

### Dev

| 패키지 | 용도 |
|--------|------|
| **TypeScript** `^5.9.3` | 타입 시스템 |
| **Webpack** `^5.93.0` | 번들링 |
| **ts-loader** | TypeScript → JS |
| **css-loader + style-loader** | CSS → JS 인라인 스타일 |
| **webpack-userscript** `^3.2.3` | 유저스크립트 헤더 생성 |
| **ESLint + Prettier** | 코드 품질 |
| **@types/jquery, @types/swiper** | 타입 정의 |

---

## 7. 코딩 컨벤션

- **Prettier**: single quote, semicolons, trailing comma `all`, tab width 2
- **ESLint**: semicolons required, `prefer-const`
- **모듈 시스템**: ESM (`"type": "module"`)
- **경로 별칭**:
  - `@/` → `src/`
  - `@css/` → `css/`
  - `@swiper/` → `node_modules/swiper/`
- **barrel export**: 각 디렉토리의 `index.ts`에서 re-export

---

## 8. 주요 동작 흐름

### 8.1 초기화 (`init` 이벤트)

```
1. addVersionInfo       — 개발 버전 표시 (DEV only)
2. checkPageMode        — URL 파싱, 상태 설정
3. [initLink, initButton, initEvent, initSeriesContent, initUi] (병렬)
   ├→ initLink: 게시글 목록 로드 / 필터링
   ├→ initButton: 내비게이션 바 버튼 추가
   ├→ initEvent: 키보드 이벤트 등록
   ├→ initSeriesContent: 시리즈 콘텐츠 파싱
   └→ initUi: UI 요소 조정, navbar wrapping, sidebar/ad 토글 적용
4. initSwiper           — Swiper 인스턴스 생성 (.root-container 내부에 삽입, .content-wrapper만 슬라이드로 이동)
```

### 8.2 게시글 내비게이션 (`renderNextPage`)

```
1. Swiper slideNext 이벤트 발생
2. slideNextTransitionEnd → toLink('NEXT') 실행
   └→ p.activeIndex + 1 게시글 URL로 window.location.replace()
   └→ 신규 페이지에서 다시 init() 실행
```

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
2. initLink             — 필터 재적용
3. initCloseModal       — 모달 제거
4. initSwiperPage       — Swiper 재생성
```

### 8.4 시리즈 모드 (`enableSeries`)

```
1. initEnableSeries     — 시리즈 링크 파싱, articleKey 복사
   └→ 새 탭에서 시리즈 전용 세션 열기
2. [initSeriesBtnCss, initSwiperPage] (병렬)
```

---

## 9. 알려진 이슈 / TODO

`.logic.md` 파일 참조:

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

| 날짜 | 변경 내용 | 관련 파일 |
|------|-----------|-----------|
| 2026-07-02 | 프로젝트 총정리 문서 최초 작성 | `PROJECT_OVERVIEW.md` |
| 2026-07-02 | UI 설정 토글 기능 추가 (사이드바, 스크롤바, 블러, 게시글 목록, 게시판 버튼) | `types/vault.ts`, `vault/store.ts`, `vault/index.ts`, `vault/config.ts`, `feature/ui.ts`, `feature/modal/uiTab.ts`, `core/event.ts`, `css/arcalive.css`, `css/ui.css` |
| 2026-07-02 | 모달 마지막 탭 기억 기능 추가 (`lastModalTab`) | `types/vault.ts`, `vault/store.ts`, `feature/modal/index.ts` |
| 2026-07-02 | PC에서 content-wrapper 드래그 리사이즈 기능 추가 (`contentWidth`) | `types/vault.ts`, `vault/store.ts`, `feature/ui.ts`, `css/arcalive.css`, `css/ui.css` |
| 2026-07-02 | 리사이즈 핸들 좌측 추가, 위치 기반 계산으로 변경, 글로우 제거 (보더 라인), 최소 너비 650 제한 | `feature/ui.ts`, `css/ui.css` |
| 2026-07-02 | Store uiSettings 깊은 병합 (기존 localStorage 호환성) | `vault/store.ts` |
| 2026-07-02 | Swiper 구조 변경: `.root-container` 전체 대신 `.content-wrapper`만 슬라이드로 이동, `.swiper`를 `.root-container` 내부에 삽입 | `feature/swiper/swiper.ts` |
| 2026-07-02 | `.navbar-wrapper` 추가: navbar를 Swiper 외부에 고정 (sticky) | `feature/ui.ts`, `css/arcalive.css` |
| 2026-07-02 | UI 토글: `hideIncludedArticleList`, `hideBtnsBoard` 제거, `hideSidebar`, `hideAd` 추가 | `types/vault.ts`, `vault/store.ts`, `feature/modal/uiTab.ts`, `feature/ui.ts`, `css/arcalive.css` |
| 2026-07-02 | 리사이즈 핸들 모바일 차단: `max-width: 1023px` + `pointer: coarse` CSS/JS 가드 | `feature/ui.ts`, `css/ui.css` |

---

## 11. 개발 가이드라인

### 새 기능 추가 방법

1. `src/feature/{기능명}.ts` 또는 `src/feature/{기능명}/` 디렉토리 생성
2. 새로운 이벤트가 필요하면:
   - `EventBus` 이벤트명 결정
   - `EventManager`에 메서드 추가 (`Step[]` 반환)
   - `ArcaFeed.wireEventBus()`의 `eventNames` 배열에 추가
3. `src/feature/index.ts`에서 export 추가
4. `PROJECT_OVERVIEW.md` 업데이트

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

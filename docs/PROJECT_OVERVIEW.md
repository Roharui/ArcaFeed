# 프로젝트 구조

ArcaFeed는 아카라이브 게시글을 스와이프로 탐색하는 TypeScript 유저스크립트입니다.
Webpack으로 코드와 CSS를 묶으며 jQuery, Swiper, Toastify는 유저스크립트의
`@require`로 로드합니다. 모바일 개발 빌드에는 eruda도 포함합니다.
버전과 의존성은 [package.json](../package.json)을 기준으로 확인합니다.

이 문서는 코드를 읽기 위한 진입점과 유지보수 규칙을 정리합니다.
구체적인 타입과 기본값은 소스에서 확인하고, 동작이나 구조가 바뀌면 관련 문서를 갱신합니다.

## 관련 문서

| 문서                        | 내용                                                       |
| --------------------------- | ---------------------------------------------------------- |
| [README](../README.md)      | 설치, 주요 기능, 기본 사용법                               |
| [사용 안내](USAGE.md)       | 필터, 구독 피드, 최근 본 글과 이어보기                     |
| [개발 안내](DEVELOPMENT.md) | 개발 서버, 로더 설치, 모바일 연결, 검증 명령               |
| [아키텍처](ARCHITECTURE.md) | 의존성 방향, 이벤트 실행, 비동기 요청과 저장소의 보장 범위 |
| [UI 테스트](UI_TESTING.md)  | 모달 미리보기와 브라우저 검사                              |
| [성능 측정](PERFORMANCE.md) | 최적화 내용, 회귀 검증과 합성 벤치마크                     |
| [기능 TODO](TODO.md)        | 아직 구현하지 않은 기능 제안과 우선순위                    |

## 코드 위치

| 위치                                                                                                                        | 역할                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [src/index.ts](../src/index.ts)                                                                                             | 중복 실행을 막고 애플리케이션 생성 후 `init` 발행       |
| [src/core/index.ts](../src/core/index.ts)                                                                                   | `ArcaFeed` 싱글톤, 상태 저장소와 이벤트 실행기 조립     |
| [src/core/app-events.ts](../src/core/app-events.ts)                                                                         | `AppEvent` 타입과 기능 모듈이 사용하는 공용 이벤트 버스 |
| [src/core/event.ts](../src/core/event.ts)                                                                                   | 이벤트별 실행 단계 정의                                 |
| [src/core/event-queue.ts](../src/core/event-queue.ts), [step-runner.ts](../src/core/step-runner.ts)                         | 명령 큐와 순차·병렬 단계 실행                           |
| [src/feature/article/](../src/feature/article/)                                                                             | 게시글 목록 조회, 링크 이동, 다음 글 prefetch           |
| [src/feature/swiper/](../src/feature/swiper/)                                                                               | Swiper 생성과 이동 가능 상태 갱신                       |
| [src/feature/filter.ts](../src/feature/filter.ts), [search.ts](../src/feature/search.ts)                                    | 목록 필터와 검색 조건 처리                              |
| [src/feature/series.ts](../src/feature/series.ts), [subscriptions.ts](../src/feature/subscriptions.ts)                      | 게시글 시리즈와 사이트 구독 채널 파싱                   |
| [src/feature/reading.ts](../src/feature/reading.ts)                                                                         | 본 글 표시·건너뛰기, 이어보기 복원과 스크롤 저장        |
| [src/feature/modal/](../src/feature/modal/)                                                                                 | 필터, 화면 설정, 구독 채널, 최근 본 글, 이어보기 탭     |
| [src/feature/button.ts](../src/feature/button.ts), [keyEvent.ts](../src/feature/keyEvent.ts), [ui.ts](../src/feature/ui.ts) | 버튼, 키보드와 페이지 레이아웃                          |
| [src/vault/](../src/vault/)                                                                                                 | 상태, 설정 검증·저장, 읽기 기록과 조회 세션 관리        |
| [src/types/vault.ts](../src/types/vault.ts)                                                                                 | 페이지 모드, 필터와 UI 설정 타입                        |
| [src/utils/](../src/utils/)                                                                                                 | URL 파싱, 네트워크 요청과 공통 유틸리티                 |
| [css/](../css/)                                                                                                             | 페이지 레이아웃과 기능별 스타일                         |
| [scripts/](../scripts/)                                                                                                     | 개발·UI 서버, 개발 로더와 성능 측정 도구                |
| [tests/](../tests/)                                                                                                         | 실제 소스 모듈을 사용하는 회귀 테스트와 테스트 어댑터   |

## 실행 흐름

1. `src/index.ts`가 중복 실행을 확인하고 `ArcaFeed`를 생성합니다.
2. `VaultAdapter`가 저장 설정을 불러오고 URL의 페이지 모드를 판단합니다.
   지원하지 않는 `OTHER` 페이지는 레이아웃 CSS 로드와 이벤트 연결 전에 종료합니다.
3. 지원 페이지에서는 이벤트를 `EventManager`의 단계와 연결하고 `init`을 발행합니다.
4. 초기화는 개발 버전 표시 → 링크·버튼·키보드·시리즈·UI 병렬 초기화 →
   읽기 기능 → Swiper → 다음 글 prefetch 순서로 실행합니다.
5. 버튼·키보드·Swiper가 발행한 명령은 `EventQueue`를 거쳐 실행됩니다.
   게시글 이동 전에는 인덱스를 저장하고 새 페이지에서 다시 초기화합니다.

페이지 모드는 [utils/regex.ts](../src/utils/regex.ts)의 `parseHref()`에서 판별합니다.

| 모드      | 대상                                |
| --------- | ----------------------------------- |
| `HOME`    | 사이트 루트와 구독 피드 `/b/my`     |
| `CHANNEL` | 채널 목록 `/b/{channelId}`          |
| `ARTICLE` | 게시글 `/b/{channelId}/{articleId}` |
| `SCRAP`   | 스크랩 목록 `/u/scrap_list`         |
| `OTHER`   | 그 밖의 페이지                      |

목록 초기화는 현재 HTML과 저장된 목록을 먼저 사용하고 필요한 보충 조회는
백그라운드에서 수행합니다. 구독 채널의 일괄 탐색도 `article/link.ts`에서 조립합니다.
조회 결과는 시작 시 캡처한 세션이 여전히 유효할 때만 반영합니다.
이벤트 중복, 병렬 실패와 조회 무효화의 상세 동작은 [아키텍처](ARCHITECTURE.md)를 참고하세요.

## 상태와 저장소

[Store](../src/vault/store.ts)는 `AppState`와 구독을 관리하고,
[VaultAdapter](../src/vault/index.ts)는 기능 모듈에 상태 접근과 자동 저장을 제공합니다.
[ConfigService](../src/vault/config.ts)는
[config-schema.ts](../src/vault/config-schema.ts)로 데이터를 검증한 뒤
[StorageRepository](../src/vault/repository.ts)를 통해 localStorage를 읽고 씁니다.

| 저장 범위        | 주요 키와 내용                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 전역 설정        | `arcaFeed:articleFilterConfig`, `arcaFeed:uiSettings`, `arcaFeed:isShuffleMode`                |
| 탐색 세션        | `arcaFeed:{articleKey}:` 아래 목록, 시리즈·스크랩 모드, 구독 채널, 검색 조건과 마지막 인덱스   |
| 탐색 캐시 관리   | `arcaFeed:recentArticleKeys`                                                                   |
| 이어보기         | `arcaFeed:readingHistory`에 목록·탐색 정보, `arcaFeed:readingProgress`에 스크롤 위치·갱신 시각 |
| 사이트 방문 기록 | `recent_articles`, `recent_disabled`를 읽어 최근 본 글과 본 글 여부 판정                       |

[ReadingHistory](../src/vault/reading-history.ts)는 사이트 방문 기록과 이어보기를
관리하며 방문 기록·세션·위치 변경을 별도로 알립니다.
보관 한도와 탭 사이 병합 정책은 [아키텍처](ARCHITECTURE.md)의 저장소 경계를 참고하세요.

## 변경할 때 확인할 곳

- 기능 모듈에서 이벤트를 발행할 때는 `@/core/app-events`를 사용합니다.
  같은 디렉토리에서도 구체적인 모듈을 가져와 barrel을 통한 순환 참조를 피합니다.
- 새 명령은 `AppEvent`, `EventManager`의 `Step[]` 메서드,
  `ArcaFeed.wireEventBus()`의 매핑에 함께 추가합니다.
- 배열과 설정 객체는 새 참조로 갱신합니다. 여러 필드가 함께 바뀌면
  `VaultAdapter.updateState()`를 사용하고, 목록 초기화에는 `resetArticleList()`를 사용합니다.
- 저장할 상태를 추가하면 `AppState`와 기본값, 스키마 정규화, 설정 로드·저장,
  `VaultAdapter`의 저장 변경 감지 대상도 확인합니다. 이동 직전에는 `flushSave()`합니다.
- 비동기 목록 조회를 추가하면 `captureArticleSession()`으로 오래된 응답을 차단합니다.
- 경로 별칭은 `@/` → `src/`, `@css/` → `css/`입니다.
  코드 포맷과 린트 규칙은 저장소의 Prettier·ESLint 설정을 따릅니다.

전체 검증은 `npm run check`입니다. 변경 중에는 해당 동작의 테스트와
`npm run typecheck`로 확인하고, 화면 변경은 [UI 테스트](UI_TESTING.md)로 검증합니다.

## 빌드와 릴리즈

[개발 설정](../webpack.config.dev.js)은 `dist/ArcaFeed.dev.user.js`,
[프로덕션 설정](../webpack.config.prod.js)은 `dist/ArcaFeed.user.js`를 생성합니다.
실시간 개발과 모바일 로더 설치는 [개발 안내](DEVELOPMENT.md)에 정리되어 있습니다.

[릴리즈 워크플로](../.github/workflows/release.yml)는 `main` 푸시 시
`package.json` 버전과 최신 태그를 비교합니다. 버전이 다르면 `v{version}` 태그를
생성하고 `npm ci` → `npm run prod` 후 유저스크립트를 GitHub Release에 첨부합니다.
변경 이력은 Git 커밋과 릴리즈 노트에서 확인합니다.

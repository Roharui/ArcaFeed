# 통합 아키텍처와 실행 보장

이 워크스페이스는 공통 엔진 `@feed/core`([FeedCore](../FeedCore))와 사이트별 유저스크립트 앱 [ArcaFeed](../ArcaFeed), [RuliFeed](../RuliFeed)로 나뉩니다. 두 앱 모두 페이지마다 실행되며 `core/index.ts`가 상태 저장소와 이벤트 실행기를 조립하고, 기능 모듈은 `core/app-events.ts`의 타입이 지정된 이벤트 버스에 명령을 발행합니다.

## 패키지 의존성 방향

```text
ArcaFeed ──┐
           ├──▶ @feed/core (FeedCore, 외부 런타임 의존성 없음)
RuliFeed ──┘
```

- `ArcaFeed`와 `RuliFeed`는 `package.json`에서 `"@feed/core": "file:../FeedCore"`로 연결합니다.
- `@feed/core`는 두 앱 중 어느 쪽에도 역의존하지 않으며 외부 npm 패키지를 직접 import하지 않습니다(`toastify-js`는 앱에서 주입, `swiper`는 구조적 타입 `SwiperLike`로 참조).
- 앱 내부 의존성 방향:

```text
진입점 → 애플리케이션 조립 → 이벤트 실행기 → 기능 모듈
                            기능 모듈 → app-events → EventBus
                            기능 모듈 → VaultAdapter → Store / ConfigService
                                                       ConfigService → 저장소 / 스키마 검증
```

기능 모듈에서 조립 모듈인 `@/core`를 가져오면 `core → feature → core` 순환 참조가 생깁니다. 이벤트 전송에는 `@/core/app-events`를 사용하고, 같은 디렉토리의 모듈도 barrel 대신 구체적인 모듈을 가져옵니다. 각 앱의 `tests/architecture.test.mjs`는 앱 `src/`와 `FeedCore/src/`를 합친 런타임 의존성 그래프에 순환이 없는지 검사합니다.

## `@feed/core` 계층

| 서브패스               | 역할                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@feed/core/types/*`   | 공통 페이지·필터·설정·명령 함수 타입                                                                                                                                                         |
| `@feed/core/core/*`    | `EventBus`, `EventQueue`, `StepRunner`, `CommandResult`, `wireFeedEventBus`                                                                                                                  |
| `@feed/core/utils/*`   | DOM·네트워크·동시성·URL 유틸리티, `createAfterPaint`, `createToast`, `OperationError`                                                                                                        |
| `@feed/core/vault/*`   | `IndexedStorage`, `record-transaction`, `record-schema`, `record-migration`, `StorageRepository`, `StorageActivity`, `Store`, `ReadingHistory`, `ConfigStorage`, `article-window`            |
| `@feed/core/feature/*` | 로딩 카운터, `createNavigation`, `createKeyEventInit`, `createVersionInfo`, `createArticlePrefetch`, 모달 포커스/정리/읽기 UI 헬퍼, 스와이퍼 비디오·모션·지연 렌더링·사이드 클릭·스킵 토스트 |

## 이벤트와 실패 처리

- `EventQueue`는 서로 다른 명령을 도착 순서대로 처리합니다. 같은 이벤트가 아직 대기 또는 실행 중이면 기존 실행을 공유하며, 실패한 명령 이후에도 큐는 계속 처리됩니다. 실행 중인 명령 내부에서 후속 이벤트를 발행할 때는 기다리지 않고 발행해야 합니다.
- `StepRunner`는 단계 사이의 순서를 유지하며 한 단계의 배열 안 함수들을 병렬 실행합니다. 하나라도 실패하면 실행 중인 병렬 함수들이 모두 끝날 때까지 기다린 뒤 오류를 전달하고 후속 단계를 건너뜁니다. `mapConcurrent`도 실패 후 추가 요청을 시작하지 않고 실행 중인 요청의 완료를 기다립니다.
- `EventBus`는 모든 구독자의 완료를 기다리고 `CommandResult`(`{ ok: true }` 또는 `{ ok: false, errors }`)를 반환합니다. `OperationError`는 오류 종류(`storage`·`navigation`·`command`)와 원인을 보존하고 같은 오류의 사용자 안내를 한 번만 표시합니다. 이미 수행한 DOM 작업 전체를 되돌리는 트랜잭션은 제공하지 않습니다.

## 상태와 비동기 요청

- 여러 필드가 함께 바뀌는 경우에는 `VaultAdapter.updateState()`로 한 번에 반영하고, 목록 초기화에는 `resetArticleList()`로 목록·인덱스를 초기화하며 조회 revision을 증가시킵니다.
- `captureArticleSession()`은 조회 시작 시 revision, 세션 키, 페이지 정보, 필터 참조, 검색 조건, 시리즈/셔플 모드, 홈 시리즈 채널 목록을 캡처합니다. 응답 반영이나 다음 페이지 요청 전 캡처가 현재 상태와 같은지 확인해 무효화된 응답을 버립니다.
- 목록을 덧붙일 때는 응답 도착 시점의 최신 목록과 중복 제거합니다. 구독 채널 조회는 채널별 실패를 수집해 성공한 채널의 피드를 시작하고, 개별 재시도는 현재 글까지 보존한 뒤 결과를 병합합니다.
- `feature/navigation.ts`(`@feed/core/feature/navigation`)는 현재 페이지 저장과 대상 세션 준비가 성공한 뒤 이동합니다. 저장·이동 예외 시 변경한 탐색 상태·인덱스·Swiper 위치·임시 스크롤 전달을 복구하고 재시도를 허용합니다. 같은 페이지에서 이동 시작 후 들어온 추가 이동은 무시하며 BFCache 복귀(`pageshow.persisted`) 시 가드를 해제합니다.

## 저장소 경계

각 앱 소유 영속 데이터는 IndexedDB(`ArcaFeed` / `RuliFeed`, 버전 2)에 일반 객체로 저장합니다. 문자열 `Storage` API와 JSON 캐시를 사용하지 않습니다.

| Object store         | 기본 키        | 내용                                                                         |
| -------------------- | -------------- | ---------------------------------------------------------------------------- |
| `settings`           | `id`           | `display`·`subscription`·`reading`·`lastModalTab`·`shuffle`·`versionInfo`    |
| `channelFilters`     | 채널/게시판 ID | 채널별 필터 객체                                                             |
| `navigationSessions` | `articleKey`   | `mode`·`query`·(`nextPageUrl`)·`channels`·실패 상태·목록 버전·최근 사용 시각 |
| `resumeSessions`     | 이어보기 ID    | 이름·고정·탐색 문맥·현재 글·목록 개수·목록 버전                              |
| `progress`           | `[kind, id]`   | `navigation`의 인덱스 또는 `resume`의 스크롤·갱신 시각                       |
| `lists`              | `[kind, id]`   | 순서가 있는 pathname 배열과 목록 버전                                        |
| `meta`               | `id`           | 스키마 이전 상태                                                             |

- `kind`는 `navigation` 또는 `resume`입니다. 탐색 캐시는 최근 사용 시각 기준으로 5개, 이어보기는 최대 20개 세션(세션당 최대 2,000개·전체 5,000개 링크) 한도를 트랜잭션 안에서 유지합니다.
- 지원하지 않는 `OTHER` 페이지는 DB를 열지 않습니다. 지원 페이지는 작은 레코드와 현재 `articleKey`의 탐색 목록만 읽고 앱을 생성합니다.
- 쓰기·삭제는 object store별 메모리 캐시에 먼저 반영하고 microtask에서 모아 커밋합니다. 트랜잭션 범위는 변경된 object store와 검증에 필요한 저장소만 포함합니다. 보관 한도를 검증할 때는 일괄 조회 결과를 개별 레코드 병합에도 재사용합니다.
- `StorageActivity`는 문서가 숨겨지거나 `pagehide`·`freeze` 상태가 되면 진행 중인 트랜잭션을 abort해 다른 탭의 잠금을 해제하고, 복귀(`visibilitychange`·`pageshow`·`resume`) 시 중단된 작업을 최신 DB 값에 다시 적용합니다.
- `BroadcastChannel`(`arcaFeed:records` / `ruliFeed:records`)은 `{ store, key }` 주소 배열을 알리고, 수신 탭은 변경된 작은 레코드와 이미 로드된 목록만 조회한 뒤 커스텀 이벤트(`arcafeed:storage` / `rulifeed:storage`)를 한 번 발행합니다.
- `record-migration.ts`는 DB `versionchange` 트랜잭션에서만 실행해 구형 v1 `values`와 localStorage 키를 일회성으로 이전하며, 실패 시 원본을 유지합니다.

## 필터와 접근성

- 채널 필터의 `includeTitle`·`includeMode`·`includeCaseSensitive`는 저장 경계에서 검증하며, 공용 필터 판정은 제목 차단을 우선합니다.
- `@feed/core/feature/modal/focus`는 최상단 대화상자의 초기 포커스·Tab 순환·외부 포커스 차단·Escape·닫기 후 포커스 복원을 담당합니다.
- `@feed/core/feature/key-event`는 편집 가능한 composed path·IME·키 반복·수정키·열린 모달에서 단축키를 차단합니다.
- `@feed/core/feature/swiper/motion`은 동작 줄이기 설정(`prefers-reduced-motion`)에 따라 전환 속도를 갱신합니다.
- `@feed/core/feature/swiper/side-click`은 폭 1024px 이상에서 본문 좌우 빈 공간 클릭을 이전·다음 스와이프 명령으로 전달합니다.

## 앱별 차이 요약

| 항목                     | ArcaFeed                                                  | RuliFeed                                                               |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| IndexedDB / 이벤트       | `ArcaFeed` / `arcafeed:storage`                           | `RuliFeed` / `rulifeed:storage`                                        |
| CSS 접두사               | `arcafeed-*`                                              | `rulifeed-*`                                                           |
| `articleKey` 유지        | URL 쿼리 파라미터(`?articleKey=...`)                      | `history.state` + `sessionStorage` + 짧은 수명 `localStorage` 핸드오프 |
| 설정 탭                  | 필터·UI 설정·채널 설정·최근 본 글·이어보기                | 필터·최근 본 글 (`resumeSessions`는 구버전 호환 경계)                  |
| 방문 기록 소스           | 사이트 소유 `recent_articles`·`recent_disabled` 읽기 전용 | RuliFeed 자체 `localStorage` 방문 기록                                 |
| 프로덕션 외부 라이브러리 | `@require`로 Swiper·Toastify 로드                         | 프로덕션 번들에 Swiper·Toastify 포함                                   |

사이트별 라우팅과 전용 모듈 위치는 [ArcaFeed/docs/PROJECT_OVERVIEW.md](../ArcaFeed/docs/PROJECT_OVERVIEW.md)와 [RuliFeed/docs/PROJECT_OVERVIEW.md](../RuliFeed/docs/PROJECT_OVERVIEW.md)를 참고하세요.

# @feed/core

ArcaFeed와 RuliFeed가 공통으로 사용하는 핵심 엔진, 유틸리티, IndexedDB 저장소(Vault), 모달/스와이퍼 헬퍼를 제공하는 내부 패키지입니다.

## 구성

- `@feed/core/types`: 공통 타입 (`HrefImpl`, `ArticleFilterImpl`, `UISettings`, `SubscriptionFailure`, `PromiseFunc` 등)
- `@feed/core/core`: 명령 실행 엔진 (`EventBus`, `EventQueue`, `StepRunner`, `CommandResult`, `wireFeedEventBus`)
- `@feed/core/utils`: 공통 유틸리티 (`dom`, `fetch`, `func`, `url`, `type`, `after-paint`, `toast`, `operation-error`)
- `@feed/core/vault`: 저장소 및 상태 엔진 (`IndexedStorage`, `StorageRepository`, `StorageActivity`, `Store`, `ReadingHistory`, `ConfigStorage`, `record-schema`, `record-transaction`, `record-migration`, `article-window` 등)
- `@feed/core/feature`: 공통 기능 헬퍼 (`loading`, `navigation`, `key-event`, `version`, `prefetch`, `modal/cleanup`, `modal/focus`, `modal/reading-ui`, `swiper/video`, `swiper/motion`, `swiper/rendering`, `swiper/side-click`, `swiper/skip-toast`)

## 설계 원칙

- 외부 런타임 의존성이 없습니다(`swiper`, `toastify-js` 등은 호출 앱에서 주입하거나 구조적 타입으로 연결).
- 사이트별 차이(DB 이름, CSS 접두사, URL 파서, DOM 선택자, 레거시 키 접두사)는 팩토리 함수/생성자 옵션으로 주입합니다.
- 각 앱(`ArcaFeed`, `RuliFeed`)은 `package.json`의 `"@feed/core": "file:../FeedCore"`로 연결합니다.

# ArcaFeed 프로젝트 구조

ArcaFeed는 아카라이브(`arca.live`) 게시글을 스와이프로 탐색하는 TypeScript 유저스크립트입니다.
공용 이벤트 엔진·유틸리티·IndexedDB 저장소·모달/스와이퍼 헬퍼는 [`@feed/core`](../../FeedCore)를 사용하고, 이 디렉토리는 아카라이브 전용 라우팅·DOM 파싱·UI 설정·구독/스크랩/이어보기 기능을 담당합니다.

설정 저장기는 직전에 저장한 상태 스냅샷과 참조가 같으면 저장소 조회를 생략합니다.

공통 아키텍처, 개발·빌드 절차, UI 테스트, 성능 측정과 기능 TODO는 루트 문서에서 관리합니다.

| 문서                                        | 내용                                                             |
| ------------------------------------------- | ---------------------------------------------------------------- |
| [README](../README.md)                      | 설치, 주요 기능과 기본 사용법                                    |
| [사용 안내](./USAGE.md)                     | 아카라이브 필터, 구독 피드, 스크랩, 최근 본 글과 이어보기        |
| [통합 아키텍처](../../docs/ARCHITECTURE.md) | `@feed/core` 경계, 이벤트 실행·비동기·IndexedDB 저장소 보장 범위 |
| [개발·CI 안내](../../docs/DEVELOPMENT.md)   | 루트 `webpack.config.js`, `dist/`, 실시간 개발 서버와 검증 명령  |
| [UI 테스트](../../docs/UI_TESTING.md)       | 모달 미리보기와 Playwright MCP 검사                              |
| [성능 측정](../../docs/PERFORMANCE.md)      | 최적화 내용, 성능 회귀 검증과 벤치마크                           |
| [기능 TODO](../../docs/TODO.md)             | 공통 기능 제안과 우선순위                                        |

## 아카라이브 페이지 모드

페이지 모드는 [src/utils/regex.ts](../src/utils/regex.ts)의 `parseHref()`에서 판별합니다.

| 모드      | 대상                                        |
| --------- | ------------------------------------------- |
| `HOME`    | 사이트 루트(`/`)와 구독 피드(`/b/my`)       |
| `CHANNEL` | 채널 목록(`/b/{channelId}`)                 |
| `ARTICLE` | 게시글(`/b/{channelId}/{articleId}`)        |
| `SCRAP`   | 스크랩 목록(`/u/scrap_list`)                |
| `OTHER`   | 그 밖의 페이지 (스타일·DB 초기화 전에 종료) |

## 아카라이브 전용 코드 위치

| 위치                                                                                                   | 역할                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/index.ts](../src/index.ts), [src/core/](../src/core/)                                             | 중복 실행 가드, `arcalive.css` 선적용, `ArcaFeed` 싱글톤과 이벤트 단계 조립                                                                                 |
| [src/utils/regex.ts](../src/utils/regex.ts), [article-key.ts](../src/utils/article-key.ts)             | 아카라이브 URL 파싱과 URL 쿼리(`?articleKey=...`) 기반 세션 키 관리                                                                                         |
| [src/feature/article/](../src/feature/article/)                                                        | 아카라이브 목록 파싱(`.page-item.active`, `?mode=best`), 링크 이동, `/b/my` 구독 일괄 탐색                                                                  |
| [src/feature/subscriptions.ts](../src/feature/subscriptions.ts), [series.ts](../src/feature/series.ts) | 구독 메뉴 채널 파싱과 본문 시리즈 링크 추출                                                                                                                 |
| [src/feature/filter.ts](../src/feature/filter.ts), [search.ts](../src/feature/search.ts)               | 채널별 카테고리·제목 포함/차단·개념글 필터                                                                                                                  |
| [src/feature/reading.ts](../src/feature/reading.ts)                                                    | 본 글 표시·건너뛰기, 이어보기 복원과 스크롤 체크포인트 저장                                                                                                 |
| [src/feature/modal/](../src/feature/modal/)                                                            | 필터·UI 설정(`uiTab`)·채널 설정(`subscribeTab`)·최근 본 글(`historyTab`)·이어보기(`resumeTab`) 탭과 독립 탐색 패널                                          |
| [src/feature/button.ts](../src/feature/button.ts), [ui.ts](../src/feature/ui.ts)                       | 상단/목록 제어 버튼과 아카라이브 화면 레이아웃·본문 너비 설정                                                                                               |
| [src/vault/](../src/vault/)                                                                            | IndexedDB `ArcaFeed` v2 어댑터, `recent_articles`·`recent_disabled` 읽기 전용 방문 기록 연동([site-recent-history.ts](../src/vault/site-recent-history.ts)) |
| [css/](../css/)                                                                                        | `arcalive.css`, `ui.css` 및 기능별 스타일 (`arcafeed-*` 접두사)                                                                                             |

저장된 글 목록을 이어 읽을 때 페이지에 표시된 행에는 필터 스타일을 적용하고 탐색 링크 목록을 다시 수집하지 않습니다.
추천글 전용 필터는 필요한 경우 저장 목록을 조회해 행을 표시합니다. 공통 최적화는 [성능 최적화](../../docs/PERFORMANCE.md)를 참고하세요.

## 빌드 및 의존성 특징

- 프로덕션 빌드([webpack.config.js](../../webpack.config.js))는 루트 `dist/ArcaFeed.user.js`를 생성하며 `Swiper`와 `Toastify`를 유저스크립트 `@require`로 외부 로드합니다.
- 경로 별칭은 `@/` → `src/`, `@css/` → `css/`입니다.

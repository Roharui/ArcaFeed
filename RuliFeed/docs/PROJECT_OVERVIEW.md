# RuliFeed 프로젝트 구조

RuliFeed는 루리웹(`bbs.ruliweb.com`, `m.ruliweb.com`) 게시판과 게시글을 스와이프로 탐색하는 TypeScript 유저스크립트입니다.
공용 이벤트 엔진·유틸리티·IndexedDB 저장소·모달/스와이퍼 헬퍼는 [`@feed/core`](../../FeedCore)를 사용하고, 이 디렉토리는 루리웹 전용 라우팅·DOM 파싱·세션 키 핸드오프·플로팅 제어 UI를 담당합니다.

설정 저장기는 직전에 저장한 상태 스냅샷과 참조가 같으면 저장소 조회를 생략합니다.

공통 아키텍처, 개발·빌드 절차, UI 테스트, 성능 측정과 기능 TODO는 루트 문서에서 관리합니다.

| 문서                                        | 내용                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| [README](../README.md)                      | 설치, 주요 기능과 기본 사용법                                             |
| [사용 안내](./USAGE.md)                     | 루리웹 조작, 필터와 최근 본 글 사용법                                     |
| [통합 아키텍처](../../docs/ARCHITECTURE.md) | `@feed/core` 경계, 이벤트 실행·비동기·IndexedDB 저장소 보장 범위          |
| [개발·CI 안내](../../docs/DEVELOPMENT.md)   | 루트 `webpack.config.js`, `dist/`, 실시간 개발 서버, ADB 확인과 검증 명령 |
| [UI 테스트](../../docs/UI_TESTING.md)       | 모달 미리보기와 Playwright MCP 검사                                       |
| [성능 측정](../../docs/PERFORMANCE.md)      | 최적화 내용, 성능 회귀 검증과 벤치마크                                    |
| [기능 TODO](../../docs/TODO.md)             | 공통 기능 제안과 우선순위                                                 |

## 루리웹 페이지 모드

페이지 모드는 [src/utils/regex.ts](../src/utils/regex.ts)의 `parseHref()`에서 판별합니다.

| 모드      | 대상                                                          |
| --------- | ------------------------------------------------------------- |
| `HOME`    | 지원 호스트(`bbs.ruliweb.com`, `m.ruliweb.com`)의 사이트 루트 |
| `CHANNEL` | 게시판 목록(`/{group}/board/{boardId}`)                       |
| `ARTICLE` | 게시글(`/{group}/board/{boardId}/read/{articleId}`)           |
| `OTHER`   | 그 밖의 페이지 (스타일·DB 초기화 전에 종료)                   |

## 루리웹 전용 코드 위치 및 동작 차이

| 위치                                                                                                                         | 역할                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [src/index.ts](../src/index.ts), [src/core/](../src/core/)                                                                   | 중복 실행 가드, `ruliweb.css` 선적용, `RuliFeed` 싱글톤과 이벤트 단계 조립                                                                       |
| [src/utils/regex.ts](../src/utils/regex.ts), [article-key.ts](../src/utils/article-key.ts)                                   | 데스크톱·모바일 루리웹 라우팅 및 URL을 오염시키지 않는 `history.state`·`sessionStorage`·짧은 수명 `localStorage` 핸드오프 기반 `articleKey` 관리 |
| [src/feature/article/](../src/feature/article/)                                                                              | 루리웹 게시판 파싱(`#board_list .btn_num.active`, `?view_best=1`), `nextPageUrl` 커서 기반 보충 조회                                             |
| [src/feature/filter.ts](../src/feature/filter.ts), [search.ts](../src/feature/search.ts)                                     | 제목 키워드·베스트 조건 필터                                                                                                                     |
| [src/feature/reading.ts](../src/feature/reading.ts), [src/vault/site-recent-history.ts](../src/vault/site-recent-history.ts) | RuliFeed 자체 `localStorage` 방문 기록 저장, 본 글 표시·건너뛰기(이어보기 체크포인트 미기록)                                                     |
| [src/feature/modal/](../src/feature/modal/)                                                                                  | 필터·최근 본 글 2탭 설정 모달 및 좌측 하단 플로팅 제어 스택(스와이프 전환·루리피드 설정·탐색 목록)                                               |
| [src/vault/](../src/vault/)                                                                                                  | IndexedDB `RuliFeed` v2 어댑터, `navigationSessions.nextPageUrl` 커서 및 게시판 ID 정규식                                                        |
| [css/](../css/)                                                                                                              | `ruliweb.css` 및 기능별 스타일 (`rulifeed-*` 접두사)                                                                                             |

## 빌드 및 의존성 특징

- 프로덕션 빌드([webpack.config.js](../../webpack.config.js))는 루트 `dist/RuliFeed.user.js`를 생성하며, 배포 번들에 `Swiper`와 `Toastify`를 포함합니다.
- 개발 빌드에서는 `--env BUNDLE=true`로 의존성을 포함한 단일 개발 번들을 생성해 ADB로 설치할 수 있습니다([개발·CI 안내](../../docs/DEVELOPMENT.md#adb로-rui-browser에서-확인-rulifeed)).
- 경로 별칭은 `@/` → `src/`, `@css/` → `css/`입니다.

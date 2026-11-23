# 문서 안내

공통 문서는 루트 `docs/`에서 관리하고, 각 앱 디렉토리에는 해당 사이트에 특화된 문서만 유지합니다.

## 공통 문서 (루트 `docs/`)

| 문서                               | 내용                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| [README](../README.md)             | 패키지 구성, 빠른 시작과 주요 루트 명령어                                            |
| [통합 아키텍처](./ARCHITECTURE.md) | `@feed/core` 경계, 의존성 방향, 이벤트 실행·비동기·IndexedDB 저장소 보장 범위        |
| [개발·CI 안내](./DEVELOPMENT.md)   | 루트 검증·빌드, 단일 `webpack.config.js`, 실시간 개발 서버, ADB 확인, GitHub Actions |
| [UI 테스트](./UI_TESTING.md)       | 모달 미리보기 서버, Playwright MCP 자동 검사, 브라우저 수동 검증 절차                |
| [성능 측정](./PERFORMANCE.md)      | 최적화 내용, 성능 회귀 검증과 합성 벤치마크                                          |
| [기능 TODO](./TODO.md)             | 공통 기능 제안과 우선순위                                                            |

## 패키지별 특화 문서

### FeedCore (`@feed/core`)

- [FeedCore/README.md](../FeedCore/README.md)

### ArcaFeed (아카라이브)

- [ArcaFeed/README.md](../ArcaFeed/README.md)
- [ArcaFeed/docs/PROJECT_OVERVIEW.md](../ArcaFeed/docs/PROJECT_OVERVIEW.md): 아카라이브 라우팅, 전용 모듈과 저장소 어댑터
- [ArcaFeed/docs/USAGE.md](../ArcaFeed/docs/USAGE.md): 아카라이브 필터, 구독 피드, 스크랩, 최근 본 글과 이어보기 사용법

### RuliFeed (루리웹)

- [RuliFeed/README.md](../RuliFeed/README.md)
- [RuliFeed/docs/PROJECT_OVERVIEW.md](../RuliFeed/docs/PROJECT_OVERVIEW.md): 루리웹 라우팅, 탭 기반 `articleKey` 핸드오프, `nextPageUrl` 커서와 어댑터
- [RuliFeed/docs/USAGE.md](../RuliFeed/docs/USAGE.md): 루리웹 조작, 필터와 최근 본 글 사용법

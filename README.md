# Feed

`ArcaFeed`와 `RuliFeed` 유저스크립트, 그리고 두 프로젝트가 공유하는 `@feed/core` 패키지를 루트에서 통합 관리·검증·빌드하기 위한 환경입니다.

## 구성

| 디렉토리               | 패키지명     | 역할                                                                    |
| ---------------------- | ------------ | ----------------------------------------------------------------------- |
| [FeedCore](./FeedCore) | `@feed/core` | 공용 이벤트 엔진, 유틸리티, IndexedDB 저장소(Vault), 모달·스와이퍼 헬퍼 |
| [ArcaFeed](./ArcaFeed) | `arcafeed`   | 아카라이브 게시글 스와이프 탐색 유저스크립트                            |
| [RuliFeed](./RuliFeed) | `rulifeed`   | 루리웹 게시글 스와이프 탐색 유저스크립트                                |

## 빠른 시작

Node.js 22.13 이상(22.x 또는 24 이상)과 npm 10.9 이상이 필요합니다.

```bash
npm run install:all   # ArcaFeed, RuliFeed 의존성 일괄 설치 (@feed/core 로컬 링크 포함)
npm run check         # 전체 포맷·린트·타입검증·테스트·프로덕션 빌드
```

## 주요 명령어

| 명령어                                    | 설명                                                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                           | 루트 `webpack.config.js` (`--mode production`)로 `dist/ArcaFeed.user.js`와 `dist/RuliFeed.user.js` 프로덕션 빌드 (`build:arca`, `build:ruli`) |
| `npm run dev`                             | 루트 `webpack.config.js` (`--mode development`)로 `dist/`에 개발 빌드 생성 (`dev:arca`, `dev:ruli`)                                           |
| `npm run lint`                            | `FeedCore`, `ArcaFeed`, `RuliFeed` ESLint 검사 (`lint:core`, `lint:arca`, `lint:ruli`)                                                        |
| `npm run format` / `npm run format:check` | 루트 및 3개 패키지 Prettier 포맷·검사                                                                                                         |
| `npm run typecheck`                       | `FeedCore`, `ArcaFeed`, `RuliFeed` TypeScript 타입 검증                                                                                       |
| `npm test`                                | `FeedCore`, `ArcaFeed`, `RuliFeed` 전체 테스트 실행                                                                                           |
| `npm run check`                           | `format:check` → `lint` → `typecheck` → `test` → `build` 일괄 실행                                                                            |

## 문서

- [문서 목차](./docs/README.md)
- [통합 아키텍처](./docs/ARCHITECTURE.md)
- [개발·CI 안내](./docs/DEVELOPMENT.md)
- [UI 테스트](./docs/UI_TESTING.md) · [성능 측정](./docs/PERFORMANCE.md) · [기능 TODO](./docs/TODO.md)
- [FeedCore README](./FeedCore/README.md)
- [ArcaFeed README](./ArcaFeed/README.md) · [RuliFeed README](./RuliFeed/README.md)

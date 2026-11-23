# 프로젝트 안내

이 루트 디렉토리는 공용 패키지 `@feed/core`([FeedCore](./FeedCore))와 유저스크립트 앱 [ArcaFeed](./ArcaFeed)(아카라이브), [RuliFeed](./RuliFeed)(루리웹)를 루트의 Webpack(`webpack.config.js`), ESLint(`eslint.config.js`), Prettier(`prettier.config.js`) 설정으로 통합 빌드·린트·타입검증·테스트·릴리즈할 수 있게 구성되어 있습니다.

## 작업 시작 시 먼저 읽을 문서

1. [통합 아키텍처](docs/ARCHITECTURE.md): `@feed/core`와 각 앱 사이의 경계, 의존성 방향, 이벤트 실행·비동기·IndexedDB 저장소 보장 범위를 확인합니다.
2. [개발·CI 안내](docs/DEVELOPMENT.md): 루트 검증 명령, Webpack 설정, `dist/` 산출물과 GitHub Actions 워크플로를 확인합니다.
3. 공통 세부 문서는 [UI 테스트](docs/UI_TESTING.md), [성능 측정](docs/PERFORMANCE.md), [기능 TODO](docs/TODO.md)를, 앱별 특화 문서는 [문서 목차](docs/README.md)에서 각 프로젝트의 `PROJECT_OVERVIEW.md`와 `USAGE.md`를 참고합니다.

## 기본 검증 명령

```bash
npm run check     # 루트 + FeedCore + ArcaFeed + RuliFeed 전체 포맷·린트·타입·테스트·빌드(dist/)
```

## 유지보수 원칙

- 두 앱이 공통으로 사용하는 로직(이벤트 엔진, 유틸리티, IndexedDB 저장소, 공통 UI/스와이퍼 헬퍼)은 `FeedCore/src/`에 두고, 사이트별 차이(DB 이름, CSS 접두사, 선택자, URL 파서 등)는 옵션/어댑터로 주입합니다.
- `FeedCore`에는 외부 런타임 의존성을 추가하지 않습니다.
- 구체적인 타입과 기본값, 버전 및 의존성은 소스 코드와 각 `package.json`에서 확인하며, 동작이나 구조를 변경하면 루트 [docs/](docs/README.md)와 관련 앱 문서를 함께 갱신합니다.
- 기능 개발이나 기존 기능 수정 시 구현과 검증(`npm run check`)을 완료한 뒤, 관련 없는 사용자 변경 사항을 제외해 변경 내역만 Git 커밋합니다(사용자의 별도 지시가 있으면 우선합니다).

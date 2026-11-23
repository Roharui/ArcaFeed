# RuliFeed

루리웹 게시판과 게시글을 가로 스와이프로 탐색하는 유저스크립트입니다. 모바일 `m.ruliweb.com`과 데스크톱 `bbs.ruliweb.com`의 게시판에서 동작합니다.

## 설치

유저스크립트 관리자에서 [RuliFeed.user.js](https://github.com/Roharui/ArcaFeed/releases/latest/download/RuliFeed.user.js)를 설치하거나, 루트 저장소에서 `npm run install:all`과 `npm run build`를 실행한 뒤 `dist/RuliFeed.user.js`를 가져오세요.

Rui Browser에 ADB로 개발 빌드를 설치하는 방법은 [개발·CI 안내](../docs/DEVELOPMENT.md#adb로-rui-browser에서-확인-rulifeed)를 참고하세요.

## 사용

- 게시판에서 왼쪽으로 밀면 첫 게시글이 열립니다.
- 게시글에서 왼쪽으로 밀면 다음 글, 오른쪽으로 밀면 이전 글로 이동합니다. 데스크톱에서는 방향키를 사용할 수 있습니다.
- **루리피드 설정**에서 제목 키워드, 베스트 조건을 지정할 수 있습니다.
- 게시글 탐색 버튼에서 현재 목록을 열 수 있습니다. 설정에서는 최근 본 글를 확인할 수 있습니다.

[사용 안내](docs/USAGE.md) · [프로젝트 구조](docs/PROJECT_OVERVIEW.md) · [개발·CI 안내](../docs/DEVELOPMENT.md) · [통합 아키텍처](../docs/ARCHITECTURE.md)

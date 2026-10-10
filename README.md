# 아카피드

아카라이브 게시글을 쇼츠처럼 스와이프하며 탐색하는 유저스크립트입니다.

[예시 영상](https://arca.live/b/bluearchive/149927310) · [버그 제보](https://github.com/Roharui/ArcaFeed/issues)

## 설치

1. **Tampermonkey** 또는 **Violentmonkey** 확장프로그램을 설치합니다.
2. 아래에서 사용하는 확장프로그램의 **스크립트 설치** 링크를 엽니다.
3. 설치 화면에서 **Install** 버튼을 누르고 아카라이브를 새로고침합니다.

| 확장프로그램  | Chrome 설치                                                                                                  | 스크립트 설치                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tampermonkey  | [확장프로그램](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ko) | [스크립트 설치](https://www.tampermonkey.net/script_installation.php#url=https://github.com/Roharui/ArcaFeed/releases/latest/download/ArcaFeed.user.js) |
| Violentmonkey | [확장프로그램](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)      | [스크립트 설치](https://github.com/Roharui/ArcaFeed/releases/latest/download/ArcaFeed.user.js)                                                          |

## 주요 기능

- **게시글 탐색** — 좌우 스와이프와 화살표 키로 이동
- **채널별 필터** — 카테고리, 제목 차단 키워드, 인기글 여부 설정
- **시리즈·스크랩·구독 채널** — 여러 게시글을 하나의 피드로 탐색
- **읽기 기록** — 본 글 표시·건너뛰기, 최근 본 글 검색, 탐색 위치 이어보기
- **화면 설정** — 스크롤바, 스포일러 블러, 목록 정보 등 표시 여부 변경

## 기본 사용법

| 동작                    | 방법                                                 |
| ----------------------- | ---------------------------------------------------- |
| 다음·이전 게시글        | 좌우 스와이프 또는 ← → 키                            |
| 필터·화면 설정          | 우측 상단 ⚙️ 버튼                                    |
| 스와이프 모드 켜기·끄기 | 우측 상단 🔒/▶ 버튼                                 |
| 시리즈 탐색             | 게시글 하단 **시리즈 바로가기 활성화** 버튼          |
| 스크랩 탐색             | 스크랩 목록의 📁 버튼                                |
| 최근 본 글·이어보기     | 설정의 🕘·📖 탭                                      |
| 구독 채널 탐색          | `/b/my` → ⚙️ → 채널별 필터 설정 → **일괄 탐색 시작** |
| 본 글 건너뛰기          | 게시글 제목 오른쪽 ⏭️ 버튼                           |

최근 본 글은 아카라이브의 [최근 읽은글](https://arca.live/u/recents) 기록을 사용합니다.
이어보기는 현재 브라우저에 탐색 목록과 스크롤 위치를 저장합니다.
기록 관리, 검색, 구독 채널 필터의 자세한 동작은 [사용 안내](./docs/USAGE.md)를 참고하세요.

## 개발

Node.js 22.13 이상인 22.x 또는 24 이상과 npm 10.9 이상이 필요합니다.

```bash
npm ci
npm run dev:live  # 실시간 개발 서버
npm run dev:cdn   # .env의 CDN_URL에서 업데이트받는 개발 빌드
npm run check     # 포맷, 린트, 타입, 테스트, 프로덕션 빌드
```

[개발 안내](./docs/DEVELOPMENT.md)에서 개발 로더 설치, 모바일 연결, HTTPS 프록시 설정과 명령어를 확인할 수 있습니다.

- [UI 테스트](./docs/UI_TESTING.md)
- [프로젝트 구조](./docs/PROJECT_OVERVIEW.md)
- [아키텍처](./docs/ARCHITECTURE.md)
- [성능 측정](./docs/PERFORMANCE.md)
- [기능 TODO](./docs/TODO.md)

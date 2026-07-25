# 아카피드

> 아카라이브를 쇼츠처럼

아카라이브(arca.live)를 쇼츠처럼 스와이프로 게시글을 넘겨볼 수 있게 해주는 유저스크립트입니다.

> [예시영상](https://arca.live/b/bluearchive/149927310)

[TamperMonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ko), [ViolentMonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) 확장프로그램을 통해 사용 가능합니다.

## 기능

- ⌨️ **키보드 단축키** — 좌우 화살표 키로 게시글 이동
- 🔍 **채널별 필터** — 탭, 제목 키워드, 인기글 여부를 채널별로 설정
- 🏠 **홈 시리즈** — 선택한 여러 채널의 글을 하나의 피드로 탐색
- 📚 **시리즈/스크랩 모드** — 연관 게시글이나 스크랩 목록을 연속 탐색
- ⚙️ **UI 설정** — 스크롤바, 스포일러 블러, 게시글 목록 정보, 내비게이션 등 표시/숨김 토글

## 설치

> TamperMonkey

1. [TamperMonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ko) 설치
2. [설치 링크](https://www.tampermonkey.net/script_installation.php#url=https://github.com/Roharui/ArcaFeed/releases/latest/download/ArcaFeed.user.js) 클릭
3. **Install** 버튼 클릭

> Violentmonkey

1. [ViolentMonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) 설치
2. [설치 링크](https://github.com/Roharui/ArcaFeed/releases/latest/download/ArcaFeed.user.js) 클릭
3. **Install** 버튼 클릭

## 사용법

| 동작             | 방법                                      |
| ---------------- | ----------------------------------------- |
| 다음/이전 게시글 | 좌우 스와이프 또는 ← → 화살표 키          |
| 필터/UI 설정     | 우측 상단 ⚙️ 버튼                         |
| Swiper 토글      | 우측 상단 🔒/▶ 버튼                      |
| 시리즈 활성화    | 게시글 하단 "시리즈 바로가기 활성화" 버튼 |
| 스크랩 시리즈    | 스크랩 목록에서 📁 버튼                   |

## 버그 제보

[GitHub Issues](https://github.com/Roharui/ArcaFeed/issues) 탭에서 제보 바랍니다.

## 개발

Node.js 22.13 이상과 npm 10.9 이상이 필요합니다.

```bash
npm ci
npm run dev        # 1회 개발 빌드
npm run dev:watch  # 변경 감시
npm run check      # 포맷, 린트, 타입, 테스트, 프로덕션 빌드
```

프로덕션 유저스크립트는 `dist/ArcaFeed.user.js`에 생성됩니다. 주요 변경
내역은 [CHANGELOG.md](./CHANGELOG.md), 내부 구조와 유지보수 규칙은
[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)를 참고하세요.

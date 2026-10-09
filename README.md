# 아카피드

> 아카라이브를 쇼츠처럼

아카라이브(arca.live)를 쇼츠처럼 스와이프로 게시글을 넘겨볼 수 있게 해주는 유저스크립트입니다.

> [예시영상](https://arca.live/b/bluearchive/149927310)

[TamperMonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=ko), [ViolentMonkey](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) 확장프로그램을 통해 사용 가능합니다.

## 기능

- ⌨️ **키보드 단축키** — 좌우 화살표 키로 게시글 이동
- 🔍 **채널별 필터** — 탭, 제목 키워드, 인기글 여부를 채널별로 설정
- 📚 **시리즈/스크랩 모드** — 연관 게시글이나 스크랩 목록을 연속 탐색
- ⚙️ **UI 설정** — 스크롤바, 스포일러 블러, 게시글 목록 정보, 내비게이션 등 표시/숨김 토글
- ✅ **본 글 표시·건너뛰기** — 접속한 게시글을 즉시 본 글로 기록하고, 다음 글 이동 시 본 글을 건너뛰는 옵션
- 🕘 **최근 본 글·이어보기** — 방문 기록 검색과 채널 필터, 채널/시리즈별 탐색 목록과 스크롤 위치 복원

> 현재 개발 중

- 🏠 **홈 시리즈** — 선택한 여러 채널의 글을 하나의 피드로 탐색

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

| 동작             | 방법                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| 다음/이전 게시글 | 좌우 스와이프 또는 ← → 화살표 키                                        |
| 필터/UI 설정     | 우측 상단 ⚙️ 버튼                                                       |
| Swiper 토글      | 우측 상단 🔒/▶ 버튼                                                    |
| 시리즈 활성화    | 게시글 하단 "시리즈 바로가기 활성화" 버튼                               |
| 스크랩 시리즈    | 스크랩 목록에서 📁 버튼                                                 |
| 최근 본 글       | 설정의 🕘 탭                                                            |
| 이어보기         | 설정의 📖 탭                                                            |
| 본 글 표시       | 방문한 게시글은 목록 제목 오른쪽에 표시하며, UI 설정에서 표시 여부 변경 |
| 본 글 건너뛰기   | 게시글 제목 오른쪽 ⏭️ 버튼으로 켜기/끄기                                |

게시글에 접속하면 머문 시간과 관계없이 바로 본 글로 기록합니다.
빠르게 넘긴 글도 본 글에 포함됩니다. 건너뛰기는 다음 글 이동에만 적용되므로
이전 글로 돌아가거나 목록에서 본 글을 직접 여는 것은 가능합니다.

최근 본 글과 이어보기 탭에서 제목·채널 이름을 검색할 수 있습니다.
이어보기는 시리즈 이름도 검색하며, 여러 검색어를 띄어 쓰면 모두 포함된 기록을 찾습니다.
검색어는 검색창 오른쪽 × 버튼으로 지울 수 있습니다.

기록은 현재 브라우저에 최근 1,000개 글과 20개 탐색 위치까지 저장합니다.
이어보기는 탐색 위치별 최대 2,000개 링크를 보관하며, 일반 탐색 캐시가 정리되어도
마지막 글과 목록을 복원합니다. 스크롤 위치는 이미지 로딩 후에도 최대 5초 동안
복원을 시도하고, 직접 스크롤하거나 화면을 터치하면 위치 보정을 멈춥니다.
방문 기록 화면에서 기록·본 글 표시·이어보기 위치를 함께 삭제할 수 있습니다.

## 버그 제보

[GitHub Issues](https://github.com/Roharui/ArcaFeed/issues) 탭에서 제보 바랍니다.

## 개발

Node.js 22.13 이상과 npm 10.9 이상이 필요합니다.

```bash
npm ci
npm run dev        # 1회 개발 빌드
npm run dev:watch  # 변경 감시
npm run check      # 포맷, 린트, 타입, 프로덕션 빌드
npm run test:performance  # 네트워크·저장·초기화 성능 회귀 검증
npm run bench:performance # 재현 가능한 합성 벤치마크
```

프로덕션 유저스크립트는 `dist/ArcaFeed.user.js`에 생성됩니다. 내부 구조와
유지보수 규칙은 [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)를 참고하세요.
성능 개선 내용과 측정 조건은 [docs/PERFORMANCE.md](./docs/PERFORMANCE.md)에 정리되어 있습니다.

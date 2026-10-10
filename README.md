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
- ✅ **본 글 표시·건너뛰기** — 사이트의 최근 읽은 글을 표시하고, 다음 글 이동 시 본 글을 건너뛰는 옵션
- 🕘 **최근 본 글·이어보기** — 사이트의 최근 읽은 글 검색과 채널 필터, 채널/시리즈별 탐색 목록과 스크롤 위치 복원

- 📡 **구독 채널 일괄 탐색** — `/b/my`에서 채널별 필터를 설정하고 선택한 채널의 글을 하나의 피드로 탐색

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
| 구독 채널 탐색   | `/b/my` → ⚙️ → 채널별 필터 수정 → 일괄 탐색 시작                        |
| 본 글 표시       | 방문한 게시글은 목록 제목 오른쪽에 표시하며, UI 설정에서 표시 여부 변경 |
| 본 글 건너뛰기   | 게시글 제목 오른쪽 ⏭️ 버튼으로 켜기/끄기                                |

최근 본 글과 본 글 판정은 아카라이브의 [최근 읽은글](https://arca.live/u/recents)과
같은 브라우저 기록을 사용하며, 아카피드가 방문 기록을 따로 저장하지 않습니다.
사이트에서 기록 사용을 끄면 본 글 목록도 비워집니다. 건너뛰기는 다음 글 이동에만
적용되므로 이전 글로 돌아가거나 목록에서 본 글을 직접 여는 것은 가능합니다.

구독 채널 설정에서는 채널마다 카테고리, 제목 차단 키워드, 인기글 여부를 수정할 수 있습니다.
**저장**은 설정만 저장하고, **일괄 탐색 시작**은 선택한 채널의 필터를 적용해 최신 글부터
함께 탐색합니다. 필터 편집에서 적용한 뒤 바깥 설정창을 취소하면 변경을 저장하지 않습니다.

최근 본 글과 이어보기 탭에서 제목·채널 이름을 검색할 수 있습니다.
이어보기는 시리즈 이름도 검색하며, 여러 검색어를 띄어 쓰면 모두 포함된 기록을 찾습니다.
검색어는 검색창 오른쪽 × 버튼으로 지울 수 있습니다.

이어보기는 현재 브라우저에 최대 20개 탐색 위치를 저장합니다.
탐색 위치별 최대 2,000개 링크를 보관하며, 일반 탐색 캐시가 정리되어도
마지막 글과 목록을 복원합니다. 스크롤 위치는 이미지 로딩 후에도 최대 5초 동안
복원을 시도하고, 직접 스크롤하거나 화면을 터치하면 위치 보정을 멈춥니다.
방문 기록은 최근 본 글 탭의 **사이트 기록 관리**에서 관리하고, 이어보기 위치는
이어보기 탭에서 따로 삭제할 수 있습니다.

## 버그 제보

[GitHub Issues](https://github.com/Roharui/ArcaFeed/issues) 탭에서 제보 바랍니다.

## 개발

Node.js 22.13 이상과 npm 10.9 이상이 필요합니다.

```bash
npm ci
npm run dev:live   # 로컬 서버 + 변경 감시 + 브라우저 자동 새로고침
npm run dev:live:mobile # 안드로이드 확인용 네트워크 서버 + eruda
npm run dev        # 1회 개발 빌드
npm run dev:watch  # 변경 감시
npm run check      # 포맷, 린트, 타입, 프로덕션 빌드
npm run test:performance  # 네트워크·저장·초기화 성능 회귀 검증
npm run bench:performance # 재현 가능한 합성 벤치마크
```

개발 중에는 `npm run dev:live`를 실행하고
[개발 로더](http://127.0.0.1:3000/ArcaFeed.live.user.js)를 TamperMonkey 또는
ViolentMonkey에 **한 번만 설치**하세요. 설치 화면이 열리지 않으면 해당 URL의
내용을 확장 프로그램의 새 스크립트에 붙여 넣어 저장해도 됩니다.
기존 `ArcaFeed`와 `ArcaFeed-dev`는 끄고 `ArcaFeed-live`만 켠 뒤,
아카라이브 페이지를 새로고침하세요.

이후 `src/`나 `css/`를 저장하면 빌드 완료 후 약 1초 안에 아카라이브 탭이
자동 새로고침되어 최신 코드를 적용합니다. 페이지를 열 때마다 로컬 서버에서
번들을 가져오므로 매번 스크립트를 다시 설치할 필요가 없습니다. 서버가 꺼져
있으면 연결을 재시도하고, 빌드 오류가 있으면 현재 탭을 유지합니다.
실행 오류는 브라우저 콘솔, 빌드 오류는 터미널에서 확인할 수 있습니다.

안드로이드에서 확인하려면 PC에서 `npm run dev:live:mobile`을 실행하세요.
서버가 `0.0.0.0:3000`에서 접속을 받고 eruda 디버거를 포함합니다. 휴대폰에서
`http://<PC의 Tailscale IP 또는 접속 가능한 PC 주소>:3000/ArcaFeed.live.user.js`를
열어 로더를 한 번 설치하세요. 로더는 설치할 때 접속한 주소에서 코드를 가져옵니다.
기존 스크립트를 끄고 아카라이브를 새로고침하면 이후 PC에서 저장할 때마다
휴대폰 탭도 자동으로 새로고침됩니다. 확장 프로그램이 PC 주소의 연결 권한을
물으면 허용하세요. Tailscale 연결과 접근 설정은 별도로 준비해야 합니다.

`npm run dev:live`는 `127.0.0.1`에서만 접속을 받습니다.
특정 주소에서만 접속을 받으려면 `HOST=<PC 주소> npm run dev:live:mobile`,
포트를 바꾸려면 `PORT=3001 npm run dev:live:mobile`로 실행하세요.
접속 주소, 포트 또는 외부 의존성(`@require`)을 바꾸면 로더를 다시 설치해야 하며,
Webpack 설정을 바꿀 때는 서버도 다시 실행해야 합니다.

기본 로더는 `GM_xmlhttpRequest`를 사용하고 `@connect`에는 접속할 PC 주소만
지정합니다. Via의 공식 스크립트 안내에도 이 API가 지원 목록에 있습니다.
([Via 공식 안내](https://github.com/tuyafeng/Via/blob/master/app/src/main/res/values/strings.xml))
설치된 버전에서 API를 지원하지 않거나 사용할 수 없으면 아래 대안을 사용하세요.

**GM API 없는 HTTPS 로더**: 개발 서버를 Tailscale Serve 등의 HTTPS 주소에
연결한 뒤 `DEV_URL=https://<PC의 HTTPS 호스트> npm run dev:live -- --mobile`로
실행하고, 휴대폰에서 `https://<PC의 HTTPS 호스트>/ArcaFeed.fetch.user.js`를
설치하세요. HTTPS 연결 설정은 별도로 준비해야 합니다. 이 로더는 `@grant none`과
표준 `fetch`를 사용하며, 기본 로더도 GM API가 없고 주소가 HTTPS이면 `fetch`로
전환합니다. GM API가 존재하지만 동작하지 않는 환경에서는 별도 fetch 로더를
선택하세요. 로더 두 개를 동시에 켜지 마세요.

nginx가 `location /n`을 개발 서버의 3000번 포트로 프록시하는 경우:

```bash
DEV_URL=https://roharui.duckdns.org/n npm run dev:live:mobile
```

휴대폰에서 `https://roharui.duckdns.org/n/ArcaFeed.fetch.user.js`를 설치하세요.
로더는 `/n/build`를 조회합니다. nginx가 upstream에 `/n`을 유지하거나
제거해서 전달하는 경우 모두 지원합니다. 프록시가 다른 PC에 있어도 접속할
수 있도록 이 명령은 `0.0.0.0:3000`에서 연결을 받습니다.

서버는 `https://arca.live`에만 CORS 응답을 허용하고, 쿠키나 인증 정보를
첨부하지 않습니다. 일반 HTTP 주소는 혼합 콘텐츠 차단 때문에 fetch 로더에서
사용할 수 없습니다. 또한 Via/WebView나 사이트의 CSP가 외부 연결 또는 `eval`을
차단하면 이 대안도 실행되지 않을 수 있습니다. 브라우저 보안 설정을 꺼서 우회하는
방식은 사용하지 않습니다. 실제 설치된 Via에서의 실행 확인은 별도로 필요합니다.

개발 서버에는 별도 인증이 없습니다. 직접 Tailscale IP로 접속할 때는
`HOST=<PC의 Tailscale IP> npm run dev:live:mobile`로 해당 주소에서만 접속을 받게
설정할 수 있습니다. HTTPS 프록시가 같은 PC에서 연결하는 방식이라면 위의
`npm run dev:live -- --mobile`을 사용하여 기본 `127.0.0.1` 바인딩을 유지하세요.

프로덕션 유저스크립트는 `dist/ArcaFeed.user.js`에 생성됩니다. 내부 구조와
유지보수 규칙은 [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)를 참고하세요.
성능 개선 내용과 측정 조건은 [docs/PERFORMANCE.md](./docs/PERFORMANCE.md)에 정리되어 있습니다.

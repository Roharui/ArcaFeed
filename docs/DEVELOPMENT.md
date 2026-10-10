# 개발 안내

Node.js 22.13 이상인 22.x 또는 24 이상과 npm 10.9 이상이 필요합니다.

```bash
npm ci
npm run dev:live          # 로컬 서버 + 변경 감시 + 브라우저 자동 새로고침
npm run dev:live:mobile   # 안드로이드 확인용 네트워크 서버 + eruda
npm run dev:ui            # 모달 미리보기 + 테스트 데이터 + 소스 자동 갱신
npm run dev               # 1회 개발 빌드
npm run dev:watch         # 변경 감시
npm run check             # 포맷, 린트, 타입, 테스트, 프로덕션 빌드
npm run test:performance  # 네트워크·저장·초기화 성능 회귀 검증
npm run bench:performance # 재현 가능한 합성 벤치마크
```

## UI 미리보기

모달 UI는 `npm run dev:ui` 실행 후 <http://127.0.0.1:4317>에서 반복 확인할 수 있습니다.
모바일·데스크톱, 빈 목록·긴 목록, 밝은·어두운 테마, 요청 지연·실패를 재현하며,
Playwright MCP에서 저장된 검사 파일을 실행할 수 있습니다.
사용법과 검증 범위는 [UI_TESTING.md](./UI_TESTING.md)를 참고하세요.

## 실시간 개발

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

## 안드로이드에서 확인

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

## GM API 없는 HTTPS 로더

개발 서버를 Tailscale Serve 등의 HTTPS 주소에
연결한 뒤 `DEV_URL=https://<PC의 HTTPS 호스트> npm run dev:live -- --mobile`로
실행하고, 휴대폰에서 `https://<PC의 HTTPS 호스트>/ArcaFeed.fetch.user.js`를
설치하세요. HTTPS 연결 설정은 별도로 준비해야 합니다. 이 로더는 `@grant none`과
표준 `fetch`를 사용하며, 기본 로더도 GM API가 없고 주소가 HTTPS이면 `fetch`로
전환합니다. GM API가 존재하지만 동작하지 않는 환경에서는 별도 fetch 로더를
선택하세요. 로더 두 개를 동시에 켜지 마세요.

### nginx 프록시 예시

아래의 `dev.example.com`은 예시 주소입니다. 실제 개발 서버 주소로 바꾸세요.
nginx가 `location /n`을 개발 서버의 3000번 포트로 프록시하는 경우:

```bash
DEV_URL=https://dev.example.com/n npm run dev:live:mobile
```

휴대폰에서 `https://dev.example.com/n/ArcaFeed.fetch.user.js`를 설치하세요.
로더는 `/n/build`를 조회합니다. nginx가 upstream에 `/n`을 유지하거나
제거해서 전달하는 경우 모두 지원합니다. 프록시가 다른 PC에 있어도 접속할
수 있도록 이 명령은 `0.0.0.0:3000`에서 연결을 받습니다.

## 연결 제한과 바인딩

서버는 `https://arca.live`에만 CORS 응답을 허용하고, 쿠키나 인증 정보를
첨부하지 않습니다. 일반 HTTP 주소는 혼합 콘텐츠 차단 때문에 fetch 로더에서
사용할 수 없습니다. 또한 Via/WebView나 사이트의 CSP가 외부 연결 또는 `eval`을
차단하면 이 대안도 실행되지 않을 수 있습니다. 브라우저 보안 설정을 꺼서 우회하는
방식은 사용하지 않습니다. 실제 설치된 Via에서의 실행 확인은 별도로 필요합니다.

개발 서버에는 별도 인증이 없습니다. 직접 Tailscale IP로 접속할 때는
`HOST=<PC의 Tailscale IP> npm run dev:live:mobile`로 해당 주소에서만 접속을 받게
설정할 수 있습니다. HTTPS 프록시가 같은 PC에서 연결하는 방식이라면 위의
`npm run dev:live -- --mobile`을 사용하여 기본 `127.0.0.1` 바인딩을 유지하세요.

## 빌드와 관련 문서

프로덕션 유저스크립트는 `dist/ArcaFeed.user.js`에 생성됩니다. 내부 구조와
유지보수 규칙은 [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md)를 참고하세요.
성능 개선 내용과 측정 조건은 [PERFORMANCE.md](./PERFORMANCE.md)에 정리되어 있습니다.

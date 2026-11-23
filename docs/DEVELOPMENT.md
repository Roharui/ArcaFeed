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
[개발 로더](http://127.0.0.1:3000/RuliFeed.live.user.js)를 TamperMonkey 또는
ViolentMonkey에 **한 번만 설치**하세요. 설치 화면이 열리지 않으면 해당 URL의
내용을 확장 프로그램의 새 스크립트에 붙여 넣어 저장해도 됩니다.
기존 `RuliFeed`와 `RuliFeed-dev`는 끄고 `RuliFeed-live`만 켠 뒤,
루리웹 페이지를 새로고침하세요.

이후 `src/`나 `css/`를 저장하면 빌드 완료 후 약 1초 안에 루리웹 탭이
자동 새로고침되어 최신 코드를 적용합니다. 페이지를 열 때마다 로컬 서버에서
번들을 가져오므로 매번 스크립트를 다시 설치할 필요가 없습니다. 라이브 서버는
인라인 소스 맵을 제외한 번들을 축소하고 클라이언트가 gzip을 지원하면 압축해 전송합니다.
이미 설치한 로더의 실행 시점을 `document-start`로 갱신하려면 로더를 한 번 다시 설치하세요. 서버가 꺼져
있으면 연결을 재시도하고, 빌드 오류가 있으면 현재 탭을 유지합니다.
실행 오류는 브라우저 콘솔, 빌드 오류는 터미널에서 확인할 수 있습니다.

## 안드로이드에서 확인

안드로이드에서 확인하려면 PC에서 `npm run dev:live:mobile`을 실행하세요.
서버가 `0.0.0.0:3000`에서 접속을 받습니다. 모바일 빌드는 화면 초기화 후 eruda 디버거를 불러옵니다. 휴대폰에서
`http://<PC의 Tailscale IP 또는 접속 가능한 PC 주소>:3000/RuliFeed.live.user.js`를
열어 로더를 한 번 설치하세요. 로더는 설치할 때 접속한 주소에서 코드를 가져옵니다.
기존 스크립트를 끄고 루리웹를 새로고침하면 이후 PC에서 저장할 때마다
휴대폰 탭도 자동으로 새로고침됩니다. 확장 프로그램이 PC 주소의 연결 권한을
물으면 허용하세요. Tailscale 연결과 접근 설정은 별도로 준비해야 합니다.

`npm run dev:live`는 `127.0.0.1`에서만 접속을 받습니다.
특정 주소에서만 접속을 받으려면 `HOST=<PC 주소> npm run dev:live:mobile`,
포트를 바꾸려면 `PORT=3001 npm run dev:live:mobile`로 실행하세요.
접속 주소, 포트 또는 외부 의존성(`@require`)을 바꾸면 로더를 다시 설치해야 하며,
Webpack 설정을 바꿀 때는 서버도 다시 실행해야 합니다.

기본 로더는 `GM_xmlhttpRequest`를 사용하고 `@connect`에는 접속할 PC 주소만
지정합니다.

## 연결 제한과 바인딩

서버는 `https://bbs.ruliweb.com`에만 CORS 응답을 허용하고, 쿠키나 인증 정보를
첨부하지 않습니다. 개발 서버에는 별도 인증이 없습니다. 직접 Tailscale IP로 접속할 때는
`HOST=<PC의 Tailscale IP> npm run dev:live:mobile`로 해당 주소에서만 접속을 받게
설정할 수 있습니다.

## 빌드와 관련 문서

프로덕션 유저스크립트는 `dist/RuliFeed.user.js`에 생성됩니다. 내부 구조와
유지보수 규칙은 [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)를 참고하세요.
성능 개선 내용과 측정 조건은 [PERFORMANCE.md](./PERFORMANCE.md)에 정리되어 있습니다.

## 저장소 검증

영속 데이터는 IndexedDB `RuliFeed` 버전 2의 settings·channelFilters·navigationSessions·resumeSessions·progress·lists·meta에서 확인합니다. 객체를 직접 저장하며 progress와 lists는 `[kind, id]` 복합 키를 사용합니다. 최초 실행은 v1 values와 RuliFeed localStorage 데이터를 업그레이드 트랜잭션 안에서 이전합니다. 사이트 방문 기록은 사이트 소유 localStorage, 탭별 이동 전달은 sessionStorage를 사용합니다. `node tests/indexed-storage.test.mjs`는 실제 소스와 fake-indexeddb로 이전·롤백·선택적 로드·레코드별 병합·보관 한도·동시 준비와 커밋 대기를 검증합니다. 실제 브라우저 검증과 목록 저장 비교는 [UI 테스트](UI_TESTING.md)의 저장소 검사 절차를 사용합니다.

## ADB로 Rui Browser에서 확인

연결된 기기에서 Rui Browser의 유저스크립트를 활성화합니다. Rui Browser 저장소의 ADB 설치 도구를 사용합니다.

```bash
npm run dev -- --env BUNDLE=true
python3 ../Soul/patches/adb_userscript.py ../dist/RuliFeed.dev.user.js
adb shell am start -a android.intent.action.VIEW -d https://m.ruliweb.com/community/board/300143 -p com.mycompany.app.soulbrowser.memoryfix
```

좌측 하단 플로팅 버튼의 **루리피드 설정**을 열고 가로 스와이프로 게시판에서 첫 글, 첫 글에서 다음 글로 이동하는지 확인합니다. `BUNDLE=true`는 Rui Browser가 페이지 외부 라이브러리를 따로 읽지 않아도 실행할 수 있도록 Swiper와 Toastify를 빌드에 포함합니다.

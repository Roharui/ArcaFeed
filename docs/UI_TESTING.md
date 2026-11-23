# UI 테스트 도구

루트 또는 각 앱에서 UI 미리보기 서버를 실행해 모달·탐색 버튼·저장소 동작을 반복 검증할 수 있습니다.

```bash
npm run dev:ui:arca   # ArcaFeed UI 미리보기 (http://127.0.0.1:4317)
npm run dev:ui:ruli   # RuliFeed UI 미리보기 (http://127.0.0.1:4317)
```

<http://127.0.0.1:4317>에서 모드, 데이터 양, 테마, 카테고리 응답 상태, 화면 크기를 선택합니다.
포트는 `PORT=4318 npm run dev:ui:arca`처럼 변경합니다.

`FeedCore/src/`, 앱의 `src/`, `css/`, 테스트 데이터 코드를 저장하면 Webpack이 다시 빌드하고 미리보기가 자동으로 갱신됩니다. 화면에 현재 빌드 해시와 시간이 표시되며, 빌드 오류가 있는 번들은 제공하지 않습니다.

이 도구는 실제 모달 생성 코드와 CSS, 로컬에 설치된 의존성을 사용하므로 계정·사이트 접속·유저스크립트 확장프로그램이 필요하지 않습니다. 게시글 이동과 일괄 탐색의 실제 네트워크·페이지 전환은 `dev:live`로 별도 확인합니다.

## Playwright MCP 자동 검사

서버를 실행한 다음 Playwright MCP의 `browser_navigate`로 <http://127.0.0.1:4317>을 열고, `browser_run_code_unsafe`에 해당 앱의 검사 스크립트를 전달합니다.

```json
{ "filename": "ArcaFeed/scripts/check-ui.mjs" }
```

```json
{ "filename": "RuliFeed/scripts/check-ui.mjs" }
```

검사 항목:

- 데스크톱·모바일·가로 화면 × 지원 모드 × 데이터 양 × 테마 조합
- 최초 선택한 탭만 생성되는지, 탭 선택 시 생성과 재사용, 80% 높이, 본문 스크롤, 가로 넘침, 하단 버튼 잘림·간격
- 최근 본 글 검색·검색어 삭제·채널 필터·더 보기
- 탭 이동 시 스크롤 초기화, 설정 저장, Escape 닫기 (`ArcaFeed`는 UI 설정·이어보기·구독 채널 필터 편집 포함)
- 카테고리 요청 실패와 늦은 응답 취소

결과는 각 앱의 `.cache/ui-results/report.json`과 대표/실패 화면 PNG에 기록됩니다. 결과의 `passed`가 `true`인지, 검사 전후 빌드 해시가 동일한지 확인하세요.

서버와 테스트 데이터의 회귀 검사는 다음 명령으로 실행합니다.

```bash
npm --prefix ArcaFeed run test:ui:server
npm --prefix RuliFeed run test:ui:server
```

## 독립 탐색 목록 확인

미리보기의 설정창을 닫으면 고정 탐색 버튼(RuliFeed는 좌측 하단 플로팅 제어 스택)을 확인할 수 있습니다.

- `ArcaFeed`: `.nav-control` 고정·숨김·크기 변경 시 버튼 위치 재계산, PC hover 표시, 모바일 버튼 주변 12px 터치 시 1.5초 표시를 확인합니다.
- `RuliFeed`: 좌측 하단 플로팅 제어 스택(스와이프 전환·루리피드 설정·탐색 목록)의 배치와 가로 넘침 여부를 확인합니다.
- 공통: 목록 첫·중간·마지막 글 및 100개 이후 현재 글 중앙 표시, 목록 열기·채널 필터·앞뒤 더 보기·닫기와 키보드 포커스 이동을 확인합니다.

탐색 버튼 전용 자동 검사는 Playwright MCP에서 `ArcaFeed/scripts/check-navigation-ui.mjs` 또는 `RuliFeed/scripts/check-navigation-ui.mjs`를 실행합니다. 목록 로딩 중 테두리 애니메이션, 동시 요청 완료 시 로딩 해제, 동작 줄이기 설정, 별도 `.fetch-loader` 미생성을 검증합니다.

## 넓은 화면의 여백 클릭 확인

실제 게시글·채널 화면에서 폭을 1024px 이상으로 설정하고 본문 너비보다 넓게 만듭니다.

- 본문 왼쪽 여백 클릭은 이전 글, 오른쪽 여백 클릭은 다음 글 스와이프를 실행합니다(채널 목록에서는 오른쪽 클릭으로 탐색 시작).
- 본문·링크·버튼·입력 컨트롤·여백 드래그·글자 선택·수정키·열린 모달/패널·비활성 스와이프·전환/이동 중 상태에서는 동작하지 않아야 합니다.
- 폭 1024px 미만에서는 여백 클릭으로 이동하지 않아야 합니다.

## 좌우 드래그 확인

- 마우스와 터치로 긴 게시글을 드래그하고 누른 상태에서 방향을 바꿔 본문이 양방향 움직임을 연속해서 따라오는지 확인합니다.
- 짧게 드래그해 복귀할 때 기존에 재생 중이던 HTML 영상만 이어서 재생되는지 확인합니다.
- 터치로 세로 스크롤과 핀치 확대가 동작하고, 드래그·전환 중 `.swiper-wrapper`에 `will-change: transform`이 적용되었다가 정지 시 해제되는지 확인합니다.
- 댓글과 하단 목록이 긴 게시글에서 드래그 후 아래로 스크롤해 지연 렌더링 영역과 `iframe` 임베드가 정상 표시되는지 확인합니다.

## IndexedDB 브라우저 검사

로컬 UI 서버를 실행하고 Playwright MCP에서 `/fixture`를 연 뒤 `ArcaFeed/scripts/check-storage.mjs` 또는 `RuliFeed/scripts/check-storage.mjs`를 실행합니다. 새 브라우저 context의 localhost 테스트 DB만 사용하며 실제 사이트 데이터에는 접근하지 않습니다. v1 이전, 객체 레코드, 지연 목록 로드, 위치 저장, 이름·고정 보존, 삭제 복구 및 저장 방식별 벤치마크를 검증합니다.

## 모바일 배경 탭의 저장 잠금 확인

Soul Browser처럼 이전 글의 WebView를 배경에 보관하는 브라우저에서 실제 기기로 확인합니다.

- 채널에서 게시글을 열고 다음·이전 글을 여러 번 스와이프할 때 새 글에서도 Swiper와 탐색 버튼이 정상 초기화되는지 확인합니다.
- 탭 전환·앱 전환 중 진행하던 IndexedDB 조회·저장이 중단되어 다른 활성 탭의 저장을 막지 않고, 복귀 시 중단된 작업이 최신 DB 값으로 재개되는지 확인합니다.

`node ArcaFeed/tests/indexed-storage.test.mjs` 및 `node RuliFeed/tests/indexed-storage.test.mjs`는 실제 저장 모듈과 `fake-indexeddb`로 잠금 해제, 복귀 재시도, 타 탭 필드 보존과 `pagehide` 상태의 새 트랜잭션 지연을 검증합니다.

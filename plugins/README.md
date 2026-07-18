# ArcaFeed Plugins

ArcaFeed의 보조 기능을 위한 독립형 플러그인 모음입니다.
각 플러그인은 별도의 userscript로 빌드되어 독립적으로 동작합니다.
빌드 결과물은 루트 `dist/` 폴더에 출력됩니다.

## 디렉토리 구조

```
plugins/
├── shared/           # 공통 유틸리티 (releaseUrl 헬퍼 등)
│   └── release.js
├── sample/           # 예제 플러그인 (API 사용법 데모)
│   ├── src/
│   │   ├── index.ts      # 독립 빌드 진입점 (IIFE 래퍼)
│   │   └── plugin.ts     # 핵심 로직 (통합 빌드용 export)
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.prod.js
├── series/           # 시리즈 플러그인 (게시글 시리즈 바로가기 UI)
│   ├── src/
│   │   ├── index.ts
│   │   └── plugin.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.prod.js
├── scrap/            # 스크랩 플러그인 (스크랩 시리즈 버튼)
│   ├── src/
│   │   ├── index.ts
│   │   └── plugin.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── webpack.config.prod.js
├── .gitignore
└── README.md
```

## 작동 방식

- 각 플러그인은 ArcaFeed와 **별도의 userscript**로 빌드됩니다.
- `window.__arcaFeed.eventBus`를 통해 메인 ArcaFeed와 이벤트 기반 통신을 합니다.
- `plugin.ts`는 통합 개발 빌드(`npm run dev`)에서 사용되는 핵심 로직을 export 합니다.
- `index.ts`는 독립 배포용 IIFE 래퍼입니다.

## 새 플러그인 추가

```bash
# 1. sample 폴더를 복사하여 새 플러그인 생성
cp -r plugins/sample plugins/my-feature

# 2. package.json, webpack config에서 이름 수정
#    - "name": "arcafeed-plugin-my-feature"
#    - userscript headers의 name, description
#    - output filename (예: arcafeed-my-feature.user.js)

# 3. src/plugin.ts에 핵심 로직 작성 (export function initXxxPlugin)
#    src/index.ts에서 import하여 IIFE로 감싸기

# 4. 의존성 설치 및 빌드
cd plugins/my-feature
npm install
npm run build    # 결과물은 루트 dist/ 폴더에 생성됨
```

## 기존 플러그인

| 플러그인 | 설명 |
|----------|------|
| [sample](./sample) | 예제 플러그인 - EventBus API 사용법을 보여줍니다 |
| [series](./series) | 시리즈 플러그인 - 게시글 페이지에서 시리즈 바로가기 UI와 시리즈 모드 활성화 버튼을 제공합니다 |
| [scrap](./scrap) | 스크랩 플러그인 - 스크랩 목록 페이지에서 스크랩 시리즈 모드 버튼을 제공합니다 |

# ArcaFeed Plugins

ArcaFeed의 보조 기능을 위한 독립형 플러그인 모음입니다.
각 플러그인은 별도의 userscript로 빌드되어 독립적으로 동작합니다.

## 디렉토리 구조

```
plugins/
├── sample/          # 예제 플러그인 (API 사용법 데모)
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── webpack.config.dev.js
│   ├── webpack.config.prod.js
│   └── dist/         # 빌드 결과물
├── .gitignore
└── README.md
```

## 작동 방식

- 각 플러그인은 ArcaFeed와 **별도의 userscript**로 빌드됩니다.
- `window.__arcaFeed.eventBus`를 통해 메인 ArcaFeed와 이벤트 기반 통신을 합니다.

## 새 플러그인 추가

```bash
# 1. sample 폴더를 복사하여 새 플러그인 생성
cp -r plugins/sample plugins/my-feature

# 2. package.json, webpack config에서 이름 수정
#    - "name": "arcafeed-plugin-my-feature"
#    - userscript headers의 name, description
#    - output filename

# 3. 의존성 설치 및 개발
cd plugins/my-feature
npm install
npm run dev
```

## 기존 플러그인

| 플러그인 | 설명 |
|----------|------|
| [sample](./sample) | 예제 플러그인 - EventBus API 사용법을 보여줍니다 |



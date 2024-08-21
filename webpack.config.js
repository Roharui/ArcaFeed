// webpack.config.js 
const path = require('path')

module.exports = {
    // 파일을 읽기 위한 진입점 설정
    entry: './src/index.js',

    // 번들을 반환하는 설정
    output: {
        path: path.resolve(__dirname, 'dist'), // 절대경로여야 한다. 그에 따라 require('path') 모듈을 가져와서 사용한다. __dirname은 현재 경로를 의미한다. 그리고 'dist'(기본설정)라는 폴더에서
        filename: 'dist.js', // // 해당 파일로 내어준다.
        clean: true // 루트 변경 시 기존 파일 삭제 여부
    }
}
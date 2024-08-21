const fs = require('fs');
const http = require('http');

http.createServer((req, res) => {
	res.write(fs.readFileSync("./dist/dist.js"));
	res.end();
}).listen(3000);
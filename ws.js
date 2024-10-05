import WebSocket, { WebSocketServer } from 'ws';
import chokidar from 'chokidar'

import fs from "fs";
import { exec } from 'child_process';

const wss = new WebSocketServer({ port: 5500, path: "/ws" });

wss.on('connection', function connection(ws) {
    console.log("server : CONNECT")

    ws.on('error', console.error);

    ws.on('message', function message(data, isBinary) {
        console.log("server: RELOAD RUN")
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data, { binary: isBinary });
            }
        });
    });
});

const wc = new WebSocket("ws://localhost:5500/ws")
wc.addEventListener("open", () => {
    console.log("client : CONNECT");
});

const watcher = chokidar.watch("./src")

let mutex = false

watcher
    .on("change", function (path) {
        if (mutex) return;

        mutex = true;

        console.log('filename provided: ' + path);

        exec('npm run build', (err, stdout, stderr) => {
            mutex = false;
            if (err) return;

            console.log("client: RELOAD REQUEST")
            wc.send("reload")
        });
    })

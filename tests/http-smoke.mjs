import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../dist");
const server = http.createServer((request, response) => {
  const target = request.url === "/" ? "index.html" : request.url.replace(/^\//, "");
  const file = path.join(dist, target);
  if (!file.startsWith(dist) || !fs.existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": target.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain" });
  fs.createReadStream(file).pipe(response);
});

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const body = await response.text();
  if (!response.ok || !body.includes("自分で体験してみる")) {
    server.close();
    throw new Error("HTTP smoke test failed");
  }
  console.log("PASS: index.html served over HTTP.");
  server.close();
});

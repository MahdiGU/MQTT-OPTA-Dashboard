import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd(), "dist");
createServer(async (request, response) => {
  try {
    const path = request.url === "/" ? "/index.html" : request.url;
    const body = await readFile(join(root, path));
    response.writeHead(200, { "Content-Type": path.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Serve the exact WebView bundle used by the Android app so the browser
// preview and the installed APK always show the same interface.
const root = join(process.cwd(), "app", "src", "main", "assets");
createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const path = pathname === "/" ? "/index.html" : pathname;
    const body = await readFile(join(root, path));
    response.writeHead(200, { "Content-Type": path.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));

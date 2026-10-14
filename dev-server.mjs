import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".md": "text/plain" };
createServer(async (request, response) => {
  const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const file = normalize(join(root, requested));
  if (!file.startsWith(root)) { response.writeHead(403); response.end("Forbidden"); return; }
  try { response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }); response.end(await readFile(file)); }
  catch { response.writeHead(404); response.end("Not found"); }
}).listen(4177, "127.0.0.1", () => console.log("Lonnster Sonion running at http://127.0.0.1:4177"));

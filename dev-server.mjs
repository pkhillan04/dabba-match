// Local test server: `npm run dev`, then open http://localhost:3000
// Serves public/ and runs api/dishes.js the same way Vercel does.
// Reads secrets from .env.local (never commit that file).
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// Minimal .env.local loader (KEY=value per line)
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const api = await import("./api/dishes.js");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname === "/api/dishes") {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const ctl = new AbortController();
        res.on("close", () => { if (!res.writableFinished) ctl.abort(); });
        const request = new Request(url, {
          method: req.method,
          headers: { "content-type": req.headers["content-type"] || "application/json", "x-forwarded-for": req.socket.remoteAddress || "local" },
          body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
          signal: ctl.signal,
        });
        const handler = req.method === "POST" ? api.POST : api.GET;
        const response = await handler(request);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        if (response.body) for await (const chunk of response.body) res.write(chunk);
        return res.end();
      }
      const rel = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
      const file = join(root, "public", rel);
      if (!file.startsWith(join(root, "public"))) { res.writeHead(403); return res.end(); }
      const data = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(data);
    } catch (e) {
      if (!res.headersSent) res.writeHead(e.code === "ENOENT" ? 404 : 500);
      res.end(e.code === "ENOENT" ? "Not found" : "Server error");
    }
  })
  .listen(PORT, () => {
    console.log(`Dabba Match running at http://localhost:${PORT}  (AI provider: ${process.env.AI_PROVIDER || "gemini"})`);
  });

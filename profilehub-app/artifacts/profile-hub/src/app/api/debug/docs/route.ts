import type { NextRequest } from "next/server";
import { isDebugAuthEnabled } from "@/lib/debug-auth-tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ProfileHub Debug Auth Tests</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f7f7f7; }
      .debug-bar {
        align-items: center;
        background: #111827;
        color: #ffffff;
        display: flex;
        gap: 12px;
        padding: 12px 16px;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .debug-bar input {
        border: 1px solid #374151;
        border-radius: 6px;
        flex: 1;
        font-size: 14px;
        padding: 8px 10px;
      }
      .debug-bar button {
        background: #2563eb;
        border: 0;
        border-radius: 6px;
        color: #ffffff;
        cursor: pointer;
        font-size: 14px;
        padding: 8px 12px;
      }
      .debug-status {
        background: #fef3c7;
        color: #78350f;
        font: 14px system-ui, sans-serif;
        padding: 10px 16px;
      }
      #swagger-ui { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div class="debug-bar">
      <strong>Debug Swagger</strong>
      <input id="debug-secret" type="password" placeholder="x-debug-secret" autocomplete="off" />
      <button id="load-docs" type="button">Load Swagger</button>
    </div>
    <div id="debug-status" class="debug-status">Temporary debug endpoint. Disable after testing.</div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      const secretInput = document.getElementById("debug-secret");
      const statusEl = document.getElementById("debug-status");
      const loadButton = document.getElementById("load-docs");

      async function loadSwagger() {
        const debugSecret = secretInput.value.trim();
        if (!debugSecret) {
          statusEl.textContent = "Enter x-debug-secret first.";
          return;
        }

        statusEl.textContent = "Loading OpenAPI spec...";
        const response = await fetch("/api/debug/openapi.json", {
          headers: { "x-debug-secret": debugSecret },
          cache: "no-store"
        });

        if (!response.ok) {
          statusEl.textContent = "Could not load Swagger. Check ENABLE_DEBUG_AUTH_TESTS and x-debug-secret.";
          return;
        }

        const spec = await response.json();
        document.getElementById("swagger-ui").innerHTML = "";
        window.ui = SwaggerUIBundle({
          spec,
          dom_id: "#swagger-ui",
          deepLinking: true,
          persistAuthorization: false,
          tryItOutEnabled: true,
          requestInterceptor: (request) => {
            request.headers["x-debug-secret"] = debugSecret;
            return request;
          },
          presets: [
            SwaggerUIBundle.presets.apis
          ]
        });
        statusEl.textContent = "Swagger loaded. Use Try it out on POST /api/debug/supabase-key-test.";
      }

      loadButton.addEventListener("click", loadSwagger);
      secretInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") loadSwagger();
      });
    </script>
  </body>
</html>`;

export async function GET(request: NextRequest) {
  if (!isDebugAuthEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

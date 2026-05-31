import type { NextRequest } from "next/server";
import { isAuthorizedDebugRequest } from "@/lib/debug-auth-tests";

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
      #swagger-ui { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      const debugSecret = window.prompt("x-debug-secret");
      window.ui = SwaggerUIBundle({
        url: "/api/debug/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: false,
        tryItOutEnabled: true,
        requestInterceptor: (request) => {
          if (debugSecret) request.headers["x-debug-secret"] = debugSecret;
          return request;
        },
        presets: [
          SwaggerUIBundle.presets.apis
        ]
      });
    </script>
  </body>
</html>`;

export async function GET(request: NextRequest) {
  if (!isAuthorizedDebugRequest(request)) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

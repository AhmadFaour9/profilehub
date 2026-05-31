import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedDebugRequest } from "@/lib/debug-auth-tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ProfileHub Debug Auth Tests",
    version: "0.1.0",
    description: "Temporary debug endpoint. Disable after testing.",
  },
  paths: {
    "/api/debug/supabase-key-test": {
      post: {
        summary: "Read-only test of pasted Supabase keys",
        description:
          "Temporary debug endpoint. Disable after testing. Paste Supabase keys in the request body; full key values are never returned.",
        security: [{ DebugSecret: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["supabaseUrl", "keys"],
                properties: {
                  supabaseUrl: {
                    type: "string",
                    format: "uri",
                    example: "https://PROJECT_REF.supabase.co",
                  },
                  keys: {
                    type: "array",
                    minItems: 1,
                    maxItems: 10,
                    items: {
                      type: "object",
                      required: ["name", "value"],
                      properties: {
                        name: {
                          type: "string",
                          example: "service_role_jwt",
                        },
                        value: {
                          type: "string",
                          format: "password",
                          example: "eyJhbGciOi...",
                        },
                      },
                    },
                  },
                },
              },
              examples: {
                pastedKeys: {
                  value: {
                    supabaseUrl: "https://PROJECT_REF.supabase.co",
                    keys: [
                      {
                        name: "publishable",
                        value: "sb_publishable_...",
                      },
                      {
                        name: "secret",
                        value: "sb_secret_...",
                      },
                      {
                        name: "service_role_jwt",
                        value: "eyJhbGciOi...",
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Safe read-only Supabase key test result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ok", "testedKeys"],
                  properties: {
                    ok: { type: "boolean" },
                    testedKeys: {
                      type: "array",
                      items: {
                        type: "object",
                        required: [
                          "name",
                          "maskedKey",
                          "type",
                          "jwtRole",
                          "jwtRef",
                          "jwtExpExists",
                          "canReadProfiles",
                          "status",
                          "error",
                        ],
                        properties: {
                          name: {
                            type: "string",
                          },
                          maskedKey: {
                            type: ["string", "null"],
                            example: "sb_sec...abcd",
                          },
                          type: {
                            type: "string",
                            enum: [
                              "sb_publishable",
                              "sb_secret",
                              "jwt_service_role",
                              "jwt_anon",
                              "jwt_other",
                              "unknown",
                              "missing",
                            ],
                          },
                          jwtRole: {
                            type: ["string", "null"],
                          },
                          jwtRef: {
                            type: ["string", "null"],
                          },
                          jwtExpExists: { type: "boolean" },
                          canReadProfiles: { type: "boolean" },
                          status: {
                            type: ["number", "null"],
                            example: 200,
                          },
                          error: {
                            anyOf: [
                              {
                                type: "object",
                                required: ["code", "message"],
                                properties: {
                                  code: { type: "string" },
                                  message: { type: "string" },
                                },
                              },
                              { type: "null" },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid request body" },
          "404": { description: "Debug tests disabled or unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      DebugSecret: {
        type: "apiKey",
        in: "header",
        name: "x-debug-secret",
      },
    },
  },
};

export async function GET(request: NextRequest) {
  if (!isAuthorizedDebugRequest(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(openApiDocument, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

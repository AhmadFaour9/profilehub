import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAuthorizedDebugRequest, testSupabaseKeysReadOnly } from "@/lib/debug-auth-tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  supabaseUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
      } catch {
        return false;
      }
    }, "Enter a valid https://*.supabase.co URL."),
  keys: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(4096),
      })
    )
    .min(1)
    .max(10),
});

export async function POST(request: NextRequest) {
  if (!isAuthorizedDebugRequest(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const testedKeys = await testSupabaseKeysReadOnly(parsed.data);

  return NextResponse.json(
    {
      ok: true,
      testedKeys,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

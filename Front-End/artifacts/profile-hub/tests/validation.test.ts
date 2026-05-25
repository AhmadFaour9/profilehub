import { describe, expect, it } from "vitest";
import { httpUrlSchema, sanitizeText, usernameSchema } from "../src/lib/validation";

describe("validation", () => {
  it("accepts safe username slugs", () => {
    expect(usernameSchema.parse("Sara-Design_24")).toBe("sara-design_24");
  });

  it("rejects reserved or unsafe usernames", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("-bad").success).toBe(false);
    expect(usernameSchema.safeParse("bad-").success).toBe(false);
  });

  it("allows only http and https URLs", () => {
    expect(httpUrlSchema.safeParse("https://example.com/work").success).toBe(true);
    expect(httpUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(httpUrlSchema.safeParse("data:text/html;base64,abc").success).toBe(false);
  });

  it("strips html from text input", () => {
    expect(sanitizeText("Hello <script>alert(1)</script> world")).toBe("Hello alert(1) world");
  });
});

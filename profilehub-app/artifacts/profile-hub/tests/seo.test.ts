import { describe, expect, it } from "vitest";

import { metadata as rootMetadata } from "../src/app/layout";

describe("site SEO metadata", () => {
  it("includes the critical global SEO fields", () => {
    expect(rootMetadata).toMatchObject({
      title: expect.objectContaining({
        default: expect.stringContaining("ProfileHub"),
      }),
      description: expect.stringContaining("professional profile"),
      keywords: expect.arrayContaining([
        "ProfileHub",
        "professional profile",
        "personal branding",
      ]),
      openGraph: expect.objectContaining({
        siteName: "ProfileHub",
        type: "website",
      }),
      twitter: expect.objectContaining({
        card: "summary_large_image",
      }),
      alternates: expect.objectContaining({
        canonical: "/",
      }),
    });
  });
});

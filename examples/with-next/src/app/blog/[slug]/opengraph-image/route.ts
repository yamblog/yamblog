import { createOgImageHandler } from "@yamblog/next";
import { blog } from "@/lib/blog";

// A plain route handler (not Next's opengraph-image.tsx file convention), so it
// is linked from the post metadata through the `ogImage` option in ../page.tsx.
// Unknown slugs get a 404.
export const GET = createOgImageHandler(blog, { siteName: "Yamblog Example" });

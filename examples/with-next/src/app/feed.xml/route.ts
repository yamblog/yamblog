import { createRssHandler } from "@yamblog/next";
import { blog } from "@/lib/blog";

export const GET = createRssHandler(blog, {
  title: "Yamblog Example",
  description: "A blog powered by Yamblog",
  author: "Your Name",
});

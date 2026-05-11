import { defineBlog, resolvePath } from "@yamblog/core";

export const blog = defineBlog(resolvePath(import.meta.url, "../../content/posts"));

import { defineBlog } from '@yamblog/core';

export const blog = defineBlog('src/content/posts', import.meta.env.SITE_URL);

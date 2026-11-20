---
'@yamblog/react': patch
'@yamblog/next': patch
---

Update `react-markdown` from 9 to 10. `MarkdownRenderer` and the Next.js `BlogPostPage` render the same output and keep the same props (`components`, `remarkPlugins`, `rehypePlugins`); neither passes the `className` prop that react-markdown 10 removed. If you also import `react-markdown` directly in your app, note that its own `className` prop is gone in 10: wrap it in an element instead.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { serializeJsonLd } from "@yamblog/core";
import { generatePostMetadata, generateBlogJsonLd } from "@yamblog/next";
import { blog } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await blog.getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // findPostBySlug returns null for an unknown slug; any other error (invalid
  // frontmatter, unreadable file) still throws and fails the build.
  const post = await blog.findPostBySlug(slug);
  if (!post) return {};
  return generatePostMetadata(post, {
    siteUrl: blog.siteUrl,
    basePath: blog.basePath,
    siteName: "Yamblog Example",
    // Served by ./opengraph-image/route.ts
    ogImage: `${blog.basePath}/${post.slug}/opengraph-image`,
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await blog.findPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = generateBlogJsonLd(post, { siteUrl: blog.siteUrl, basePath: blog.basePath });
  const adjacent = await blog.getAdjacentPosts(slug);

  return (
    <>
      {/* serializeJsonLd escapes "<", so a "</script>" in a title cannot break out */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <main className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
        <p className="text-sm text-zinc-500 mb-8">
          {post.date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}{" "}
          &middot; {post.readingTime} min read &middot; {post.author}
        </p>
        <article className="prose dark:prose-invert max-w-none">
          {/* react-markdown shows raw HTML as text; do not add rehype-raw for untrusted posts */}
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>
        <div className="mt-12 flex justify-between text-sm text-zinc-500">
          {adjacent.prev && (
            <a href={`${blog.basePath}/${adjacent.prev.slug}`} className="hover:underline">
              &larr; {adjacent.prev.title}
            </a>
          )}
          {adjacent.next && (
            <a href={`${blog.basePath}/${adjacent.next.slug}`} className="ml-auto hover:underline">
              {adjacent.next.title} &rarr;
            </a>
          )}
        </div>
      </main>
    </>
  );
}

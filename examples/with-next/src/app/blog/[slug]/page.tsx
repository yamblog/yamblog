import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { generatePostMetadata, generateBlogJsonLd } from "@yamblog/next";
import { blog } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await blog.getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let post;
  try {
    post = await blog.getPostBySlug(slug);
  } catch {
    return {};
  }
  return generatePostMetadata(post, { siteUrl: blog.siteUrl, siteName: "Yamblog Example" });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  let post;
  try {
    post = await blog.getPostBySlug(slug);
  } catch {
    notFound();
  }

  const jsonLd = generateBlogJsonLd(post, { siteUrl: blog.siteUrl });
  const adjacent = await blog.getAdjacentPosts(slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-3">{post.title}</h1>
        <p className="text-sm text-zinc-500 mb-8">
          {post.date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          &middot; {post.readingTime} min read &middot; {post.author}
        </p>
        <article className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>
        <div className="mt-12 flex justify-between text-sm text-zinc-500">
          {adjacent.prev && (
            <a href={`/blog/${adjacent.prev.slug}`} className="hover:underline">
              &larr; {adjacent.prev.title}
            </a>
          )}
          {adjacent.next && (
            <a href={`/blog/${adjacent.next.slug}`} className="ml-auto hover:underline">
              {adjacent.next.title} &rarr;
            </a>
          )}
        </div>
      </main>
    </>
  );
}

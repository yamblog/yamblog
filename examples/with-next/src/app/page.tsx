import Link from "next/link";
import { blog } from "@/lib/blog";

export default async function Home() {
  const featured = await blog.getFeaturedPosts();
  const posts = featured.length > 0 ? featured : (await blog.getPosts()).slice(0, 3);

  return (
    <main className="max-w-2xl mx-auto px-4 py-24">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Yamblog</h1>
      <p className="text-zinc-500 mb-12">A blogging platform for the agentic AI era.</p>

      <ul className="flex flex-col gap-8">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/blog/${post.slug}`} className="group">
              <h2 className="text-lg font-semibold group-hover:underline">{post.title}</h2>
            </Link>
            <p className="text-sm text-zinc-500 mt-0.5">
              {post.date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              &middot; {post.readingTime} min read
            </p>
            {post.excerpt && (
              <p className="mt-1 text-zinc-600 dark:text-zinc-400 text-sm">{post.excerpt}</p>
            )}
          </li>
        ))}
      </ul>

      <Link
        href="/blog"
        className="inline-block mt-12 text-sm font-medium underline underline-offset-4"
      >
        All posts &rarr;
      </Link>
    </main>
  );
}

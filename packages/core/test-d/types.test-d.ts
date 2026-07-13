/**
 * Type-level tests — checked by `bun run typecheck` (tsconfig.typetest.json),
 * never executed. They prove that a custom Zod schema's fields flow through
 * defineBlog/createBlog to every method that returns posts, sync and async,
 * with zero casts, and that the default schema still works with no generic.
 */
import { z } from 'zod';
import { defineBlog, createBlog, defaultSchema, PostNotFoundError } from '../src/index.js';
import type { Post, Blog, AdjacentPosts } from '../src/index.js';

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type ExpectTrue<T extends true> = T;
const expectType = <T>(_value: T): void => void 0;

// ---------------------------------------------------------------------------
// Custom schema: fields are typed on every post-returning method, no casts
// ---------------------------------------------------------------------------
const projectSchema = defaultSchema.extend({
  company: z.string(),
  technologies: z.array(z.string()),
  url: z.string().url().optional(),
});

const projects = defineBlog({ contentDir: 'content/projects', schema: projectSchema });

async function customSchemaAsync() {
  const all = await projects.getPosts();
  expectType<string>(all[0]!.company);
  expectType<string[]>(all[0]!.technologies);
  expectType<string | undefined>(all[0]!.url);
  // Engine fields still present
  expectType<string>(all[0]!.slug);
  expectType<number>(all[0]!.readingTime);

  const one = await projects.getPostBySlug('x');
  expectType<string>(one.company);

  const maybe = await projects.findPostBySlug('x');
  expectType<string | undefined>(maybe?.company);

  expectType<string>((await projects.getPostsByCategory('c'))[0]!.company);
  expectType<string>((await projects.getPostsByTag('t'))[0]!.company);
  expectType<string>((await projects.getFeaturedPosts())[0]!.company);
  expectType<string>((await projects.search('q'))[0]!.company);
  expectType<string>((await projects.getRelatedPosts('x'))[0]!.company);
  expectType<string>((await projects.validateContent())[0]!.company);

  const adjacent = await projects.getAdjacentPosts('x');
  expectType<string | undefined>(adjacent.prev?.company);
  expectType<string | undefined>(adjacent.next?.company);
}

function customSchemaSync() {
  expectType<string>(projects.getPostsSync()[0]!.company);
  expectType<string>(projects.getPostBySlugSync('x').company);
  expectType<string | undefined>(projects.findPostBySlugSync('x')?.company);
  expectType<string>(projects.getPostsByCategorySync('c')[0]!.company);
  expectType<string>(projects.getPostsByTagSync('t')[0]!.company);
  expectType<string>(projects.getFeaturedPostsSync()[0]!.company);
  expectType<string>(projects.searchSync('q')[0]!.company);
  expectType<string>(projects.getRelatedPostsSync('x')[0]!.company);
  expectType<string>(projects.validateContentSync()[0]!.company);
  expectType<string | undefined>(projects.getAdjacentPostsSync('x').prev?.company);
}

// createBlog carries the generic the same way
const viaCreate = createBlog({ contentDir: 'x', schema: projectSchema });
expectType<Blog<typeof projectSchema>>(viaCreate);

// ---------------------------------------------------------------------------
// Zero-config / string-arg overloads still resolve to the default schema
// ---------------------------------------------------------------------------
const zeroConfig = defineBlog();
const stringArg = defineBlog('content/posts');
const stringWithUrl = defineBlog('content/posts', 'https://example.com');

type _ZeroIsDefault = ExpectTrue<Equal<typeof zeroConfig, Blog<typeof defaultSchema>>>;
type _StringIsDefault = ExpectTrue<Equal<typeof stringArg, Blog<typeof defaultSchema>>>;
type _StringUrlIsDefault = ExpectTrue<Equal<typeof stringWithUrl, Blog<typeof defaultSchema>>>;

async function defaultSchemaFields() {
  const post = await zeroConfig.getPostBySlug('x');
  expectType<string>(post.title);
  expectType<Date>(post.date);
  expectType<string[]>(post.tags);
  expectType<boolean>(post.featured);
  // @ts-expect-error — custom fields don't exist on the default schema
  post.company;
}

// Post with no generic equals Post<typeof defaultSchema>
type _PostDefault = ExpectTrue<Equal<Post, Post<typeof defaultSchema>>>;
type _AdjacentDefault = ExpectTrue<Equal<AdjacentPosts, AdjacentPosts<typeof defaultSchema>>>;

// findPostBySlug is nullable; getPostBySlug is not
async function nullability() {
  const found = await zeroConfig.findPostBySlug('x');
  type _Nullable = ExpectTrue<Equal<typeof found, Post<typeof defaultSchema> | null>>;
  const strict = await zeroConfig.getPostBySlug('x');
  type _NotNullable = ExpectTrue<Equal<typeof strict, Post<typeof defaultSchema>>>;
}

// PostNotFoundError narrows and exposes the slug
function errorNarrowing(err: unknown) {
  if (err instanceof PostNotFoundError) {
    expectType<string>(err.slug);
    expectType<string>(err.message);
  }
}

// Silence unused-symbol noise: reference everything once
void customSchemaAsync;
void customSchemaSync;
void defaultSchemaFields;
void nullability;
void errorNarrowing;

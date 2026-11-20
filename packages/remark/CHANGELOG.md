# @yamblog/remark

## 1.2.0

### Minor Changes

- f88e46d: Security and correctness fixes for the remark plugins and `toHtml`. Nothing is removed or renamed, and new behaviour that could change a working site is opt-in.

  **New options**

  - `toHtml(markdown, { sanitize: true })`: for content you do not fully trust. Raw HTML is not passed through. Script-capable elements, `on*`, `style` and `srcdoc` attributes, and `javascript:`/`data:`/`vbscript:` URLs are removed. The built-in YouTube, Vimeo and CodePen embeds keep working. The default stays `false`, so raw HTML is still passed through verbatim. The README now has a "Content trust" section explaining when to use each mode.
  - `remarkToc({ ids: true })`: gives every heading an `id` (github-slugger, the same algorithm as GitHub and `rehype-slug`, with Unicode support and de-duplication) and points the TOC links at those ids, so TOC links work without `rehype-slug`. By default no ids are added and links keep the previous slugs.
  - `remarkInteractive({ components, output })`:
    - `components` is an allow-list of directive names. Other text directives are restored to their source text, so prose such as `a:b` is no longer mangled.
    - Without `components`, a bare text directive glued to the end of a word (no `[label]`, no `{attributes}`), such as `:b` in `a:b` or `:alert` in `javascript:alert(1)`, is restored to its text instead of becoming `<b></b>`. Standalone `:name` and directives with a label or attributes are converted as before.
    - `output: 'element'` emits real elements, so react-markdown no longer needs `rehype-raw`, the output survives `sanitize`, and `on*` attributes are dropped.
    - Every directive is still converted by default. New exports: `RemarkInteractiveOptions`, `REFUSED_DIRECTIVE_NAMES`, `EmbedElement`.

  **Behaviour changes (bug fixes)**

  - `remarkEmbed`: built-in providers now emit a real `<iframe>` element instead of a raw `html` node. Embeds now render in react-markdown and `MarkdownRenderer` without `rehype-raw`; before, they showed as literal iframe source text. The `toHtml` output is the same iframe, but attribute order differs and Vimeo iframes gain `title="Vimeo video"`. Markdown serialisation via `remark()` still writes the iframe HTML. Custom providers keep their `html` string API, and can add an optional `element` function to get the same benefits.
  - `remarkEmbed`: provider URLs must now start with `http(s)://` and the provider's host (any subdomain). So `https://evil.example/?u=vimeo.com/123` is no longer embedded. The CodePen user segment is limited to `[A-Za-z0-9_-]`, which closes an attribute-injection hole.
  - `remarkInteractive`:
    - Directives named `script`, `iframe`, `object`, `embed`, `style`, `link`, `meta` or `base` are never converted. They are left as plain directives, and text directives are restored to their text.
    - Converted non-void elements now get an explicit closing tag (`<counter-demo start="0"></counter-demo>` instead of `<counter-demo start="0" />`). An HTML parser does not treat `<x />` as self-closing, so the element used to swallow the content that followed it.
    - Container directive children and `[label]` text are now kept instead of being deleted.
    - `&` in attribute values is escaped.
  - `remarkToc`: a placeholder heading nested in a blockquote or list is now replaced in place. Before, the wrong top-level node was deleted. When several placeholders exist, the first one is replaced, as documented, instead of the last.

  **Packaging**

  - `exports` gains a `default` condition (so `require()` works on Node versions with require(esm)) and `./package.json`.
  - `sideEffects: false`.
  - `src` is published so source maps resolve.
  - The `remark` and `remark-directive` peers are now optional. `toHtml` uses neither, and `remark-directive` is only needed for `remarkInteractive`.
  - `github-slugger` is a new dependency.

## 1.1.1

### Patch Changes

- d44c4d4: The TOC plugin's `heading` option is now matched as literal text — regex metacharacters (e.g. `C++ Guide`, `Contents (overview)`) no longer throw or silently fail to match. Also removes dead code and adds package metadata (repository, homepage, bugs) so the npm page links back to GitHub.

## 1.1.0

### Minor Changes

- 3257b4e: version bump

## 1.0.1

### Patch Changes

- Initial release with npm publishing setup

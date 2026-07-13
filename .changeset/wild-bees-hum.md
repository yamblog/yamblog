---
"@yamblog/remark": patch
---

The TOC plugin's `heading` option is now matched as literal text — regex metacharacters (e.g. `C++ Guide`, `Contents (overview)`) no longer throw or silently fail to match. Also removes dead code and adds package metadata (repository, homepage, bugs) so the npm page links back to GitHub.

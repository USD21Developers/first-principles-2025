# Offline scripture library

The app bundles individual passage JSON files, not a complete Bible database.
The reader constructs an exact filename from each `data-scripture` reference.
Single-verse files do not automatically supply a multi-verse range.
The existing service-worker generator precaches these files for offline reading
after a successful cache installation.

## Provenance

The inherited English files identify their translation as NIV. The repository
does not document their original import process or verify all their source text.
The reader's Bible Gateway link alone is not proof of their original source.

Romans 3:24 and the combined Romans 3:23–25 passage were checked against:
https://www.biblegateway.com/passage/?search=Romans%203%3A23-25&version=NIV

The existing verse 23 and verse 25 files were retained unchanged and reused
verbatim in the combined range. The new files include their verification URL.
Do not claim that this single-passage verification validates the entire library.

The app owner confirmed permission to include NIV text for offline use.
This confirmation does not establish permission for other translations or uses.
Publisher guidance: https://www.biblica.com/permissions

## Coverage checks

From the workspace root:

```sh
pnpm --filter @workspace/first-principles run audit:scriptures
pnpm --filter @workspace/first-principles run audit:scriptures --locale=en --study=light-darkness-legacy
node --test artifacts/first-principles/scripts/*.test.mjs
```

The audit checks exact file availability, explicitly disabled references, JSON
validity, metadata, and complete ordered verse sequences. It reads each page's
actual HTML language, including `pt-eu` pages using `pt` scripture files. It
does not contact an external service or alter files. A nonzero exit status means
issues need review; existing findings are not suppressed or treated as successes.
With `--study`, only that study's references and their passage files are checked.
Empty text may represent an intentional translation-specific omission (for
example Acts 8:37 in NIV), not necessarily missing source material. Verify such
cases against the edition before editing them.

Coverage is not a guarantee of textual accuracy, copyright compliance, or a
fully populated Bible. New text still needs verification against an authorized
source. After adding files, regenerate the worker through the normal build.

# Editorial guidance

## Voice

Plain, accurate, unsensational. The histories speak loudly enough on their own;
our job is to set them down carefully and source them honestly.

## Depth

- `summary` — one sentence, ≤ 280 characters. The hook, not the article.
- `description_md` — 200–600 words. Markdown is supported (paragraphs, **bold**,
  *italic*, `[links](url)`, `> blockquotes`, headings). No raw HTML.
- More-than-600-word essays belong in linked external sources, not here.

## Citations

Every site should carry at least one citable source — a book, an archive
record, a journal article, or a peer-reviewed online resource. Wikipedia is
fine as a way in but not as the sole source. Format:

```
{ "type": "book",    "citation": "Carretta, V. (2015). Ignatius Sancho.", "url": null }
{ "type": "archive", "citation": "TNA PROB 11/...", "url": "https://discovery.nationalarchives.gov.uk/..." }
```

`type` is one of: `book`, `archive`, `journal`, `web`, `oral`.

## Image rights matrix

The validator rejects any media item missing `credit`, `license`, and
`rights_holder`. Common cases:

| Source | Default licence | Reproduce in-app? | Link out only? |
|---|---|---|---|
| **National Portrait Gallery** | `CC-BY-NC-4.0` (most images) | Thumb only, with credit | Yes for full image |
| **Historic England Archive** | Bespoke licence | Check per asset | Default to link-out |
| **Black Cultural Archives** | Bespoke; ask first | Only with explicit permission | Default to link-out |
| **Wikimedia Commons (PD / CC-BY)** | Per asset (PD or CC-BY) | Yes, with credit | Optional |
| **Layers of London** | Bespoke; varies | Check per asset | Default to link-out |
| **English Heritage Blue Plaques** | Crown copyright on some assets | Check per asset | Link to plaque page |

When in doubt: link out, do not embed.

## What we exclude

- Unsourced claims, however charming.
- Material that risks "outing" living individuals from private records.
- Promotional material for venues that have no historical claim.
- Anything that would not survive thirty seconds of a Black historian's
  scrutiny.

## Voice checklist

- [ ] Does the summary survive being quoted out of context?
- [ ] Is every claim traceable to a source you've named?
- [ ] Are people named with their full preferred name on first mention?
- [ ] Does the description avoid euphemism for slavery, racism, or violence?
- [ ] Does it credit the contributor and the rights holder for every image?

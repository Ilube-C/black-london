# Nubian Jak ingestion

One-off import of Nubian Jak plaques from [Open Plaques](https://openplaques.org/organisations/nubian_jak), 23 Oct 2026.
Code: `scripts/adapters/openplaques.mjs`. Source notes: `data-source/openplaques/README.md`.

## Result

- 70 plaques on Open Plaques
- 51 added as `draft` sites
- 2 linked to existing sites (no new site)
- 9 skipped: no location
- 7 skipped: outside London
- 3 new boroughs: Waltham Forest, Ealing, Bromley

## Fixed by hand

| Issue | Fix |
|---|---|
| Names copied titles and honours from Open Plaques ("Sir Lord Learie Constantine MBE", "Dennis Emmanuel Brown CD") | Shortened to the common name, slugs to match (15 sites) |
| Plaques naming several people or albums ("Bob Marley and others") | Named after the main subject |
| Equiano plaque at Maze Hill had no subject, so it was named after the inscription | Renamed, linked to `olaudah-equiano` |
| Years like "1945-81" and "c1778 - 1823" not read | Parser fixed in the adapter |
| Plaques with no life dates (events, businesses, Leslie Palmer) had no period | Added from the inscription (8 sites). Russell Henderson's end year (2015) isn't on the plaque: check it |
| Themes guessed from keywords: some wrong ("Nurse" in George Padmore's name gave `medicine`), 4 empty | Corrected (17 sites) |
| People not linked to `people.json` | Linked Mary Prince, Coleridge-Taylor, Harold Moody, Equiano |

## Open

- [ ] **Summaries are the plaque inscriptions word for word.** Rewrite as one plain sentence each.
- [ ] **9 plaques have no location:** Stephen Lawrence, Daphne Steele, Winifred Atwell (second plaque), Darcus Howe, Cecil Belfield-Clarke, Evelyn Dove, James Baldwin, Denise Johnson, Smiley Culture. Find the address and add coordinates.
- [ ] **Check 2 links to existing sites.** The Sancho plaque (King Charles Street) was merged into `ignatius-sancho-charles-st`; the Claudia Jones plaque (Tavistock Road) into `notting-hill-carnival-origin`. Confirm, or split into their own sites.
- [ ] **Harold Moody and Coleridge-Taylor now have two sites each** (home and plaque). Fine, but cross-link them.
- [ ] **Only 33 of 51 have a photo.** The rest only have Flickr photos with NC/ND licences, which we can't reuse.
- [ ] **Draft cards say "awaiting C. Ilube verification".** Reviews will queue on one person. Change the wording or share the review.
- [ ] **Publish:** set `status` to `published` and `verification.confidence` once each site is reviewed.

## Updates

`.github/workflows/openplaques-check.yml` checks Open Plaques every Monday and opens an `openplaques` issue when plaques are added, changed or removed.

# Schema reference

Authoritative source: the JSON Schemas in [`schemas/`](../schemas/). This
document is a human-readable summary.

## Site (`sites.geojson`)

GeoJSON `Feature`. `geometry` is `Point` for plaques/buildings; `Polygon` is
allowed for venues or areas.

| Field | Type | Required | Notes |
|---|---|:-:|---|
| `id` | string | ✓ | `site_<borough>_<digits>` — stable, never reused |
| `slug` | string | ✓ | URL-safe; appears in `#/site/<slug>` |
| `name` | string | ✓ | Plain text, 2–200 chars |
| `name_alt` | string[] | | Alternative names / aliases |
| `kind` | enum | ✓ | `plaque`, `building`, `area`, `memorial`, `burial`, `institution`, `event_site` |
| `summary` | string | ✓ | One sentence, ≤ 280 chars |
| `description_md` | string | | Markdown body, 200–600 words |
| `borough` | string | ✓ | Must be one of `themes.json:boroughs` |
| `address` | string | | |
| `period.start_year` | integer | | |
| `period.end_year` | integer | | |
| `period.era` | string | | Must be one of `themes.json:eras` |
| `themes` | string[] | ✓ | Slugs from `themes.json:themes` |
| `people` | string[] | | Slugs from `people.json` |
| `media` | array | | See *Media* |
| `sources` | array | | See *Sources* |
| `external_ids` | object | | e.g. `{ wikidata: "Q706854" }` |
| `accessibility` | object | | `step_free`, `viewable_from_street`, `indoor`, `opening_hours`, `notes` |
| `contributor` | object | ✓ | `{ name, affiliation?, orcid?, submitted_at }` — no `email` |
| `verification` | object | ✓ | `{ verified_by, verified_at, confidence }` |
| `status` | enum | ✓ | `draft`, `published`, `retired` |
| `license` | string | | Per-feature override; default CC-BY-4.0 |

### Media item

```json
{
  "type": "image",
  "src": "/media/sites/<slug>/hero.jpg",
  "thumb": "/media/sites/<slug>/thumb.webp",
  "alt": "Portrait of …",
  "credit": "National Portrait Gallery, NPG 1976",
  "license": "CC-BY-NC-4.0",
  "rights_holder": "NPG"
}
```

`type` ∈ `image`, `audio`, `video`, `embed`. **`credit`, `license`,
`rights_holder` are all required.** The validator rejects orphan rights.

### Sources

`type` ∈ `book`, `archive`, `journal`, `web`, `oral`. Must include `citation`;
`url` is optional.

## Event (`events.geojson`)

GeoJSON `Feature` with `Point` geometry (or `null` for online events).

Required: `id`, `name`, `summary`, `starts_at`, `venue_name`, `themes`,
`status`, `contributor`, `verification`. ISO 8601 timestamps with timezone.
`recurrence` is an `RRULE` string.

`related_sites` is the editorial linkage to a site (an event surfaces near
related sites in the bottom sheet).

## Restaurant (`restaurants.geojson`)

GeoJSON `Feature` with `Point` geometry.

Required: `id`, `name`, `cuisine`, `borough`, `status`, `contributor`,
`verification`. `cuisine` slugs come from `themes.json:cuisines`.
`related_themes` boost matches when surfacing nearby a Black History site.

## Person (`people.json`)

Object keyed by slug:

```json
{
  "ignatius-sancho": {
    "name": "Charles Ignatius Sancho",
    "birth_year": 1729,
    "death_year": 1780,
    "summary": "...",
    "wikidata": "Q706854"
  }
}
```

## Themes & taxonomy (`themes.json`)

Controlled vocabularies. The validator rejects any feature that references a
theme/era/cuisine/borough not present here. Add new entries at PR time.

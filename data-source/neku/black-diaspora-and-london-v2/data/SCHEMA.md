# Data schema

[Home](../README.md) · [How this atlas was made](../METHODOLOGY.md)

The atlas's records are published twice, with identical content:

- `atlas.json`: one JSON file with a top-level object holding `title`, `schema_version`, `edition`, `generated`, `notes` and one array for each record type below.
- `csv/`: one CSV file for each record type, with the same fields in the same order.

**Equivalence rules.** In the CSV files, a list is written as a JSON array (for example `["SRC-0001", "SRC-0119"]`) and an empty or missing value is written as an empty cell; in `atlas.json` the same values are JSON arrays and `null`. All files are UTF-8.

**Identifiers** are permanent. They have the form `PER-0001`, `PLC-0001`, `EVT-0001`, `ORG-0001`, `WRK-0001`, `REL-0001`, `CLM-0001` and `SRC-0001`. Gaps in the numbering belong to records not included in this edition; numbers are never reused.

## people (`csv/people.csv`)

| Field | Meaning |
| :--- | :--- |
| `id` | `PER-` identifier |
| `canonical_name` | Name used in the atlas |
| `aliases` | Other names and spellings found in the sources (list) |
| `birth_date`, `death_date` | ISO date (`YYYY-MM-DD`, `YYYY-MM` or `YYYY`), or empty |
| `birth_date_precision`, `death_date_precision` | `day`, `month`, `year` or `unknown` |
| `origins`, `roles`, `themes` | Descriptive lists |
| `place_ids`, `event_ids`, `organisation_ids`, `work_ids`, `related_person_ids` | Records that appear in the person's biography (lists) |
| `verification_status` | `editorially_reviewed` for every person in this edition |
| `last_reviewed` | Date of the final editorial review |
| `biography_file` | Path of the biography |

The same values appear in the front matter at the top of each biography.

## places (`csv/places.csv`)

| Field | Meaning |
| :--- | :--- |
| `id` | `PLC-` identifier |
| `historical_name` | Name of the place as the sources give it |
| `category` | Kind of place (for example `residence`, `office`, `theatre`, `district`) |
| `historical_address` | Address as the sources give it, or empty where the sources give none |
| `location_precision` | How closely the sources identify the place: `building`, `campus`, `precinct`, `street_address`, `street_segment` or `district` |
| `coordinate_status` | `not_geocoded` for every place in this edition |
| `latitude`, `longitude` | Empty for every place: no coordinates have been established |
| `source_ids` | Sources that describe the place itself (list); the sources for each person's connection with it are in `claim_sources` and `relationships` |

## events (`csv/events.csv`)

`id` (`EVT-`), `name`, `date_start` (ISO date or empty) and `date_precision` (`day`, `month`, `year` or `unknown`). The places and people connected with an event are given by the relationship records.

## organisations (`csv/organisations.csv`) and works (`csv/works.csv`)

`id` (`ORG-` or `WRK-`) and `name` or `title`.

## claims (`csv/claims.csv`)

A claim is one sourced statement about a person.

| Field | Meaning |
| :--- | :--- |
| `id` | `CLM-` identifier |
| `subject_id` | The person the claim is about |
| `predicate` | The kind of statement (for example `resided_at`, `attended_event`, `founded`, `birth_year`) |
| `object` | An identifier, or a short text value where the object is not a record (for example `Trinidad`) |
| `claim_text` | The statement in words |
| `date`, `date_precision` | When it applies; `date_precision` is `day`, `month`, `year`, `range` (`date` is then `start/end`), `circa_year` or `unknown` |
| `evidence_status` | `explicitly_documented`, or `disputed` where the sources disagree and the claim text gives both versions |

## claim_sources (`csv/claim_sources.csv`)

One row for each source cited for a claim: `claim_id`, `source_id` and `locator` (page, section or document reference, usually with a short quotation).

## relationships (`csv/relationships.csv`)

| Field | Meaning |
| :--- | :--- |
| `id` | `REL-` identifier |
| `source_id`, `target_id` | The two linked records; `source_id` is always a person |
| `type` | The kind of link (for example `collaborated_with`, `member_of`, `resided_at`, `shared_event`) |
| `directness` | `direct`, or `indirect` where the link is only shared presence at an event |
| `intermediate_entity_ids` | For indirect links, the event through which the two are linked (list) |
| `date`, `date_precision` | As for claims |
| `evidence_status` | `explicitly_documented`, `disputed` or `documented_shared_context` (shared presence only) |
| `evidence_summary` | The evidence in words |
| `claim_ids` | The claims the relationship rests on (list) |
| `evidence_source_ids` | Consulted sources that support it (list); always a subset of the sources of its claims |

## sources (`csv/sources.csv`)

| Field | Meaning |
| :--- | :--- |
| `id` | `SRC-` identifier |
| `creators`, `title`, `type`, `archive_or_publisher`, `date` | Bibliographic details |
| `identifier` | URL, DOI, ISBN or archive reference |
| `consultation` | How the source was consulted: `copy_consulted`, `open_access_consulted`, `published_article_consulted`, `publisher_preview_consulted` or `catalogue_consulted` |

## entity_aliases (`csv/entity_aliases.csv`)

Other names for records: `entity_id`, `alias`, `alias_type` (`name_variant`, `spelling_variant`, `abbreviation`, `title_variant`, `later_name` or `building_name`) and `source_ids` (list; empty where the alias is the record's own abbreviation or a name already given in the person's record).


## Fields added in the second edition

| Record type | Field | Meaning |
| :--- | :--- | :--- |
| people, places, events, organisations, works | `tier` | `full`, `standard` or `short`: the length of the entry |
| people, places, events, organisations, works, relationships | `summary` | One-sentence summary used in lists |
| people, places, events, organisations, works, sources | `entry_file` | Path of the entry in the Markdown archive |
| places | `present_day`, `present_day_sources`, `present_day_asof` | The site today, only from an official record, with the record and the date it was checked; otherwise empty |
| places | `latitude`, `longitude`, `national_grid_reference`, `position_source_id`, `position_precision` | A position, only where an official record gives a grid reference; latitude and longitude are converted from the National Grid (WGS84). `coordinate_status` is then `official_grid_reference` |
| works | `date`, `texts` | Date of the work; sources through which the text can be read |
| relationships | `documentation_class`, `page_file` | How the link is documented (personal connection, link between a person and a record, or indirect association); path of its page |
| sources | `shelf`, `accessed`, `note` | Library shelf (`original`, `periodicals`, `archival`, `secondary`); date consulted online, where recorded; editorial note |

New relationship type: `interviewed` (a published conversation). New records: relationships REL-0190 to REL-0197, claims CLM-0227 to CLM-0234, sources SRC-0155 to SRC-0160.

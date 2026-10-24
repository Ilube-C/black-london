# BCA events

Daily pipeline: `scripts/adapters/bca-events.mjs`, run by `.github/workflows/bca-events.yml`.

1. Event list from BCA's RSS feed (`blackculturalarchives.org/events?format=rss`).
2. Each event page's Eventbrite link.
3. Time, venue and coordinates from the Eventbrite API (`EVENTBRITE_TOKEN` secret).

**Rule: no venue, no pin.** BCA's own pages have no location, so we never guess one. An event is skipped if it has no Eventbrite link, is online, has no venue coordinates, is outside London, is cancelled or has ended. Each run lists what it skipped and why.

Changes arrive as a PR from the `data/bca-events` branch. Hand-made events in `events.geojson` are never touched.

## Known gaps

- [ ] Exhibitions (e.g. *The Forgotten Generations*) have no Eventbrite link, so they're skipped.
- [ ] Online events are dropped. Add them if we build an online list.

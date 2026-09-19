# Romhacking.com discovery recommendations

Captured 2026-09-19 from the public Romhacking.com browse API: first ten results
for Downloads descending and Rating descending. The site's deployed frontend
uses ten results per request and defaults to `mature=no`, `includePrivate=true`,
and `includeUnapproved=true`. Exact API URLs and ranked project IDs are recorded
in `sources/rhdc-recommendations.json`. These are a dated snapshot, not live scores.

The builder emits two source-scoped custom categories: **RHDC Most Downloaded**
and **RHDC Highest Rated**. Existing client Recommended ordering already puts
exact-base entries with a curated claim ahead of unclaimed exact-base entries,
then sorts that tier alphabetically. Thus these projects move into the promoted
tier; the UI does not reproduce the website's numerical rank order. Name and
Newest sorting are unaffected. Canonical slot selections are unchanged.

There are 18 distinct projects across the two pages. Fourteen are eligible,
covering 16 retained catalog records (Star Road and Serene Fusion each have two
source records). Shotgun Mario and SM64 Land retain their SM64 Romhacks source
catalogs; the RHDC ranking does not relabel their patch provenance.

Four projects cannot be promoted into the published catalog yet:

- B3313 Internal Plexus: its known 96 MiB output is excluded by the current
  78 MiB client limit. B3313 Unabandoned is a separate eligible project.
- Mario Builder 64: no verified release admitted.
- Mystery of the Capsmith Demo: no verified release admitted.
- Star Revenge 6.25: Luigi's Adventure DX: no verified release admitted.

Popularity applies to the project, not a claim that our retained version is
the latest, console-compatible, or equivalent to another release. No missing
patch identities are invented, and existing publication exclusions still apply.

Refresh by checking the site's current page size/defaults, capturing both API
pages, reviewing explicit entry mappings and gaps, and running the publication
tests. Publish with a new signed sequence after review.

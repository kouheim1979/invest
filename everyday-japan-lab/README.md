# Everyday Japan Lab

English guides and transparent planning tools. This directory is a **development preview**, not the production advertising host. All generated HTML keeps `noindex,nofollow`.

## Build and check

```sh
python3 everyday-japan-lab/scripts/research.py
python3 everyday-japan-lab/scripts/build.py
node --test everyday-japan-lab/tests/models.test.mjs
python3 everyday-japan-lab/tests/site.py
```

Edit original guide text in `scripts/content.py`, layouts/forms in `scripts/build.py`, and shared presentation/logic in `assets/`. Commit generated HTML with the sources. There are no npm dependencies, analytics, external fonts or API calls in the site.

The editorial inventory contains 110 screened ideas with explicit evidence limits. It does not assert that every candidate is widely adopted or commercially validated. See `research/STRATEGY-JA.md`, `research/candidates.csv`, `research/top10.json` and `research/sources.json`.

Run `python3 everyday-japan-lab/scripts/export_blogger.py` after building to create a self-contained migration pack. An actual Blogger account and URL are still needed to test the platform integration, canonical tags, privacy configuration and any future advertising.

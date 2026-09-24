# Everyday Japan Lab

**Publication paused at the owner’s request (2026-09-25 JST).** Blogger reader access is authors only and search visibility is off. Development and legacy HTML show a pause notice. Source content is retained. `preview_paused` in `deployment/blogger.json` prevents a normal build from republishing it; do not resume without the owner’s instruction.

English guides and transparent planning tools. This directory is a **development preview**, not the production advertising host. All generated HTML keeps `noindex,nofollow`.

## Build and check

```sh
python3 everyday-japan-lab/scripts/research.py
python3 everyday-japan-lab/scripts/build.py
node --test everyday-japan-lab/tests/*.test.mjs
python3 everyday-japan-lab/tests/site.py
```

Edit original guide text in `scripts/content.py`, layouts/forms in `scripts/build.py`, and shared presentation/logic in `assets/`. Commit generated HTML with the sources. There are no npm dependencies, analytics, external fonts or API calls in the site.

The editorial inventory contains 110 screened ideas with explicit evidence limits. It does not assert that every candidate is widely adopted or commercially validated. See `research/STRATEGY-JA.md`, `research/candidates.csv`, `research/top10.json` and `research/sources.json`.

Run `python3 everyday-japan-lab/scripts/export_blogger.py` after building to create the self-contained Blogger update pack. The live site is `https://everydayjapanlab.blogspot.com/`; start with `/p/home.html`. All 23 pages and the shared tool gadget are published, and their actual URLs are recorded in `deployment/published-pages.json`. Reuse those pages when updating them.

See `deployment/STATUS-JA.md` and `deployment/live-audit.json` for verified results and remaining work. The root introduction post is pending because the editing session's automatic approval review blocked actions while its save state was unverified. The eight-link navigation is live. AdSense is not connected, and GA4 and affiliate tracking are not enabled. Publishing content is not AdSense approval.

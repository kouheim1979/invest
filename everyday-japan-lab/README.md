# Everyday Japan Lab

**Blogger publication resumed at the owner’s request (2026-09-25 JST).** Reader access is public. Search visibility remains off because automatic approval review rejected that separate discoverability change; explicit authorization is pending. The development and legacy preview HTML remain paused, and `preview_paused` stays enabled.

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

While the development preview is paused, run `python3 everyday-japan-lab/scripts/build.py --manifest-only` to refresh the export content without changing any preview HTML or assets. Then run `python3 everyday-japan-lab/scripts/export_blogger.py` to create the self-contained Blogger update pack. The public Blogger site is `https://everydayjapanlab.blogspot.com/`; start with `/p/home.html`. All 23 fixed pages, the shared tool gadget and one introductory post are public, and their actual URLs are recorded in `deployment/published-pages.json`. Reuse those pages when updating them.

See `deployment/STATUS-JA.md` and `deployment/release-audit.json` for current results and remaining work; earlier audit files are historical. The root introduction post is saved and published; its actual URL is recorded in `deployment/blogger.json`. The eight-link navigation is live. AdSense is not connected, and GA4 and affiliate tracking are not enabled. Publishing content is not AdSense approval.

Public-facing attribution uses the Everyday Japan Lab name. Personal account links are not used as the contact route. The owner-supplied site contact email is configured in `deployment/blogger.json` and used by Contact and Privacy. Mail delivery and the sender display name still need owner verification. Repository ownership and historical commits are not anonymized by this content change.

# Action Plan

- URL: `https://www.hackingdream.net/`
- Overall score: `63/100`

## Priority Fixes

1. **No Organization/Person entity found in JSON-LD.**
   - Priority: `Critical`
   - Area: `Schema`
   - Evidence: See audit output.
   - Fix: Add Organization or Person schema with name, url, logo, and sameAs properties.
2. **Missing H1 on page**
   - Priority: `Critical`
   - Area: `environment`
   - Evidence: No primary content heading was detected, which weakens topical clarity.
   - Fix: In Blogger templates, keep exactly one content H1 per page (post title on posts, site headline on homepage).
3. **4 security headers missing**
   - Priority: `Critical`
   - Area: `environment`
   - Evidence: Missing headers reduce trust and can expose the site to browser/security risks.
   - Fix: Blogger cannot set most response headers directly. Add Cloudflare in front and configure Response Header Transform Rules.
4. **Title tag needs optimization**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: Title length/content is likely suboptimal for rankings and click-through.
   - Fix: In Blogger, update Theme -> Edit HTML and add tags in the <head> section (title template, meta description, OG/Twitter tags).
5. **No llms.txt found**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: AI crawlers and assistants have no curated machine-readable guidance for key pages.
   - Fix: Blogger cannot natively serve arbitrary root files. Serve /llms.txt via Cloudflare Workers/Pages or reverse-proxy route.
6. **Social meta tags are incomplete**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: Missing OG/Twitter tags weakens social previews and share quality.
   - Fix: In Blogger, update Theme -> Edit HTML and add tags in the <head> section (title template, meta description, OG/Twitter tags).
7. **Content readability is difficult**
   - Priority: `Warning`
   - Area: `environment`
   - Evidence: Long, complex text can reduce engagement and comprehension.
   - Fix: Rewrite key sections with shorter sentences (15-20 words), shorter paragraphs (2-4 sentences), and clearer subheadings.
8. **No Wikidata entry found for 'Hacking Dream'.**
   - Priority: `Info`
   - Area: `Wikidata`
   - Evidence: See audit output.
   - Fix: If the entity meets Wikidata notability guidelines, create or improve an item with accurate third-party references. Do not create one solely for SEO.
9. **No Wikipedia article found for 'Hacking Dream'.**
   - Priority: `Info`
   - Area: `Wikipedia`
   - Evidence: See audit output.
   - Fix: Only pursue Wikipedia if the entity meets independent notability standards. Otherwise, strengthen official schema, sameAs profiles, citations, and About/Contact signals.
10. **Performance measurement incomplete**
   - Priority: `Info`
   - Area: `environment`
   - Evidence: PageSpeed API returned an error, so CWV recommendations are less reliable.
   - Fix: Set `PAGESPEED_API_KEY` in your environment or `.env` file (see `.env.example`), then rerun. The CLI also accepts `--api-key`. Prioritize LCP/INP/CLS fixes from that output.
11. **Missing sameAs link to Wikipedia (Primary KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add the existing official 'wikipedia.org' URL to sameAs; do not create this profile solely for SEO.
12. **Missing sameAs link to Wikidata (Primary KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add the existing official 'wikidata.org' URL to sameAs; do not create this profile solely for SEO.
13. **Missing sameAs link to LinkedIn (Strong KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add 'linkedin.com' profile URL to sameAs array in your entity schema.
14. **Missing sameAs link to Twitter/X (Strong KG signal).**
   - Priority: `Info`
   - Area: `sameAs`
   - Evidence: See audit output.
   - Fix: Add 'x.com' profile URL to sameAs array in your entity schema.

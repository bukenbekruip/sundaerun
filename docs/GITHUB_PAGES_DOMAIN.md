# Sundae Run production domain

Primary host: **www.sundaerun.com**. GitHub repository: **bukenbekruip/sundaerun**. GitHub Pages DNS hostname: **bukenbekruip.github.io** (no protocol or repository path).

## Production layout and deployment

- `https://www.sundaerun.com/` — brand website home.
- `https://www.sundaerun.com/shop.html` — clothing collection preview.
- `https://www.sundaerun.com/garage/` — existing six-car garage game.
- `/website/` and its existing HTML pages remain available, with canonical URLs pointing to the root website pages.

Pushes to `main` and manual runs of `.github/workflows/deploy-pages.yml` run `npm ci`, Node tests and `npm run build:pages`. That command retains the normal Vite build, moves the complete game and its relative asset tree into `/garage/`, publishes the existing website at `/`, retains the `/website/` pages, and verifies local references, runtime game images and canonical URLs before upload. The normal `npm run build` and portable download layout remain unchanged.

`public/CNAME` contains only `www.sundaerun.com`. With an Actions deployment, a CNAME file alone does not configure the repository setting: the workflow explicitly saves the Pages custom domain through the GitHub API using its repository-scoped `pages: write` permission. Its separate deploy job uses the existing Pages action and OIDC permission. No extra secret or registrar credential is required.

The workflow enables HTTPS enforcement when GitHub reports an approved certificate covering `www.sundaerun.com`. Before DNS is connected, certificate approval and public redirects cannot be verified. After DNS propagates and the certificate is approved, re-run the deployment workflow, or turn on **Enforce HTTPS** in repository Settings → Pages. The GitHub default address redirects to the configured custom host.

## GoDaddy records to update after deployment is confirmed

Keep the existing nameservers and all email-related records. **Do not delete or alter MX, SPF, DKIM, DMARC, mail or autodiscover records.** No DNS records are modified by this repository or workflow.

| Type | Name | Value |
| --- | --- | --- |
| CNAME | www | bukenbekruip.github.io |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

Use GoDaddy’s default TTL or one hour. Replace only conflicting web-hosting records for these names; do not leave `www` pointing to a parked site. Do not put `https://`, `www.sundaerun.com`, or `/sundaerun/` in the CNAME target. Domain forwarding is unnecessary: with **www** saved as the Pages custom domain and both names resolving to Pages, GitHub Pages redirects the apex `sundaerun.com` to `www.sundaerun.com`, retaining the requested path.

IPv6 is optional. If publishing apex AAAA records, use GitHub’s four addresses `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`; conflicting old web-hosting AAAA records can send IPv6 visitors elsewhere.

GitHub reference: [Manage a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Checks after changing DNS

1. In repository Settings → Pages, confirm the custom domain is **www.sundaerun.com** and the DNS check succeeds.
2. Allow GitHub to issue its certificate, then enforce HTTPS as above. Provisioning and DNS propagation are separate from a successful code deployment.
3. Open the website home, shop, Play page and `/garage/` on the official host. Check a car switch, interior and sound, and return to the website through Build Club.
4. Confirm `http://sundaerun.com/`, `https://sundaerun.com/shop.html` and the GitHub Pages address redirect to the www host. Do not claim these live checks passed before DNS exists.

Game saves are stored per browser origin. Changing from the GitHub hostname to the official domain does not automatically transfer local purchases, credits or saved builds; the game code and existing portable ZIP are preserved. Existing build share codes/JSON can carry build recipes, but do not grant owned parts or credits on the new host.

# Cloudflare server — v67
Status: v66 deployed successfully on design/visual-review-v26 (verified user log and GitHub check). v67 UI/pricing follow-up; main unchanged.
Live URL: https://brothers-kingdoms.murat-amir-olzhasuly.workers.dev .

## Deploy without sharing credentials
1. Cloudflare Dashboard → Workers & Pages → Create application → GitHub.
2. Connect amirmurat/brothers-kingdoms. After creating the project, use Settings → Builds → Branch control to select design/visual-review-v26, never main. A retry of an old main build keeps that old ref; trigger a new push/build from the selected branch.
3. Worker name: brothers-kingdoms (must match wrangler.jsonc).
4. Root directory: repository root. Build command: node scripts/build-cloudflare.cjs. Deploy command: npx wrangler@4 deploy.
5. Remain on Workers Free. No custom domain, paid database or payment credentials required by this configuration.
6. Deploy, then open the workers.dev URL. Check /api/health returns the current build (v67 after this deployment).
7. Create a room on that URL, share its link and test using two devices on separate networks.

Wrangler also runs the build automatically; an explicit Dashboard build command is harmless.
No API token is embedded. GitHub authorization happens inside Cloudflare.

## Architecture and behavior
- server/cloudflare.mjs imports the existing engine.js; authoritative rooms are SQLite-backed Durable Objects.
- Browser uses same-origin WebSocket; simulation and command validation run on server.
- Server economy ticks once per second, combat four times per second on average, matching previous simulation frequency.
- Room creator controls Start/settings; controls transfer to a connected player when they disconnect. Match does not depend on creator's browser.
- Same-device rejoin token stored in localStorage on server deployment. Do not copy session tokens into URLs or snapshots.
- No connected players: pause and save. Rejoin resumes. Active room checkpoints every 10 economy ticks and accepted commands; abrupt platform restart may roll back up to 10 seconds of uncheckpointed simulation.
- Snapshot saves split into transactional 50,000-character values to stay below per-value storage limits.
- Idle rooms expire on their cleanup alarm (24 hours after most recent connection, subject to alarm scheduling).
- Snapshots compress terrain and territory using existing base64/RLE client codec.
- Cloudflare build publishes only game files/styles/assets and generates server-config.js with BK_SERVER=true; it removes PeerJS CDN from its HTML.
- GitHub/raw.githack preview has BK_SERVER=false and keeps previous PeerJS transport until a server URL is deployed and verified. This preview is not the server.

## Verification and limitations
Seven existing engine regression suites and tests/cloudflare-server.cjs + tests/cloudflare-client.cjs passed in V8 with runtime/storage/socket/DOM test adapters.
The stale build assertion in unlimited-plans.cjs was updated to v66.
JS syntax verified. No local shell environment was available: no npm build, Wrangler dry run or real workerd integration was executed.
Cloudflare v66 deploy verified. Not yet verified: browser handshake, public free-tier usage, two physical iPhones/Safari on separate networks.
Run node tests/cloudflare-server.cjs and node tests/cloudflare-client.cjs in Node, then a real Cloudflare deployment and multi-device check.
Existing tests/lifecycle.cjs is historical (Russian copy/direct send assumptions), not a passing current-suite claim.

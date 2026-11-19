# Cowrie statistics API + Homepage widget

A minimal statistics adapter for [Cowrie](https://github.com/cowrie/cowrie) running on a resource-constrained VPS. It reads Cowrie's JSON lines, stores **only event type, timestamp and source IP** in a tiny SQLite file, and exposes aggregate totals only. It never returns attacker passwords, commands, raw logs or downloaded payloads.

## LA deployment

The API is a *separate* Docker service. It does not require a shell inside Cowrie or access to the Docker socket.

1. In this repository, enter \`integrations/cowrie-stats\`.
2. Copy \`.env.example\` to \`.env\` and set a strong, unique token via \`openssl rand -hex 32\`.
3. Discover Cowrie's existing var volume:

   \`\`\`bash
   docker inspect cowrie --format '{{range .Mounts}}{{if eq .Destination "/cowrie/cowrie-git/var"}}{{.Name}}{{end}}{{end}}'
   \`\`\`

   Set \`COWRIE_VAR_VOLUME\` in \`.env\` to that **exact** name.
4. Start the API:

   \`\`\`bash
   docker compose up -d --build
   docker compose logs --tail=30
   \`\`\`

5. Test locally:

   \`\`\`bash
   curl -fsS -H "X-API-Key: $(sed -n 's/^COWRIE_API_TOKEN=//p' .env)" http://127.0.0.1:8765/api/summary
   \`\`\`

This service binds to **127.0.0.1:8765 on the VPS only**. It is intentionally not directly reachable through the public VPS IP.

If permissions prevent the UID 10001 API user from reading Cowrie's anonymous volume, use a dedicated read-only shared group or ACL on the Cowrie volume directory. Do not make the Cowrie var volume writable by the API or mount \`/var/run/docker.sock\`.

## HTTPS access from Homepage

Use a TLS reverse proxy on LA, such as Caddy, to expose the local API over HTTPS on port 443. Keep 443 restricted to the intended source networks (e.g. the existing Telstra/Optus policy), and retain the API key. A reverse proxy only on \`127.0.0.1\` cannot serve Homepage remotely.

Example Caddyfile for a hostname you own pointing to LA:

\`\`\`caddyfile
cowrie.example.net {
    reverse_proxy 127.0.0.1:8765
}
\`\`\`

Replace the hostname and configure valid HTTPS certificates and DNS. **Important:** because LA restricts HTTPS to Telstra/Optus, ordinary Let's Encrypt HTTP-01/TLS-ALPN-01 validation from public certificate authorities can fail. Prefer a DNS-01 challenge with a supported DNS provider or supply an existing certificate; do not assume Caddy's default issuance will work. Do **not** publish TCP 8765, and do not expose the API over plaintext HTTP to the Internet. Verify existing iptables INPUT rules also permit the selected HTTPS port; the managed nftables allow rule alone cannot override another INPUT DROP.

## Homepage (fork feature branch)

Add a service widget to \`services.yaml\`:

\`\`\`yaml
- Security:
    - Cowrie:
        icon: cowrie.png
        href: https://cowrie.example.net/
        widget:
          type: cowrie
          url: https://cowrie.example.net
          key: YOUR_UNIQUE_API_TOKEN
          period: last24h
          fields:
            - sessions
            - login_attempts
            - unique_ips
            - commands
\`\`\`

The icon is optional (remove it if no icon asset is available); \`href\` is also optional. Use \`period: lifetime\` for cumulative counts. Supported fields: \`sessions\`, \`login_attempts\`, \`login_success\`, \`login_failed\`, \`unique_ips\`, \`commands\`, \`downloads\`. Display order is configurable and capped to four fields. Invalid fields are ignored.

Only the Homepage server's proxy sends the configured API key; the browser queries Homepage, not Cowrie directly.

## Response example

\`\`\`json
{
  "lifetime": {"sessions": 6, "login_success": 2, "login_failed": 4, "commands": 1, "downloads": 0, "login_attempts": 6, "unique_ips": 4},
  "last24h": {"sessions": 3, "login_success": 1, "login_failed": 2, "commands": 1, "downloads": 0, "login_attempts": 3, "unique_ips": 2}
}
\`\`\`

Sample values only. A Cowrie "successful login" is a **simulated login**, not a real compromise.

## Operational notes

- Incoming lines are consumed incrementally, with a durable inode/byte-offset checkpoint, and only complete JSON lines are processed.
- All startup history in the current JSON file is imported once; subsequent API queries read only appended data.
- Renamed/truncated logs are detected for typical rotations. Previous rotated files *not previously processed* are not automatically backfilled.
- Lifetime counts persist in SQLite even after Cowrie truncates or rotates its log.
- 24-hour queries use UTC timestamps recorded in Cowrie events.
- SQLite file growth is proportional to the number of relevant events; monitor the named volume over time.
- No network calls or background polling are performed; parsing happens on authenticated requests.
- This endpoint exposes aggregate data, but source-IP values remain in the local SQLite file. Keep the stats volume private.
- Run tests: \`python3 -m unittest discover -s tests -v\`.

## Caveats

A newly created named stats volume must be writable by the UID 10001 service user; the Dockerfile provisions \`/data\` with that ownership. If your runtime uses different volume semantics, pre-create it with appropriate ownership. The Cowrie log must be readable to that user.

Never configure a Homepage \`url\` pointing to \`127.0.0.1:8765\` unless Homepage itself runs on LA in the same network namespace.

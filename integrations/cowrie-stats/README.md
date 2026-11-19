# Cowrie statistics API and Homepage widget

A small Python HTTPS API for Cowrie's JSONL event log. Stores only event type, timestamp, and source IP in SQLite. API responses contain counts only, never usernames, passwords, attacker commands, raw logs, or downloaded content.

## LA setup

The Cowrie statistics container runs independently of Cowrie. It reads Cowrie's existing Docker volume read-only and listens with a self-signed TLS certificate on TCP 8765.

1. On LA, enter `integrations/cowrie-stats`. Keep your existing `.env` (which should contain a strong `COWRIE_API_TOKEN` and the actual Docker volume name in `COWRIE_VAR_VOLUME`). If missing, copy `.env.example` and fill it in.

2. Generate a certificate, **replacing the DNS name** with your chosen NPM upstream hostname (or use LA's public IP as the SAN if NPM will connect by IP):

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:3072 -sha256 -nodes \
  -days 825 \
  -subj "/CN=la-cowrie.example.net" \
  -addext "subjectAltName=DNS:la-cowrie.example.net" \
  -keyout certs/server.key -out certs/server.crt
# Container runs as UID 10001. Let only that UID read the private key.
sudo chown 10001:10001 certs/server.key
sudo chmod 600 certs/server.key
sudo chmod 644 certs/server.crt
sudo chmod 755 certs
```

If NPM forwards directly to LA's public IPv4 address, instead use `-subj "/CN=LA_PUBLIC_IP"` and `-addext "subjectAltName=IP:LA_PUBLIC_IP"`.

3. Verify the Cowrie volume name (not the JSON filename!) if needed:

```bash
docker inspect cowrie --format '{{range .Mounts}}{{if eq .Destination "/cowrie/cowrie-git/var"}}{{.Name}}{{end}}{{end}}'
```

4. Ensure port 8765 is allowed **only from NPM's actual public source IP** if stable, or temporarily from your already permitted Telstra/Optus ranges. The firewall manager's structured configuration can place TCP 8765 in `ports.isp_restricted.tcp`. Note that this is a network-level allowlist and **not** a guarantee that an unrelated iptables INPUT DROP chain will permit host traffic; Docker publishing normally travels through DNAT/FORWARD, so verify connectivity from NPM. Do not add 8765 to `ports.public.tcp`.

5. Restart the API:

```bash
docker compose up -d --build
docker compose logs --tail=30
curl -kfsS -H "X-API-Key: $(sed -n 's/^COWRIE_API_TOKEN=//p' .env)" \
  https://127.0.0.1:8765/api/summary | python3 -m json.tool
```

The Compose file publishes TCP 8765 from LA, but **does not change your firewall automatically**. No HTTPS proxy runs on LA; the Python server handles TLS itself.

## Raspberry Pi Nginx Proxy Manager

- Domain: your chosen public HTTPS subdomain, for example `cowrie.example.net`
- Scheme: **https**
- Forward hostname/IP: LA's reachable public IP
- Forward port: **8765**
- NPM's public SSL certificate is managed on the Raspberry Pi, as with your Sofia CTBRec service.
- In Homepage use the **NPM URL**, not `https://LA_IP:8765`.

NPM generally does not validate upstream TLS certificates unless explicitly configured to do so. A self-signed upstream certificate with verification disabled **encrypts but does not authenticate the LA endpoint**; active interception of the Pi-to-LA connection remains possible. For stronger security, configure NPM to trust and verify the exact server certificate, matching its SAN, or use a private tunnel. Avoid passing sensitive secrets on an unverified upstream if that risk is unacceptable.

## Homepage services.yaml

```yaml
- Security:
    - Cowrie:
        widget:
          type: cowrie
          url: https://cowrie.example.net
          key: YOUR_COWRIE_API_TOKEN
          period: last24h
          fields:
            - sessions
            - login_attempts
            - unique_ips
            - commands
```

The Homepage server sends the token in the `X-API-Key` header; browsers never contact the Cowrie endpoint directly. The fields list accepts `sessions`, `login_attempts`, `login_success`, `login_failed`, `unique_ips`, `commands`, and `downloads`. Up to four fields are shown; `period` accepts `last24h` (default) or `lifetime`.

## Operational details

- Reading starts from the existing log and resumes after the last **complete** JSON line. When a log is rotated/truncated, the current file is ingested from the beginning. Rotated files not previously processed aren't backfilled.
- No SQL dependencies beyond the Python standard library.
- SQLite tracks counts and distinct IPs. Keep the named `stats_data` volume private.
- No Cowrie shell or Docker socket mount needed.
- API requests require a 32-character minimum random token.
- Python tests: `python3 -m unittest discover -s tests -v`.
- GitHub Actions runs Python and Homepage Vitest tests.

**Important:** a `cowrie.login.success` event is a successful **simulated** login, not a real SSH login to LA.

This is a feature branch; it does not deploy to LA until you pull the changes and restart the container.

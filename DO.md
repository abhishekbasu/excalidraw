# Hosting Basudraw on DigitalOcean

Basudraw is a static single-page app (built with Vite). The lean hosting setup builds the site **on your machine** (or CI) and serves the static files from a single **Caddy** container that also does automatic HTTPS. The Droplet only needs **Podman** — no Node, no in-container build — so the **cheapest Droplet works**.

```
your laptop:  make build  ──► excalidraw-app/build  ──(rsync)──►  Droplet: Caddy serves it + HTTPS
```

---

## TL;DR

With a Droplet created and Podman installed on it:

```bash
# HTTP only (browse by IP):
make deploy DROPLET=root@<droplet-ip>

# With a domain + automatic HTTPS:
make deploy DROPLET=root@<droplet-ip> DOMAIN=draw.example.com
```

`make deploy` builds locally, rsyncs the static bundle to the box, and starts Caddy. Re-run it any time to ship updates.

To use a specific SSH key (instead of relying on your ssh-agent or `~/.ssh/config`), add `SSH_KEY=`:

```bash
make deploy DROPLET=root@<droplet-ip> DOMAIN=draw.example.com SSH_KEY=~/.ssh/id_basudraw
```

`SSH_KEY` is applied uniformly to `ssh`, `scp`, and `rsync` (it expands to `-i <key> -o IdentitiesOnly=yes`, so only that key is offered). It also works with `make ssh`.

---

## Prerequisites

- A DigitalOcean account with your SSH key added (Settings → Security → SSH Keys).
- On your laptop: Node 18+ and `yarn` (to build), plus `make`, `rsync`, `ssh`.
- Optional: a domain to point at the Droplet (for HTTPS).

---

## Step 1 — Create the Droplet

**Create → Droplets**

- **Image:** plain **Ubuntu 24.04** (Podman is installed in Step 2).
- **Size:** the smallest **Basic** Droplet is fine (512 MB–1 GB, ~$4–6/mo) — nothing is built on the box, it just serves static files.
- **Authentication:** your SSH key. Note the public IP.

`doctl` equivalent:

```bash
doctl compute droplet create basudraw \
  --image ubuntu-24-04-x64 --size s-1vcpu-512mb-10gb --region nyc1 \
  --ssh-keys <your-key-id> --wait
```

---

## Step 2 — Install Podman

```bash
ssh root@<droplet-ip>
apt-get update && apt-get install -y podman podman-compose
podman compose version   # sanity check
exit
```

---

## Step 3 — (Optional) Point a domain at the Droplet

Add a DNS **A record** (e.g. `draw.example.com` → Droplet IP). Confirm:

```bash
dig +short draw.example.com   # should print the droplet IP
```

Caddy fetches/renews a Let's Encrypt cert automatically the first time you deploy with `DOMAIN=` set.

---

## Step 4 — Deploy

```bash
make deploy DROPLET=root@<droplet-ip> DOMAIN=draw.example.com   # HTTPS
# or, no domain:
make deploy DROPLET=root@<droplet-ip>                            # HTTP by IP
```

This runs `make build` locally, rsyncs `excalidraw-app/build/` to `~/basudraw/excalidraw-app/build` on the Droplet, copies `podman-compose.prod.yml`

- `Caddyfile`, and runs `podman compose up -d` there. One container (`basudraw`, Caddy) comes up on ports 80/443.

Visit `https://draw.example.com` (or `http://<droplet-ip>`).

### Manual alternative (build on the box not required)

If you'd rather not use `make`, build locally then:

```bash
make build                                                   # -> excalidraw-app/build
rsync -az --delete excalidraw-app/build/  root@<ip>:~/basudraw/excalidraw-app/build/
scp podman-compose.prod.yml Caddyfile      root@<ip>:~/basudraw/
ssh root@<ip> "cd ~/basudraw && DOMAIN=draw.example.com podman compose -f podman-compose.prod.yml up -d"
```

---

## Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Updating

Re-run the deploy — it rebuilds locally and rsyncs the diff:

```bash
make deploy DROPLET=root@<droplet-ip> DOMAIN=draw.example.com
```

The container is `restart: always`, so it survives reboots.

---

## Managing / logs

```bash
make ssh DROPLET=root@<droplet-ip>          # shell into the box
# on the box:
cd ~/basudraw
podman compose -f podman-compose.prod.yml logs -f
podman compose -f podman-compose.prod.yml ps
podman compose -f podman-compose.prod.yml down
```

---

## Troubleshooting

- **HTTPS cert not issued.** Confirm DNS resolves to the Droplet, ports 80 and 443 are open, and you passed `DOMAIN=`. Check `logs` for Caddy errors.
- **Port 80 already in use.** Stop any stray web server (`systemctl stop nginx apache2`), then redeploy.
- **`podman compose` not found.** Install the compose provider — re-run the Step 2 install (`apt-get install -y podman-compose`).
- **Blank page / 404 on refresh.** The `Caddyfile` already does SPA fallback (`try_files {path} /index.html`); make sure `excalidraw-app/build` actually synced.

---

## Notes

- The repo's root `Containerfile` (full monorepo build → nginx) and the dev `podman-compose.yml` (source-mounted) are **not used** by this lean deploy. They're kept for local all-in-one container use and can be deleted if you don't want them.
- Want a build-and-serve-in-one-container image instead? `podman build -t basudraw .` then run it — but that builds the whole monorepo and needs ~2 GB RAM, which the lean path deliberately avoids.

---

## Makefile quick reference

| Target | What it does |
| --- | --- |
| `make dev` | Local dev server (hot reload) |
| `make build` | Build static app → `excalidraw-app/build` |
| `make preview` | Build + serve the bundle locally on :5000 |
| `make up` / `make down` / `make logs` | Manage the local/host Caddy stack |
| `make deploy DROPLET=… [DOMAIN=…] [SSH_KEY=…]` | Build + ship + serve on the Droplet |
| `make ssh DROPLET=… [SSH_KEY=…]` | SSH into the Droplet |

Run `make help` to list everything.

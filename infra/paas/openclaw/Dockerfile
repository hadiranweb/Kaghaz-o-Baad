FROM ghcr.io/openclaw/openclaw:2026.6.34

EXPOSE 18789

ENV HOME=/home/node \
    OPENCLAW_HOME=/home/node \
    OPENCLAW_STATE_DIR=/home/node/.openclaw \
    OPENCLAW_CONFIG_DIR=/home/node/.openclaw \
    OPENCLAW_CONFIG_PATH=/home/node/.openclaw/openclaw.json \
    OPENCLAW_WORKSPACE_DIR=/home/node/.openclaw/workspace \
    OPENCLAW_GATEWAY_BIND=lan \
    OPENCLAW_DISABLE_BONJOUR=1 \
    TZ=Asia/Tehran

COPY --chown=node:node entrypoint.sh /usr/local/bin/kaghazbaad-openclaw-entrypoint
RUN chmod 0755 /usr/local/bin/kaghazbaad-openclaw-entrypoint

ENTRYPOINT ["/usr/local/bin/kaghazbaad-openclaw-entrypoint"]

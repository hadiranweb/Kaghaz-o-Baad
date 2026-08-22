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

CMD ["node", "dist/index.js", "gateway", "--bind", "lan", "--port", "18789"]

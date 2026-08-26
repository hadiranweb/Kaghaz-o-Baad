#!/usr/bin/env sh
set -eu

: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN must be configured at runtime}"

config_dir="${OPENCLAW_CONFIG_DIR:-/home/node/.openclaw}"
config_path="${OPENCLAW_CONFIG_PATH:-${config_dir}/openclaw.json}"
mkdir -p "${config_dir}"

if [ ! -f "${config_path}" ]; then
  cat > "${config_path}" <<'JSON'
{
  gateway: {
    mode: "local",
    bind: "lan",
    port: 18789,
    auth: { mode: "token", token: "${OPENCLAW_GATEWAY_TOKEN}" }
  },
  session: { dmScope: "per-channel-peer" },
  tools: {
    profile: "messaging",
    deny: ["group:automation", "group:runtime", "group:fs", "sessions_spawn", "sessions_send"],
    fs: { workspaceOnly: true },
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false }
  },
  plugins: { allow: [] }
}
JSON
  chmod 600 "${config_path}"
fi

exec node dist/index.js gateway --bind lan --port 18789

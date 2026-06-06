#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
CONTEXT="${NETLIFY_CONTEXT:-production}"

required_keys=(
  DATABASE_URL
  BETTER_AUTH_URL
  BETTER_AUTH_SECRET
  OPENAI_API_KEY
  OPENAI_ADMIN_KEY
  OPENAI_BILLING_CREDIT_LIMIT
  OPENAI_BILLING_CURRENCY
  R2_BUCKET_NAME
  R2_ENDPOINT
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_URL
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  RESEND_API_KEY
)

fallback_keys() {
  case "$1" in
    R2_BUCKET_NAME) echo "AWS_S3_BUCKET_NAME" ;;
    R2_ENDPOINT) echo "AWS_S3_API_URL" ;;
    R2_ACCESS_KEY_ID) echo "AWS_ACCESS_KEY_ID" ;;
    R2_SECRET_ACCESS_KEY) echo "AWS_SECRET_ACCESS_KEY" ;;
    *) echo "" ;;
  esac
}

run_netlify() {
  if command -v netlify >/dev/null 2>&1; then
    netlify "$@"
    return
  fi

  if command -v pnpm >/dev/null 2>&1; then
    pnpm dlx netlify-cli "$@"
    return
  fi

  if command -v npx >/dev/null 2>&1; then
    npx netlify-cli "$@"
    return
  fi

  echo "Netlify CLI is not available. Install Node/pnpm or run: npm i -g netlify-cli"
  exit 1
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

get_env_value() {
  local key="$1"
  local line

  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"

  if [[ -z "$line" ]]; then
    return 1
  fi

  local value="${line#*=}"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  printf "%s" "$value"
}

for key in "${required_keys[@]}"; do
  value="$(get_env_value "$key" || true)"

  if [[ -z "$value" ]]; then
    fallback_key="$(fallback_keys "$key")"

    if [[ -n "$fallback_key" ]]; then
      value="$(get_env_value "$fallback_key" || true)"
    fi
  fi

  if [[ -z "$value" ]]; then
    echo "Skipping $key: not found in $ENV_FILE"
    continue
  fi

  if [[ "$key" == "BETTER_AUTH_URL" && -n "${NETLIFY_SITE_URL:-}" ]]; then
    value="$NETLIFY_SITE_URL"
  fi

  echo "Setting $key for Netlify context: $CONTEXT"
  run_netlify env:set "$key" "$value" --context "$CONTEXT" >/dev/null
done

echo "Done. If you use a custom domain, make sure BETTER_AUTH_URL matches it."

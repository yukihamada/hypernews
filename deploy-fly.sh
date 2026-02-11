#!/usr/bin/env bash
set -euo pipefail

# Deploy HyperNews to Fly.io
# Usage: ./deploy-fly.sh [xyz|online|both]

TARGET="${1:-both}"

create_app() {
  local app="$1"
  if ! fly apps list | grep -q "$app"; then
    echo "Creating app: $app"
    fly apps create "$app"
    fly volumes create news_data -a "$app" --region nrt --size 1 -y
    echo "Set ANTHROPIC_API_KEY:"
    echo "  fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a $app"
  fi
}

deploy_app() {
  local config="$1"
  local app="$2"
  echo "Deploying $app..."
  fly deploy -c "$config" --wait-timeout 300
  echo "Checking health..."
  sleep 5
  curl -sf "https://$app.fly.dev/health" && echo " OK" || echo " FAILED"
}

case "$TARGET" in
  xyz)
    create_app "news-xyz"
    deploy_app "fly.toml" "news-xyz"
    ;;
  online)
    create_app "news-online"
    deploy_app "fly.online.toml" "news-online"
    ;;
  both)
    create_app "news-xyz"
    create_app "news-online"
    deploy_app "fly.toml" "news-xyz"
    deploy_app "fly.online.toml" "news-online"
    ;;
  *)
    echo "Usage: $0 [xyz|online|both]"
    exit 1
    ;;
esac

echo ""
echo "=== Deploy complete ==="
echo "Add custom domains:"
echo "  fly certs add news.xyz -a news-xyz"
echo "  fly certs add news.online -a news-online"
echo "  fly certs add news.claud -a news-online"

#!/bin/sh
set -e

for n in 0 1 2 3 4 5 6 7 8; do
  IP=$(ipconfig getifaddr en$n 2>/dev/null || true)
  [ -n "$IP" ] && break
done

if [ -z "$IP" ]; then
  IP=$(ifconfig | grep 'inet ' | grep -v ' 127\.' | grep -v ' 169\.254\.' | awk 'NR==1{print $2}')
fi

if [ -z "$IP" ]; then
  echo "Error: Could not detect LAN IP. Are you connected to WiFi?" >&2
  exit 1
fi

echo "EXPO_PUBLIC_DEV_HOST=$IP" > "$(dirname "$0")/.env"
exec expo run:ios --device "$@"

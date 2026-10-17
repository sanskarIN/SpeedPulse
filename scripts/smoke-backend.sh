#!/usr/bin/env bash
set -euo pipefail
host='http://127.0.0.1:5087'
dotnet ./publish/SpeedPulseBackend.dll --urls "$host" >/tmp/speedpulse-dotnet.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; cat /tmp/speedpulse-dotnet.log' EXIT

ready=0
for attempt in $(seq 1 50); do
  if curl --silent --fail "$host/api/health" > /tmp/speedpulse-health.json; then
    ready=1
    break
  fi
  sleep 0.2
done
test "$ready" = 1 || { echo 'Backend did not start'; exit 1; }
grep -q '"service":"SpeedPulseBackend"' /tmp/speedpulse-health.json
curl --silent --fail "$host/api/config" | grep -q '"maxDownloadBytes":67108864'
curl --silent --fail "$host/" | grep -q 'SpeedPulse'
curl --silent --fail "$host/backend-status.js" | grep -q '/api/health'

# HEAD is a genuinely bodyless probe; GET transfers the exact number of bytes.
curl --silent --fail --head "$host/api/down?bytes=1024" | grep -qi 'content-length: 1024'
curl --silent --fail "$host/api/down?bytes=1024" -o /tmp/speedpulse-down.bin
test "$(wc -c </tmp/speedpulse-down.bin)" -eq 1024

status=$(curl --silent -o /dev/null -w '%{http_code}' "$host/api/down?bytes=-1")
test "$status" = 400
status=$(curl --silent -o /dev/null -w '%{http_code}' "$host/api/down?bytes=67108865")
test "$status" = 400
status=$(curl --silent -o /dev/null -w '%{http_code}' "$host/api/not-a-real-route")
test "$status" = 404

printf 'speedpulse-upload' | curl --silent --fail -X POST --data-binary @- \
  -H 'Content-Type: application/octet-stream' "$host/api/up" \
  | grep -q '"bytesReceived":17'

status=$(head -c 9437184 /dev/zero | curl --silent -o /dev/null \
  -w '%{http_code}' -X POST --data-binary @- "$host/api/up" || true)
test "$status" = 413 || { echo "Expected 413 for oversized upload, got: $status"; exit 1; }
echo 'SpeedPulse ASP.NET smoke tests passed.'

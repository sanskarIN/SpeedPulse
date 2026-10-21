#!/usr/bin/env bash
set -euo pipefail
host='http://127.0.0.1:5087'
(
  cd publish
  dotnet ./SpeedPulseBackend.dll --urls "$host"
) >/tmp/speedpulse-dotnet.log 2>&1 &
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
curl --silent --fail "$host/api/config" -o /tmp/speedpulse-config.json
grep -q '"maxDownloadBytes":67108864' /tmp/speedpulse-config.json
grep -q '"id":"quick","downloadBytes":5242880,"uploadBytes":1048576' /tmp/speedpulse-config.json
grep -q '"id":"standard","downloadBytes":26214400,"uploadBytes":5242880' /tmp/speedpulse-config.json
grep -q '"id":"thorough","downloadBytes":52428800,"uploadBytes":8388608' /tmp/speedpulse-config.json
curl --silent --fail "$host/" -o /tmp/speedpulse-index.html
grep -q 'SpeedPulse' /tmp/speedpulse-index.html
curl --silent --fail "$host/backend-status.js" -o /tmp/speedpulse-status.js
grep -q '/api/health' /tmp/speedpulse-status.js

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
# Verify the API explicitly prevents unrelated origins from using permissive CORS.
headers=$(curl --silent --head -H 'Origin: https://example.invalid' "$host/api/down?bytes=0")
if printf '%s' "$headers" | grep -qi '^access-control-allow-origin:'; then
  echo 'Unexpected cross-origin allow header'; exit 1
fi
# Enough requests to exceed the server's 60/minute rate limit.
limited=0
for attempt in $(seq 1 65); do
  code=$(curl --silent -o /dev/null -w '%{http_code}' "$host/api/down?bytes=0")
  if [ "$code" = 429 ]; then limited=1; break; fi
done
test "$limited" = 1 || { echo 'Rate limiting did not activate'; exit 1; }
# Custom host limits must cap configured profiles and reject excessive data.
limited_host='http://127.0.0.1:5088'
(
  cd publish
  SpeedPulse__MaxDownloadBytes=10485760 \
  SpeedPulse__MaxUploadBytes=2097152 \
  SpeedPulse__RateLimitRequestsPerMinute=12 \
  dotnet ./SpeedPulseBackend.dll --urls "$limited_host"
) >/tmp/speedpulse-limited.log 2>&1 &
limited_pid=$!
trap 'kill "$limited_pid" "$pid" 2>/dev/null || true' EXIT

limited_ready=0
for attempt in $(seq 1 50); do
  if curl --silent --fail "$limited_host/api/config" -o /tmp/speedpulse-limited.json; then
    limited_ready=1
    break
  fi
  sleep 0.2
done
test "$limited_ready" = 1 || { echo 'Limited backend did not start'; exit 1; }
grep -q '"maxDownloadBytes":10485760' /tmp/speedpulse-limited.json
grep -q '"maxUploadBytes":2097152' /tmp/speedpulse-limited.json
grep -q '"rateLimitRequestsPerMinute":12' /tmp/speedpulse-limited.json
grep -q '"id":"standard","downloadBytes":10485760,"uploadBytes":2097152' /tmp/speedpulse-limited.json
code=$(curl --silent -o /dev/null -w '%{http_code}' "$limited_host/api/down?bytes=10485761")
test "$code" = 400
code=$(head -c 3145728 /dev/zero | curl --silent -o /dev/null \
  -w '%{http_code}' -X POST --data-binary @- "$limited_host/api/up" || true)
test "$code" = 413 || { echo "Custom upload limit should return 413, got $code"; exit 1; }

echo 'SpeedPulse ASP.NET default and custom-limits smoke tests passed.'

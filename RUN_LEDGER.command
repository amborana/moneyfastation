#!/bin/bash
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server 8080 --bind 127.0.0.1 >/tmp/the-ledger-server.log 2>&1 &
  PID=$!
  sleep 1
  open "http://127.0.0.1:8080/"
  echo "The Ledger is running at http://127.0.0.1:8080/"
  echo "Press Ctrl+C to stop."
  trap 'kill $PID 2>/dev/null' EXIT
  wait $PID
else
  echo "Python 3 is required. Install it with your preferred package manager."
  read -p "Press Enter to close..."
fi

#!/bin/sh
# Run the TEST PR branch locally; does not publish or change Supabase.
set -eu
cd "$(dirname "$0")"
printf '%s\n' 'INVESTLAB TEST preview: http://127.0.0.1:8765/pilot-ledger.html'
printf '%s\n' 'My Portfolio: http://127.0.0.1:8765/my-portfolio.html'
printf '%s\n' 'Shared Data: http://127.0.0.1:8765/shared-data.html'
python3 -m http.server 8765 --bind 127.0.0.1

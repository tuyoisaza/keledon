#!/bin/sh
set -eu
# The existing private WebSocket upstream resolves inside the runtime network,
# not in the image builder. Validate before nginx starts serving requests.
nginx -t

#!/bin/bash
# AGON | COMBAT SPORTS — Local dev server
# Run: bash start.sh
cd "$(dirname "$0")/public" && python3 -m http.server 8080

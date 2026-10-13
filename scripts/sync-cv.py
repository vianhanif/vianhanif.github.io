#!/usr/bin/env python3
"""Fetch CV from vianhanif/my-cv and sync to _tabs/cv.md."""

import sys
import urllib.request
import urllib.error

# Configuration
CV_URL = "https://raw.githubusercontent.com/vianhanif/my-cv/main/CV.md"
OUTPUT_PATH = "cv.md"
TIMEOUT = 10

# Front-matter — page NOT in the tabs collection, so it never appears in the
# sidebar nav. Reachable only via https://vianhanif.link/cv/ (linked from About).
FRONT_MATTER = """---
layout: page
permalink: /cv/
title: Resume
---

<!-- GENERATED from vianhanif/my-cv; do not edit -->

"""

try:
    with urllib.request.urlopen(CV_URL, timeout=TIMEOUT) as response:
        cv_content = response.read().decode("utf-8")
    
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(FRONT_MATTER)
        f.write(cv_content)
    
    print(f"✓ Synced CV to {OUTPUT_PATH}")
    sys.exit(0)

except urllib.error.URLError as e:
    print(f"✗ Failed to fetch CV: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}", file=sys.stderr)
    sys.exit(1)

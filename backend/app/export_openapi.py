"""Print the OpenAPI schema as JSON (the source for the frontend's TS types).

Usage (repo root):  podman-compose run --rm api python -m app.export_openapi > frontend/openapi.json
"""

import json

from app.main import app

if __name__ == "__main__":
    print(json.dumps(app.openapi(), indent=2, sort_keys=True))

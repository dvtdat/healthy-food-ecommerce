#!/bin/bash

BASE_URL="http://localhost:3300"
EMAIL="admin@email.com"
PASSWORD="12345"
ID_MAP_FILE="$(dirname "$0")/category-ids.json"

echo "==> Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Token acquired."
echo ""

# ─── Helper ───────────────────────────────────────────────────────────────────

upsert_category() {
  local NAME="$1"
  local SLUG="$2"
  local DESC="$3"

  curl -s -X POST "$BASE_URL/categories" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"name\": \"$NAME\", \"slug\": \"$SLUG\", \"description\": \"$DESC\"}" > /dev/null

  ID=$(curl -s "$BASE_URL/categories/slug/$SLUG" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

  if [ -z "$ID" ]; then
    echo "  [ERROR] Could not resolve '$NAME'"
  else
    echo "  [OK] $NAME → $ID"
  fi
}

# ─── Create categories ────────────────────────────────────────────────────────

echo "==> Creating categories..."

upsert_category "Fruits & Vegetables"      "fruits-vegetables"      "Fresh organic fruits and vegetables"
upsert_category "Grains & Cereals"         "grains-cereals"         "Whole grains, oats, quinoa, and cereals"
upsert_category "Nuts & Seeds"             "nuts-seeds"             "Raw and roasted nuts, seeds, and trail mixes"
upsert_category "Beverages"               "beverages"              "Healthy drinks, teas, juices, and smoothies"
upsert_category "Dairy & Alternatives"    "dairy-alternatives"     "Milk, yogurt, cheese, and plant-based alternatives"
upsert_category "Superfoods & Supplements" "superfoods-supplements" "Protein powders, adaptogens, and superfoods"

# ─── Fetch all & write ID map ─────────────────────────────────────────────────

echo ""
echo "==> Writing ID map to $ID_MAP_FILE..."

curl -s "$BASE_URL/categories?pageSize=100" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys, json

response = json.load(sys.stdin)
categories = response['data']

mapping = {
    c['slug']: {'name': c['name'], 'id': c['id']}
    for c in categories
}

with open('$ID_MAP_FILE', 'w') as f:
    json.dump(mapping, f, indent=2)

for slug, entry in mapping.items():
    print(f\"  {slug}: {entry['id']} ({entry['name']})\")
"

echo ""
echo "==> Done. ID map saved to $ID_MAP_FILE"

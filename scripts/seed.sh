#!/usr/bin/env bash
# seed.sh — Create mock categories and products via the API
# Usage:
#   ./scripts/seed.sh                        # prompts for email/password, auto-login
#   TOKEN=<jwt> ./scripts/seed.sh            # skip login, use provided token
#   BASE_URL=http://localhost:3500 ./scripts/seed.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3500}"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

ok()   { echo -e "${GREEN}  ✓ $*${RESET}"; }
fail() { echo -e "${RED}  ✗ $*${RESET}"; }
info() { echo -e "${CYAN}▶ $*${RESET}"; }
warn() { echo -e "${YELLOW}  ! $*${RESET}"; }

# ─── jq check ─────────────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  warn "jq not found — install it for better output: brew install jq"
  extract() { grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
else
  extract() { jq -r ".$1 // empty"; }
fi

# ─── Login ────────────────────────────────────────────────────────────────────
if [[ -z "${TOKEN:-}" ]]; then
  info "No TOKEN set — logging in to get one"
  read -rp "  Admin email: " ADMIN_EMAIL
  read -rsp "  Admin password: " ADMIN_PASSWORD
  echo

  RESPONSE=$(curl -sf -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || true)

  if [[ -z "$RESPONSE" ]]; then
    fail "Login failed — is the server running at $BASE_URL?"
    exit 1
  fi

  TOKEN=$(echo "$RESPONSE" | extract "token")
  if [[ -z "$TOKEN" ]]; then
    fail "Could not extract token. Response: $RESPONSE"
    exit 1
  fi
  ok "Logged in"
else
  ok "Using provided TOKEN"
fi

AUTH="Authorization: Bearer $TOKEN"

# ─── Helper: POST with JSON ────────────────────────────────────────────────────
post() {
  local endpoint="$1"
  local body="$2"
  curl -sf -X POST "$BASE_URL$endpoint" \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -d "$body" || true
}

# ─── Create Category ──────────────────────────────────────────────────────────
declare -A CATEGORY_IDS

create_category() {
  local name="$1" slug="$2" description="$3" image="$4"
  local body
  body=$(printf '{"name":"%s","slug":"%s","description":"%s","imageUrl":"%s"}' \
    "$name" "$slug" "$description" "$image")
  local resp
  resp=$(post "/categories" "$body")
  local id
  id=$(echo "$resp" | extract "_id")
  if [[ -n "$id" ]]; then
    CATEGORY_IDS["$slug"]="$id"
    ok "Category: $name  (id: $id)"
  else
    fail "Category failed: $name — $resp"
  fi
}

# ─── Create Product ───────────────────────────────────────────────────────────
create_product() {
  local name="$1" slug="$2" price="$3" stock="$4" cat_slug="$5" description="$6" image="$7"
  local cat_id="${CATEGORY_IDS[$cat_slug]:-}"
  if [[ -z "$cat_id" ]]; then
    warn "Skipping '$name' — category '$cat_slug' not found"
    return
  fi
  local body
  body=$(printf '{"name":"%s","slug":"%s","price":%s,"stock":%s,"categoryId":"%s","description":"%s","imageUrl":"%s"}' \
    "$name" "$slug" "$price" "$stock" "$cat_id" "$description" "$image")
  local resp
  resp=$(post "/products" "$body")
  local id
  id=$(echo "$resp" | extract "_id")
  if [[ -n "$id" ]]; then
    ok "Product:  $name  (id: $id)"
  else
    fail "Product failed: $name — $resp"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
echo
info "Creating categories..."
echo

create_category \
  "Vegetables" "vegetables" \
  "Fresh organic vegetables sourced from local farms" \
  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400"

create_category \
  "Fruits" "fruits" \
  "Seasonal and exotic fruits packed with vitamins" \
  "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400"

create_category \
  "Whole Grains" "whole-grains" \
  "Nutritious whole grains and cereals for a balanced diet" \
  "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400"

create_category \
  "Dairy & Alternatives" "dairy-alternatives" \
  "Fresh dairy products and plant-based alternatives" \
  "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"

create_category \
  "Beverages" "beverages" \
  "Healthy drinks, herbal teas, and natural juices" \
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400"

# ══════════════════════════════════════════════════════════════════════════════
echo
info "Creating products..."
echo

# Vegetables
create_product "Organic Broccoli" "organic-broccoli" \
  29000 150 "vegetables" \
  "Fresh organic broccoli, rich in vitamins C and K" \
  "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400"

create_product "Baby Spinach" "baby-spinach" \
  35000 200 "vegetables" \
  "Tender baby spinach leaves, high in iron and antioxidants" \
  "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400"

create_product "Rainbow Carrots" "rainbow-carrots" \
  25000 300 "vegetables" \
  "Colorful heirloom carrots, naturally sweet and crunchy" \
  "https://images.unsplash.com/photo-1508747703725-719777637510?w=400"

create_product "Red Bell Pepper" "red-bell-pepper" \
  32000 180 "vegetables" \
  "Sweet red bell peppers, excellent source of vitamin C" \
  "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400"

create_product "Organic Kale" "organic-kale" \
  38000 120 "vegetables" \
  "Curly kale packed with nutrients and dietary fibre" \
  "https://images.unsplash.com/photo-1515543904379-3d757afe72c4?w=400"

# Fruits
create_product "Fuji Apple" "fuji-apple" \
  45000 250 "fruits" \
  "Crisp and sweet Fuji apples, perfect as a daily snack" \
  "https://images.unsplash.com/photo-1569870499705-504209102861?w=400"

create_product "Cavendish Banana" "cavendish-banana" \
  28000 400 "fruits" \
  "Ripe bananas, great source of potassium and natural energy" \
  "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400"

create_product "Wild Blueberries" "wild-blueberries" \
  85000 100 "fruits" \
  "Antioxidant-rich wild blueberries, frozen at peak freshness" \
  "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400"

create_product "Hass Avocado" "hass-avocado" \
  55000 160 "fruits" \
  "Creamy Hass avocados, loaded with healthy fats and minerals" \
  "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400"

create_product "Navel Orange" "navel-orange" \
  40000 220 "fruits" \
  "Juicy seedless navel oranges, bursting with vitamin C" \
  "https://images.unsplash.com/photo-1547514701-42782101795e?w=400"

# Whole Grains
create_product "Brown Rice 1kg" "brown-rice-1kg" \
  55000 200 "whole-grains" \
  "Unprocessed brown rice with all natural bran and germ intact" \
  "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400"

create_product "Organic Quinoa 500g" "organic-quinoa-500g" \
  120000 80 "whole-grains" \
  "Complete protein quinoa, gluten-free superfood grain" \
  "https://images.unsplash.com/photo-1612257999648-c3d3db0f9e9e?w=400"

create_product "Rolled Oats 800g" "rolled-oats-800g" \
  65000 150 "whole-grains" \
  "Slow-cooked rolled oats for a hearty and nutritious breakfast" \
  "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=400"

create_product "Buckwheat Flour 500g" "buckwheat-flour-500g" \
  75000 90 "whole-grains" \
  "Gluten-free buckwheat flour with rich earthy flavour" \
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400"

# Dairy & Alternatives
create_product "Greek Yogurt 500g" "greek-yogurt-500g" \
  89000 120 "dairy-alternatives" \
  "Thick and creamy plain Greek yogurt, high in protein and probiotics" \
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400"

create_product "Unsweetened Almond Milk 1L" "almond-milk-1l" \
  65000 180 "dairy-alternatives" \
  "Creamy almond milk with no added sugar, naturally lactose-free" \
  "https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=400"

create_product "Cottage Cheese 300g" "cottage-cheese-300g" \
  75000 100 "dairy-alternatives" \
  "Low-fat cottage cheese, excellent post-workout protein source" \
  "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400"

create_product "Oat Milk 1L" "oat-milk-1l" \
  72000 140 "dairy-alternatives" \
  "Smooth oat milk, ideal for coffee and cereal" \
  "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400"

# Beverages
create_product "Organic Green Tea 50 bags" "organic-green-tea-50bags" \
  95000 200 "beverages" \
  "Premium Japanese sencha green tea, rich in antioxidants" \
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400"

create_product "Cold-Pressed Orange Juice 500ml" "orange-juice-500ml" \
  75000 80 "beverages" \
  "100% cold-pressed orange juice, no preservatives or added sugar" \
  "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400"

create_product "Coconut Water 330ml" "coconut-water-330ml" \
  45000 250 "beverages" \
  "Natural coconut water, great electrolyte replenishment after exercise" \
  "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400"

create_product "Kombucha Ginger Lemon 330ml" "kombucha-ginger-lemon" \
  62000 120 "beverages" \
  "Raw fermented kombucha with live cultures, ginger and lemon flavour" \
  "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400"

# ══════════════════════════════════════════════════════════════════════════════
echo
ok "Seed complete — ${#CATEGORY_IDS[@]} categories and products created"
echo

#!/bin/bash

BASE_URL="http://localhost:3300"
EMAIL="admin@email.com"
PASSWORD="12345"
ID_MAP_FILE="$(dirname "$0")/category-ids.json"

# ─── Check ID map exists ──────────────────────────────────────────────────────

if [ ! -f "$ID_MAP_FILE" ]; then
  echo "[ABORT] $ID_MAP_FILE not found. Run seed-categories.sh first."
  exit 1
fi

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

# ─── Load category IDs from map file ─────────────────────────────────────────

echo "==> Loading category IDs from $ID_MAP_FILE..."

read_id() {
  local SLUG="$1"
  python3 -c "
import json
with open('$ID_MAP_FILE') as f:
    m = json.load(f)
entry = m.get('$SLUG')
if entry:
    print(entry['id'])
"
}

FRUITS_ID=$(read_id "fruits-vegetables")
GRAINS_ID=$(read_id "grains-cereals")
NUTS_ID=$(read_id "nuts-seeds")
BEVERAGES_ID=$(read_id "beverages")
DAIRY_ID=$(read_id "dairy-alternatives")
SUPERFOODS_ID=$(read_id "superfoods-supplements")

echo "  A (Fruits & Vegetables)      → ${FRUITS_ID:-[NOT FOUND]}"
echo "  B (Grains & Cereals)         → ${GRAINS_ID:-[NOT FOUND]}"
echo "  C (Nuts & Seeds)             → ${NUTS_ID:-[NOT FOUND]}"
echo "  D (Beverages)                → ${BEVERAGES_ID:-[NOT FOUND]}"
echo "  E (Dairy & Alternatives)     → ${DAIRY_ID:-[NOT FOUND]}"
echo "  F (Superfoods & Supplements) → ${SUPERFOODS_ID:-[NOT FOUND]}"
echo ""

for VAR in "$FRUITS_ID" "$GRAINS_ID" "$NUTS_ID" "$BEVERAGES_ID" "$DAIRY_ID" "$SUPERFOODS_ID"; do
  if [ -z "$VAR" ]; then
    echo "[ABORT] One or more category IDs missing. Re-run seed-categories.sh."
    exit 1
  fi
done

# ─── Helper ───────────────────────────────────────────────────────────────────

create_product() {
  local NAME="$1"
  local SLUG="$2"
  local DESC="$3"
  local PRICE="$4"
  local STOCK="$5"
  local CATEGORY_ID="$6"

  RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"name\": \"$NAME\",
      \"slug\": \"$SLUG\",
      \"description\": \"$DESC\",
      \"price\": $PRICE,
      \"stock\": $STOCK,
      \"categoryId\": \"$CATEGORY_ID\"
    }")

  ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['_id'])" 2>/dev/null)

  if [ -z "$ID" ]; then
    echo "    [ERROR] $NAME → $RESPONSE"
  else
    echo "    [OK] $NAME → $ID"
  fi
}

# ─── Products — A: Fruits & Vegetables ───────────────────────────────────────

echo "==> Category A: Fruits & Vegetables"
create_product "Item A.1 - Organic Banana"  "organic-banana"  "Sweet and ripe organic bananas, sold per bunch"  1.99  200  "$FRUITS_ID"
create_product "Item A.2 - Baby Spinach"    "baby-spinach"    "Tender baby spinach leaves, 200g bag"            3.49  150  "$FRUITS_ID"
create_product "Item A.3 - Hass Avocado"    "hass-avocado"    "Creamy Hass avocados packed with healthy fats"   2.49  120  "$FRUITS_ID"
create_product "Item A.4 - Cherry Tomatoes" "cherry-tomatoes" "Sweet cherry tomatoes, 500g punnet"              3.99  180  "$FRUITS_ID"
create_product "Item A.5 - Blueberries"     "blueberries"     "Antioxidant-rich fresh blueberries, 250g"        5.49   90  "$FRUITS_ID"
create_product "Item A.6 - Broccoli Crown"  "broccoli-crown"  "Firm green broccoli crown, sold individually"    2.29  160  "$FRUITS_ID"
create_product "Item A.7 - Sweet Potato"    "sweet-potato"    "Organic sweet potatoes, 1kg bag"                 4.49  200  "$FRUITS_ID"
create_product "Item A.8 - Kale Bunch"      "kale-bunch"      "Curly kale, great for salads and smoothies"      2.99  130  "$FRUITS_ID"
echo ""

# ─── Products — B: Grains & Cereals ──────────────────────────────────────────

echo "==> Category B: Grains & Cereals"
create_product "Item B.1 - Rolled Oats"      "rolled-oats"      "Whole grain rolled oats, 1kg bag"              4.99  300  "$GRAINS_ID"
create_product "Item B.2 - Brown Rice"       "brown-rice"       "Long grain brown rice, 2kg bag"                6.99  250  "$GRAINS_ID"
create_product "Item B.3 - White Quinoa"     "white-quinoa"     "Complete protein white quinoa, 500g"           8.49  180  "$GRAINS_ID"
create_product "Item B.4 - Buckwheat Groats" "buckwheat-groats" "Gluten-free buckwheat groats, 500g"            5.99  140  "$GRAINS_ID"
create_product "Item B.5 - Millet"           "millet"           "Whole grain millet, great for porridge, 500g"  4.49  160  "$GRAINS_ID"
create_product "Item B.6 - Spelt Flour"      "spelt-flour"      "Stone-ground wholegrain spelt flour, 1kg"      7.29  120  "$GRAINS_ID"
create_product "Item B.7 - Granola"          "granola"          "Honey and oat granola with dried fruits, 400g" 6.49  200  "$GRAINS_ID"
echo ""

# ─── Products — C: Nuts & Seeds ──────────────────────────────────────────────

echo "==> Category C: Nuts & Seeds"
create_product "Item C.1 - Raw Almonds"      "raw-almonds"      "Unsalted whole raw almonds, 500g"               10.99  100  "$NUTS_ID"
create_product "Item C.2 - Chia Seeds"       "chia-seeds"       "Omega-3 rich black chia seeds, 300g"             7.49  200  "$NUTS_ID"
create_product "Item C.3 - Cashews"          "cashews"          "Lightly roasted whole cashews, 500g"            12.99   90  "$NUTS_ID"
create_product "Item C.4 - Walnuts"          "walnuts"          "Raw walnut halves, rich in omega-3, 400g"       11.49  110  "$NUTS_ID"
create_product "Item C.5 - Pumpkin Seeds"    "pumpkin-seeds"    "Hulled green pumpkin seeds, 300g"                6.99  180  "$NUTS_ID"
create_product "Item C.6 - Flaxseeds"        "flaxseeds"        "Whole golden flaxseeds, high in fibre, 500g"     4.99  220  "$NUTS_ID"
create_product "Item C.7 - Mixed Nut Butter" "mixed-nut-butter" "No-added-sugar mixed nut butter, 250g jar"      13.49   80  "$NUTS_ID"
echo ""

# ─── Products — D: Beverages ─────────────────────────────────────────────────

echo "==> Category D: Beverages"
create_product "Item D.1 - Green Tea"               "green-tea"               "Japanese sencha green tea, 50 bags"               5.99  300  "$BEVERAGES_ID"
create_product "Item D.2 - Cold-Press Orange Juice"  "cold-press-orange-juice" "100% pure cold-pressed orange juice, 1L"          6.49   80  "$BEVERAGES_ID"
create_product "Item D.3 - Coconut Water"            "coconut-water"           "Natural coconut water, no added sugar, 330ml"     3.29  150  "$BEVERAGES_ID"
create_product "Item D.4 - Matcha Powder"            "matcha-powder"           "Ceremonial grade Japanese matcha, 50g tin"       14.99  100  "$BEVERAGES_ID"
create_product "Item D.5 - Kombucha Original"        "kombucha-original"       "Raw fermented kombucha, original flavour, 330ml"  4.49  120  "$BEVERAGES_ID"
create_product "Item D.6 - Almond Milk"              "almond-milk"             "Unsweetened almond milk, 1L carton"               3.99  200  "$BEVERAGES_ID"
create_product "Item D.7 - Turmeric Latte Mix"       "turmeric-latte-mix"      "Golden milk turmeric latte blend, 150g"           9.99   90  "$BEVERAGES_ID"
echo ""

# ─── Products — E: Dairy & Alternatives ──────────────────────────────────────

echo "==> Category E: Dairy & Alternatives"
create_product "Item E.1 - Greek Yogurt"   "greek-yogurt"   "Full-fat plain Greek yogurt, 500g"                 4.99  150  "$DAIRY_ID"
create_product "Item E.2 - Oat Milk"       "oat-milk"       "Barista oat milk, great for coffee, 1L"            3.79  200  "$DAIRY_ID"
create_product "Item E.3 - Cottage Cheese" "cottage-cheese" "Low-fat cottage cheese, 250g"                      3.49  130  "$DAIRY_ID"
create_product "Item E.4 - Kefir"          "kefir"          "Plain probiotic kefir drink, 500ml"                5.49   80  "$DAIRY_ID"
create_product "Item E.5 - Coconut Yogurt" "coconut-yogurt" "Dairy-free coconut yogurt, natural flavour, 400g"  5.99  100  "$DAIRY_ID"
create_product "Item E.6 - Feta Cheese"    "feta-cheese"    "Authentic Greek feta in brine, 200g"               4.29  110  "$DAIRY_ID"
echo ""

# ─── Products — F: Superfoods & Supplements ──────────────────────────────────

echo "==> Category F: Superfoods & Supplements"
create_product "Item F.1 - Whey Protein Vanilla" "whey-protein-vanilla" "Grass-fed whey protein isolate, vanilla, 1kg"           39.99   60  "$SUPERFOODS_ID"
create_product "Item F.2 - Spirulina Powder"     "spirulina-powder"     "Organic blue-green spirulina powder, 200g"              12.99  100  "$SUPERFOODS_ID"
create_product "Item F.3 - Maca Powder"          "maca-powder"          "Peruvian gelatinised maca root powder, 300g"            11.49   90  "$SUPERFOODS_ID"
create_product "Item F.4 - Collagen Peptides"    "collagen-peptides"    "Hydrolysed bovine collagen peptides, unflavoured, 400g" 29.99   70  "$SUPERFOODS_ID"
create_product "Item F.5 - Cacao Nibs"           "cacao-nibs"           "Raw organic cacao nibs, 250g"                            8.99  130  "$SUPERFOODS_ID"
create_product "Item F.6 - Ashwagandha Capsules" "ashwagandha-capsules" "KSM-66 ashwagandha root extract, 60 capsules"           16.99   80  "$SUPERFOODS_ID"
create_product "Item F.7 - Plant Protein Blend"  "plant-protein-blend"  "Pea and rice protein blend, chocolate, 900g"            34.99   50  "$SUPERFOODS_ID"
echo ""

echo "==> Done."

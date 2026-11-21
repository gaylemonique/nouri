// Pulls the per 100 g values for every ingredient used in recipes.json out of
// the USDA SR Legacy CSV download and writes usda-ingredients.json.
//
//   node catalog/extract-usda.mjs <path-to>/FoodData_Central_sr_legacy_food_csv_2018-04
//
// The CSV download (public domain) is not committed; the small extracted file is.
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

const here = new URL(".", import.meta.url);
const srDir = process.argv[2];
if (!srDir) {
  console.error("usage: node catalog/extract-usda.mjs <sr-legacy-csv-folder>");
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// SR Legacy nutrient ids -> our column names.
const NUTRIENTS = {
  1008: "kcal",
  1003: "protein_g",
  1005: "carbohydrates_g",
  1004: "fat_g",
  1079: "fiber_g",
  2000: "sugar_g",
  1093: "sodium_mg",
};

const { recipes } = JSON.parse(readFileSync(new URL("recipes.json", here), "utf8"));
const wanted = new Set(recipes.flatMap((r) => r.ingredients.map((i) => String(i.fdc))));

const out = {};
for (const line of readFileSync(join(srDir, "food.csv"), "utf8").split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const [fdcId, , description] = parseCsvLine(line);
  if (wanted.has(fdcId)) {
    out[fdcId] = { description };
    for (const name of Object.values(NUTRIENTS)) out[fdcId][name] = null;
  }
}

const missing = [...wanted].filter((id) => !out[id]);
if (missing.length) {
  console.error(`not in SR Legacy: ${missing.join(", ")}`);
  process.exit(1);
}

const rl = createInterface({ input: createReadStream(join(srDir, "food_nutrient.csv")) });
for await (const line of rl) {
  const [, fdcId, nutrientId, amount] = parseCsvLine(line);
  const name = NUTRIENTS[nutrientId];
  if (name && out[fdcId]) out[fdcId][name] = Number(amount);
}

for (const [id, f] of Object.entries(out)) {
  for (const required of ["kcal", "protein_g", "carbohydrates_g", "fat_g"]) {
    if (f[required] === null) {
      console.error(`${id} ${f.description} has no ${required}`);
      process.exit(1);
    }
  }
}

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => Number(a) - Number(b)));
writeFileSync(
  new URL("usda-ingredients.json", here),
  JSON.stringify({ source: "USDA FoodData Central, SR Legacy (April 2018 release)", per: "100 g", foods: sorted }, null, 2) + "\n",
);
console.log(`wrote ${Object.keys(sorted).length} ingredients`);

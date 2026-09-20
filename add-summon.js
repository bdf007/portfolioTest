#!/usr/bin/env node
/**
 * add-summon.js
 *
 * Script interactif qui cree, a partir d'un seul monstre, toutes les
 * entrees necessaires pour en faire une invocation jouable :
 *   - la competence dans ABILITY_DEFS (abilityDefs.js)
 *   - la recette de craft dans CRAFTING_RECIPES (craftingRecipes.js)
 *   - l'item "core" (materiau) + l'item "scroll" (parchemin) dans
 *     ITEM_DEFS cote client (itemDefs.js) ET dans ITEM_TYPES cote
 *     serveur (itemTypes.js)
 *   - la table de loot <key>Drop dans LOOT_TABLES (itemTypes.js)
 *   - les 2 entrees de teinte dans ICON_TINTS (InventoryScreen.jsx)
 *   - les 2 entrees de frame (core dans MONSTER_LOOTS_FRAMES, scroll
 *     dans ICON_SHEET_1_FRAMES) dans spriteRegistry.js
 *
 * Toutes les stats/loot/couleur sont clonees sur le modele exact de
 * "gnome" (cf. conversation) - a ajuster ensuite a la main si besoin.
 *
 * Usage : node add-summon.js
 * (a lancer depuis la racine du projet, au meme niveau que client/ et
 * server/)
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ---------------------------------------------------------------------
// Chemins des fichiers - a ajuster ici si l'arborescence change
// ---------------------------------------------------------------------
const ROOT = process.cwd();
const FILES = {
  abilityDefs: path.join(ROOT, "client/src/component/arpg/abilityDefs.js"),
  craftingRecipes: path.join(
    ROOT,
    "client/src/component/arpg/craftingRecipes.js",
  ),
  inventoryScreen: path.join(
    ROOT,
    "client/src/component/arpg/InventoryScreen.jsx",
  ),
  itemDefs: path.join(ROOT, "client/src/component/arpg/itemDefs.js"),
  spriteRegistry: path.join(
    ROOT,
    "client/src/component/arpg/spriteRegistry.js",
  ),
  itemTypes: path.join(ROOT, "server/services/generation/itemTypes.js"),
};

const DEFAULT_TINT_COLOR = "#cccccc"; // place-holder volontaire, a retoucher a la main

// ---------------------------------------------------------------------
// Utilitaires generiques
// ---------------------------------------------------------------------

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Trouve l'index de l'accolade ouvrante d'un objet/array declare comme
 * "const NAME = {" ou "export const NAME = {" (ou "[" pour un array).
 * Retourne l'index du caractere "{"/"[" lui-meme.
 */
function findObjectOpenBrace(content, varName, filePath) {
  const regex = new RegExp(
    `(?:export\\s+)?const\\s+${varName}\\s*=\\s*(\\{|\\[)`,
  );
  const match = regex.exec(content);
  if (!match) {
    throw new Error(
      `Impossible de trouver la declaration de "${varName}" dans ${filePath}`,
    );
  }
  return match.index + match[0].length - 1;
}

/**
 * A partir de l'index d'une accolade/crochet ouvrant, trouve l'index de
 * son accolade/crochet fermant correspondant, en ignorant le contenu des
 * chaines de caracteres (simple/double/template) et des commentaires,
 * pour ne pas se faire piocher par un "{" ou "}" present dans une chaine.
 */
function findMatchingClose(content, openIndex) {
  const openChar = content[openIndex];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let i = openIndex;
  let inString = null; // ', ", ou ` si on est dans une chaine
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < content.length; i++) {
    const c = content[i];
    const prev = content[i - 1];

    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (prev === "*" && c === "/") inBlockComment = false;
      continue;
    }
    if (inString) {
      if (c === inString && prev !== "\\") inString = null;
      continue;
    }

    if (c === "/" && content[i + 1] === "/") {
      inLineComment = true;
      continue;
    }
    if (c === "/" && content[i + 1] === "*") {
      inBlockComment = true;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      inString = c;
      continue;
    }

    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  throw new Error("Accolade/crochet fermant introuvable (fichier corrompu ?)");
}

/**
 * Insere `entryText` juste avant l'accolade/crochet fermant de l'objet
 * `varName` dans `content`. `entryText` doit deja etre correctement
 * indente et se terminer par une virgule + retour a la ligne.
 */
function insertIntoObject(content, varName, entryText, filePath) {
  const openIndex = findObjectOpenBrace(content, varName, filePath);
  const closeIndex = findMatchingClose(content, openIndex);
  return (
    content.slice(0, closeIndex) + entryText + content.slice(closeIndex)
  );
}

// ---------------------------------------------------------------------
// Prompts interactifs
// ---------------------------------------------------------------------

// On evite rl.question() enchaine (peu fiable selon la facon dont le
// terminal bufferise l'entree) et on lit plutot les lignes une a une via
// l'evenement "line", avec une file d'attente - fonctionne de la meme
// facon quel que soit le terminal.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const pendingLines = [];
const pendingResolvers = [];
rl.on("line", (line) => {
  if (pendingResolvers.length > 0) {
    pendingResolvers.shift()(line);
  } else {
    pendingLines.push(line);
  }
});

function ask(question) {
  process.stdout.write(question);
  return new Promise((resolve) => {
    if (pendingLines.length > 0) {
      resolve(pendingLines.shift());
    } else {
      pendingResolvers.push(resolve);
    }
  });
}

async function main() {
  console.log("=== Creation d'une nouvelle invocation ===\n");

  const key = (
    await ask(
      'Identifiant camelCase (ex: "gnome", "angryTrent") : ',
    )
  ).trim();
  if (!key) throw new Error("Identifiant requis.");
  const Key = capitalize(key);

  const titleName = (
    await ask(
      'Nom affiche, majuscule (ex: "Gnome", "Trent en colère") : ',
    )
  ).trim();

  const nameBare = titleName.charAt(0).toLowerCase() + titleName.slice(1);

  const namePhrase = (
    await ask(
      'Phrase avec article indefini (ex: "un gnome", "un trent en colère") : ',
    )
  ).trim();

  const summonTypeInput = (
    await ask(
      `Cle SPRITE_REGISTRY pour le visuel (Entree = "${key}") : `,
    )
  ).trim();
  const summonType = summonTypeInput || key;

  const coreFrameIndex = (
    await ask("Frame index du core dans MONSTER_LOOTS_FRAMES : ")
  ).trim();
  const scrollFrameIndex = (
    await ask("Frame index du scroll dans ICON_SHEET_1_FRAMES : ")
  ).trim();

  const tintInput = (
    await ask(`Couleur de teinte (Entree = "${DEFAULT_TINT_COLOR}") : `)
  ).trim();
  const tintColor = tintInput || DEFAULT_TINT_COLOR;

  rl.close();

  if (!/^\d+$/.test(coreFrameIndex) || !/^\d+$/.test(scrollFrameIndex)) {
    throw new Error("Les frame index doivent etre des nombres entiers.");
  }

  console.log("\nRecapitulatif :");
  console.log({
    key,
    Key,
    titleName,
    nameBare,
    namePhrase,
    summonType,
    coreFrameIndex,
    scrollFrameIndex,
    tintColor,
  });
  console.log("\nEcriture des fichiers...\n");

  // ---------------------------------------------------------------
  // 1. ABILITY_DEFS
  // ---------------------------------------------------------------
  {
    const filePath = FILES.abilityDefs;
    let content = readFile(filePath);
    const entry = `  summon${Key}: {
    id: "summon${Key}",
    name: "Invocation : ${titleName}",
    archetypes: [],
    description:
      "Invoque ${namePhrase} temporaire qui combat à tes côtés, jusqu'à sa mort ou expiration. 30 mana.",
    staminaCost: 1,
    cooldownMs: 15000,
    effectType: "summon",
    summonType: "${summonType}",
    durationMs: null,
    hp: 40,
    damage: 8,
    defense: 1,
    damageType: "physical",
    resistances: { physical: 1 },
    unlockLevel: null,
  },
`;
    content = insertIntoObject(content, "ABILITY_DEFS", entry, filePath);
    writeFile(filePath, content);
    console.log(`✓ abilityDefs.js : summon${Key} ajoute`);
  }

  // ---------------------------------------------------------------
  // 2. CRAFTING_RECIPES
  // ---------------------------------------------------------------
  {
    const filePath = FILES.craftingRecipes;
    let content = readFile(filePath);
    const entry = `  summon${Key}Recipe: {
    id: "summon${Key}Recipe",
    name: "Recette de Parchemin : Invocation : ${titleName}",
    resultItemId: "summon${Key}Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "${key}Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
`;
    content = insertIntoObject(
      content,
      "CRAFTING_RECIPES",
      entry,
      filePath,
    );
    writeFile(filePath, content);
    console.log(`✓ craftingRecipes.js : summon${Key}Recipe ajoute`);
  }

  // ---------------------------------------------------------------
  // 3. ITEM_DEFS (client) - core + scroll
  // ---------------------------------------------------------------
  {
    const filePath = FILES.itemDefs;
    let content = readFile(filePath);
    const coreEntry = `  ${key}Core: {
    id: "${key}Core",
    category: "craftingMaterial",
    name: "Noyau de ${nameBare}",
    description: "Le cœur d'${namePhrase}, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
`;
    const scrollEntry = `  summon${Key}Scroll: {
    id: "summon${Key}Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : ${titleName}",
    description: "Apprend la compétence Invocation : ${titleName}.",
    grantsAbility: "summon${Key}",
    stackable: false,
  },
`;
    content = insertIntoObject(
      content,
      "ITEM_DEFS",
      coreEntry + scrollEntry,
      filePath,
    );
    writeFile(filePath, content);
    console.log(
      `✓ itemDefs.js : ${key}Core + summon${Key}Scroll ajoutes`,
    );
  }

  // ---------------------------------------------------------------
  // 4. spriteRegistry.js - frames core + scroll
  // ---------------------------------------------------------------
  {
    const filePath = FILES.spriteRegistry;
    let content = readFile(filePath);
    content = insertIntoObject(
      content,
      "MONSTER_LOOTS_FRAMES",
      `  ${key}Core: ${coreFrameIndex},\n`,
      filePath,
    );
    content = insertIntoObject(
      content,
      "ICON_SHEET_1_FRAMES",
      `  summon${Key}Scroll: ${scrollFrameIndex},\n`,
      filePath,
    );
    writeFile(filePath, content);
    console.log(
      `✓ spriteRegistry.js : frames ${key}Core (${coreFrameIndex}) + summon${Key}Scroll (${scrollFrameIndex}) ajoutees`,
    );
  }

  // ---------------------------------------------------------------
  // 5. InventoryScreen.jsx - ICON_TINTS
  // ---------------------------------------------------------------
  {
    const filePath = FILES.inventoryScreen;
    let content = readFile(filePath);
    const entry = `  ${key}Core: "${tintColor}",
  summon${Key}Scroll: "${tintColor}",
`;
    content = insertIntoObject(content, "ICON_TINTS", entry, filePath);
    writeFile(filePath, content);
    console.log(`✓ InventoryScreen.jsx : teintes ${key}Core / summon${Key}Scroll ajoutees`);
  }

  // ---------------------------------------------------------------
  // 6. itemTypes.js (serveur) - ITEM_TYPES (core + scroll) + LOOT_TABLES
  // ---------------------------------------------------------------
  {
    const filePath = FILES.itemTypes;
    let content = readFile(filePath);
    const coreEntry = `  ${key}Core: {
    id: "${key}Core",
    category: "craftingMaterial",
    name: "Noyau de ${nameBare}",
    description: "Le cœur d'${namePhrase}, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
`;
    const scrollEntry = `  summon${Key}Scroll: {
    id: "summon${Key}Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : ${titleName}",
    description: "Apprend la compétence Invocation : ${titleName}.",
    grantsAbility: "summon${Key}",
    stackable: false,
  },
`;
    content = insertIntoObject(
      content,
      "ITEM_TYPES",
      coreEntry + scrollEntry,
      filePath,
    );

    const dropEntry = `  ${key}Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "${key}Core", weight: 50 },
  ],
`;
    content = insertIntoObject(content, "LOOT_TABLES", dropEntry, filePath);

    writeFile(filePath, content);
    console.log(
      `✓ itemTypes.js : ${key}Core + summon${Key}Scroll + ${key}Drop ajoutes`,
    );
  }

  console.log("\nTermine. Pense a verifier/ajuster manuellement :");
  console.log(
    `  - la couleur de teinte (actuellement "${tintColor}")`,
  );
  console.log("  - les stats de la competence (clonees sur gnome)");
  console.log("  - le attackType de la competence si le monstre est ranged");
}

main().catch((err) => {
  console.error("\nErreur :", err.message);
  process.exit(1);
});

/**
 * blob47-autotile.js
 * Moteur d'autotiling "blob47" (256 masques de voisinage -> 47 formes uniques).
 * Généré et vérifié pour le projet ARPG Phaser.
 *
 * Convention des bits de voisinage :
 *   N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128
 * (un bit = 1 si la case voisine est du même matériau / terrain plein)
 */

export const DIR = { N: 1, NE: 2, E: 4, SE: 8, S: 16, SW: 32, W: 64, NW: 128 };

// Réduit un masque 8-bits (0-255) à son masque "effectif" : une diagonale
// ne compte que si les DEUX cases orthogonales adjacentes sont pleines.
export function effectiveMask(mask) {
  let m = mask & (DIR.N | DIR.E | DIR.S | DIR.W);
  if (mask & DIR.NE && (mask & DIR.N) && (mask & DIR.E)) m |= DIR.NE;
  if (mask & DIR.SE && (mask & DIR.S) && (mask & DIR.E)) m |= DIR.SE;
  if (mask & DIR.SW && (mask & DIR.S) && (mask & DIR.W)) m |= DIR.SW;
  if (mask & DIR.NW && (mask & DIR.N) && (mask & DIR.W)) m |= DIR.NW;
  return m;
}

// Table des 47 formes canoniques, triées par nombre de voisins orthogonaux
// puis par valeur de masque. C'est la MÊME table que celle utilisée pour
// générer blob47-shapes.json (index 0-46).
const _shapes = (() => {
  const set = new Set();
  for (let m = 0; m < 256; m++) set.add(effectiveMask(m));
  return [...set].sort((a, b) => {
    const pa = popcount(a & (DIR.N | DIR.E | DIR.S | DIR.W));
    const pb = popcount(b & (DIR.N | DIR.E | DIR.S | DIR.W));
    return pa - pb || a - b;
  });
})();

function popcount(x) {
  let c = 0;
  while (x) { c += x & 1; x >>= 1; }
  return c;
}

// mask (0-255) -> index de forme (0-46)
export function shapeIndex(mask) {
  return _shapes.indexOf(effectiveMask(mask));
}

export const SHAPES = _shapes; // tableau : SHAPES[i] = masque effectif de la forme i

/**
 * Calcule le masque de voisinage d'une case (x,y) dans une grille.
 * sameFn(nx, ny) doit renvoyer true si la case voisine est le même terrain
 * (ou hors-grille si tu veux qu'un bord de carte compte comme "plein").
 */
export function computeMask(x, y, sameFn) {
  let mask = 0;
  if (sameFn(x, y - 1)) mask |= DIR.N;
  if (sameFn(x + 1, y - 1)) mask |= DIR.NE;
  if (sameFn(x + 1, y)) mask |= DIR.E;
  if (sameFn(x + 1, y + 1)) mask |= DIR.SE;
  if (sameFn(x, y + 1)) mask |= DIR.S;
  if (sameFn(x - 1, y + 1)) mask |= DIR.SW;
  if (sameFn(x - 1, y)) mask |= DIR.W;
  if (sameFn(x - 1, y - 1)) mask |= DIR.NW;
  return mask;
}

/**
 * Renvoie {col, row} dans le tileset splitté (materials.json) pour une case
 * donnée, à partir du numéro de ligne du matériau (row_index dans materials.json).
 */
export function tileForCell(x, y, sameFn, materialRowIndex) {
  const mask = computeMask(x, y, sameFn);
  const shape = shapeIndex(mask);
  return { col: shape, row: materialRowIndex }; // col 0-46, à multiplier par tile_size
}

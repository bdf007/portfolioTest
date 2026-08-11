/**
 * Script de migration : envoie vers pCloud toutes les images encore
 * stockées en Base64 (imageData) dans Mongo, pour les 4 collections
 * concernées, et remplace le champ par pcloudFileId.
 *
 * À lancer depuis le dossier "server" (local et prod partagent la même
 * base, donc pas besoin de le déployer sur le serveur) :
 *
 *   node scripts/migrate-images-to-pcloud.js
 *
 * Sûr à relancer plusieurs fois : seules les entrées avec imageData ET
 * sans pcloudFileId sont traitées, les autres sont ignorées.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const connection = require("../config/db");
const { uploadBase64Image } = require("../services/pcloud");

const Game = require("../models/game");
const Technologie = require("../models/technologies");
const Certificate = require("../models/certificate");
const Project = require("../models/projectWithimage");

const TARGETS = [
  { model: Game, subfolder: "ludotheque", prefix: "game", label: "Ludothèque" },
  {
    model: Technologie,
    subfolder: "technologies",
    prefix: "technologie",
    label: "Technologies",
  },
  {
    model: Certificate,
    subfolder: "certificats",
    prefix: "certificate",
    label: "Certificats",
  },
  { model: Project, subfolder: "projets", prefix: "project", label: "Projets" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function migrateCollection({ model, subfolder, prefix, label }) {
  console.log(`\n=== ${label} ===`);

  const toMigrate = await model
    .find({
      imageData: { $exists: true, $ne: null },
      $or: [{ pcloudFileId: { $exists: false } }, { pcloudFileId: null }],
    })
    .limit(1);

  if (toMigrate.length === 0) {
    console.log("Rien à migrer.");
    return { success: 0, failed: 0 };
  }

  console.log(`${toMigrate.length} entrée(s) à migrer.`);

  let success = 0;
  let failed = 0;

  for (const doc of toMigrate) {
    try {
      const fileid = await uploadBase64Image(
        doc.imageData,
        `${prefix}-${doc._id}.webp`,
        subfolder,
      );

      doc.pcloudFileId = fileid;
      doc.imageData = undefined;
      await doc.save();

      success += 1;
      console.log(`  OK  ${doc._id} (${doc.title || "sans titre"})`);
    } catch (error) {
      failed += 1;
      console.error(`  ECHEC ${doc._id} :`, error.message);
    }

    // Petite pause entre chaque upload, pour ne pas bombarder l'API pCloud
    await wait(300);
  }

  return { success, failed };
}

async function main() {
  connection();
  await mongoose.connection.asPromise();
  console.log("Connecté à MongoDB.");

  const totals = { success: 0, failed: 0 };

  for (const target of TARGETS) {
    const result = await migrateCollection(target);
    totals.success += result.success;
    totals.failed += result.failed;
  }

  console.log("\n=== Résumé ===");
  console.log(`Migrées avec succès : ${totals.success}`);
  console.log(`Échecs : ${totals.failed}`);

  await mongoose.disconnect();
  process.exit(totals.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Erreur fatale :", error);
  process.exit(1);
});

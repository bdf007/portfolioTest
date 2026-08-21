const mongoose = require("mongoose");

/**
 * Représente une partie ARPG en cours pour un joueur.
 * Le layout du niveau courant n'est volontairement PAS stocké tel quel :
 * on stocke la seed + la profondeur, et on régénère le niveau à la demande
 * via services/generation. Ça évite de dupliquer des grilles potentiellement
 * grosses en base, et ça garantit que layout et seed restent toujours cohérents.
 */
const ArpgGameSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seed: {
      type: String,
      required: true,
    },
    depth: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ["en_cours", "termine", "abandonne"],
      default: "en_cours",
    },
    // historique des seeds par etage deja visite - permet de regenerer
    // exactement le meme plan en revenant sur un etage traverse
    // precedemment (cf. mecanique de remontee), plutot que d'en tirer un
    // nouveau a chaque fois. `depth`/`seed` ci-dessus restent l'etage
    // COURANT ; ce tableau est l'historique complet, `depth` courant y
    // compris (redondant avec les champs ci-dessus pour l'etage actuel,
    // mais garde une structure uniforme facile a interroger)
    floors: {
      type: [{ depth: Number, seed: String, _id: false }],
      default: [],
    },
    // position du joueur dans le niveau courant, pour reprendre exactement où il était
    playerPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    // stats de run en cours (vie, inventaire...) - à affiner une fois le
    // système de combat/inventaire défini
    playerState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ArpgGame", ArpgGameSchema);

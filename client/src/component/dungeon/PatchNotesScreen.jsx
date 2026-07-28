import React from "react";

const PatchNotesScreen = ({ onBack }) => {
  return (
    <div className="rules-screen">
      <h2>🛠️ Notes de mise à jour</h2>
      <button onClick={onBack}>← Retour</button>

      <section>
        <h3>Version 1.2 — 28 juillet 2026</h3>
        <p className="patch-version-subtitle">Personnalisation du héros</p>

        <p>
          <strong>Apparence du héros</strong> : choisis parmi 4 sprites à la
          création (et à chaque recréation après une mort). Une apparence déjà
          utilisée par une vie précédente de la même partie est grisée,
          indisponible.
        </p>

        <p>
          <strong>Marche animée</strong> : le héros s'oriente désormais dans la
          bonne direction et anime son cycle de marche pendant les déplacements,
          au lieu d'un sprite fixe.
        </p>

        <p>
          <strong>Nom du héros</strong> : reprend automatiquement ton pseudo, au
          lieu du nom générique "Hero".
        </p>

        <p>
          <strong>Classement</strong> : affiche maintenant l'apparence du héros
          à côté du pseudo, ainsi que la cause précise de chaque fin de partie
          (type de mort, ou abandon).
        </p>

        <p>
          <strong>Signaler un bug</strong> : nouveau bouton dédié, accessible à
          tout moment en jeu — plus besoin de passer par la page Contact du
          site.
        </p>

        <p>
          <strong>Correctif</strong> : le résultat du dernier combat d'une
          partie terminée ne reste plus affiché par erreur au moment d'en
          démarrer une nouvelle.
        </p>
      </section>

      <section>
        <h3>Version 1.1 — 27 juillet 2026</h3>
        <p className="patch-version-subtitle">Rythme de jeu et équilibrage</p>

        <p>
          <strong>Gouffre</strong> : la découverte d'un gouffre ne tue plus
          automatiquement. Tente un jet de sauvetage (1D6, besoin d'un 6) —
          réussi, tu t'accroches de justesse et recules en sécurité ; raté, la
          mort est confirmée via un bouton dédié, pour te laisser le temps de
          comprendre ce qui vient de se passer.
        </p>

        <p>
          <strong>Score</strong> : le méga-blob (7 pts), le mimic (6 pts) et le
          boss (12 pts) rapportent désormais plus de points, pour que fusionner
          ou affronter le boss reste rentable. Ramasser la clé pour la première
          fois rapporte 1 point, et explorer le donjon rapporte +1 point tous
          les 5 tuiles révélées.
        </p>

        <p>
          <strong>Déplacement complet en un clic</strong> : une double flèche
          permet de dérouler tout le trajet restant dans une direction, au lieu
          de cliquer case par case. Le déplacement s'arrête automatiquement dès
          qu'une décision devient nécessaire (piège, ennemi...).
        </p>

        <p>
          <strong>Combat</strong> : le popup reste désormais affiché après une
          victoire ou une défaite (avec un bouton "Continuer"), pour ne plus
          rater ce qui s'est passé lors d'une attaque furtive ou d'un coup
          décisif.
        </p>

        <p>
          <strong>Magasin</strong> : ne s'ouvre plus qu'en terminant son tour
          dessus — un simple passage avec des mouvements restants ne déclenche
          plus rien.
        </p>

        <p>
          <strong>Objets</strong> : les utiliser en dehors d'un combat consomme
          désormais le tour (comme acheter ou ouvrir un coffre), et un seul
          objet est utilisable par tour. En combat, les bombes n'ont plus
          d'effet (elles ne servent qu'à révéler des cases).
        </p>

        <p>
          <strong>Bloqué face à un ennemi</strong> : un héros incapable de se
          déplacer (sans jambes, mauvais lancer) et resté sur la case d'un
          ennemi après avoir décliné un premier affrontement peut désormais
          tenter de se dissimuler (1D6, 50 %) plutôt que de rester bloqué sans
          aucune option.
        </p>

        <p>
          <strong>Petit plus</strong> : un message s'affiche si le lancer de dé,
          réduit par la perte des jambes, tombe à 0 mouvement.
        </p>

        <p className="patch-fixes-label">
          Correctifs découverts pendant les tests :
        </p>
        <ul className="patch-fixes-list">
          <li>
            Rebond sur les murs correctement suivi lors d'un déplacement en un
            clic
          </li>
          <li>
            Messages du trajet (comme la récupération d'un trésor) qui ne
            disparaissaient plus
          </li>
          <li>
            Magasin qui refusait parfois de s'ouvrir même en y terminant son
            tour
          </li>
        </ul>
      </section>
    </div>
  );
};

export default PatchNotesScreen;

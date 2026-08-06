import React from "react";

const PatchNotesScreen = ({ onBack }) => {
  return (
    <div className="rules-screen">
      <h2>🛠️ Notes de mise à jour</h2>
      <button onClick={onBack}>← Retour</button>

      <section>
        <h3>Version 1.4 — 6 août 2026</h3>
        <p className="patch-version-subtitle">La victoire, enfin</p>

        <p>
          <strong>Correctif majeur</strong> : il était jusqu'ici impossible de
          gagner une partie — le donjon enchaînait les étages à l'infini, sans
          jamais déclencher l'écran de victoire. Chaque difficulté a désormais
          un nombre d'étages précis à boucler pour triompher : Facile 10, Moyen
          6, Difficile 4, Épique 2 (moins d'étages sur les difficultés qui
          laissent le moins de vies, pour ne pas cumuler les pénalités). Les
          victoires apparaissent bien sûr dans le classement, avec leur propre
          icône 🏆.
        </p>

        <p>
          <strong>Détecteur de pièges</strong> : nouvelle capacité, disponible à
          tout moment hors combat (pas besoin de la trouver ni de la porter dans
          l'inventaire). Révèle brièvement l'emplacement de tous les pièges de
          l'étage en cours — un vrai coup de pouce en Épique, où la moindre case
          cachée peut être fatale. Gratuite la première fois, puis +5 points de
          score à chaque utilisation suivante.
        </p>
      </section>

      <section>
        <h3>Version 1.3 — 29 juillet 2026</h3>
        <p className="patch-version-subtitle">Décor et objets</p>

        <p>
          <strong>Sols variés</strong> : chaque étage tire désormais l'une de
          ses 5 textures de sol possibles, pour casser la monotonie visuelle
          d'un étage à l'autre.
        </p>

        <p>
          <strong>Icônes d'objets</strong> : potions, amélioration d'arme et
          bombes ont maintenant leur propre icône, dans l'inventaire comme dans
          la barre de statistiques — plus besoin d'ouvrir l'inventaire pour
          savoir d'un coup d'œil ce que tu portes sur toi.
        </p>

        <p>
          <strong>Classement</strong> : à score strictement égal, le premier
          arrivé garde sa place — un nouveau score identique ne délogera plus
          quelqu'un déjà classé, il faut désormais le battre pour prendre sa
          place.
        </p>

        <p>
          <strong>Déplacement</strong> : plusieurs corrections sur l'animation
          du héros — orientation correcte tout au long d'un déplacement (y
          compris après un rebond sur un mur ou sur le tout dernier pas), et
          retour face à la caméra une fois immobile.
        </p>
      </section>

      <section>
        <h3>Version 1.2 — 28 juillet 2026</h3>
        <p className="patch-version-subtitle">Personnalisation du héros</p>

        <p>
          <strong>Apparence du héros</strong> : choisis parmi 4 sprites à la
          création (et à chaque recréation après une mort). Une apparence déjà
          utilisée par une vie précédente de la même partie est grisée,
          indisponible — sauf si les 4 ont déjà servi, auquel cas elles
          redeviennent toutes disponibles.
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

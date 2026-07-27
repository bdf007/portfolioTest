import React from "react";

const PatchNotesScreen = ({ onBack }) => {
  return (
    <div className="rules-screen">
      <h2>🛠️ Notes de mise à jour</h2>
      <button onClick={onBack}>← Retour</button>

      <section>
        <h3>Aujourd'hui</h3>

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
          désormais le tour (comme acheter ou ouvrir un coffre). En combat, ça
          reste libre et sans conséquence.
        </p>

        <p>
          <strong>Petit plus</strong> : un message s'affiche si le lancer de dé,
          réduit par la perte des jambes, tombe à 0 mouvement.
        </p>
      </section>

      <section>
        <h3>Correctifs découverts pendant les tests</h3>

        <p>
          <strong>Rebond sur les murs</strong> : lors d'un déplacement complet
          en un clic, le héros suit désormais correctement le rebond sur un mur
          d'une case à l'autre, au lieu de rester bloqué à osciller contre le
          mur.
        </p>

        <p>
          <strong>Messages du trajet</strong> : lors d'un déplacement complet en
          un clic, tous les événements survenus en route (comme la récupération
          d'un trésor perdu) restent désormais affichés à la fin, au lieu de
          disparaître, écrasés par le message de l'étape suivante.
        </p>

        <p>
          <strong>Magasin bloqué</strong> : corrigé un cas où le magasin
          refusait de s'ouvrir même en y terminant son tour, si un popup avait
          déjà été fermé manuellement sur cette case lors d'un tour précédent.
        </p>

        <p>
          <strong>Bloqué face à un ennemi</strong> : un héros incapable de se
          déplacer (sans jambes, mauvais lancer) et resté sur la case d'un
          ennemi après avoir décliné un premier affrontement ne reste plus
          jamais sans option — voir "Ennemis & combat" dans les règles pour le
          détail du nouveau choix proposé.
        </p>

        <p>
          <strong>Un seul objet par tour</strong> : hors combat, impossible d'en
          utiliser un second dans le même tour (les boutons se grisent
          directement dans l'inventaire). En combat, les bombes sont désormais
          grisées elles aussi — elles n'ont aucun effet en plein affrontement.
        </p>
      </section>
    </div>
  );
};

export default PatchNotesScreen;

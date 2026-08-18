import React from "react";

const RulesScreen = ({ onBack }) => {
  return (
    <div className="rules-screen">
      <h2>📜 Règles du jeu</h2>
      <button onClick={onBack}>← Retour</button>

      <section>
        <h3>Objectif</h3>
        <p>
          Récupère la clé, vaincs le boss, puis atteins la sortie. Une fois ces
          trois conditions réunies, tu descends à l'étage suivant — sauf si
          c'était le dernier étage de ta difficulté, auquel cas tu remportes la
          partie.
        </p>
        <p>
          Nombre d'étages à boucler pour gagner : <strong>10</strong> en Facile,{" "}
          <strong>6</strong> en Moyen, <strong>4</strong> en Difficile,{" "}
          <strong>2</strong> en Épique — moins de vies, moins d'étages à tenir.
        </p>
      </section>

      <section>
        <h3>Difficulté</h3>
        <p>
          Choisie au lancement, elle fixe deux choses pour toute la partie :
        </p>
        <ul>
          <li>
            <strong>Facile</strong> — 4 essais de dés à la création du héros, 4
            vies
          </li>
          <li>
            <strong>Moyen</strong> — 3 essais, 3 vies
          </li>
          <li>
            <strong>Difficile</strong> — 2 essais, 2 vies. Une horde de rats ou
            un méga-blob formé sous tes pieds engage le combat immédiatement
          </li>
          <li>
            <strong>Épique</strong> — 1 seul essai, 1 seule vie. Tout combat
            engagé va jusqu'au bout, sans repli possible
          </li>
        </ul>
      </section>

      <section>
        <h3>Mode</h3>
        <p>
          Deux choix indépendants à la création : le <strong>mode</strong>{" "}
          (structure du plateau) et la <strong>difficulté</strong> (densité de
          monstres/pièges, vies, essais) — les mêmes réglages de difficulté
          s'appliquent quel que soit le mode choisi.
        </p>
        <ul>
          <li>
            <strong>Classique</strong> — une seule grande salle, comme le jeu de
            plateau d'origine
          </li>
          <li>
            <strong>Aventure</strong> — un vrai donjon en plusieurs salles
            reliées par des portes. Chaque salle ne communique avec sa voisine
            qu'en un point précis (le reste est un mur) — repère les murs à
            l'écran, même sur les cases pas encore explorées. Le déplacement ne
            fait jamais rebondir : une direction bloquée est juste indisponible,
            et tu peux changer de sens à chaque pas. Une caméra te suit et une
            mini-carte en coin d'écran montre les salles déjà visitées.
          </li>
        </ul>
      </section>

      <section>
        <h3>Déplacement</h3>
        <p>
          Lance le dé, choisis une direction, avance case par case. Un mur te
          fait rebondir dans la direction opposée pour les mouvements restants.
          Seule la case où tu t'arrêtes est révélée.
        </p>
        <p>
          Si tu n'as plus l'usage de tes jambes, ton lancer de dé est réduit de
          2 (1D6 - 2, minimum 0 mouvement).
        </p>
        <p>
          Astuce : la double flèche déroule tout le trajet restant en un clic,
          et s'arrête automatiquement dès qu'une décision devient nécessaire
          (piège, ennemi...).
        </p>
      </section>

      <section>
        <h3>Pièges</h3>
        <p>
          <strong>Herse</strong> : -1 PV à la découverte. Une fois connue, tu
          peux marcher dessus (-1 PV), ou sauter par-dessus (garanti à 3
          mouvements, risqué à 2) — le saut n'est possible que si tu as encore
          l'usage de tes jambes.
        </p>
        <p>
          <strong>Gouffre</strong> : à la découverte, tente un jet de sauvetage
          (1D6, besoin d'un 6). Réussi, tu t'accroches de justesse et recules en
          sécurité. Raté, c'est la mort. Une fois le gouffre connu, tu peux
          t'arrêter avant, t'y jeter volontairement, ou tenter de sauter
          par-dessus (mêmes conditions que pour la herse).
        </p>
        <p>
          Si tu atterris sur une autre herse en sautant, tu perds 2 PV au lieu
          d'1 — le choc de l'atterrissage est plus rude que si tu marchais
          simplement dessus.
        </p>
        <p>
          Si tu atterris sur un ennemi en sautant, le combat démarre aussitôt
          avec l'initiative à l'ennemi, sans possibilité de fuite.
        </p>
      </section>

      <section>
        <h3>Ennemis & combat</h3>
        <p>
          Chaque rat, blob, mimic ou boss tire ses propres PV et PC dans une
          fourchette qui monte avec la difficulté — deux ennemis du même type
          peuvent donc avoir des stats différentes.
        </p>
        <p>
          Face à un ennemi déjà connu, quatre choix s'offrent à toi : tenter de
          le contourner furtivement (garanti à 3 mouvements, risqué à 2),
          l'affronter directement, ou t'arrêter net sans agir.
        </p>
        <p>
          En combat, chaque coup touche une partie du corps au hasard (tête,
          torse ou jambes). La tête ou le torse à 0 PV, c'est la mort. Les
          jambes à 0 PV réduisent ta mobilité et affaiblissent ton arme.
        </p>
        <p>
          Le repli n'est possible qu'après un round complet, et seulement si le
          combat n'est pas obligatoire (horde de rats, monstre au trésor, boss
          avec la clé, ou n'importe quel combat en difficulté Épique).
        </p>
        <p>
          Si tu restes coincé sur la case d'un ennemi (typiquement sans jambes,
          incapable de bouger), le choix te sera reproposé à chaque tour :
          combattre, ou tenter de te dissimuler (1D6, 50 %) — un échec te fait
          repérer, combat immédiat avec l'ennemi ayant l'initiative.
        </p>
        <p>
          Victoire ou défaite, le popup de combat reste affiché avec le résultat
          jusqu'à ce que tu cliques sur "Continuer" — tu as toujours le temps de
          voir ce qui vient de se passer.
        </p>
      </section>

      <section>
        <h3>Fusion des monstres</h3>
        <p>
          3 rats révélés fusionnent en une horde redoutable, jamais fuyable. 3
          monstres gélatineux de la même couleur fusionnent en un méga-blob plus
          puissant. Les PV des 3 fusionnés sont répartis sur les 3 parties du
          corps du résultat (rien n'est perdu), et le PC devient la moyenne des
          3 arrondie au-dessus. Les bombes révèlent des cases sans rien
          déclencher, mais peuvent quand même provoquer ces fusions.
        </p>
      </section>

      <section>
        <h3>Objets & trésors</h3>
        <p>
          Potions, améliorations d'arme et bombes s'obtiennent en ouvrant des
          coffres. Un mimic peut surgir d'un coffre — combat immédiat et
          obligatoire.
        </p>
        <p>
          Le magasin ne s'ouvre que si tu termines ton tour dessus (pas juste en
          passant), et un seul achat est possible par tour.
        </p>
        <p>
          Utiliser un objet est libre pendant un combat, sauf les bombes (aucun
          effet en plein affrontement). En dehors d'un combat, ça consomme ton
          tour, et un seul objet est utilisable par tour — l'objet acheté au
          magasin ne sera donc utilisable qu'au tour suivant.
        </p>
        <p>
          Le <strong>détecteur de pièges</strong> est à part : pas besoin de le
          trouver, il est disponible dès le début. Gratuit la première fois,
          puis +5 points à chaque utilisation suivante. Il révèle brièvement
          l'emplacement des pièges cachés de l'étage — un bon filet de sécurité
          en Épique, où un gouffre inconnu peut coûter la partie.
        </p>
      </section>

      <section>
        <h3>Mort et vies</h3>
        <p>
          À ta mort, ton or, tes objets et ta clé restent au sol — tu peux les
          récupérer en repassant dessus. Tant qu'il te reste des vies, tu peux
          recréer un héros. Sinon, l'aventure s'arrête, ton score final est
          enregistré.
        </p>
      </section>

      <section>
        <h3>Score</h3>
        <p>Chaque ennemi vaincu rapporte des points :</p>
        <ul>
          <li>Rat — 1 point</li>
          <li>Blob — 2 points</li>
          <li>Horde de rats — 4 points</li>
          <li>Mimic — 6 points</li>
          <li>Méga-blob — 7 points</li>
          <li>Boss — 12 points</li>
        </ul>
        <p>
          Ramasser la clé pour la première fois rapporte 1 point, et explorer le
          donjon en rapporte aussi un peu : +1 point tous les 5 tuiles révélées.
        </p>
        <p>
          Chaque étage réussi ajoute un bonus de rapidité (100 moins le nombre
          de tours utilisés). Les meilleurs scores apparaissent dans le
          classement — séparé entre mode Classique et mode Aventure.
        </p>
      </section>
    </div>
  );
};

export default RulesScreen;

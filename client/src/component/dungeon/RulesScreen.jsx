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
          trois conditions réunies, tu descends à l'étage suivant plutôt que de
          terminer la partie — l'aventure continue jusqu'à ce que tu n'aies plus
          de vies, ou que tu choisisses d'abandonner.
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
          <strong>Gouffre</strong> : mort instantanée à la découverte. Une fois
          connu, tu ne peux que t'arrêter avant, t'y jeter volontairement, ou
          tenter de sauter par-dessus (mêmes conditions que pour la herse).
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
      </section>

      <section>
        <h3>Fusion des monstres</h3>
        <p>
          3 rats révélés fusionnent en une horde redoutable, jamais fuyable. 3
          monstres gélatineux de la même couleur fusionnent en un méga-blob plus
          puissant. Les bombes révèlent des cases sans rien déclencher, mais
          peuvent quand même provoquer ces fusions.
        </p>
      </section>

      <section>
        <h3>Objets & trésors</h3>
        <p>
          Potions, améliorations d'arme et bombes s'obtiennent en ouvrant des
          coffres. Le magasin permet d'en acheter un par tour. Un mimic peut
          surgir d'un coffre — combat immédiat et obligatoire.
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
          <li>Mimic — 5 points</li>
          <li>Méga-blob — 6 points</li>
          <li>Boss — 10 points</li>
        </ul>
        <p>
          Chaque étage réussi ajoute un bonus de rapidité (100 moins le nombre
          de tours utilisés). Les meilleurs scores apparaissent dans le
          classement.
        </p>
      </section>
    </div>
  );
};

export default RulesScreen;

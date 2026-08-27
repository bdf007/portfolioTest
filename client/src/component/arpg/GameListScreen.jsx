import { HERO_ROSTER } from "./spriteRegistry";

/**
 * Formate un temps de jeu en secondes -> "XhYY" (ex: 9900 -> "2h45").
 */
function formatPlayTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

/**
 * Libelle de classe du heros choisi pour cette partie - meme repli sur
 * 'hero1' que handleResumeGame (cf. arpg.jsx), pour rester coherent avec
 * ce qui sera reellement charge si le joueur reprend cette partie.
 */
function resolveHeroLabel(heroId) {
  const hero =
    HERO_ROSTER.find((h) => h.id === (heroId || "hero1")) || HERO_ROSTER[0];
  return hero.label;
}

/**
 * Écran "Parties en cours" - même pattern que StartScreen.jsx de Skip
 * the Dungeon : liste des parties en cours (reprendre/abandonner) plus
 * un bouton pour en démarrer une nouvelle.
 */
export default function GameListScreen({
  games,
  username,
  onResume,
  onAbandon,
  onDelete,
  onNewGame,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: 40,
        color: "#eee",
        background: "#12131a",
        minHeight: 400,
      }}
    >
      <h2 style={{ margin: 0 }}>
        {username ? `Parties en cours - ${username}` : "Parties en cours"}
      </h2>

      {games.length === 0 && (
        <div style={{ color: "#999" }}>Aucune partie en cours.</div>
      )}

      {games.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: 420,
          }}
        >
          {games.map((g) => (
            <div
              key={g.gameId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>
                {resolveHeroLabel(g.playerState?.heroId)} - Étage {g.depth} -
                Niveau {g.playerState?.level || 1} - XP {g.playerState?.xp || 0}{" "}
                - Temps en jeu :{" "}
                {formatPlayTime(g.playerState?.timePlayedSeconds || 0)}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => onResume(g)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    borderRadius: 6,
                    border: "1px solid #8a7050",
                    background: "#3a2f20",
                    color: "#f0e6d0",
                    cursor: "pointer",
                  }}
                >
                  Reprendre
                </button>
                <button
                  onClick={() => onAbandon(g.gameId)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    borderRadius: 6,
                    border: "1px solid #a04040",
                    background: "#3a2020",
                    color: "#f0d0d0",
                    cursor: "pointer",
                  }}
                >
                  Abandonner
                </button>
                <button
                  onClick={() => onDelete(g.gameId)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    borderRadius: 6,
                    border: "1px solid #a04040",
                    background: "#3a2020",
                    color: "#f0d0d0",
                    cursor: "pointer",
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onNewGame}
        style={{
          padding: "10px 20px",
          fontSize: 15,
          borderRadius: 6,
          border: "1px solid #555",
          background: "#2a2a35",
          color: "#eee",
          cursor: "pointer",
        }}
      >
        Nouvelle partie
      </button>
    </div>
  );
}

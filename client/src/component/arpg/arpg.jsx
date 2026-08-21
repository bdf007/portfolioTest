import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MainScene from "./scenes/MainScene";
import Minimap from "./Minimap";
import CharacterSelectScreen from "./CharacterSelectScreen";
import GameListScreen from "./GameListScreen";
import InventoryScreen from "./InventoryScreen";
import { fetchMyGames, abandonGame } from "../../api/arpgClient";

/**
 * Composant React qui héberge le jeu Phaser et le HUD (PV, XP, game over).
 *
 * Le HUD est rendu en JSX normal, piloté par du state React mis à jour
 * via les événements émis par MainScene (this.events.emit(...)) - pas de
 * document.getElementById() comme dans la démo de prototypage. Cette
 * séparation est ce qui permet au composant de survivre proprement à un
 * démontage/remontage (navigation ailleurs sur le site puis retour) sans
 * laisser de références DOM obsolètes.
 *
 * Flux : au chargement, liste des parties en cours (comme Skip the
 * Dungeon) - reprendre l'une d'elles saute directement le jeu, sinon
 * "Nouvelle partie" mène à l'écran de sélection du héros. Le jeu ne se
 * monte QUE une fois un héros connu (choisi ou déjà fixé par la partie
 * reprise).
 */
export default function Arpg() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  const [phase, setPhase] = useState("loading"); // 'loading' | 'picker' | 'select' | 'playing'
  const [games, setGames] = useState([]);
  const [heroId, setHeroId] = useState(null);
  const [resumeSave, setResumeSave] = useState(null); // partie a reprendre, si choisie dans la liste

  const [playerHp, setPlayerHp] = useState({ hp: 100, maxHp: 100 });
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [depth, setDepth] = useState(1);
  const [gameOver, setGameOver] = useState(null); // null | { xp, depth }
  const [loadError, setLoadError] = useState(null);
  const [minimapData, setMinimapData] = useState(null); // null | { grid, fogState, playerTile }
  const [npcDialog, setNpcDialog] = useState(null); // null | { text, canAccept }
  const [quests, setQuests] = useState({}); // { [depth]: { accepted, completed, killCount, target } }
  const [upstairsPrompt, setUpstairsPrompt] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [equipped, setEquipped] = useState({
    weapon: null,
    armor: null,
    accessory: null,
  });
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [minimapVisible, setMinimapVisible] = useState(true);

  const loadGamesList = () => {
    fetchMyGames()
      .then(({ games }) => setGames(games || []))
      .catch(() => setGames([])) // en cas d'echec reseau, liste vide plutot que de bloquer l'ecran
      .finally(() => setPhase("picker"));
  };

  // au montage : charge la liste des parties en cours
  useEffect(() => {
    loadGamesList();
  }, []);

  // monte Phaser uniquement une fois un heros connu (phase === 'playing')
  useEffect(() => {
    if (phase !== "playing" || !heroId) return;

    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      pixelArt: true,
      // aucun son dans le jeu pour l'instant - desactive completement le
      // systeme audio de Phaser (donc son AudioContext) plutot que de
      // laisser une instance en creer un a chaque montage. Sans ca, le
      // Fast Refresh de CRA (qui detruit et recree le jeu a chaque
      // modif de fichier sans recharger la page) peut laisser Phaser
      // tenter de suspendre/reprendre l'AudioContext d'une instance
      // precedente deja fermee - "Cannot suspend/resume a closed
      // AudioContext". Confirme comme un probleme connu pour les SPA qui
      // recreent le jeu sans reload complet (doc Phaser 4).
      audio: { noAudio: true },
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: [BootScene, MainScene],
    };

    // drapeau ferme sur une variable locale (pas une ref) : chaque
    // invocation de cet effet a sa PROPRE variable `destroyed`, contrairement
    // a une ref qui survivrait au cycle monte->nettoie->remonte que React 18
    // (StrictMode) et le Fast Refresh de CRA declenchent en dev. Sans ca, si
    // le chargement du sprite finit APRES un destroy() (montage->nettoyage->
    // remontage rapide au hot-reload), le callback 'ready' de l'instance
    // detruite essaie quand meme d'ecrire dans un jeu mort -> crash.
    let destroyed = false;

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // heros choisi (et partie a reprendre, le cas echeant) transmis a
    // Phaser via son registre global - lu par MainScene.create()/startGame()
    game.registry.set("heroId", heroId);
    if (resumeSave) game.registry.set("resumeSave", resumeSave);

    // les listeners ne peuvent s'attacher qu'une fois la scène créée -
    // on les branche via l'événement 'ready' du système de scènes plutôt
    // que d'espérer un timing correct
    game.events.once("ready", () => {
      if (destroyed) return; // cette instance a deja ete demontee, on ignore
      const scene = game.scene.getScene("MainScene");
      if (!scene) return;

      scene.events.on("player-hp-changed", ({ hp, maxHp }) =>
        setPlayerHp({ hp, maxHp }),
      );
      scene.events.on("xp-changed", ({ xp }) => setXp(xp));
      scene.events.on("level-up", ({ level }) => setLevel(level));
      scene.events.on("game-over", ({ xp, depth }) =>
        setGameOver({ xp, depth }),
      );
      scene.events.on("level-loading", () => setLoadError(null));
      scene.events.on("level-load-error", ({ error }) => setLoadError(error));
      scene.events.on("level-loaded", ({ depth }) => {
        setGameOver(null);
        setDepth(depth);
      });
      scene.events.on("fog-changed", (data) => setMinimapData(data));
      scene.events.on("npc-dialog", (dialog) => setNpcDialog(dialog));
      scene.events.on("quests-updated", (qs) => setQuests(qs));
      scene.events.on("upstairs-prompt", (show) => setUpstairsPrompt(!!show));
      scene.events.on("inventory-updated", (inv) => setInventory(inv));
      scene.events.on("equipment-updated", (eq) => setEquipped(eq));
      scene.events.on("quit-to-menu", () => {
        setPhase("picker");
        loadGamesList();
      });
    });

    return () => {
      destroyed = true;
      game.destroy(true);
      gameRef.current = null;
    };
  }, [phase, heroId, resumeSave]);

  const handleRetry = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.retryLevel();
  };

  const handleAcceptQuest = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.acceptQuest();
  };

  const handleCloseDialog = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.closeDialog();
  };

  const handleSaveAndQuit = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.saveAndQuit(); // la scene emet 'quit-to-menu' une fois la sauvegarde confirmee
  };

  const handleConfirmUpstairs = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.confirmGoUpstairs();
  };

  const handleCancelUpstairs = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.cancelGoUpstairs();
  };

  const handleEquip = (index) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.equipItem(index);
  };

  const handleUnequip = (slot) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.unequipItem(slot);
  };

  const handleUseConsumable = (index) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.useConsumable(index);
  };

  const handleOpenInventory = () => {
    setInventoryOpen(true);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.pauseGame("inventory");
  };

  const handleCloseInventory = () => {
    setInventoryOpen(false);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.unpauseGame("inventory");
  };

  const handleResumeGame = (game) => {
    setHeroId((game.playerState && game.playerState.heroId) || "hero1");
    setResumeSave(game);
    setPhase("playing");
  };

  const handleAbandonGame = (gameId) => {
    abandonGame(gameId)
      .then(() => loadGamesList())
      .catch((err) => console.warn("[Arpg] echec abandon de partie", err));
  };

  const handleNewGame = () => setPhase("select");

  const handleSelectHero = (id) => {
    setHeroId(id);
    setResumeSave(null); // partie fraiche, pas de reprise
    setPhase("playing");
  };

  if (phase === "loading") {
    return <div style={{ padding: 40, color: "#eee" }}>Chargement...</div>;
  }

  if (phase === "picker") {
    return (
      <GameListScreen
        games={games}
        onResume={handleResumeGame}
        onAbandon={handleAbandonGame}
        onNewGame={handleNewGame}
      />
    );
  }

  if (phase === "select") {
    return <CharacterSelectScreen onSelect={handleSelectHero} />;
  }

  return (
    <div style={{ position: "relative", width: 800 }}>
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 6,
          fontSize: 14,
          alignItems: "center",
        }}
      >
        <span>Étage : {depth}</span>
        <span>Niveau : {level}</span>
        <span>
          PV : {Math.max(0, playerHp.hp)} / {playerHp.maxHp}
        </span>
        <span>XP : {xp}</span>
        {Object.entries(quests)
          .filter(([, q]) => q.accepted)
          .map(([questDepth, q]) => (
            <span key={questDepth}>
              Quête (étage {questDepth}) :{" "}
              {q.completed
                ? "Terminée"
                : `${q.killCount}/${q.target} ${q.targetEnemyType}`}
            </span>
          ))}
        <button
          onClick={() => setMinimapVisible((v) => !v)}
          style={{
            marginLeft: "auto",
            padding: "4px 12px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
          }}
        >
          🗺️ Carte
        </button>
        <button
          onClick={handleOpenInventory}
          style={{
            padding: "4px 12px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
          }}
        >
          🎒 Inventaire
        </button>
        <button
          onClick={handleSaveAndQuit}
          style={{
            padding: "4px 12px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
          }}
        >
          💾 Sauvegarder et quitter
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <div ref={containerRef} id="arpg-container" />

        {minimapVisible && minimapData && (
          <Minimap
            grid={minimapData.grid}
            fogState={minimapData.fogState}
            playerTile={minimapData.playerTile}
          />
        )}

        {loadError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
            }}
          >
            Erreur de chargement du niveau : {loadError}
          </div>
        )}

        {gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              fontSize: 22,
              gap: 14,
            }}
          >
            <div>Game over</div>
            <div style={{ fontSize: 14, color: "#ccc" }}>
              Étage {gameOver.depth} - XP total : {gameOver.xp}
            </div>
            <button
              onClick={handleRetry}
              style={{
                padding: "8px 18px",
                fontSize: 14,
                borderRadius: 6,
                border: "1px solid #555",
                background: "#2a2a35",
                color: "#eee",
                cursor: "pointer",
              }}
            >
              Réessayer cet étage
            </button>
          </div>
        )}

        {npcDialog && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              zIndex: 10,
              background: "rgba(20,18,15,0.95)",
              border: "2px solid #8a7050",
              borderRadius: 8,
              padding: 16,
              color: "#f0e6d0",
              fontSize: 14,
            }}
          >
            <div style={{ marginBottom: 12 }}>{npcDialog.text}</div>
            <div style={{ display: "flex", gap: 10 }}>
              {npcDialog.canAccept && (
                <button
                  onClick={handleAcceptQuest}
                  style={{
                    padding: "6px 14px",
                    fontSize: 13,
                    borderRadius: 6,
                    border: "1px solid #8a7050",
                    background: "#3a2f20",
                    color: "#f0e6d0",
                    cursor: "pointer",
                  }}
                >
                  Accepter
                </button>
              )}
              <button
                onClick={handleCloseDialog}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid #555",
                  background: "#2a2a35",
                  color: "#eee",
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {upstairsPrompt && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              fontSize: 18,
              gap: 16,
            }}
          >
            <div>Redescendre à l'étage précédent ?</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleConfirmUpstairs}
                style={{
                  padding: "8px 20px",
                  fontSize: 14,
                  borderRadius: 6,
                  border: "1px solid #dc3030",
                  background: "#3a1f1f",
                  color: "#f0d0d0",
                  cursor: "pointer",
                }}
              >
                Oui
              </button>
              <button
                onClick={handleCancelUpstairs}
                style={{
                  padding: "8px 20px",
                  fontSize: 14,
                  borderRadius: 6,
                  border: "1px solid #555",
                  background: "#2a2a35",
                  color: "#eee",
                  cursor: "pointer",
                }}
              >
                Non
              </button>
            </div>
          </div>
        )}
        {inventoryOpen && (
          <InventoryScreen
            inventory={inventory}
            equipped={equipped}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onUse={handleUseConsumable}
            onClose={handleCloseInventory}
          />
        )}
      </div>
    </div>
  );
}

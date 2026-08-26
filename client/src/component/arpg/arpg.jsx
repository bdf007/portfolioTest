import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MainScene from "./scenes/MainScene";
import Minimap from "./Minimap";
import CharacterSelectScreen from "./CharacterSelectScreen";
import GameListScreen from "./GameListScreen";
import InventoryScreen from "./InventoryScreen";
import QuestsScreen from "./QuestsScreen";
import TravelHubScreen from "./TravelHubScreen";
import ShopScreen from "./ShopScreen";
import TouchControls from "./TouchControls";
import { computeLevelFromXp, getPlayerStatsForLevel } from "./leveling";
import { resolveHeroStatsOverride } from "./spriteRegistry";
import { computeEquipmentBonuses } from "./equipment";
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

  // detection du POINTEUR PRINCIPAL (pas juste "capacite tactile
  // presente") - decide a la fois l'affichage des controles tactiles ET
  // le besoin de forcer le mode paysage. `(pointer: coarse) and (hover:
  // none)` est le motif standard pour "l'appareil principal est un
  // doigt, sans souris/trackpad" - contrairement a un simple test de
  // capacite tactile (ontouchstart/maxTouchPoints), qui declenche a tort
  // sur un ecran ou trackpad tactile de BUREAU (le bureau garde une
  // souris comme pointeur principal, donc hover:hover - un vrai
  // telephone n'a jamais de survol possible). Bug trouve en testant :
  // l'ancienne detection affichait les controles tactiles/le
  // verrouillage paysage meme sur un poste de bureau equipe d'un ecran
  // tactile. Une seule lecture au montage : le TYPE d'appareil ne change
  // jamais en cours de partie, inutile de re-detecter a chaque render.
  const [isMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(pointer: coarse) and (hover: none)").matches,
  );
  const [isPortrait, setIsPortrait] = useState(
    () =>
      typeof window !== "undefined" && window.innerHeight > window.innerWidth,
  );

  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationChange = () =>
      setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    // tentative de verrouillage natif - fonctionne sur certains
    // Android/Chrome (generalement en plein ecran uniquement), jamais
    // sur iOS Safari (API absente) - simple amelioration progressive.
    // Le vrai filet de securite reste l'overlay "tournez votre appareil"
    // plus bas (isPortrait), qui fonctionne partout sans permission
    // particuliere - on ne bloque jamais sur l'echec de cette tentative.
    if (window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock("landscape").catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [isMobile]);
  const lootToastTimerRef = useRef(null); // pour reinitialiser le delai d'effacement a chaque nouvelle ligne (cf. le listener 'loot-toast')

  const [phase, setPhase] = useState("loading"); // 'loading' | 'picker' | 'select' | 'playing'
  const [games, setGames] = useState([]);
  const [heroId, setHeroId] = useState(null);
  const [resumeSave, setResumeSave] = useState(null); // partie a reprendre, si choisie dans la liste

  const [playerHp, setPlayerHp] = useState({ hp: 100, maxHp: 100 });
  const [playerMana, setPlayerMana] = useState({ mana: 0, maxMana: 0 });
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [depth, setDepth] = useState(1);
  const [gameOver, setGameOver] = useState(null); // null | { xp, depth }
  const [loadError, setLoadError] = useState(null);
  const [minimapData, setMinimapData] = useState(null); // null | { grid, fogState, playerTile }
  const [npcDialog, setNpcDialog] = useState(null); // null | { text, canAccept }
  const [quests, setQuests] = useState({}); // { [depth]: { accepted, completed, killCount, target } }
  const [upstairsPrompt, setUpstairsPrompt] = useState(false);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [equipped, setEquipped] = useState({
    mainHand: null,
    offHand: null,
    armor: null,
    helmet: null,
    pants: null,
    boots: null,
    belt: null,
    ring1: null,
    ring2: null,
    necklace: null,
    quiver: null,
  });
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [travelDestinations, setTravelDestinations] = useState(null); // null = ferme, tableau = ouvert avec ces destinations
  const [shopStock, setShopStock] = useState(null); // null = ferme, tableau = ouvert avec ce stock
  const [questsOpen, setQuestsOpen] = useState(false);
  const [lootToast, setLootToast] = useState(null); // texte de la derniere ligne de butin, ou null - s'efface automatiquement (cf. useEffect du listener 'loot-toast')
  const [minimapVisible, setMinimapVisible] = useState(true);
  // disposition de deplacement au clavier - 'azerty' (ZQSD, defaut) ou
  // 'qwerty' (WASD) - cf. MainScene.setKeyboardLayout. Etat duplique ici
  // (en plus de this.keyboardLayout cote scene) uniquement pour afficher
  // le libelle correct sur le bouton de bascule.
  const [keyboardLayout, setKeyboardLayoutState] = useState("azerty");
  const [username, setUsername] = useState(null);

  const loadGamesList = () => {
    fetchMyGames()
      .then(({ games, username }) => {
        setGames(games || []);
        setUsername(username || null);
      })
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
      // adapte le canvas 800x600 (resolution LOGIQUE, inchangee - tout le
      // reste du jeu continue de raisonner en ces coordonnees) a la
      // taille REELLE du conteneur parent, en conservant le ratio
      // d'aspect (letterboxing si besoin) plutot que de deborder. Sans
      // ca, un mobile plus etroit que 800px de large ne montrait tout
      // simplement pas le canvas (deborde hors du viewport visible) -
      // sur desktop ou le conteneur mesure deja exactement 800x600,
      // aucun effet visuel (echelle = 1, no-op).
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600,
      },
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
    // idem pour isMobile - lu par MainScene pour zoomer la camera sur
    // mobile (cf. le commentaire de setZoom dans MainScene.js)
    game.registry.set("isMobile", isMobile);

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
      scene.events.on("player-mana-changed", ({ mana, maxMana }) =>
        setPlayerMana({ mana, maxMana }),
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
      scene.events.on("loot-toast", (text) => {
        setLootToast(text);
        clearTimeout(lootToastTimerRef.current);
        lootToastTimerRef.current = setTimeout(() => setLootToast(null), 3500);
      });
      scene.events.on("upstairs-prompt", (show) => setUpstairsPrompt(!!show));
      scene.events.on("exit-prompt", (show) => setExitPrompt(!!show));
      scene.events.on("inventory-updated", (inv) => setInventory(inv));
      scene.events.on("travel-hub", (destinations) =>
        setTravelDestinations(destinations),
      );
      scene.events.on("shop", (stock) => setShopStock(stock));
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
  }, [phase, heroId, resumeSave, isMobile]);

  const handleRetry = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.retryLevel();
  };

  const handleAcceptQuest = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.acceptQuest();
  };

  const handleTurnInQuest = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.turnInQuest();
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

  const handleConfirmExit = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.confirmDescend();
  };

  const handleCancelExit = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.cancelDescend();
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

  const handleOpenQuests = () => {
    setQuestsOpen(true);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.pauseGame("quests");
  };

  const handleCloseQuests = () => {
    setQuestsOpen(false);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.unpauseGame("quests");
  };

  const handleToggleKeyboardLayout = () => {
    const next = keyboardLayout === "azerty" ? "qwerty" : "azerty";
    setKeyboardLayoutState(next);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.setKeyboardLayout(next);
  };

  // raccourcis clavier globaux - I (inventaire), R (quetes), V (carte) -
  // basculent (ouvre si ferme, ferme si ouvert), meme principe que le
  // bouton Carte deja existant, plutot que de toujours ouvrir sans
  // jamais pouvoir fermer au clavier. e.key (caractere, pas keyCode) :
  // I/R/V occupent la MEME position physique en AZERTY et QWERTY (seuls
  // Q/W/A/Z/Z autour d'eux different), pas besoin de la meme gestion de
  // disposition que le deplacement (cf. MainScene.setKeyboardLayout).
  // Ne fait rien tant qu'aucune partie n'est en cours (gameRef.current
  // absent) - evite un effet sur les ecrans de menu (selection de
  // personnage, liste de parties).
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (!gameRef.current) return;
      const key = e.key.toLowerCase();
      if (key === "i") {
        if (inventoryOpen) handleCloseInventory();
        else handleOpenInventory();
      } else if (key === "r") {
        if (questsOpen) handleCloseQuests();
        else handleOpenQuests();
      } else if (key === "v") {
        setMinimapVisible((v) => !v);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [inventoryOpen, questsOpen]);

  const handleTravelToDepth = (depth) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.travelToDepth(depth); // la scene emet 'travel-hub': null, pas besoin de setTravelDestinations ici
  };

  const handleCloseTravelHub = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.closeTravelHub();
  };

  const handleBuyItem = (index) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.buyItem(index);
  };

  const handleSellItem = (index) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.sellItem(index);
  };

  const handleCloseShop = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.closeShop();
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

    // reinitialise TOUT l'etat de progression avant de demarrer - sans
    // ca, une partie fraichement lancee affichait les valeurs LAISSEES
    // par une precedente partie de cette meme session de navigateur
    // (meme si celle-ci avait ete abandonnee/supprimee entre temps) :
    // le state React ne se remettait jamais a zero tout seul, seul un
    // vrai cycle sauvegarde/reprise le corrigeait ensuite (en ecrasant
    // avec les vraies donnees serveur) - d'ou l'illusion d'un "bug
    // d'affichage qui garde en memoire une autre partie".
    setPlayerHp({ hp: 100, maxHp: 100 });
    setPlayerMana({ mana: 0, maxMana: 0 });
    setXp(0);
    setLevel(1);
    setDepth(1);
    setGameOver(null);
    setLoadError(null);
    setMinimapData(null);
    setNpcDialog(null);
    setQuests({});
    setUpstairsPrompt(false);
    setExitPrompt(false);
    setInventory([]);
    setEquipped({
      mainHand: null,
      offHand: null,
      armor: null,
      helmet: null,
      pants: null,
      boots: null,
      belt: null,
      ring1: null,
      ring2: null,
      necklace: null,
      quiver: null,
    });
    setInventoryOpen(false);
    setTravelDestinations(null);
    setShopStock(null);
    setQuestsOpen(false);
    setLootToast(null);
    setMinimapVisible(true);

    setPhase("playing");
  };

  if (phase === "loading") {
    return <div style={{ padding: 40, color: "#eee" }}>Chargement...</div>;
  }

  if (phase === "picker") {
    return (
      <GameListScreen
        games={games}
        username={username}
        onResume={handleResumeGame}
        onAbandon={handleAbandonGame}
        onNewGame={handleNewGame}
      />
    );
  }

  if (phase === "select") {
    return (
      <CharacterSelectScreen onSelect={handleSelectHero} isMobile={isMobile} />
    );
  }

  // force le mode paysage UNIQUEMENT pendant la partie elle-meme (pas
  // les ecrans de menu ci-dessus, qui restent lisibles en portrait) - le
  // jeu a besoin de largeur (canvas 800px, controles tactiles aux deux
  // coins bas) pour rester jouable. Bloque completement le rendu du jeu
  // plutot qu'un simple overlay par-dessus : un canvas Phaser affiche en
  // portrait sur un ecran etroit serait deja visuellement casse avant
  // meme que l'overlay ne s'affiche par-dessus.
  if (isMobile && isPortrait) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#eee",
          background: "#0b0c10",
          textAlign: "center",
          padding: 20,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📱↻</div>
        <div style={{ fontSize: 16 }}>Tourne ton appareil pour jouer</div>
        <div style={{ fontSize: 13, color: "#999", marginTop: 8 }}>
          Ce jeu se joue en mode paysage
        </div>
      </div>
    );
  }

  const xpProgress = computeLevelFromXp(xp);
  const combatStats = {
    level,
    ...(() => {
      const base = getPlayerStatsForLevel(
        level,
        resolveHeroStatsOverride(heroId),
      );
      const bonus = computeEquipmentBonuses(equipped);
      return {
        maxHp: base.maxHp + bonus.maxHp,
        meleeDamage: base.meleeDamage + bonus.meleeDamage,
        rangedDamage: base.rangedDamage + bonus.rangedDamage,
        defense: base.defense + bonus.defense,
        // pas de bonus.mana - computeEquipmentBonuses n'a pas ce champ,
        // meme choix que dans MainScene.recalculatePlayerStats
        mana: base.mana,
      };
    })(),
  };

  return (
    <div
      style={{
        position: "relative",
        width: isMobile ? "100dvw" : 800,
        height: isMobile ? "100dvh" : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: isMobile ? "hidden" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: isMobile ? 8 : 20,
          marginBottom: isMobile ? 2 : 6,
          padding: isMobile ? "4px 6px" : 0,
          fontSize: isMobile ? 12 : 14,
          alignItems: "center",
          flexShrink: 0,
          flexWrap: isMobile ? "nowrap" : "wrap",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span>Étage : {depth}</span>
        <span>Niv. : {level}</span>

        <span>
          ❤️ {Math.max(0, playerHp.hp)}/{playerHp.maxHp}
        </span>

        {playerMana.maxMana > 0 && (
          <span>
            💧 {Math.max(0, playerMana.mana)}/{playerMana.maxMana}
          </span>
        )}

        <span>
          XP : {xpProgress.xpIntoLevel}/{xpProgress.xpForNextLevel}
        </span>

        <button
          onClick={() => setMinimapVisible((v) => !v)}
          style={{
            marginLeft: "auto",
            padding: isMobile ? "4px 7px" : "4px 12px",
            fontSize: isMobile ? 14 : 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Carte"
        >
          🗺️
        </button>

        {!isMobile && (
          <button
            onClick={handleToggleKeyboardLayout}
            title="Basculer la disposition clavier"
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
            ⌨️ {keyboardLayout === "azerty" ? "ZQSD" : "WASD"}
          </button>
        )}

        <button
          onClick={handleOpenQuests}
          style={{
            padding: isMobile ? "4px 7px" : "4px 12px",
            fontSize: isMobile ? 14 : 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Quêtes"
        >
          {isMobile ? "📜" : "📜 Quêtes"}
        </button>

        <button
          onClick={handleOpenInventory}
          style={{
            padding: isMobile ? "4px 7px" : "4px 12px",
            fontSize: isMobile ? 14 : 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Inventaire"
        >
          {isMobile ? "🎒" : "🎒 Inventaire"}
        </button>

        <button
          onClick={handleSaveAndQuit}
          style={{
            padding: isMobile ? "4px 7px" : "4px 12px",
            fontSize: isMobile ? 14 : 13,
            borderRadius: 6,
            border: "1px solid #555",
            background: "#2a2a35",
            color: "#eee",
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Sauvegarder et quitter"
        >
          {isMobile ? "💾" : "💾 Sauvegarder et quitter"}
        </button>
      </div>

      {lootToast && (
        <div
          style={{
            position: "absolute",
            top: isMobile ? 6 : 44,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            padding: isMobile ? "5px 10px" : "6px 16px",
            fontSize: isMobile ? 11 : 13,
            borderRadius: 6,
            background: "rgba(20,18,14,0.9)",
            border: "1px solid #8a7050",
            color: "#f0e6d0",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            maxWidth: isMobile ? "80vw" : undefined,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lootToast}
        </div>
      )}

      <div
        style={{
          position: "relative",
          flex: isMobile ? "1 1 0" : undefined,
          minHeight: isMobile ? 0 : undefined,
          minWidth: isMobile ? 0 : undefined,
          width: "100%",
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          id="arpg-container"
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        />

        {isMobile && <TouchControls gameRef={gameRef} />}

        {minimapVisible && minimapData && (
          <Minimap
            grid={minimapData.grid}
            fogState={minimapData.fogState}
            playerTile={minimapData.playerTile}
            exitTile={minimapData.exitTile}
            upstairsTile={minimapData.upstairsTile}
            isMobile={isMobile}
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
              bottom: isMobile ? 80 : 20,
              left: isMobile ? 8 : 20,
              right: isMobile ? 8 : 20,
              zIndex: 20,
              background: "rgba(20,18,15,0.95)",
              border: "2px solid #8a7050",
              borderRadius: 8,
              padding: isMobile ? 10 : 16,
              color: "#f0e6d0",
              fontSize: isMobile ? 12 : 14,
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
              {npcDialog.canTurnIn && (
                <button
                  onClick={handleTurnInQuest}
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
                  Rendre
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
        {exitPrompt && (
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
            <div>Descendre à l'étage suivant ?</div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleConfirmExit}
                style={{
                  padding: "8px 20px",
                  fontSize: 14,
                  borderRadius: 6,
                  border: "1px solid #ffd700",
                  background: "#3a3320",
                  color: "#f0e8c0",
                  cursor: "pointer",
                }}
              >
                Oui
              </button>
              <button
                onClick={handleCancelExit}
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
            stats={combatStats}
            heroId={heroId}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onUse={handleUseConsumable}
            onClose={handleCloseInventory}
          />
        )}
        {questsOpen && (
          <QuestsScreen quests={quests} onClose={handleCloseQuests} />
        )}
        {travelDestinations && (
          <TravelHubScreen
            destinations={travelDestinations}
            onTravel={handleTravelToDepth}
            onClose={handleCloseTravelHub}
          />
        )}
        {shopStock && (
          <ShopScreen
            stock={shopStock}
            inventory={inventory}
            onBuy={handleBuyItem}
            onSell={handleSellItem}
            onClose={handleCloseShop}
          />
        )}
      </div>
    </div>
  );
}

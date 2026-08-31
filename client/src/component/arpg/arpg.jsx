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
import { fetchMyGames, abandonGame, deleteGame } from "../../api/arpgClient";
import { resolveAbilityDef } from "./abilityDefs";
import { resolveItemDef } from "./itemDefs";
import HotbarScreen from "./HotbarScreen";
import { ItemIcon, hasIconFrame } from "./InventoryScreen";
import CraftingScreen from "./CraftingScreen";

/**
 * Overlay sombre qui se dissout progressivement au-dessus d'un
 * emplacement en recharge - transition CSS pilotee UNE SEULE fois (pas
 * de boucle JS qui recalcule a chaque frame). `key={startedAt}` sur le
 * parent (cf. plus bas) force un vrai remontage a chaque nouvelle
 * recharge, meme pour la MEME competence/objet - sinon une recharge
 * declenchee en plein milieu d'une precedente ne redemarrerait jamais
 * proprement l'animation depuis opacite 1.
 */
function HotbarCooldownOverlay({ startedAt, cooldownMs }) {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    setOpacity(1);
    const raf = requestAnimationFrame(() => setOpacity(0));
    return () => cancelAnimationFrame(raf);
  }, [startedAt, cooldownMs]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        opacity,
        transition: `opacity ${cooldownMs}ms linear`,
        pointerEvents: "none",
      }}
    />
  );
}

export default function Arpg() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

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

    if (window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock("landscape").catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [isMobile]);
  const lootToastTimerRef = useRef(null);

  const [phase, setPhase] = useState("loading");
  const [games, setGames] = useState([]);
  const [heroId, setHeroId] = useState(null);
  const [resumeSave, setResumeSave] = useState(null);

  const [playerHp, setPlayerHp] = useState({ hp: 100, maxHp: 100 });
  const [playerMana, setPlayerMana] = useState({ mana: 0, maxMana: 0 });
  const [playerStamina, setPlayerStamina] = useState({
    stamina: 0,
    maxStamina: 0,
  });
  const [hotbarSlots, setHotbarSlots] = useState(new Array(9).fill(null));
  const [furyProgress, setFuryProgress] = useState({ count: 0, required: 10 });
  const [cooldownEvents, setCooldownEvents] = useState({});
  const [unlockedAbilities, setUnlockedAbilities] = useState([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [depth, setDepth] = useState(1);
  const [gameOver, setGameOver] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [minimapData, setMinimapData] = useState(null);
  const [npcDialog, setNpcDialog] = useState(null);
  const [quests, setQuests] = useState({});
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
  const [travelDestinations, setTravelDestinations] = useState(null);
  const [shopStock, setShopStock] = useState(null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [hotbarScreenOpen, setHotbarScreenOpen] = useState(false);
  const [craftingScreenOpen, setCraftingScreenOpen] = useState(false);
  const [unlockedRecipes, setUnlockedRecipes] = useState([]);
  const [lootToast, setLootToast] = useState(null);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [keyboardLayout, setKeyboardLayoutState] = useState("azerty");
  const [username, setUsername] = useState(null);

  const loadGamesList = () => {
    fetchMyGames()
      .then(({ games, username }) => {
        setGames(games || []);
        setUsername(username || null);
      })
      .catch(() => setGames([]))
      .finally(() => setPhase("picker"));
  };

  useEffect(() => {
    loadGamesList();
  }, []);

  useEffect(() => {
    if (phase !== "playing" || !heroId) return;

    const config = {
      type: Phaser.AUTO,
      width: 1000,
      height: 750,
      parent: containerRef.current,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1000,
        height: 750,
      },
      audio: { noAudio: true },
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scene: [BootScene, MainScene],
    };

    let destroyed = false;

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.registry.set("heroId", heroId);
    if (resumeSave) game.registry.set("resumeSave", resumeSave);
    game.registry.set("isMobile", isMobile);

    game.events.once("ready", () => {
      if (destroyed) return;
      const scene = game.scene.getScene("MainScene");
      if (!scene) return;

      scene.events.on("player-hp-changed", ({ hp, maxHp }) =>
        setPlayerHp({ hp, maxHp }),
      );
      scene.events.on("player-mana-changed", ({ mana, maxMana }) =>
        setPlayerMana({ mana, maxMana }),
      );
      scene.events.on("player-stamina-changed", ({ stamina, maxStamina }) =>
        setPlayerStamina({ stamina, maxStamina }),
      );
      scene.events.on("hotbar-updated", (slots) => setHotbarSlots(slots));
      scene.events.on(
        "hotbar-cooldown-started",
        ({ key, cooldownMs, startedAt }) =>
          setCooldownEvents((prev) => ({
            ...prev,
            [key]: { cooldownMs, startedAt },
          })),
      );
      scene.events.on("fury-progress", ({ count, required }) =>
        setFuryProgress({ count, required }),
      );
      scene.events.on("abilities-updated", (abilities) =>
        setUnlockedAbilities(abilities),
      );
      scene.events.on("recipes-updated", (recipes) =>
        setUnlockedRecipes(recipes),
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
      // note : plus de listener sur 'quest-npcs-updated' - jamais emis
      // par MainScene.js, la liste des PNJ decouverts vient deja via
      // 'fog-changed' -> minimapData.questNpcs (cf. applyFogChanges/
      // getQuestNpcMinimapData cote scene)
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
    if (scene) scene.saveAndQuit();
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

  const handleOpenHotbarScreen = () => {
    setHotbarScreenOpen(true);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.pauseGame("hotbar");
  };

  const handleCloseHotbarScreen = () => {
    setHotbarScreenOpen(false);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.unpauseGame("hotbar");
  };

  const handleOpenCraftingScreen = () => {
    setCraftingScreenOpen(true);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.pauseGame("crafting");
  };

  const handleCloseCraftingScreen = () => {
    setCraftingScreenOpen(false);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.unpauseGame("crafting");
  };

  const handleCraftItem = (recipeId) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.craftItem(recipeId);
  };

  const handleAssignHotbarSlot = (index, payload) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.assignHotbarSlot(index, payload);
  };

  const handleToggleKeyboardLayout = () => {
    const next = keyboardLayout === "azerty" ? "qwerty" : "azerty";
    setKeyboardLayoutState(next);
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.setKeyboardLayout(next);
  };

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
      } else if (key >= "1" && key <= "9") {
        const scene = gameRef.current.scene.getScene("MainScene");
        if (scene) scene.useHotbarSlot(Number(key) - 1);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [inventoryOpen, questsOpen]);

  const handleTravelToDepth = (depth) => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) scene.travelToDepth(depth);
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

  const handleDeleteGame = (gameId) => {
    deleteGame(gameId)
      .then(() => loadGamesList())
      .catch((err) => console.warn("[Arpg] echec suppression de partie", err));
  };

  const handleNewGame = () => setPhase("select");

  const handleSelectHero = (id) => {
    setHeroId(id);
    setResumeSave(null);

    setPlayerHp({ hp: 100, maxHp: 100 });
    setPlayerMana({ mana: 0, maxMana: 0 });
    setPlayerStamina({ stamina: 0, maxStamina: 0 });
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
    setHotbarSlots(new Array(9).fill(null));
    setUnlockedAbilities([]);
    setUnlockedRecipes([]);
    setFuryProgress({ count: 0, required: 10 });
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
        onDelete={handleDeleteGame}
        onNewGame={handleNewGame}
      />
    );
  }

  if (phase === "select") {
    return (
      <CharacterSelectScreen onSelect={handleSelectHero} isMobile={isMobile} />
    );
  }

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
        mana: base.mana,
      };
    })(),
  };

  return (
    <div
      className={isMobile ? "arpg arpg-mobile" : "arpg"}
      style={{
        position: "relative",
        width: isMobile ? "100%" : 1000,
        height: isMobile ? "100dvh" : undefined,
        display: isMobile ? "flex" : undefined,
        flexDirection: isMobile ? "column" : undefined,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        className={isMobile ? "arpg-hud arpg-hud-mobile" : "arpg-hud"}
        style={{
          display: "flex",
          gap: isMobile ? 8 : 20,
          marginBottom: isMobile ? 0 : 6,
          fontSize: isMobile ? 12 : 14,
          alignItems: "center",
          flexShrink: 0,
          flexWrap: "nowrap",
          boxSizing: "border-box",
        }}
      >
        <span>Étage : {depth}</span>
        <span>Niv. : {level}</span>

        <span>
          ❤️ {Math.round(Math.max(0, playerHp.hp))}/{playerHp.maxHp}
        </span>

        {playerMana.maxMana > 0 && (
          <span>
            💧 {Math.round(Math.max(0, playerMana.mana))}/{playerMana.maxMana}
          </span>
        )}

        {playerStamina.maxStamina > 0 && (
          <span>
            🏃 {Math.round(Math.max(0, playerStamina.stamina))}/
            {playerStamina.maxStamina}
          </span>
        )}

        <span
          title={`Furie : ${furyProgress.count}/${furyProgress.required} ennemis`}
        >
          🔥 {furyProgress.count}/{furyProgress.required}
        </span>

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
          <span className="desktop-button-label">🗺️ Carte</span>
          <span className="mobile-button-icon">🗺️</span>
        </button>

        {!isMobile && (
          <button
            onClick={handleToggleKeyboardLayout}
            title="Basculer la disposition clavier"
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
          {isMobile ? "📜" : "📜"}
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
          {isMobile ? "🎒" : "🎒"}
        </button>
        <button
          onClick={handleOpenHotbarScreen}
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
          title="Raccourcis"
        >
          {isMobile ? "⚡" : "⚡"}
        </button>
        <button
          onClick={handleOpenCraftingScreen}
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
          title="Craft"
        >
          {isMobile ? "🔨" : "🔨 Craft"}
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
          {isMobile ? "💾" : "💾 et quitter"}
        </button>
      </div>

      {lootToast && (
        <div
          style={{
            position: "fixed", // <-- etait "absolute" - ancre au VIEWPORT reel, immunise contre tout defilement (page ou conteneur interne)
            top: isMobile ? 60 : 44,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999, // <-- etait 20 - au-dessus de TOUS les ecrans superposes (inventaire=22, dialogue=20, etc.)
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
        className={
          isMobile ? "arpg-game-area arpg-game-area-mobile" : "arpg-game-area"
        }
        style={{
          position: "relative",
          flex: isMobile ? 1 : undefined,
          minHeight: isMobile ? 0 : undefined,
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          id="arpg-container"
          className="arpg-container"
          style={
            isMobile
              ? {
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  inset: 0,
                }
              : undefined
          }
        />

        {isMobile && (
          <TouchControls
            gameRef={gameRef}
            furyReady={furyProgress.count >= furyProgress.required}
          />
        )}

        <div
          style={{
            position: "absolute",
            bottom: isMobile ? 10 : 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 15,
            display: "flex",
            gap: 6,
            pointerEvents: "auto", // purement informatif - l'activation reste au clavier (1-9), pas de clic
          }}
        >
          {hotbarSlots.map((slot, index) => {
            const iconId = slot
              ? slot.type === "item"
                ? slot.itemId
                : slot.id
              : null;
            const showIcon = iconId && hasIconFrame(iconId);
            const label = slot
              ? slot.type === "ability"
                ? resolveAbilityDef(slot.id).name
                : resolveItemDef(slot.itemId).name
              : null;
            const cooldownKey = slot
              ? slot.type === "ability"
                ? `ability:${slot.id}`
                : `item:${slot.itemId}`
              : null;
            const cooldownInfo = cooldownKey
              ? cooldownEvents[cooldownKey]
              : null;
            const quantity =
              slot?.type === "item"
                ? (inventory.find((i) => i.itemId === slot.itemId)?.quantity ??
                  0)
                : null;

            return (
              <div
                key={index}
                onClick={() => {
                  const scene = gameRef.current?.scene.getScene("MainScene");
                  if (scene) scene.useHotbarSlot(index);
                }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 6,
                  border: "1px solid #555",
                  background: slot
                    ? "rgba(58,47,32,0.9)"
                    : "rgba(30,32,41,0.6)",
                  color: "#f0e6d0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  textAlign: "center",
                  padding: 2,
                  boxSizing: "border-box",
                  position: "relative",
                  overflow: "hidden",
                  cursor: slot ? "pointer" : "default", // <-- indication visuelle sur desktop
                }}
                title={label || "Vide"}
              >
                <div style={{ fontSize: 10, color: "#8a7050" }}>
                  {index + 1}
                </div>
                {showIcon ? (
                  <ItemIcon itemId={iconId} scale={1.3} />
                ) : (
                  label && (
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                      }}
                    >
                      {label}
                    </div>
                  )
                )}
                {quantity !== null && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 1,
                      right: 3,
                      fontSize: 9,
                      color: "#f0e6d0",
                      textShadow: "0 0 2px #000, 0 0 2px #000",
                    }}
                  >
                    x{quantity}
                  </div>
                )}
                {cooldownInfo && (
                  <HotbarCooldownOverlay
                    key={cooldownInfo.startedAt}
                    startedAt={cooldownInfo.startedAt}
                    cooldownMs={cooldownInfo.cooldownMs}
                  />
                )}
              </div>
            );
          })}
        </div>

        {minimapVisible && minimapData && (
          <div className="arpg-minimap">
            <Minimap
              grid={minimapData.grid}
              fogState={minimapData.fogState}
              playerTile={minimapData.playerTile}
              exitTile={minimapData.exitTile}
              upstairsTile={minimapData.upstairsTile}
              questNpcs={minimapData.questNpcs || []}
              summons={minimapData.summons || []}
              isMobile={isMobile}
            />
          </div>
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
              bottom: isMobile ? 100 : 20,
              left: isMobile ? 10 : 20,
              right: isMobile ? 10 : 20,
              zIndex: 20,
              background: "rgba(20,18,15,0.95)",
              border: "2px solid #8a7050",
              borderRadius: 8,
              padding: isMobile ? 12 : 16,
              color: "#f0e6d0",
              fontSize: isMobile ? 13 : 14,
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
        {hotbarScreenOpen && (
          <HotbarScreen
            hotbarSlots={hotbarSlots}
            unlockedAbilities={unlockedAbilities}
            inventory={inventory}
            playerLevel={level}
            onAssign={handleAssignHotbarSlot}
            onClose={handleCloseHotbarScreen}
          />
        )}
        {craftingScreenOpen && (
          <CraftingScreen
            unlockedRecipes={unlockedRecipes}
            inventory={inventory}
            onCraft={handleCraftItem}
            onClose={handleCloseCraftingScreen}
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

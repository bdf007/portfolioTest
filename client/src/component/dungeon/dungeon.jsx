import React, { useState, useEffect } from "react";
import axios from "axios";

import HeroPanel from "./HeroPanel";
import HeroStatsBar from "./HeroStatsBar";
import MovementPanel from "./MovementPanel";
import DeathPanel from "./DeathPanel";
import CombatChoicePanel from "./CombatChoicePanel";
import CombatPanel from "./CombatPanel";
import TrapChoicePanel from "./TrapChoicePanel";
import EnemyChoicePanel from "./EnemyChoicePanel";
import { KeyPanel, ChestPanel, ShopPanel } from "./InteractionPanels";
import InventoryPanel from "./InventoryPanel";
import DungeonGrid from "./DungeonGrid";
import ActionOverlay from "./ActionOverlay";
import { VictoryScreen, GameOverScreen, DefeatScreen } from "./EndScreens";
import FloorRecapScreen from "./FloorRecapScreen";
import StartScreen from "./StartScreen";

const API = process.env.REACT_APP_API_URL;

const Dungeon = () => {
  const [gameData, setGameData] = useState(null);
  const [activeGames, setActiveGames] = useState(undefined); // undefined = pas encore vérifié
  const [heroPosition, setHeroPosition] = useState([0, 0]);
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [tileMessage, setTileMessage] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const movesRemaining = gameData?.gameState?.movesRemaining ?? 0;

  // ---------------------------------------------------------------------
  // Liste des parties en cours (n'en crée aucune automatiquement)
  // ---------------------------------------------------------------------
  const fetchMyGames = () => {
    axios
      .post(`${API}/api/dungeon/my-games`)
      .then((res) => setActiveGames(res.data.games))
      .catch((err) => {
        console.error(err);
        setActiveGames([]);
      });
  };

  useEffect(() => {
    fetchMyGames();
  }, []);

  const resumeGame = (game) => {
    setGameData(game);
    const { x, y } = game.gameState.currentTile;
    setHeroPosition([x, y]);
  };

  const abandonFromList = (gameId) => {
    axios
      .post(`${API}/api/dungeon/abandon-game`, { gameId })
      .then(() => fetchMyGames())
      .catch((err) => console.error(err));
  };

  const startNewGame = (difficulty) => {
    axios
      .post(`${API}/api/dungeon/create-game`, { difficulty })
      .then((res) => {
        setGameData(res.data);
        const { x, y } = res.data.gameState.currentTile;
        setHeroPosition([x, y]);
        setTileMessage(null);
        setCombatLog([]);
        setError(null);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (gameData?.gameState) {
      setSelectedDirection(gameData.gameState.lockedDirection ?? null);
    }
  }, [gameData]);

  const heroReady =
    gameData &&
    (gameData.hero.bodyParts?.tete ?? 0) +
      (gameData.hero.bodyParts?.torse ?? 0) +
      (gameData.hero.bodyParts?.jambes ?? 0) >
      0;

  // ---------------------------------------------------------------------
  // Création du héros
  // ---------------------------------------------------------------------
  const createHero = () => {
    axios
      .post(`${API}/api/dungeon/roll-three-dices`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        return axios.post(`${API}/api/dungeon/roll-weapon-die`, {
          gameId: gameData._id,
        });
      })
      .then((res) => setGameData(res.data.gameData))
      .catch((err) => {
        console.error("Erreur createHero :", err.response?.data || err.message);
        setError(
          err.response?.data?.error || "Erreur lors de la création du héros",
        );
      });
  };

  const rerollHero = createHero; // même logique : relancer les 2 dés d'un coup

  const confirmHero = () => {
    axios
      .post(`${API}/api/dungeon/confirm-hero`, { gameId: gameData._id })
      .then((res) => setGameData(res.data.gameData))
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error ||
            "Erreur lors de la confirmation du héros",
        );
      });
  };

  // ---------------------------------------------------------------------
  // Déplacement
  // ---------------------------------------------------------------------
  const revealCurrentTile = () => {
    axios
      .post(`${API}/api/dungeon/reveal-tile`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        const { x, y } = res.data.gameData.gameState.currentTile;
        setHeroPosition([x, y]);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur pendant la révélation");
      });
  };

  const rollMoveDice = () => {
    if (movesRemaining > 0 || isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/roll-dice`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(null);
        setCombatLog([]);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur lors du lancer de dés");
      })
      .finally(() => setIsBusy(false));
  };

  const moveOneStep = (direction) => {
    if (!gameData || movesRemaining <= 0 || isBusy) return;
    if (selectedDirection !== null && direction !== selectedDirection) return;

    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/move-one-step`, {
        gameId: gameData._id,
        direction,
      })
      .then((res) => {
        const { gameData: updatedGame, message, stopped } = res.data;

        setGameData(updatedGame);
        setHeroPosition([
          updatedGame.gameState.currentTile.x,
          updatedGame.gameState.currentTile.y,
        ]);
        setTileMessage(message);
        setError(null);

        if (
          stopped &&
          updatedGame.gameState.movesRemaining === 0 &&
          !updatedGame.gameState.pendingTrapChoice &&
          !updatedGame.gameState.pendingCombat &&
          !updatedGame.gameState.pendingEnemyChoice
        ) {
          revealCurrentTile();
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur lors du déplacement");
      })
      .finally(() => setIsBusy(false));
  };

  const stopMovement = () => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/stop-movement`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        revealCurrentTile();
      })
      .catch((err) => console.error(err))
      .finally(() => setIsBusy(false));
  };

  // ---------------------------------------------------------------------
  // Pièges permanents
  // ---------------------------------------------------------------------
  const resolveTrapChoice = (choice) => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/resolve-trap-choice`, {
        gameId: gameData._id,
        choice,
      })
      .then((res) => {
        setGameData(res.data.gameData);
        const { x, y } = res.data.gameData.gameState.currentTile;
        setHeroPosition([x, y]);
        setTileMessage(res.data.message);

        if (res.data.heroDied) return;
        if (res.data.stopped) revealCurrentTile();
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || "Erreur lors de la résolution du piège",
        );
      })
      .finally(() => setIsBusy(false));
  };

  // ---------------------------------------------------------------------
  // Ennemi déjà révélé (furtivité / combat / arrêt)
  // ---------------------------------------------------------------------
  const resolveEnemyChoice = (choice) => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/resolve-enemy-choice`, {
        gameId: gameData._id,
        choice,
      })
      .then((res) => {
        setGameData(res.data.gameData);
        const { x, y } = res.data.gameData.gameState.currentTile;
        setHeroPosition([x, y]);
        setTileMessage(res.data.message);

        if (
          res.data.stopped &&
          res.data.gameData.gameState.movesRemaining === 0 &&
          !res.data.gameData.gameState.pendingTrapChoice &&
          !res.data.gameData.gameState.pendingCombat &&
          !res.data.gameData.gameState.pendingEnemyChoice
        ) {
          revealCurrentTile();
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur");
      })
      .finally(() => setIsBusy(false));
  };

  // ---------------------------------------------------------------------
  // Magasin / Clé / Coffre
  // ---------------------------------------------------------------------
  const buyItem = (itemKey) => {
    axios
      .post(`${API}/api/dungeon/buy-item`, { gameId: gameData._id, itemKey })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur lors de l'achat");
      });
  };

  const pickUpKey = () => {
    axios
      .post(`${API}/api/dungeon/pickup-key`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur lors du ramassage");
      });
  };

  const openChest = () => {
    axios
      .post(`${API}/api/dungeon/open-chest`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || "Erreur lors de l'ouverture du coffre",
        );
      });
  };

  // ---------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------
  const startCombat = () => {
    axios
      .post(`${API}/api/dungeon/start-combat`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setCombatLog([]);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur pendant le combat");
      });
  };

  const declineCombat = () => {
    axios
      .post(`${API}/api/dungeon/decline-combat`, { gameId: gameData._id })
      .then((res) => setGameData(res.data.gameData))
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur");
      });
  };

  const attackRound = () => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/attack-round`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setCombatLog((prev) => [...prev, res.data.log]); // un round = un bloc de lignes (ordre interne préservé)
        if (res.data.victory)
          setTileMessage(`Victoire ! +${res.data.goldReward} PO`);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur pendant le combat");
      })
      .finally(() => setIsBusy(false));
  };

  const stopCombat = () => {
    axios
      .post(`${API}/api/dungeon/stop-combat`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        const { x, y } = res.data.gameData.gameState.currentTile;
        setHeroPosition([x, y]);
        setTileMessage(res.data.message);
        setCombatLog([]);

        if (!res.data.heroDied) revealCurrentTile();
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur pendant le combat");
      });
  };

  // ---------------------------------------------------------------------
  // Mort / abandon / nouvelle partie
  // ---------------------------------------------------------------------
  const recreateHero = () => {
    axios
      .post(`${API}/api/dungeon/recreate-hero`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        const { x, y } = res.data.gameData.gameState.currentTile;
        setHeroPosition([x, y]);
        setTileMessage("Un nouveau héros se dresse à l'entrée du donjon.");
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || "Erreur lors de la recréation du héros",
        );
      });
  };

  const abandonGame = () => {
    axios
      .post(`${API}/api/dungeon/abandon-game`, { gameId: gameData._id })
      .then((res) => setGameData(res.data.gameData))
      .catch((err) => console.error(err));
  };

  // Retour à l'écran de démarrage (choix reprendre / nouvelle partie) après
  // une victoire ou un abandon, plutôt que de recréer directement une partie.
  const returnToStartScreen = () => {
    setGameData(null);
    setTileMessage(null);
    setCombatLog([]);
    setError(null);
    fetchMyGames();
  };

  const dismissFloorRecap = () => {
    axios
      .post(`${API}/api/dungeon/dismiss-floor-recap`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        const { x, y } = res.data.gameData.gameState.currentTile;
        setHeroPosition([x, y]);
      })
      .catch((err) => console.error(err));
  };

  const continueToNextFloor = () => {
    dismissFloorRecap();
  };

  const saveAndQuitFromRecap = () => {
    axios
      .post(`${API}/api/dungeon/dismiss-floor-recap`, { gameId: gameData._id })
      .then(() => returnToStartScreen())
      .catch((err) => console.error(err));
  };

  // ---------------------------------------------------------------------
  // Utilisation des objets
  // ---------------------------------------------------------------------
  const useItem = (itemKey, extra = {}) => {
    axios
      .post(`${API}/api/dungeon/use-item`, {
        gameId: gameData._id,
        itemKey,
        ...extra,
      })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error ||
            "Erreur lors de l'utilisation de l'objet",
        );
      });
  };

  const usePotion = (itemKey, bodyPart) => useItem(itemKey, { bodyPart });
  const useBombeLigne = (itemKey, direction) => useItem(itemKey, { direction });

  // ---------------------------------------------------------------------
  // Helpers d'affichage
  // ---------------------------------------------------------------------
  const isHeroOnShop = () => {
    if (!gameData?.gameState?.currentTile) return false;
    const { x, y } = gameData.gameState.currentTile;
    const tile = gameData.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    return tile?.type === "magasin" && tile.revealed;
  };

  const isHeroOnKey = () => {
    if (!gameData?.gameState?.currentTile) return false;
    const { x, y } = gameData.gameState.currentTile;
    const tile = gameData.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    return tile?.type === "clé" && tile.revealed && !tile.cleared;
  };

  const isHeroOnChest = () => {
    if (!gameData?.gameState?.currentTile) return false;
    const { x, y } = gameData.gameState.currentTile;
    const tile = gameData.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    return tile?.type === "coffre" && tile.revealed && !tile.cleared;
  };

  // ---------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------
  if (activeGames === undefined) return <div>Chargement...</div>;

  if (!gameData) {
    return (
      <StartScreen
        activeGames={activeGames}
        onResume={resumeGame}
        onAbandon={abandonFromList}
        onStartNew={startNewGame}
      />
    );
  }

  if (!gameData.tiles) return <div>Chargement...</div>;

  if (gameData.status === "victory")
    return <VictoryScreen onNewGame={returnToStartScreen} />;
  if (gameData.status === "abandoned")
    return <GameOverScreen onNewGame={returnToStartScreen} />;
  if (gameData.status === "defeat") {
    return (
      <DefeatScreen
        score={gameData.gameState.score}
        floor={gameData.gameState.floor}
        onNewGame={returnToStartScreen}
      />
    );
  }
  if (gameData.gameState.floorRecap) {
    return (
      <FloorRecapScreen
        recap={gameData.gameState.floorRecap}
        onContinue={continueToNextFloor}
        onSaveAndQuit={saveAndQuitFromRecap}
      />
    );
  }

  const pendingTrap = gameData.gameState.pendingTrapChoice;
  const pendingCombat = gameData.gameState.pendingCombat;
  const pendingEnemyChoice = gameData.gameState.pendingEnemyChoice;
  const heroIsDead = gameData.gameState.heroIsDead;
  const heroConfirmed = gameData.gameState.heroConfirmed;

  // Détermine LE panneau prioritaire à afficher en superposition du plateau
  // (mort, combat, piège, ennemi, clé, coffre, magasin) — un seul à la fois.
  const renderPendingActionContent = () => {
    if (heroIsDead) {
      return (
        <DeathPanel
          livesRemaining={gameData.gameState.livesRemaining}
          onRecreateHero={recreateHero}
          onAbandonGame={abandonGame}
        />
      );
    }
    if (pendingCombat && !pendingCombat.started) {
      return (
        <CombatChoicePanel
          enemyType={pendingCombat.enemyType}
          onStartCombat={startCombat}
          onDeclineCombat={declineCombat}
        />
      );
    }
    if (pendingCombat?.started) {
      return (
        <CombatPanel
          pendingCombat={pendingCombat}
          hero={gameData.hero}
          combatLog={combatLog}
          isBusy={isBusy}
          onAttack={attackRound}
          onStopCombat={stopCombat}
        />
      );
    }
    if (pendingTrap) {
      return (
        <TrapChoicePanel
          pendingTrap={pendingTrap}
          tiles={gameData.tiles}
          isBusy={isBusy}
          onResolve={resolveTrapChoice}
        />
      );
    }
    if (pendingEnemyChoice) {
      return (
        <EnemyChoicePanel
          pendingEnemyChoice={pendingEnemyChoice}
          isBusy={isBusy}
          onResolve={resolveEnemyChoice}
        />
      );
    }
    if (isHeroOnKey()) {
      return <KeyPanel onPickUpKey={pickUpKey} />;
    }
    if (isHeroOnChest()) {
      return <ChestPanel onOpenChest={openChest} />;
    }
    if (isHeroOnShop()) {
      return <ShopPanel shopStock={gameData.shopStock} onBuyItem={buyItem} />;
    }
    return null;
  };

  const pendingActionContent = renderPendingActionContent();

  return (
    <div className="dungeon-board">
      <div className="dungeon-header">
        <h2>Skip the Dungeon</h2>
        <button onClick={returnToStartScreen} className="save-and-quit-button">
          💾 Sauvegarder et quitter
        </button>
      </div>

      {heroReady && (
        <HeroStatsBar hero={gameData.hero} gameState={gameData.gameState} />
      )}

      <div className="board-wrapper">
        <DungeonGrid
          tiles={gameData.tiles}
          heroPosition={heroPosition}
          heroIsDead={heroIsDead}
          groundLoot={gameData.gameState.groundLoot}
          exitReady={
            gameData.gameState.keyFound && gameData.gameState.bossDefeated
          }
        />

        {pendingActionContent && (
          <ActionOverlay>{pendingActionContent}</ActionOverlay>
        )}

        {isInventoryOpen && !pendingActionContent && (
          <ActionOverlay onClose={() => setIsInventoryOpen(false)}>
            <InventoryPanel
              inventory={gameData.hero.inventory}
              isBusy={isBusy}
              onUsePotion={usePotion}
              onUsePotionTriple={useItem}
              onUseWeapon={useItem}
              onUseBombeCarre={useItem}
              onUseBombeLigne={useBombeLigne}
            />
          </ActionOverlay>
        )}
      </div>

      {heroReady && heroConfirmed && !heroIsDead && !pendingActionContent && (
        <MovementPanel
          movesRemaining={movesRemaining}
          selectedDirection={selectedDirection}
          isBusy={isBusy}
          onRollDice={rollMoveDice}
          onMoveOneStep={moveOneStep}
          onStopMovement={stopMovement}
        />
      )}

      {tileMessage && <p className="tile-message">{tileMessage}</p>}
      {error && <p className="dungeon-error-message">{error}</p>}

      {heroReady && (
        <button
          className="inventory-toggle-button"
          onClick={() => setIsInventoryOpen(true)}
        >
          🎒 Inventaire
        </button>
      )}

      <div className="hero-reference-panel">
        <HeroPanel
          hero={gameData.hero}
          heroReady={heroReady}
          heroConfirmed={heroConfirmed}
          gameState={gameData.gameState}
          difficulty={gameData.difficulty}
          onCreateHero={createHero}
          onRerollHero={rerollHero}
          onConfirmHero={confirmHero}
        />
      </div>
    </div>
  );
};

export default Dungeon;

import React, { useState, useEffect } from "react";
import axios from "axios";

import HeroPanel from "./HeroPanel";
import MovementPanel from "./MovementPanel";
import DeathPanel from "./DeathPanel";
import CombatChoicePanel from "./CombatChoicePanel";
import CombatPanel from "./CombatPanel";
import TrapChoicePanel from "./TrapChoicePanel";
import EnemyChoicePanel from "./EnemyChoicePanel";
import { KeyPanel, ChestPanel, ShopPanel } from "./InteractionPanels";
import InventoryPanel from "./InventoryPanel";
import DungeonGrid from "./DungeonGrid";
import { VictoryScreen, GameOverScreen } from "./EndScreens";

const API = process.env.REACT_APP_API_URL;

const Dungeon = () => {
  const [gameData, setGameData] = useState(null);
  const [heroPosition, setHeroPosition] = useState([0, 0]);
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [tileMessage, setTileMessage] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const movesRemaining = gameData?.gameState?.movesRemaining ?? 0;

  // ---------------------------------------------------------------------
  // Chargement / reprise de partie
  // ---------------------------------------------------------------------
  useEffect(() => {
    axios
      .post(`${API}/api/dungeon/create-game`)
      .then((res) => {
        setGameData(res.data);
        const { x, y } = res.data.gameState.currentTile;
        setHeroPosition([x, y]);
      })
      .catch((err) => console.error(err));
  }, []);

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

  // ---------------------------------------------------------------------
  // Déplacement
  // ---------------------------------------------------------------------
  const revealCurrentTile = () => {
    axios
      .post(`${API}/api/dungeon/reveal-tile`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
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
        setCombatLog((prev) => [...prev, ...res.data.log]);
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
        setTileMessage(res.data.message);
        setCombatLog([]);
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

  const startNewGame = () => {
    axios
      .post(`${API}/api/dungeon/create-game`)
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
  if (!gameData || !gameData.tiles) return <div>Chargement...</div>;

  if (gameData.status === "victory")
    return <VictoryScreen onNewGame={startNewGame} />;
  if (gameData.status === "abandoned")
    return <GameOverScreen onNewGame={startNewGame} />;

  const pendingTrap = gameData.gameState.pendingTrapChoice;
  const pendingCombat = gameData.gameState.pendingCombat;
  const pendingEnemyChoice = gameData.gameState.pendingEnemyChoice;
  const heroIsDead = gameData.gameState.heroIsDead;

  return (
    <div className="dungeon-board">
      <h2>Plateau de Donjon</h2>

      <div className="hero-panel">
        <HeroPanel
          hero={gameData.hero}
          heroPosition={heroPosition}
          heroReady={heroReady}
          onCreateHero={createHero}
        />

        {heroReady && (
          <InventoryPanel
            inventory={gameData.hero.inventory}
            isBusy={isBusy}
            onUsePotion={usePotion}
            onUsePotionTriple={useItem}
            onUseWeapon={useItem}
            onUseBombeCarre={useItem}
            onUseBombeLigne={useBombeLigne}
          />
        )}

        {heroIsDead && (
          <DeathPanel
            onRecreateHero={recreateHero}
            onAbandonGame={abandonGame}
          />
        )}

        {heroReady &&
          !heroIsDead &&
          !pendingCombat &&
          !pendingTrap &&
          !pendingEnemyChoice && (
            <MovementPanel
              movesRemaining={movesRemaining}
              selectedDirection={selectedDirection}
              isBusy={isBusy}
              onRollDice={rollMoveDice}
              onMoveOneStep={moveOneStep}
              onStopMovement={stopMovement}
            />
          )}

        {pendingCombat && !pendingCombat.started && (
          <CombatChoicePanel
            enemyType={pendingCombat.enemyType}
            onStartCombat={startCombat}
            onDeclineCombat={declineCombat}
          />
        )}

        {pendingCombat?.started && (
          <CombatPanel
            pendingCombat={pendingCombat}
            hero={gameData.hero}
            combatLog={combatLog}
            isBusy={isBusy}
            onAttack={attackRound}
            onStopCombat={stopCombat}
          />
        )}

        {pendingTrap && (
          <TrapChoicePanel
            pendingTrap={pendingTrap}
            isBusy={isBusy}
            onResolve={resolveTrapChoice}
          />
        )}

        {pendingEnemyChoice && (
          <EnemyChoicePanel
            pendingEnemyChoice={pendingEnemyChoice}
            isBusy={isBusy}
            onResolve={resolveEnemyChoice}
          />
        )}

        {isHeroOnKey() && !pendingCombat && !pendingTrap && (
          <KeyPanel onPickUpKey={pickUpKey} />
        )}

        {isHeroOnChest() && !pendingCombat && !pendingTrap && (
          <ChestPanel onOpenChest={openChest} />
        )}

        {isHeroOnShop() && !pendingCombat && !pendingTrap && (
          <ShopPanel shopStock={gameData.shopStock} onBuyItem={buyItem} />
        )}

        {tileMessage && <p className="tile-message">{tileMessage}</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>

      <DungeonGrid
        tiles={gameData.tiles}
        heroPosition={heroPosition}
        heroIsDead={heroIsDead}
        groundLoot={gameData.gameState.groundLoot}
        exitReady={
          gameData.gameState.keyFound && gameData.gameState.bossDefeated
        }
      />
    </div>
  );
};

export default Dungeon;

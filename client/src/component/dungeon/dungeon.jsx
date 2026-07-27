import React, { useState, useEffect, useContext } from "react";
import axios from "axios";

import { UserContext } from "../../context/UserContext";
import HeroPanel from "./HeroPanel";
import HeroStatsBar from "./HeroStatsBar";
import MovementPanel from "./MovementPanel";
import DeathPanel from "./DeathPanel";
import CombatChoicePanel from "./CombatChoicePanel";
import CombatPanel from "./CombatPanel";
import CombatResultPanel from "./CombatResultPanel";
import TrapChoicePanel from "./TrapChoicePanel";
import GouffreFallPanel from "./GouffreFallPanel";
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
  const { user } = useContext(UserContext);
  const [gameData, setGameData] = useState(null);
  const [activeGames, setActiveGames] = useState(undefined); // undefined = pas encore vérifié
  const [heroPosition, setHeroPosition] = useState([0, 0]);
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [tileMessage, setTileMessage] = useState(null);
  const [combatLog, setCombatLog] = useState([]);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [interactionDismissed, setInteractionDismissed] = useState(false);
  const [combatResultOverlay, setCombatResultOverlay] = useState(null);

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
    setCombatResultOverlay(null);
    setInteractionDismissed(false);
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
        setCombatResultOverlay(null);
        setInteractionDismissed(false);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (gameData?.gameState) {
      setSelectedDirection(gameData.gameState.lockedDirection ?? null);
    }
  }, [gameData]);

  // Un popup optionnel (clé/coffre/magasin) fermé manuellement redevient
  // proposable dès que le héros change de case.
  const [heroX, heroY] = heroPosition;
  useEffect(() => {
    setInteractionDismissed(false);
  }, [heroX, heroY]);

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
        setTileMessage(res.data.message || null);
        setCombatLog([]);
        setError(null);
        setInteractionDismissed(false); // nouveau tour = un popup fermé redevient proposable
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

  // Déroule automatiquement tous les mouvements restants dans une direction,
  // en s'arrêtant net dès qu'une décision du joueur devient nécessaire
  // (piège, ennemi, gouffre, mort...) — même logique que le pas-à-pas,
  // simplement enchaînée en boucle côté client.
  const runAllMoves = async (direction) => {
    if (!gameData || movesRemaining <= 0 || isBusy) return;
    if (selectedDirection !== null && direction !== selectedDirection) return;

    setIsBusy(true);
    setError(null);

    let keepGoing = true;
    let currentDirection = direction; // suit le rebond éventuel d'un pas à l'autre
    const collectedMessages = []; // rien ne se perd, même sur les pas intermédiaires

    while (keepGoing) {
      try {
        const res = await axios.post(`${API}/api/dungeon/move-one-step`, {
          gameId: gameData._id,
          direction: currentDirection,
        });
        const { gameData: updatedGame, message, stopped } = res.data;

        setGameData(updatedGame);
        setHeroPosition([
          updatedGame.gameState.currentTile.x,
          updatedGame.gameState.currentTile.y,
        ]);
        if (message) collectedMessages.push(message);

        const gs = updatedGame.gameState;
        // Le serveur renvoie la direction effective (post-rebond éventuel) dans
        // lockedDirection tant que le mouvement continue — on la reprend pour
        // le pas suivant plutôt que de s'entêter sur la direction d'origine.
        if (gs.lockedDirection) currentDirection = gs.lockedDirection;

        const needsPlayerChoice =
          gs.pendingTrapChoice ||
          gs.pendingCombat ||
          gs.pendingEnemyChoice ||
          gs.pendingGouffreFall ||
          gs.heroIsDead;

        if (needsPlayerChoice) {
          keepGoing = false; // popup à afficher, on ne va pas plus loin sans le joueur
        } else if (stopped && gs.movesRemaining === 0) {
          keepGoing = false;
          const revealRes = await axios.post(`${API}/api/dungeon/reveal-tile`, {
            gameId: gameData._id,
          });
          setGameData(revealRes.data.gameData);
          setHeroPosition([
            revealRes.data.gameData.gameState.currentTile.x,
            revealRes.data.gameData.gameState.currentTile.y,
          ]);
          if (revealRes.data.message)
            collectedMessages.push(revealRes.data.message);
        } else if (gs.movesRemaining <= 0) {
          keepGoing = false;
        }
        // sinon : encore des mouvements, rien de bloquant → on continue la boucle
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || "Erreur lors du déplacement");
        keepGoing = false;
      }
    }

    if (collectedMessages.length > 0) {
      setTileMessage(collectedMessages.join(" ⋅ "));
    }

    setIsBusy(false);
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
  // Jet de sauvetage lors de la découverte d'un gouffre
  // ---------------------------------------------------------------------
  const rollGouffreFall = () => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/roll-gouffre-fall`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);

        if (res.data.success) {
          const { x, y } = res.data.gameData.gameState.currentTile;
          setHeroPosition([x, y]);
        }
        // En cas d'échec, on reste affiché sur le popup (état "failed") en
        // attendant que le joueur confirme via confirmGouffreDeath.
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.error || "Erreur lors du jet de sauvetage",
        );
      })
      .finally(() => setIsBusy(false));
  };

  const confirmGouffreDeath = () => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/confirm-gouffre-death`, {
        gameId: gameData._id,
      })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur");
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

  const attemptHideForced = () => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/attempt-hide-forced`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setTileMessage(res.data.message);
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur");
      })
      .finally(() => setIsBusy(false));
  };

  const attackRound = () => {
    if (isBusy) return;
    setIsBusy(true);

    axios
      .post(`${API}/api/dungeon/attack-round`, { gameId: gameData._id })
      .then((res) => {
        setGameData(res.data.gameData);
        setCombatLog((prev) => [...prev, res.data.log]); // un round = un bloc de lignes (ordre interne préservé)

        if (res.data.victory) {
          setCombatResultOverlay({
            type: "victory",
            log: res.data.log,
            goldReward: res.data.goldReward,
          });
        } else if (res.data.gameData.gameState.heroIsDead) {
          setCombatResultOverlay({ type: "defeat", log: res.data.log });
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.response?.data?.error || "Erreur pendant le combat");
      })
      .finally(() => setIsBusy(false));
  };

  const dismissCombatResult = () => setCombatResultOverlay(null);

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
    setCombatResultOverlay(null);
    setInteractionDismissed(false);
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
    if (movesRemaining > 0) return false; // pas juste en passant, il faut finir son tour dessus
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
        deathCause={gameData.gameState.deathCause}
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
  const pendingGouffreFall = gameData.gameState.pendingGouffreFall;
  const heroIsDead = gameData.gameState.heroIsDead;
  const heroConfirmed = gameData.gameState.heroConfirmed;

  // Détermine LE panneau prioritaire à afficher en superposition du plateau
  // (mort, combat, piège, ennemi, clé, coffre, magasin) — un seul à la fois.
  // "dismissable" : peut être fermé sans agir (clé/coffre/magasin uniquement —
  // combat/piège/ennemi ont déjà leurs propres boutons de sortie intégrés).
  const getPendingAction = () => {
    if (combatResultOverlay) {
      return {
        dismissable: false,
        content: (
          <CombatResultPanel
            result={combatResultOverlay}
            onContinue={dismissCombatResult}
          />
        ),
      };
    }
    if (heroIsDead) {
      return {
        dismissable: false,
        content: (
          <DeathPanel
            livesRemaining={gameData.gameState.livesRemaining}
            onRecreateHero={recreateHero}
            onAbandonGame={abandonGame}
          />
        ),
      };
    }
    if (!heroReady || !heroConfirmed) {
      return {
        dismissable: false,
        content: (
          <HeroPanel
            hero={gameData.hero}
            heroReady={heroReady}
            heroConfirmed={heroConfirmed}
            gameState={gameData.gameState}
            onCreateHero={createHero}
            onRerollHero={rerollHero}
            onConfirmHero={confirmHero}
          />
        ),
      };
    }
    if (pendingGouffreFall) {
      return {
        dismissable: false,
        content: (
          <GouffreFallPanel
            pendingGouffreFall={pendingGouffreFall}
            isBusy={isBusy}
            onRoll={rollGouffreFall}
            onConfirmDeath={confirmGouffreDeath}
          />
        ),
      };
    }
    if (pendingCombat && !pendingCombat.started) {
      return {
        dismissable: false,
        content: (
          <CombatChoicePanel
            enemyType={pendingCombat.enemyType}
            forced={pendingCombat.forced}
            onStartCombat={startCombat}
            onDeclineCombat={declineCombat}
            onAttemptHide={attemptHideForced}
          />
        ),
      };
    }
    if (pendingCombat?.started) {
      return {
        dismissable: false,
        content: (
          <CombatPanel
            pendingCombat={pendingCombat}
            hero={gameData.hero}
            combatLog={combatLog}
            isBusy={isBusy}
            onAttack={attackRound}
            onStopCombat={stopCombat}
          />
        ),
      };
    }
    if (pendingTrap) {
      return {
        dismissable: false,
        content: (
          <TrapChoicePanel
            pendingTrap={pendingTrap}
            tiles={gameData.tiles}
            isBusy={isBusy}
            onResolve={resolveTrapChoice}
          />
        ),
      };
    }
    if (pendingEnemyChoice) {
      return {
        dismissable: false,
        content: (
          <EnemyChoicePanel
            pendingEnemyChoice={pendingEnemyChoice}
            isBusy={isBusy}
            onResolve={resolveEnemyChoice}
          />
        ),
      };
    }
    if (interactionDismissed) return null;

    if (isHeroOnKey()) {
      return {
        dismissable: true,
        content: <KeyPanel onPickUpKey={pickUpKey} />,
      };
    }
    if (isHeroOnChest()) {
      return {
        dismissable: true,
        content: <ChestPanel onOpenChest={openChest} />,
      };
    }
    if (isHeroOnShop()) {
      return {
        dismissable: true,
        content: (
          <ShopPanel shopStock={gameData.shopStock} onBuyItem={buyItem} />
        ),
      };
    }
    return null;
  };

  const pendingAction = getPendingAction();

  return (
    <div className="dungeon-board">
      <div className="dungeon-header">
        <h1 className="game-title">Skip the Dungeon</h1>
        <div className="dungeon-header-meta">
          <span>Étage {gameData.gameState.floor}</span>
          <span className="hero-stats-sep">·</span>
          <span>{gameData.difficulty}</span>
          <span className="hero-stats-sep">·</span>
          <span className="dungeon-username">{user?.username}</span>
        </div>
        <button onClick={returnToStartScreen} className="save-and-quit-button">
          💾 Sauvegarder et quitter
        </button>
      </div>

      {heroReady && heroConfirmed && (
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

        {isInventoryOpen ? (
          <ActionOverlay onClose={() => setIsInventoryOpen(false)}>
            <InventoryPanel
              inventory={gameData.hero.inventory}
              isBusy={isBusy}
              inCombat={!!pendingCombat?.started}
              alreadyUsedThisTurn={
                gameData.gameState.lastItemUseTurn ===
                gameData.gameState.turnCount
              }
              onUsePotion={usePotion}
              onUsePotionTriple={useItem}
              onUseWeapon={useItem}
              onUseBombeCarre={useItem}
              onUseBombeLigne={useBombeLigne}
            />
          </ActionOverlay>
        ) : (
          pendingAction && (
            <ActionOverlay
              onClose={
                pendingAction.dismissable
                  ? () => setInteractionDismissed(true)
                  : undefined
              }
            >
              {pendingAction.content}
            </ActionOverlay>
          )
        )}
      </div>

      <div className="board-controls">
        {heroReady && heroConfirmed && !heroIsDead && !pendingAction && (
          <MovementPanel
            movesRemaining={movesRemaining}
            selectedDirection={selectedDirection}
            isBusy={isBusy}
            onRollDice={rollMoveDice}
            onMoveOneStep={moveOneStep}
            onRunAllMoves={runAllMoves}
            onStopMovement={stopMovement}
          />
        )}

        {tileMessage && <p className="tile-message">{tileMessage}</p>}
        {error && <p className="dungeon-error-message">{error}</p>}

        {heroReady && heroConfirmed && (
          <button
            className="inventory-toggle-button"
            onClick={() => setIsInventoryOpen(true)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a9714a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="backpack-icon"
            >
              <path d="M6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" />
              <path d="M9 6V4a3 3 0 0 1 6 0v2" />
              <path d="M8 12h8" />
              <path d="M9 16h2" />
              <path d="M13 16h2" />
            </svg>{" "}
            Inventaire
          </button>
        )}
      </div>
    </div>
  );
};

export default Dungeon;

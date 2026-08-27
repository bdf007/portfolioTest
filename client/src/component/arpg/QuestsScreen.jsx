import { resolveItemDef } from "./itemDefs";
import { resolveEnemyDisplayName } from "./spriteRegistry";

/**
 * Écran de quêtes - overlay superposé au jeu (meme modele que
 * InventoryScreen/ShopScreen/TravelHubScreen), ouvert/ferme depuis un
 * bouton dedie qui met le jeu en pause pendant la consultation.
 * Remplace l'ancien affichage en ligne dans le HUD (toujours visible,
 * encombrant a plusieurs quetes actives) - separe les quetes ACTIVES
 * (avec leur progression) des quetes TERMINEES (cloturees), plutot que
 * de tout mélanger.
 */
export default function QuestsScreen({ quests, onClose }) {
  // un destinataire de livraison (role 'receiver') existe des la
  // creation de sa ville, AVANT meme que le joueur ait accepte quoi que
  // ce soit du donneur (cf. MainScene.maybeInjectDeliveryQuest, cree les
  // deux entrees d'un coup pour eviter tout risque de collision si le
  // meme PNJ recevait une autre quete entre temps) - sans ce garde
  // special, il apparaitrait ici comme "en cours" avant meme d'avoir ete
  // propose au joueur
  const entries = Object.entries(quests).filter(([, q]) => {
    if (q.questId === "delivery" && q.role === "receiver") {
      const giverQs = quests[q.linkedKey];
      return giverQs && giverQs.accepted;
    }
    return q.accepted;
  });
  const active = entries.filter(([, q]) => !q.completed);
  const completed = entries.filter(([, q]) => q.completed);

  function describeAction(q) {
    if (q.questId === "obtainItem") return "Rapporter : ";
    if (q.questId === "defeatBoss") return "Vaincre : ";
    if (q.questId === "delivery")
      return q.role === "giver" ? "Livrer : " : "Réceptionner : ";
    return "Tuer : ";
  }

  function describeProgress(q) {
    if (q.questId === "obtainItem") {
      return resolveItemDef(q.targetItemId).name;
    }
    if (q.questId === "defeatBoss") {
      const bossName = resolveEnemyDisplayName(q.targetBossType);
      return `${bossName} (étage ${q.targetBossDepth})${q.bossDefeated ? " - vaincu, à confirmer" : ""}`;
    }
    if (q.questId === "delivery") {
      const itemName = resolveItemDef(q.itemId).name;
      if (q.role === "giver") {
        return `${itemName} → étage ${q.targetDepth}${q.receiverKey ? "" : " (destinataire pas encore croisé)"}`;
      }
      return `${itemName} à remettre`;
    }
    return `${q.killCount} / ${q.target} ${q.targetEnemyType}`;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 22,
        display: "flex",
        flexDirection: "column",
        background: "rgba(10,10,15,0.95)",
        color: "#eee",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>Quêtes</h3>
        <button
          onClick={onClose}
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

      <div style={{ fontSize: 13, color: "#8a7050", marginBottom: 8 }}>
        En cours
      </div>
      {active.length === 0 && (
        <div style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
          Aucune quête en cours.
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {active.map(([questKey, q]) => (
          <div
            key={questKey}
            style={{
              padding: 10,
              background: "#1e2029",
              border: "1px solid #444",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 13 }}>Étage {questKey.split("-")[0]}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              {describeAction(q)}
              {describeProgress(q)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, color: "#8a7050", marginBottom: 8 }}>
        Terminées
      </div>
      {completed.length === 0 && (
        <div style={{ color: "#666", fontSize: 13 }}>
          Aucune quête terminée pour l'instant.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {completed.map(([questKey, q]) => (
          <div
            key={questKey}
            style={{
              padding: 10,
              background: "#1a2420",
              border: "1px solid #2f4a3a",
              borderRadius: 8,
              opacity: 0.75,
            }}
          >
            <div style={{ fontSize: 13 }}>Étage {questKey.split("-")[0]}</div>
            <div style={{ fontSize: 12, color: "#7fae8f", marginTop: 4 }}>
              Terminée
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

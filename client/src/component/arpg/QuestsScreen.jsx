import { useState, useEffect, useRef } from "react";
import { resolveItemDef } from "./itemDefs";
import { resolveEnemyDisplayName } from "./spriteRegistry";
import bookPages from "../../assets/background/book_pages.png"; // ajuste le chemin selon ou tu l'as range

/**
 * Écran de quêtes - presente comme un livre ouvert (image de fond),
 * page de gauche = quetes EN COURS, page de droite = quetes TERMINEES.
 * Meme logique de filtrage qu'avant, seule la mise en page change.
 */
export default function QuestsScreen({ quests, onClose }) {
  // un destinataire de livraison (role 'receiver') existe des la
  // creation de sa ville, AVANT meme que le joueur ait accepte quoi que
  // ce soit du donneur (cf. MainScene.maybeInjectDeliveryQuest) - sans
  // ce garde special, il apparaitrait ici comme "en cours" avant meme
  // d'avoir ete propose au joueur
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

  const containerRef = useRef(null);
  const [bookSize, setBookSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    function updateSize() {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const availW = parent.clientWidth * 0.9;
      const availH = parent.clientHeight * 0.85;
      const ratio = 800 / 500;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setBookSize({ width: w, height: h });
    }
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: bookSize.width,
          height: bookSize.height,
          backgroundImage: `url(${bookPages})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "2%",
            right: "6%",
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid #8a7050",
            background: "rgba(58,47,32,0.85)",
            color: "#f0e6d0",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          Fermer
        </button>

        {/* Page gauche - quetes EN COURS */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "10%",
            left: "9%",
            width: "38%",
            height: "78%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Quêtes en cours</h3>
          {active.length === 0 && (
            <div style={{ color: "#5a4a35", fontSize: 12 }}>
              Aucune quête en cours.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {active.map(([questKey, q]) => (
              <div key={questKey} style={{ fontSize: 12 }}>
                <div style={{ fontWeight: "bold" }}>
                  Étage {questKey.split("-")[0]}
                </div>
                <div style={{ color: "#5a4a35" }}>
                  {describeAction(q)}
                  {describeProgress(q)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page droite - quetes TERMINEES */}
        <div
          className="book-page-scroll"
          style={{
            position: "absolute",
            top: "10%",
            left: "54%",
            width: "37%",
            height: "78%",
            overflowY: "auto",
            overflowX: "hidden",
            color: "#241a10",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Quêtes terminées</h3>
          {completed.length === 0 && (
            <div style={{ color: "#5a4a35", fontSize: 12 }}>
              Aucune quête terminée pour l'instant.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {completed.map(([questKey, q]) => (
              <div key={questKey} style={{ fontSize: 12, opacity: 0.75 }}>
                <div style={{ fontWeight: "bold" }}>
                  Étage {questKey.split("-")[0]}
                </div>
                <div style={{ color: "#5a4a35" }}>
                  {describeAction(q)}
                  {describeProgress(q)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
  .book-page-scroll::-webkit-scrollbar {
    width: 7px;
  }
  .book-page-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .book-page-scroll::-webkit-scrollbar-thumb {
    background: rgba(90, 74, 53, 0.45);
    border-radius: 4px;
  }
  .book-page-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(90, 74, 53, 0.65);
  }
  .book-page-scroll {
    scrollbar-width: thin;
    scrollbar-color: rgba(90, 74, 53, 0.45) transparent;
  }
`}</style>
    </div>
  );
}

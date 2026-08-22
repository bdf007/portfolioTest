/**
 * Écran du hub de voyage rapide - overlay superposé au jeu (comme
 * InventoryScreen), ouvert quand le joueur interagit avec le point de
 * voyage en ville. `destinations` est la liste des étages déjà visités
 * (hors étage courant, déjà filtré côté MainScene) - triée ici du plus
 * proche au plus profond, pour un affichage lisible.
 */
export default function TravelHubScreen({ destinations, onTravel, onClose }) {
  const sorted = [...destinations].sort((a, b) => a.depth - b.depth);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
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
        <h3 style={{ margin: 0 }}>Voyage rapide</h3>
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

      {sorted.length === 0 && (
        <div style={{ color: "#666", fontSize: 13 }}>
          Aucun autre étage visité pour l'instant.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((dest) => (
          <button
            key={dest.depth}
            onClick={() => onTravel(dest.depth)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              background: "#1e2029",
              border: "1px solid #1ba8c9",
              borderRadius: 8,
              color: "#eee",
              fontSize: 14,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span>Étage {dest.depth}</span>
            <span style={{ color: "#1ba8c9", fontSize: 13 }}>Voyager →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const ATTRIBUTE_LABELS = {
  force: "Force (dégâts de mêlée)",
  dexterite: "Dextérité (dégâts à distance)",
  intelligence: "Intelligence (mana + régén)",
  vitalite: "Vitalité (PV max + régén)",
  constitution: "Constitution (défense)",
  endurance: "Endurance (stamina + régén)",
  chance: "Chance",
};

export default function AttributesScreen({
  confirmedAttributes,
  draftAttributes,
  unspent,
  onAllocate,
  onDeallocate,
  onConfirm,
  onClose,
}) {
  const hasPendingChanges = Object.keys(ATTRIBUTE_LABELS).some(
    (key) => (draftAttributes[key] || 0) !== (confirmedAttributes[key] || 0),
  );

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
        <h3 style={{ margin: 0 }}>
          Attributs{" "}
          {unspent > 0 && (
            <span style={{ color: "#ffd700" }}>
              ({unspent} point{unspent > 1 ? "s" : ""} à distribuer)
            </span>
          )}
        </h3>
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

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => {
          const confirmedValue = confirmedAttributes[key] || 0;
          const draftValue = draftAttributes[key] || 0;
          const canRemove = draftValue > confirmedValue;

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                background: "#1e2029",
                border: "1px solid #444",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 13 }}>{label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  disabled={!canRemove}
                  onClick={() => onDeallocate(key)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid #666",
                    background: canRemove ? "#2a2a35" : "#1a1a22",
                    color: canRemove ? "#eee" : "#555",
                    cursor: canRemove ? "pointer" : "not-allowed",
                    fontSize: 16,
                  }}
                >
                  −
                </button>
                <span
                  style={{ fontSize: 16, minWidth: 24, textAlign: "center" }}
                >
                  {draftValue}
                </span>
                <button
                  disabled={unspent <= 0}
                  onClick={() => onAllocate(key)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid #8a7050",
                    background: unspent > 0 ? "#3a2f20" : "#2a2a35",
                    color: unspent > 0 ? "#f0e6d0" : "#777",
                    cursor: unspent > 0 ? "pointer" : "not-allowed",
                    fontSize: 16,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        disabled={!hasPendingChanges}
        onClick={onConfirm}
        style={{
          padding: "10px 20px",
          fontSize: 14,
          borderRadius: 8,
          border: hasPendingChanges ? "1px solid #ffd700" : "1px solid #555",
          background: hasPendingChanges ? "#3a3320" : "#2a2a35",
          color: hasPendingChanges ? "#f0e8c0" : "#777",
          cursor: hasPendingChanges ? "pointer" : "not-allowed",
          alignSelf: "center",
        }}
      >
        Valider la répartition
      </button>
    </div>
  );
}

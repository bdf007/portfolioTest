import React from "react";

const ActionOverlay = ({ children, onClose }) => {
  return (
    <div className="action-overlay-backdrop">
      <div className="action-overlay-panel">
        {onClose && (
          <button className="action-overlay-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default ActionOverlay;

import React, { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "../../context/UserContext";

const API = process.env.REACT_APP_API_URL;

const BugReportForm = ({ onClose }) => {
  const { user } = useContext(UserContext);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) {
      setError("Décris le bug avant d'envoyer.");
      return;
    }
    setIsBusy(true);
    setError(null);

    axios
      .post(`${API}/api/contact`, {
        firstname: user?.username || "Joueur",
        lastname: "Bug",
        email: "declaration@bug.fr",
        message: `Bug - ${message.trim()}`,
      })
      .then(() => setIsSubmitted(true))
      .catch((err) => {
        console.error(err);
        setError("Erreur lors de l'envoi, réessaie plus tard.");
      })
      .finally(() => setIsBusy(false));
  };

  if (isSubmitted) {
    return (
      <div className="bug-report-form">
        <h4>🐛 Signaler un bug</h4>
        <p>✓ Merci, ton signalement a bien été envoyé !</p>
        <button onClick={onClose}>Fermer</button>
      </div>
    );
  }

  return (
    <div className="bug-report-form">
      <h4>🐛 Signaler un bug</h4>
      <p className="bug-report-hint">
        Décris ce qui s'est passé — envoyé directement avec ton pseudo, pas besoin de remplir
        quoi que ce soit d'autre.
      </p>
      <textarea
        className="field-textarea"
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ex : j'ai ouvert un coffre et..."
      />
      {error && <p className="dungeon-error-message">{error}</p>}
      <button onClick={handleSubmit} disabled={isBusy}>
        Envoyer
      </button>
    </div>
  );
};

export default BugReportForm;

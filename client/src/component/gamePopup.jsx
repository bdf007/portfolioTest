import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const GamePopup = ({ game, onClose, user, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [updatedTitle, setUpdatedTitle] = useState(game.title);
  const [updatedGenre, setUpdatedGenre] = useState(game.genre);
  const [updatedDescription, setUpdatedDescription] = useState(
    game.description
  );
  const [updatedDate, setUpdatedDate] = useState(game.date);
  const [updatedEditor, setUpdatedEditor] = useState(game.editor);
  const [updatedMinPlayer, setUpdatedMinPlayer] = useState(game.minPlayer);
  const [updatedMaxPlayer, setUpdatedMaxPlayer] = useState(game.maxPlayer);
  const [updatedAge, setUpdatedAge] = useState(game.minAge);
  const [updatedDuration, setUpdatedDuration] = useState(game.duration);

  const updateGame = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/game/${game._id}`, {
        title: updatedTitle,
        genre: updatedGenre,
        description: updatedDescription,
        date: updatedDate,
        editor: updatedEditor,
        minPlayer: updatedMinPlayer,
        maxPlayer: updatedMaxPlayer,
        minAge: updatedAge,
        duration: updatedDuration,
        status: "in pending",
      });
      setEditing(false);
      // toast success message
      toast.success("Game updated");
      onUpdate(); // Notify parent component
      onClose(); // Fermer le popup après la mise à jour
    } catch (error) {
      console.log(error);
    }
  };

  // Fonction pour gérer le clic en dehors du popup
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="popup-content">
        {user && user.role === "admin" && editing ? (
          <div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Title :{" "}
              </label>
              <input
                className="flex-grow-1 ml-2"
                type="text"
                value={updatedTitle}
                onChange={(e) => setUpdatedTitle(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Genre :{" "}
              </label>
              <input
                className="flex-grow-1 ml-2"
                type="text"
                value={updatedGenre}
                onChange={(e) => setUpdatedGenre(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Description :{" "}
              </label>
              <textarea
                className="flex-grow-1 ml-2"
                value={updatedDescription}
                onChange={(e) => setUpdatedDescription(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Date :{" "}
              </label>
              <input
                type="number"
                value={updatedDate}
                onChange={(e) => setUpdatedDate(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Editor :{" "}
              </label>
              <input
                type="text"
                value={updatedEditor}
                onChange={(e) => setUpdatedEditor(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Min player :{" "}
              </label>
              <input
                type="number"
                value={updatedMinPlayer}
                onChange={(e) => setUpdatedMinPlayer(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Max player :{" "}
              </label>
              <input
                type="number"
                value={updatedMaxPlayer}
                onChange={(e) => setUpdatedMaxPlayer(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Age :{" "}
              </label>
              <input
                type="number"
                value={updatedAge}
                onChange={(e) => setUpdatedAge(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label
                className="mb-0 fw-bolder text-decoration-underline"
                style={{ whiteSpace: "nowrap" }}
              >
                Duration :{" "}
              </label>
              <input
                type="number"
                value={updatedDuration}
                onChange={(e) => setUpdatedDuration(e.target.value)}
              />
            </div>
            <br />
            <div className="d-flex justify-content-between mt-3">
              <button
                className="btn btn-primary"
                onClick={updateGame}
                type="button"
              >
                Update
              </button>
              <br />
              <button
                className="btn btn-danger"
                onClick={() => setEditing(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-center">{game.title}</h2>
            {game.imageData && (
              <img
                src={game.imageData}
                alt={game.title}
                className="img-fluid rounded mx-auto d-block"
              />
            )}
            <p>
              <span className="fw-bolder text-decoration-underline">
                Genre:{" "}
              </span>
              {game.genre ? game.genre : "pas de genre défini"}
            </p>
            <p>
              <span className="fw-bolder text-decoration-underline">
                Description:
              </span>
              {game.description
                ? game.description
                : "pas de description renseignée"}
            </p>
            <p>
              <span className="fw-bolder text-decoration-underline">
                Date de sortie:{" "}
              </span>
              {game.date ? game.date : "pas de date définie"}
            </p>
            <p>
              <span className="fw-bolder text-decoration-underline">
                Editeur:{" "}
              </span>
              {game.editor ? game.editor : "pas d'éditeur renseigné"}
            </p>
            <p>
              <span className="fw-bolder text-decoration-underline">
                Age minimum:{" "}
              </span>
              {game.minAge ? game.minAge : "pas d'âge minimum défini"}
            </p>
            <p>
              <span className="fw-bolder text-decoration-underline">
                Nombre de joueurs:{" "}
              </span>
              {game.minPlayer ? game.minPlayer : "pas de joueur minimum saisi"}{" "}
              -{" "}
              {game.maxPlayer ? game.maxPlayer : "pas de joueur maximum saisi"}
            </p>
            <p>
              <span className="fw-bolder text-decoration-underline">
                Durée:{" "}
              </span>
              {game.duration ? game.duration : "pas de durée saisie"} min
            </p>
            {user && user.role === "admin" && (
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-primary"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePopup;

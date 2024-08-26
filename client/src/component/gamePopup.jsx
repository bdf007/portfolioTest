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
            <div className="form-group d-flex align-items-center">
              <label>Title : </label>
              <input
                className="flex-grow-1 ml-2"
                type="text"
                value={updatedTitle}
                onChange={(e) => setUpdatedTitle(e.target.value)}
              />
            </div>
            <div className="form-group d-flex align-items-center">
              <label>Genre : </label>
              <input
                className="flex-grow-1 ml-2"
                type="text"
                value={updatedGenre}
                onChange={(e) => setUpdatedGenre(e.target.value)}
              />
            </div>
            <div className="form_group d-flex align-items-center">
              <label>Description : </label>
              <textarea
                className="flex-grow-1 ml-2"
                value={updatedDescription}
                onChange={(e) => setUpdatedDescription(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label>Min player : </label>
              <input
                type="number"
                value={updatedMinPlayer}
                onChange={(e) => setUpdatedMinPlayer(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label className="mb-0" style={{ whiteSpace: "nowrap" }}>
                Max player :{" "}
              </label>
              <input
                type="number"
                value={updatedMaxPlayer}
                onChange={(e) => setUpdatedMaxPlayer(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label>Age : </label>
              <input
                type="number"
                value={updatedAge}
                onChange={(e) => setUpdatedAge(e.target.value)}
              />
            </div>
            <div className="form-group d-flex justify-content-between">
              <label>Duration : </label>
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
            <p>Genre: {game.genre}</p>
            <p>Description: {game.description}</p>
            <p>Age minimum: {game.minAge}</p>
            <p>
              Nombre de joueurs: {game.minPlayer} - {game.maxPlayer}
            </p>
            <p>Durée: {game.duration} min</p>
            {game.imageData && (
              <img
                src={game.imageData}
                alt={game.title}
                className="img-fluid rounded mx-auto d-block"
              />
            )}
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

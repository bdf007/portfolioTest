import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";

const Game = () => {
  const { user } = useContext(UserContext);

  const [game, setGame] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedGenre, setUpdatedGenre] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [updatedMinPlayer, setUpdatedMinPlayer] = useState("");
  const [updatedMaxPlayer, setUpdatedMaxPlayer] = useState("");
  const [updatedAge, setUpdatedAge] = useState("");
  const [updatedDuration, setUpdatedDuration] = useState("");

  const gameId = window.location.pathname.split("/")[2];

  const getGame = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/game/${gameId}`
      );
      setGame(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const updateGame = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/game/${editingGameId}`,
        {
          title: updatedTitle,
          genre: updatedGenre,
          description: updatedDescription,
          minPlayer: updatedMinPlayer,
          maxPlayer: updatedMaxPlayer,
          age: updatedAge,
          Duration: updatedDuration,
          status: "in pending",
        }
      );
      setEditing(false);
      getGame();
    } catch (error) {
      console.log(error);
    }
  };

  const deleteGame = async () => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/game/${gameId}`);
      toast.success("Game deleted");
      window.location.href = "/ludotheque";
    } catch (error) {
      console.log(error);
    }
  };

  const startEditingGame = (
    gameId,
    title,
    genre,
    description,
    minPlayer,
    maxPlayer,
    age,
    Duration
  ) => {
    setEditing(true);
    setEditingGameId(gameId);
    setUpdatedTitle(title);
    setUpdatedGenre(genre);
    setUpdatedDescription(description);
    setUpdatedMinPlayer(minPlayer);
    setUpdatedMaxPlayer(maxPlayer);
    setUpdatedAge(age);
    setUpdatedDuration(Duration);
  };

  useEffect(() => {
    getGame();
  }, [setGame]);
  return !game ? (
    <div
      className="d-flex justify-content-center"
      style={{ paddingTop: "5rem" }}
    >
      <div className="spinner-border text-primary" role="status">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  ) : (
    <div
      className="container"
      style={{ paddingBottom: "15rem", paddingTop: "5rem" }}
    >
      {editing ? (
        <div className="d-flex justify-content-center">
          <input
            type="text"
            value={updatedTitle}
            onChange={(e) => setUpdatedTitle(e.target.value)}
          />
        </div>
      ) : (
        <div className="d-flex justify-content-center">
          <h2>{game.title}</h2>
        </div>
      )}
      <div className="row">
        <div className="col-6">
          <img src={game.imageData} alt={game.title} className="img-fluid" />
        </div>
        {editing ? (
          <div className="col-6">
            <p>
              <input
                type="text"
                value={updatedGenre}
                onChange={(e) => setUpdatedGenre(e.target.value)}
              />
            </p>
            <p>
              <textarea
                type="text"
                value={updatedDescription}
                onChange={(e) => setUpdatedDescription(e.target.value)}
              />
            </p>
            <p>
              <input
                type="number"
                value={updatedMinPlayer}
                onChange={(e) => setUpdatedMinPlayer(e.target.value)}
              />
            </p>
            <p>
              <input
                type="number"
                value={updatedMaxPlayer}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue >= 0) {
                    setUpdatedMaxPlayer(newValue);
                  }
                }}
              />
            </p>
            <p>
              <input
                type="number"
                value={updatedAge}
                onChange={(e) => setUpdatedAge(e.target.value)}
              />
            </p>
            <p>
              <input
                type="number"
                value={updatedDuration}
                onChange={(e) => setUpdatedDuration(e.target.value)}
              />
            </p>
            <button className="btn btn-primary" onClick={updateGame}>
              Update
            </button>
            <button
              className="btn btn-danger"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="col-6">
              <p>Genre : {game.genre}</p>
              <p>Description : {game.description}</p>
              {game.maxPlayer === null || game.maxPlayer === 0 ? (
                game.minPlayer === 1 ? (
                  <p>solo</p>
                ) : (
                  <p>{game.minPlayer} joueurs</p>
                )
              ) : game.minPlayer === game.maxPlayer ? (
                <p>{game.minPlayer} joueurs</p>
              ) : game.minPlayer < game.maxPlayer ? (
                <p>
                  De {game.minPlayer} à {game.maxPlayer} joueurs
                </p>
              ) : (
                <p>
                  De {game.maxPlayer} à {game.minPlayer} joueurs
                </p>
              )}

              <p>Age: {game.minAge} +</p>
              <p>Temps de jeu : {game.duration} min</p>
              {(user._id === game.addBy || user.role === "admin") && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      startEditingGame(
                        gameId,
                        game.title,
                        game.genre,
                        game.description,
                        game.minPlayer,
                        game.maxPlayer,
                        game.minAge,
                        game.duration
                      )
                    }
                  >
                    Edit
                  </button>

                  <button className="btn btn-danger" onClick={deleteGame}>
                    Delete
                  </button>
                </>
              )}
            </div>
            <div className="d-flex justify-content-center">
              <Link to="/ludotheque">
                <button className="btn btn-primary">Back</button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Game;

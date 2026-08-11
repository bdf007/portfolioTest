import React, { useState, useEffect } from "react";

const GameAdminRow = ({ game, show, onOpenPopup, onUpdateStatus, onDelete }) => {
  // État LOCAL à cette ligne uniquement — c'est ce qui corrige le bug :
  // avant, un seul state partagé par tout le tableau faisait changer
  // visuellement TOUTES les lignes en même temps.
  const [pendingStatus, setPendingStatus] = useState(game.status);

  // Si le jeu est rafraîchi depuis le serveur (après mise à jour, etc.),
  // on garde la sélection synchronisée avec la vraie valeur.
  useEffect(() => {
    setPendingStatus(game.status);
  }, [game.status]);

  return (
    <tr>
      <th className="text-justify">
        <span
          onClick={() => onOpenPopup(game)}
          className="badge bg-success text-wrap"
          style={{ cursor: "pointer" }}
        >
          <h6 className="text-decoration-underline">{game.title}</h6>
          <p>
            <img
              loading="lazy"
              src={`${process.env.REACT_APP_API_URL}/api/games/image/${game._id}`}
              alt={game.title}
              className="img-thumbnail rounded ludotheque-thumbnail"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </p>
          <p className="fst-italic">
            {game.editor ? `par ${game.editor}` : ""}
          </p>
        </span>
        <>
          <br />
          {!show &&
            (game.minAge >= 18 ? (
              <p className="badge bg-danger text-white fw-lighter fst-italic">
                interdit aux mineurs
              </p>
            ) : (
              <p className="fw-lighter fst-italic">
                {" "}
                à partir de{" "}
                <span className="badge bg-info">{game.minAge}</span> ans
              </p>
            ))}
        </>
      </th>
      <td>
        <p className="badge bg-warning text-dark text-wrap">{game.genre}</p>
        {!show && (
          <>
            <br />
            <p className="badge bg-primary">{game.duration} min</p>
          </>
        )}
      </td>

      {show === true && (
        <>
          <td className="text-justify">
            <p>
              {game.description
                ? game.description
                : "pas de résumé renseigné"}
            </p>
            <p className="fst-italic">
              {game.date ? `édité en ${game.date}` : ""}
            </p>
          </td>
          <td>
            <span
              className={`badge ${
                game.minAge >= 18
                  ? "bg-danger text-white"
                  : "bg-info text-dark"
              }`}
            >
              {game.minAge >= 18
                ? "interdit aux mineurs"
                : `${game.minAge} ans`}
            </span>
          </td>
        </>
      )}
      {game.minPlayer === 1 &&
      (game.maxPlayer === null ||
        game.maxPlayer === 0 ||
        game.maxPlayer === 1) ? (
        <td>solo</td>
      ) : game.minPlayer === game.maxPlayer ? (
        <td>
          <span className="badge bg-danger">{game.minPlayer}</span> joueurs
        </td>
      ) : game.minPlayer < game.maxPlayer ? (
        <td>
          De <span className="badge bg-danger">{game.minPlayer}</span> à{" "}
          <span className="badge bg-danger">{game.maxPlayer}</span> joueurs
        </td>
      ) : (
        <td>
          De <span className="badge bg-danger">{game.maxPlayer}</span> à{" "}
          <span className="badge bg-danger">{game.minPlayer}</span> joueurs
        </td>
      )}
      {show === true && (
        <>
          <td>
            <span className="badge bg-primary">{game.duration}min</span>{" "}
          </td>

          <td className="text-center">
            {game.status === "in pending" ? (
              <p className="list-inline bg-warning">
                En attente de validation
              </p>
            ) : game.status === "accepted" ? (
              <p className="list-inline text-success">Jeu accepté</p>
            ) : (
              <p className="list-inline bg-danger text-white">Jeu refusé</p>
            )}

            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
            >
              <option value="in pending">En attente</option>
              <option value="accepted">Accepté</option>
              <option value="rejected">Refusé</option>
            </select>

            <button
              type="button"
              className="btn btn-success"
              onClick={() => onUpdateStatus(game._id, pendingStatus)}
            >
              Mettre à jour
            </button>
          </td>
          <td>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(game._id)}
            >
              supprimer
            </button>
          </td>
        </>
      )}
    </tr>
  );
};

export default GameAdminRow;

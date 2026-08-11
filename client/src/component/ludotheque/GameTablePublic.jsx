import React from "react";

const GameTablePublic = ({ games, totalCount, show, onOpenPopup }) => {
  return (
    <table className="table table-striped table-bordered table-hover align-middle text-center">
      <thead>
        <tr>
          <th scope="col">
            <p className="text-bold ">Titre</p>
            <p className="fst-italic">Editeur </p>
            {!show && <p className="fst-italic">Age minimum</p>}
          </th>
          <th scope="col">
            <p>genre</p>
            {!show && <p>durée minimum</p>}
          </th>
          {show === true && (
            <>
              <th scope="col">
                <p>description</p>
                <p className="fst-italic">date de sortie</p>
              </th>
              <th scope="col">
                <p>age minimum</p>
              </th>
            </>
          )}
          <th scope="col">
            <p>nombre de joueurs</p>
          </th>
          {show === true && (
            <th scope="col">
              <p>durée minimum</p>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {totalCount === 0 ? (
          <tr>
            {show === true ? (
              <td colSpan="7">
                <div className="entry-loading">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              </td>
            ) : (
              <td colSpan="3">
                <div className="entry-loading">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              </td>
            )}
          </tr>
        ) : !games || games.length === 0 ? (
          <tr>
            {show === true ? (
              <td colSpan="7">Aucun jeu ne correspond à votre recherche</td>
            ) : (
              <td colSpan="3">Aucun jeu ne correspond à votre recherche</td>
            )}
          </tr>
        ) : (
          games.map((game) => (
            <tr key={game._id}>
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
                <p className="badge bg-warning text-dark text-wrap">
                  {game.genre}
                </p>
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
                  <span className="badge bg-danger">{game.minPlayer}</span>{" "}
                  joueurs
                </td>
              ) : game.minPlayer < game.maxPlayer ? (
                <td>
                  De <span className="badge bg-danger">{game.minPlayer}</span> à{" "}
                  <span className="badge bg-danger">{game.maxPlayer}</span>{" "}
                  joueurs
                </td>
              ) : (
                <td>
                  De <span className="badge bg-danger">{game.maxPlayer}</span> à{" "}
                  <span className="badge bg-danger">{game.minPlayer}</span>{" "}
                  joueurs
                </td>
              )}
              {show === true && (
                <td>
                  <span className="badge bg-primary">{game.duration}</span>
                  min
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default GameTablePublic;

import React from "react";
import GameAdminRow from "./GameAdminRow";

const GameTableAdmin = ({
  games,
  totalCount,
  show,
  onOpenPopup,
  onUpdateStatus,
  onDelete,
}) => {
  return (
    <table className="table table-striped table-bordered table-hover align-middle text-center">
      <thead>
        <tr key="0">
          <th scope="col">
            <p>titre</p>
            <p className="fst-italic">Editeur</p>
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
            <>
              <th scope="col">
                <p>durée</p>
              </th>
              <th scope="col">
                <p>Status</p>
              </th>
              <th scope="col">
                <p>action</p>
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {totalCount === 0 ? (
          <tr>
            {show === true ? (
              <td colSpan="8">
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
              <td colSpan="8">Aucun jeu ne correspond à votre recherche</td>
            ) : (
              <td colSpan="3">Aucun jeu ne correspond à votre recherche</td>
            )}
          </tr>
        ) : (
          games.map((game) => (
            <GameAdminRow
              key={game._id}
              game={game}
              show={show}
              onOpenPopup={onOpenPopup}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
            />
          ))
        )}
      </tbody>
    </table>
  );
};

export default GameTableAdmin;

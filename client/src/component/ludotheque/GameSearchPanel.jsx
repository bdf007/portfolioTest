import React from "react";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const GameSearchPanel = ({
  searchTitle,
  searchGenre,
  searchDate,
  searchEditor,
  searchMinPlayer,
  searchMaxPlayer,
  searchMinAge,
  searchMaxAge,
  searchMinDuration,
  searchMaxDuration,
  searchStatus,
  onSearchTitle,
  onSearchGenre,
  onSearchDate,
  onSearchEditor,
  onSeachMinPlayer,
  onSeachMaxPlayer,
  onSeachMinAge,
  onSeachMaxAge,
  onSeachMinDuration,
  onSeachMaxDuration,
  onSearchStatus,
  filteredCount,
  totalCount,
  show,
  isAdmin,
  onRandomGame,
  onClose,
  onResetFilter,
}) => {
  return (
    <div className="d-flex justify-content-around">
      <CancelOutlinedIcon onClick={onClose} className="icon-button" />
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <td
                colSpan="2"
                className={`text-center ${
                  filteredCount === 0 && "bg-danger text-white"
                }`}
              >
                <span
                  className={`badge ${
                    filteredCount === 0 ? "bg-danger" : "bg-primary"
                  }`}
                >
                  {filteredCount}
                </span>{" "}
                {filteredCount === 0 || filteredCount === 1 ? "jeu" : "jeux"}{" "}
                {show && <span>correspondant à la recherche</span>}
                sur{" "}
                <span
                  className={`badge ${filteredCount !== 0 && "bg-success"}`}
                >
                  {totalCount}{" "}
                </span>
                <br />
                <button className="btn btn-success" onClick={onRandomGame}>
                  Jeu aléatoire
                </button>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <label htmlFor="title">Titre</label>
                <input
                  type="text"
                  value={searchTitle}
                  className="form-control"
                  placeholder="recherche par titre"
                  onChange={onSearchTitle}
                />
              </td>
              <td>
                <label htmlFor="genre">Genre</label>
                <input
                  type="text"
                  value={searchGenre}
                  className="form-control"
                  placeholder="recherche par genre"
                  onChange={onSearchGenre}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="date">Date</label>
                <input
                  type="number"
                  value={searchDate}
                  className="form-control"
                  placeholder="recherche par date"
                  onChange={onSearchDate}
                />
              </td>
              <td>
                <label htmlFor="editor">Editeur</label>
                <input
                  type="text"
                  value={searchEditor}
                  className="form-control"
                  placeholder="recherche par editeur"
                  onChange={onSearchEditor}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="minPlayer">nb joueur min:</label>
                <input
                  type="number"
                  id="minPlayer"
                  value={searchMinPlayer}
                  className="form-control"
                  placeholder="nombre de joueur minimum"
                  onChange={onSeachMinPlayer}
                />
                <label htmlFor="minAge">Age minimum</label>
                <input
                  type="number"
                  id="minAge"
                  value={searchMinAge}
                  className="form-control"
                  placeholder="age minimum"
                  onChange={onSeachMinAge}
                />
              </td>
              <td>
                <label htmlFor="maxPlayer">nb joueur max:</label>
                <input
                  type="number"
                  id="maxPlayer"
                  value={searchMaxPlayer}
                  className="form-control"
                  placeholder="nombre de joueur maximum"
                  onChange={onSeachMaxPlayer}
                />

                <label htmlFor="maxAge">Age maximum</label>
                <input
                  type="number"
                  id="maxAge"
                  value={searchMaxAge}
                  className="form-control"
                  placeholder="age maximum"
                  onChange={onSeachMaxAge}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="minDuration">durée min : </label>
                <input
                  type="number"
                  id="minDuration"
                  value={searchMinDuration}
                  className="form-control"
                  placeholder="durée min"
                  onChange={onSeachMinDuration}
                />
              </td>
              <td>
                <label htmlFor="maxDuration">durée max : </label>
                <input
                  type="number"
                  id="maxDuration"
                  value={searchMaxDuration}
                  className="form-control"
                  placeholder="durée max"
                  onChange={onSeachMaxDuration}
                />
              </td>
            </tr>
            {isAdmin && (
              <tr>
                <td colSpan="2">
                  <label htmlFor="status">Status</label>
                  <select
                    value={searchStatus}
                    className="form-select"
                    onChange={onSearchStatus}
                  >
                    <option value="">Tous</option>
                    <option value="in pending">En attente</option>
                    <option value="accepted">Accepté</option>
                    <option value="rejected">Refusé</option>
                  </select>
                </td>
              </tr>
            )}
            <tr>
              <td className="text-center">
                <button className="btn btn-danger" onClick={onClose}>
                  annuler la recherche
                </button>
              </td>
              <td className="text-center">
                <button className="btn btn-warning" onClick={onResetFilter}>
                  reset Filter
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameSearchPanel;

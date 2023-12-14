import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

//design
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const Ludotheque = () => {
  const { user } = useContext(UserContext);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [minPlayer, setMinPlayer] = useState(0);
  const [maxPlayer, setMaxPlayer] = useState(0);
  const [minAge, setMinAge] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState("in pending"); // "in pending" | "accepted" | "rejected"
  const [listOfGames, setListOfGames] = useState([]);
  const [addNewGame, setAddNewGame] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTitle, setSearchTitle] = useState(
    localStorage.getItem("searchTitle") || ""
  );
  const [searchGenre, setSearchGenre] = useState(
    localStorage.getItem("searchGenre") || ""
  );
  const [searchMinPlayer, setSearchMinPlayer] = useState(
    localStorage.getItem("searchMinPlayer")
  );
  const [searchMaxPlayer, setSearchMaxPlayer] = useState(
    localStorage.getItem("searchMaxPlayer")
  );
  const [searchMinAge, setSearchMinAge] = useState(
    localStorage.getItem("searchMinAge")
  );
  const [searchDuration, setSearchDuration] = useState(
    localStorage.getItem("searchDuration")
  );

  const [searchStatus, setSearchStatus] = useState(""); // "idle" | "pending" | "resolved" | "rejected"
  //get the size of the window
  const [width, setWidth] = useState(window.innerWidth);
  const [show, setShow] = useState(true);

  const getListOfGames = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/games`
      );

      // Set the list of games with the updated data
      setListOfGames(response.data);
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la récupération des jeux");
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleGenreChange = (e) => {
    setGenre(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleMinPlayerChange = (e) => {
    setMinPlayer(e.target.value);
  };

  const handleMaxPlayerChange = (e) => {
    setMaxPlayer(e.target.value);
  };

  const handleMinAgeChange = (e) => {
    setMinAge(e.target.value);
  };

  const handleDurationChange = (e) => {
    setDuration(e.target.value);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  const handleUploadGame = () => {
    try {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(selectedFile);

      fileReader.onload = async () => {
        const base64Data = fileReader.result;

        const gameData = {
          title,
          genre,
          description,
          minPlayer,
          maxPlayer,
          minAge,
          duration,
          imageData: base64Data,
          addBy: user._id,
          status,
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/game`,
          gameData
        );
        toast.success("jeu ajouté avec succès");
        getListOfGames();
        setListOfGames((prevGames) => [...prevGames, response.data]);
        // post the game to the user
        const game = response.data.game;
        console.log(game);
        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/${user._id}/add-list-owned-game`,
          { listOwnedGames: game }
        );

        // userHasGame(game, user._id);
      };
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du jeu");
    }
  };

  const updateGameStatus = async (id) => {
    try {
      const gameStatus = {
        status,
      };
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/game/${id}`,
        gameStatus
      );
      toast.success("Status du jeu mis à jour avec succès");
      getListOfGames();
      resetForm();
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la mise à jour du status du jeu");
    }
  };

  const deleteGameById = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/game/${id}`);
      toast.success("jeu supprimé avec succès");
      setListOfGames(listOfGames.filter((game) => game._id !== id));
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/userHasGames/${id}`
      );
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la suppression du jeu");
    }
  };

  const resetFilter = () => {
    setSearchTitle("");
    setSearchGenre("");
    setSearchMinPlayer("");
    setSearchMaxPlayer("");
    setSearchMinAge("");
    setSearchDuration("");
    setSearchStatus("");
    // localStorage.setItem("searchTitle", "");
    // localStorage.setItem("searchGenre", "");
    // localStorage.setItem("searchMinPlayer", "");
    // localStorage.setItem("searchMaxPlayer", "");
    // localStorage.setItem("searchMinAge", "");
    // localStorage.setItem("searchDuration", "");
  };

  const cancelEditing = () => {
    setAddNewGame(false);
    resetForm();
  };

  const resetForm = () => {
    setAddNewGame(false);
    setTitle("");
    setGenre("");
    setDescription("");
    setMinPlayer("");
    setMaxPlayer("");
    setMinAge("");
    setDuration("");
    setSelectedFile(null);
    setStatus("in pending");
    resetFilter();
  };

  const handleSearchTitle = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchTitle(value);
    localStorage.setItem("searchTitle", value);
  };

  const handleSearchGenre = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchGenre(value);
    localStorage.setItem("searchGenre", value);
  };

  const handleSeachMinPlayer = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchMinPlayer(value);
    localStorage.setItem("searchMinPlayer", value);
  };

  const handleSeachMaxPlayer = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchMaxPlayer(value);
    localStorage.setItem("searchMaxPlayer", value);
  };

  const handleSeachMinAge = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchMinAge(value);
    localStorage.setItem("searchMinAge", value);
  };

  const handleSeachDuration = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchDuration(value);
    localStorage.setItem("searchDuration", value);
  };

  const handleSearchStatus = (e) => {
    e.preventDefault();
    const value = e.target.value;
    if (value === "Tous") {
      setSearchStatus("");
      return;
    }
    setSearchStatus(value);
  };

  const filteredGames = listOfGames.filter((game) => {
    const matchesSearchTitle =
      !searchTitle ||
      (game.title &&
        game.title.toLowerCase().includes(searchTitle.toLowerCase()));
    const matchesSearchGenre =
      !searchGenre ||
      (game.genre &&
        game.genre.toLowerCase().includes(searchGenre.toLowerCase()));
    const matchesSearchMinPlayer =
      !searchMinPlayer || game.minPlayer >= parseInt(searchMinPlayer, 10);
    const matchesSearchMaxPlayer =
      !searchMaxPlayer || game.maxPlayer <= parseInt(searchMaxPlayer, 10);
    const matchesSearchMinAge =
      !searchMinAge || game.minAge <= parseInt(searchMinAge, 10);
    const matchesSearchDuration =
      !searchDuration || game.duration <= parseInt(searchDuration, 10);
    const matchesSearchStatus =
      !searchStatus ||
      (game.status &&
        game.status.toLowerCase().includes(searchStatus.toLowerCase()));

    return (
      matchesSearchTitle &&
      matchesSearchGenre &&
      matchesSearchMinPlayer &&
      matchesSearchMaxPlayer &&
      matchesSearchMinAge &&
      matchesSearchDuration &&
      matchesSearchStatus
    );
  });

  // check if the size of the window is a mobile size
  const handleResize = () => {
    const newWidth = window.innerWidth;
    setWidth(newWidth);
    if (newWidth < 768) {
      setShow(false);
    } else {
      setShow(true);
    }
  };
  useEffect(() => {
    handleResize(); // Call it on initial render
    window.addEventListener("resize", handleResize); // Attach it to the resize event

    // Don't forget to remove the event listener on cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [width]);

  useEffect(() => {
    getListOfGames();
    if (!user) {
      return;
    }
    //eslint-disable-next-line
  }, [setListOfGames, user]);

  return (
    <div className="container " style={{ paddingBottom: "12rem" }}>
      <div className="row">
        <h1 className="mx-auto text-center">La Ludothéque</h1>
        <div>
          <div className="col-12 col-md-6 mx-auto">
            <div className="d-flex justify-content-around">
              {user &&
                (addNewGame ? (
                  <>
                    <CancelOutlinedIcon
                      onClick={() => cancelEditing()}
                      style={{ fontSize: "3rem", cursor: "pointer" }}
                    />
                    <form>
                      {selectedFile && (
                        <>
                          <div className="form-group">
                            <label htmlFor="title">Titre</label>
                            <input
                              type="text"
                              id="title"
                              value={title}
                              className="form-control"
                              placeholder="titre"
                              onChange={handleTitleChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="genre">Genre</label>
                            <input
                              type="text"
                              id="genre"
                              value={genre}
                              className="form-control"
                              placeholder="genre"
                              onChange={handleGenreChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="description">Résumé</label>
                            <textarea
                              type="text"
                              id="description"
                              value={description}
                              placeholder="résumé"
                              onChange={handleDescriptionChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="minPlayer">Nombre de joueurs</label>
                            <label htmlFor="minPlayer">min:</label>
                            <input
                              type="number"
                              id="minPlayer"
                              value={minPlayer}
                              className="form-control"
                              placeholder="nombre de joueur minimum"
                              onChange={handleMinPlayerChange}
                            />
                            <label htmlFor="maxPlayer">max:</label>
                            <input
                              type="number"
                              id="maxPlayer"
                              value={maxPlayer}
                              className="form-control"
                              placeholder="nombre de joueur maximum"
                              onChange={handleMaxPlayerChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="minAge">Age minimum</label>
                            <input
                              type="number"
                              id="minAge"
                              value={minAge}
                              className="form-control"
                              placeholder="age minimum"
                              onChange={handleMinAgeChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="duration">Durée</label>
                            <input
                              type="number"
                              id="duration"
                              value={duration}
                              className="form-control"
                              placeholder="durée"
                              onChange={handleDurationChange}
                            />
                          </div>
                        </>
                      )}
                      <div className="form-group">
                        <label htmlFor="file">Couverture</label>
                        <input
                          type="file"
                          id="file"
                          accept="image/*"
                          className="form-control"
                          placeholder="couverture"
                          onChange={handleFileInputChange}
                        />
                      </div>
                      <div className="d-flex justify-content-around">
                        {selectedFile && (
                          <button
                            type="submit"
                            className="btn btn-success"
                            onClick={handleUploadGame}
                          >
                            Ajouter
                          </button>
                        )}
                        <button
                          className="btn btn-warning"
                          onClick={() => cancelEditing()}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  showSearch === false && (
                    <AddCircleOutlineOutlinedIcon
                      onClick={() => {
                        setAddNewGame(true);
                        setShowSearch(false);
                      }}
                      style={{ fontSize: "3rem", cursor: "pointer" }}
                    />
                  )
                ))}

              {showSearch ? (
                <div className="d-flex justify-content-around">
                  <CancelOutlinedIcon
                    onClick={() => setShowSearch(!showSearch)}
                    style={{ fontSize: "3rem", cursor: "pointer" }}
                  />
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <td colSpan="2" className="text-center">
                            Recherche
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <input
                              type="text"
                              value={searchTitle}
                              placeholder="recherche par titre"
                              onChange={handleSearchTitle}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={searchGenre}
                              placeholder="recherche par genre"
                              onChange={handleSearchGenre}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <label htmlFor="minPlayer">min:</label>
                            <input
                              type="number"
                              id="minPlayer"
                              value={searchMinPlayer}
                              className="form-control"
                              placeholder="nombre de joueur minimum"
                              onChange={handleSeachMinPlayer}
                            />
                            <label htmlFor="maxPlayer">max:</label>
                            <input
                              type="number"
                              id="maxPlayer"
                              value={searchMaxPlayer}
                              className="form-control"
                              placeholder="nombre de joueur maximum"
                              onChange={handleSeachMaxPlayer}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              id="minAge"
                              value={searchMinAge}
                              className="form-control"
                              placeholder="age minimum"
                              onChange={handleSeachMinAge}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <label htmlFor="duration">durée max : </label>
                            <input
                              type="number"
                              id="duration"
                              value={searchDuration}
                              className="form-control"
                              placeholder="durée"
                              onChange={handleSeachDuration}
                            />
                          </td>
                          <td>
                            <select
                              value={searchStatus}
                              onChange={handleSearchStatus}
                            >
                              <option value="">Tous</option>
                              <option value="in pending">En attente</option>
                              <option value="accepted">Accepté</option>
                              <option value="rejected">Refusé</option>
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td className="text-center">
                            <button
                              className="btn btn-danger"
                              onClick={() => setShowSearch(!showSearch)}
                            >
                              annuler la recherche
                            </button>
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-warning"
                              onClick={resetFilter}
                            >
                              reset Filter
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                addNewGame === false && (
                  <SearchOutlinedIcon
                    onClick={() => {
                      setShowSearch(!showSearch);
                      cancelEditing();
                    }}
                    style={{ fontSize: "3rem", cursor: "pointer" }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        {/* Search input fields */}

        {!user ? (
          <table className="table table-striped table-bordered table-hover">
            <thead>
              <tr>
                <th scope="col">titre</th>
                <th scope="col">genre</th>
                {show === true && <th scope="col">résumé</th>}
                <th scope="col">nombre de joueurs</th>
                <th scope="col">age minimum</th>
                <th scope="col">durée</th>
                <th scope="col">couverture</th>
              </tr>
            </thead>
            <tbody>
              {!listOfGames || listOfGames.length === 0 ? (
                <tr>
                  {show === true ? (
                    <td colSpan="8">Aucun jeu</td>
                  ) : (
                    <td colSpan="7">Aucun jeu</td>
                  )}
                </tr>
              ) : (
                filteredGames.map((game) => (
                  <tr key={game._id}>
                    <th className="text-justify">{game.title}</th>
                    <td>{game.genre}</td>
                    {show === true && (
                      <td className="text-justify">{game.description}</td>
                    )}
                    {game.maxPlayer === null || game.maxPlayer === 0 ? (
                      game.minPlayer === 1 ? (
                        <td>solo</td>
                      ) : (
                        <td>{game.minPlayer} joueurs</td>
                      )
                    ) : game.minPlayer === game.maxPlayer ? (
                      <td>{game.minPlayer} joueurs</td>
                    ) : game.minPlayer < game.maxPlayer ? (
                      <td>
                        De {game.minPlayer} à {game.maxPlayer} joueurs
                      </td>
                    ) : (
                      <td>
                        De {game.maxPlayer} à {game.minPlayer} joueurs
                      </td>
                    )}
                    <td>{game.minAge} ans</td>
                    <td>{game.duration} min</td>
                    <td>
                      <Link to={`/game/${game._id}`}>
                        <img
                          src={game.imageData}
                          alt={game.title}
                          className="img-thumbnail"
                          style={{ maxWidth: "200px", maxHeight: "200px" }}
                        />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="table table-striped table-bordered table-hover">
            <thead>
              <tr>
                <th scope="col">titre</th>
                <th scope="col">genre</th>
                {show === true && (
                  <>
                    <th scope="col">résumé</th>
                  </>
                )}
                <th scope="col">nombre de joueurs</th>
                <th scope="col">age minimum</th>
                <th scope="col">durée</th>
                <th scope="col">couverture</th>
                <th scope="col">Status</th>
                {user && show === true && <th scope="col">action</th>}
              </tr>
            </thead>
            <tbody>
              {!listOfGames || listOfGames.length === 0 ? (
                <tr>
                  {show === true ? (
                    <td colSpan="9">Aucun jeu</td>
                  ) : (
                    <td colSpan="6">Aucun jeu</td>
                  )}
                </tr>
              ) : (
                filteredGames.map((game) => (
                  <tr key={game._id}>
                    <th className="text-justify">{game.title}</th>
                    <td>{game.genre}</td>
                    {show === true && (
                      <td className="text-justify">{game.description}</td>
                    )}
                    {game.maxPlayer === null ? (
                      game.minPlayer === 1 ? (
                        <td>solo</td>
                      ) : (
                        <td>{game.minPlayer} joueurs</td>
                      )
                    ) : game.minPlayer === game.maxPlayer ? (
                      <td>{game.minPlayer} joueurs</td>
                    ) : game.minPlayer < game.maxPlayer ? (
                      <td>
                        De {game.minPlayer} à {game.maxPlayer} joueurs
                      </td>
                    ) : (
                      <td>
                        De {game.maxPlayer} à {game.minPlayer} joueurs
                      </td>
                    )}
                    <td>{game.minAge} ans</td>
                    <td>{game.duration} min</td>
                    <td>
                      <Link to={`/game/${game._id}`}>
                        <img
                          src={game.imageData}
                          alt={game.title}
                          className="img-thumbnail"
                        />
                      </Link>
                    </td>
                    {show === true && (
                      <>
                        <td className="text-center">
                          {game.status === "in pending" ? (
                            <p className="list-inline bg-warning">
                              En attente de validation
                            </p>
                          ) : game.status === "accepted" ? (
                            <p className="list-inline text-success">
                              Jeu accepté
                            </p>
                          ) : (
                            <p className="list-inline bg-danger text-white">
                              Jeu refusé
                            </p>
                          )}
                          {user && (
                            <>
                              <select
                                value={status}
                                onChange={handleStatusChange}
                              >
                                <option value="in pending">En attente</option>
                                <option value="accepted">Accepté</option>
                                <option value="rejected">Refusé</option>
                              </select>

                              <button
                                type="button"
                                className="btn btn-success"
                                onClick={() => updateGameStatus(game._id)}
                              >
                                Mettre à jour
                              </button>
                            </>
                          )}
                        </td>
                        <td>
                          {user.role === "admin" && (
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => deleteGameById(game._id)}
                            >
                              supprimer
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Ludotheque;
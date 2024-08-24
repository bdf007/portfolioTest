import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import GamePopup from "../component/gamePopup";

//design
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

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
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
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
  const [searchMaxAge, setSearchMaxAge] = useState(
    localStorage.getItem("searchMaxAge")
  );
  const [searchMinDuration, setSearchMinDuration] = useState(
    localStorage.getItem("searchMinDuration")
  );
  const [searchMaxDuration, setSearchMaxDuration] = useState(
    localStorage.getItem("searchMaxDuration")
  );

  const [searchStatus, setSearchStatus] = useState("");
  //get the size of the window
  const [width, setWidth] = useState(window.innerWidth);
  const [show, setShow] = useState(true);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const getListOfGames = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/games/noimage`
      );
      // sort by title alphabetically
      response.data.sort((a, b) => {
        if (a.title.toLowerCase() < b.title.toLowerCase()) {
          return -1;
        }
        if (a.title.toLowerCase() > b.title.toLowerCase()) {
          return 1;
        }
        return 0;
      });
      // Set the list of games with the updated data
      setListOfGames(response.data);
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la récupération des jeux");
    }
  };
  const openGamePopup = async (gameId) => {
    try {
      gameId = gameId._id;
      console.log(gameId);
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/game/${gameId}`
      );
      setSelectedGame(res.data);
      console.log(res.data);
      setIsPopupOpen(true);
    } catch (error) {
      console.log(error);
    }
  };

  const closeGamePopup = () => {
    setSelectedGame(null);
    setIsPopupOpen(false);
  };
  const handleRandomGame = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/games/random`
      );

      setSelectedGame(response.data);
      openGamePopup(response.data);
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la récupération du jeu");
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

  const handleUploadGame = async (e) => {
    e.preventDefault();
    try {
      const fileReader = new FileReader();

      const base64Data = await new Promise((resolve, reject) => {
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(selectedFile);
      });

      const image = new Image();
      image.src = base64Data;

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      // Set the maximum width or height for the resized image
      const maxWidth = 800;
      const maxHeight = 600;

      let newWidth = image.width;
      let newHeight = image.height;

      // Resize the image while maintaining the aspect ratio
      if (image.width > maxWidth) {
        newWidth = maxWidth;
        newHeight = (image.height * maxWidth) / image.width;
      }

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = (image.width * maxHeight) / image.height;
      }

      // Create a canvas element to draw the resized image
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, newWidth, newHeight);

      // Convert the canvas content to base64 with WebP format
      const base64WebpData = canvas.toDataURL("image/webp");

      const gameData = {
        title,
        genre,
        description,
        minPlayer,
        maxPlayer,
        minAge,
        duration,
        imageData: base64WebpData,
        addBy: user._id,
        status,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/game`,
        gameData
      );

      toast.success("Jeu ajouté avec succès");
      getListOfGames();
      setListOfGames((prevGames) => [...prevGames, response.data]);
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
    setSearchMaxAge("");
    setSearchMinDuration("");
    setSearchMaxDuration("");
    setSearchStatus("");
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

  const handleSeachMaxAge = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchMaxAge(value);
    localStorage.setItem("searchMaxAge", value);
  };

  const handleSeachMinDuration = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchMinDuration(value);
    localStorage.setItem("searchMinDuration", value);
  };

  const handleSeachMaxDuration = (e) => {
    e.preventDefault();
    const value = e.target.value;
    setSearchMaxDuration(value);
    localStorage.setItem("searchMaxDuration", value);
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

  // Helper const to check if all words in the search term are present in the target string
  const containsAllWords = (target, searchTerm) => {
    const searchWords = searchTerm.split(" ");
    return searchWords.every((word) => target.includes(word));
  };

  const filteredGames = listOfGames.filter((game) => {
    const matchesSearchTitle =
      !searchTitle ||
      (game.title &&
        containsAllWords(game.title.toLowerCase(), searchTitle.toLowerCase()));

    const matchesSearchGenre =
      !searchGenre ||
      (game.genre &&
        containsAllWords(game.genre.toLowerCase(), searchGenre.toLowerCase()));
    const matchesSearchMinPlayer =
      !searchMinPlayer || game.minPlayer === parseInt(searchMinPlayer, 10);
    const matchesSearchMaxPlayer =
      !searchMaxPlayer || game.maxPlayer === parseInt(searchMaxPlayer, 10);
    const matchesSearchMinAge =
      !searchMinAge || game.minAge >= parseInt(searchMinAge, 10);
    const matchesSearchMaxAge =
      !searchMaxAge || game.minAge <= parseInt(searchMaxAge, 10);
    const matchesSearchMinDuration =
      !searchMinDuration || game.duration >= parseInt(searchMinDuration, 10);
    const matchesSearchMaxDuration =
      !searchMaxDuration || game.duration <= parseInt(searchMaxDuration, 10);
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
      matchesSearchMaxAge &&
      matchesSearchMinDuration &&
      matchesSearchMaxDuration &&
      matchesSearchStatus
    );
  });

  // const addByToAllGGames = () => {
  //   listOfGames.forEach((game) => {
  //     const gameData = {
  //       addBy: user._id,
  //     };
  //     axios.put(
  //       `${process.env.REACT_APP_API_URL}/api/game/${game._id}`,
  //       gameData
  //     );
  //   });

  //   toast.success("addBy ajouté avec succès");
  // };

  // Scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScroll = () => {
    const scrollY = window.scrollY;
    // You can adjust the threshold value based on when you want the button to appear
    setShowScrollButton(scrollY > 100);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
  // Callback function to update the game list
  const handleGameUpdate = () => {
    getListOfGames(); // Refresh the list of games
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
    resetFilter();
    if (!user || user.role !== "admin") {
      return;
    }
    //eslint-disable-next-line
  }, [setListOfGames, user]);

  return (
    <div className="container " style={{ paddingBottom: "12rem" }}>
      <div className="row">
        <h1 className="mx-auto text-center">Ma Ludothéque</h1>
        <div>
          <div className="col-12 col-md-6 mx-auto">
            <div className="d-flex justify-content-around">
              {user &&
                user.role === "admin" &&
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
                              placeholder="description"
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
                    onClick={() => {
                      setShowSearch(!showSearch);
                      resetFilter();
                    }}
                    style={{ fontSize: "3rem", cursor: "pointer" }}
                  />
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <td
                            colSpan="2"
                            className={`text-center ${
                              filteredGames.length === 0 &&
                              "bg-danger text-white"
                            }`}
                          >
                            <span
                              className={`badge ${
                                filteredGames.length === 0
                                  ? "bg-danger"
                                  : "bg-primary"
                              }`}
                            >
                              {filteredGames.length}
                            </span>{" "}
                            {filteredGames.length === 0 ||
                            filteredGames.length === 1
                              ? "jeu"
                              : "jeux"}{" "}
                            {show && <span>correspondant à la recherche</span>}
                            sur{" "}
                            <span
                              className={`badge ${
                                filteredGames.length !== 0 && "bg-success"
                              }`}
                            >
                              {listOfGames.length}{" "}
                            </span>
                            <br />
                            <button
                              className="btn btn-success"
                              onClick={handleRandomGame}
                            >
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
                              onChange={handleSearchTitle}
                            />
                          </td>
                          <td>
                            <label htmlFor="genre">Genre</label>
                            <input
                              type="text"
                              value={searchGenre}
                              className="form-control"
                              placeholder="recherche par genre"
                              onChange={handleSearchGenre}
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
                              onChange={handleSeachMinPlayer}
                            />
                            <label htmlFor="minAge">Age minimum</label>
                            <input
                              type="number"
                              id="minAge"
                              value={searchMinAge}
                              className="form-control"
                              placeholder="age minimum"
                              onChange={handleSeachMinAge}
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
                              onChange={handleSeachMaxPlayer}
                            />

                            <label htmlFor="maxAge">Age maximum</label>
                            <input
                              type="number"
                              id="maxAge"
                              value={searchMaxAge}
                              className="form-control"
                              placeholder="age maximum"
                              onChange={handleSeachMaxAge}
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
                              onChange={handleSeachMinDuration}
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
                              onChange={handleSeachMaxDuration}
                            />
                          </td>
                        </tr>
                        {user && user.role === "admin" && (
                          <tr>
                            <td colSpan="2">
                              <label htmlFor="status">Status</label>
                              <select
                                value={searchStatus}
                                className="form-select"
                                onChange={handleSearchStatus}
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
                            <button
                              className="btn btn-danger"
                              onClick={() => {
                                setShowSearch(!showSearch);
                                resetFilter();
                              }}
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

        {!user || user.role !== "admin" ? (
          <table className="table table-striped table-bordered table-hover align-middle text-center">
            <thead>
              <tr>
                <th scope="col">
                  <p className="text-bold">Titre</p>
                  {!show && <p className="fst-italic">Age minimum</p>}
                </th>
                {/* <th scope="col">couverture</th> */}
                <th scope="col">
                  <p>genre</p>
                  {!show && <p>durée minimum</p>}
                </th>
                {show === true && (
                  <>
                    <th scope="col">
                      <p>description</p>
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
              {!listOfGames || listOfGames.length === 0 ? (
                <tr>
                  {show === true ? (
                    <td colSpan="7">Aucun jeu</td>
                  ) : (
                    <td colSpan="3">Aucun jeu</td>
                  )}
                </tr>
              ) : (
                filteredGames.map((game) => (
                  <tr key={game._id}>
                    <th className="text-justify">
                      <span
                        onClick={() => openGamePopup(game)}
                        className="badge bg-success text-wrap"
                        style={{ cursor: "pointer" }}
                      >
                        <h6>{game.title}</h6>
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
                              <span className="badge bg-info">
                                {game.minAge}
                              </span>{" "}
                              ans
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
                          <p className="badge bg-primary">
                            {game.duration} min
                          </p>
                        </>
                      )}
                    </td>
                    {show === true && (
                      <>
                        <td className="text-justify">{game.description}</td>
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
                        <span className="badge bg-danger">
                          {game.minPlayer}
                        </span>{" "}
                        joueurs
                      </td>
                    ) : game.minPlayer < game.maxPlayer ? (
                      <td>
                        De{" "}
                        <span className="badge bg-danger">
                          {game.minPlayer}
                        </span>{" "}
                        à{" "}
                        <span className="badge bg-danger">
                          {game.maxPlayer}
                        </span>{" "}
                        joueurs
                      </td>
                    ) : (
                      <td>
                        De{" "}
                        <span className="badge bg-danger">
                          {game.maxPlayer}
                        </span>{" "}
                        à{" "}
                        <span className="badge bg-danger">
                          {game.minPlayer}
                        </span>{" "}
                        joueurs
                      </td>
                    )}
                    {show === true && (
                      <>
                        <td>
                          <span className="badge bg-primary">
                            {game.duration}
                          </span>
                          min
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="table table-striped table-bordered table-hover align-middle text-center">
            <thead>
              <tr key="0">
                <th scope="col">
                  <p>titre</p>
                  {!show && <p className="fst-italic">Age minimum</p>}
                </th>
                <th scope="col">
                  <p>genre</p>
                  {!show && <p>durée minimum</p>}
                </th>
                {/* <th scope="col">couverture</th> */}
                {show === true && (
                  <>
                    <th scope="col">
                      <p>description</p>
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
                    {user && user.role === "admin" && show === true && (
                      <th scope="col">
                        <p>action</p>
                      </th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {!listOfGames || listOfGames.length === 0 ? (
                <tr>
                  {show === true ? (
                    <td colSpan="8">Aucun jeu</td>
                  ) : (
                    <td colSpan="3">Aucun jeu</td>
                  )}
                </tr>
              ) : (
                filteredGames.map((game) => (
                  <tr key={game._id}>
                    <th className="text-justify">
                      <span
                        onClick={() => openGamePopup(game)}
                        className="badge bg-success text-wrap"
                        style={{ cursor: "pointer" }}
                      >
                        <h6>{game.title}</h6>
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
                              <span className="badge bg-info">
                                {game.minAge}
                              </span>{" "}
                              ans
                            </p>
                          ))}
                      </>
                    </th>
                    {/* <td>
                        <img
                          src={game.imageData}
                          alt={game.title}
                          className="img-thumbnail rounded"
                          style={{ maxWidth: "200px", maxHeight: "200px" }}
                        />
                    </td> */}
                    <td>
                      <p className="badge bg-warning text-dark text-wrap">
                        {game.genre}
                      </p>
                      {!show && (
                        <>
                          <br />
                          <p className="badge bg-primary">
                            {game.duration} min
                          </p>
                        </>
                      )}
                    </td>

                    {show === true && (
                      <>
                        <td className="text-justify">{game.description}</td>
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
                        <span className="badge bg-danger">
                          {game.minPlayer}
                        </span>{" "}
                        joueurs
                      </td>
                    ) : game.minPlayer < game.maxPlayer ? (
                      <td>
                        De{" "}
                        <span className="badge bg-danger">
                          {game.minPlayer}
                        </span>{" "}
                        à{" "}
                        <span className="badge bg-danger">
                          {game.maxPlayer}
                        </span>{" "}
                        joueurs
                      </td>
                    ) : (
                      <td>
                        De{" "}
                        <span className="badge bg-danger">
                          {game.maxPlayer}
                        </span>{" "}
                        à{" "}
                        <span className="badge bg-danger">
                          {game.minPlayer}
                        </span>{" "}
                        joueurs
                      </td>
                    )}
                    {show === true && (
                      <>
                        <td>
                          <span className="badge bg-primary">
                            {game.duration}
                            min
                          </span>{" "}
                        </td>

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
                          {user && game.status !== "accepted" && (
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
                          {user && user.role === "admin" && (
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
      {showScrollButton && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          <ArrowUpwardIcon />
        </button>
      )}
      {isPopupOpen && selectedGame && (
        <GamePopup
          game={selectedGame}
          onClose={closeGamePopup}
          user={user}
          onUpdate={handleGameUpdate}
        />
      )}
    </div>
  );
};

export default Ludotheque;

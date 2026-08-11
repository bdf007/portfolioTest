import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import GamePopup from "../component/ludotheque/gamePopup";
import GameForm from "../component/ludotheque/GameForm";
import GameSearchPanel from "../component/ludotheque/GameSearchPanel";
import GameTablePublic from "../component/ludotheque/GameTablePublic";
import GameTableAdmin from "../component/ludotheque/GameTableAdmin";
import "../App.css";

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
  const [date, setDate] = useState("");
  const [editor, setEditor] = useState("");
  const [minPlayer, setMinPlayer] = useState(0);
  const [maxPlayer, setMaxPlayer] = useState(0);
  const [minAge, setMinAge] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [listOfGames, setListOfGames] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [addNewGame, setAddNewGame] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTitle, setSearchTitle] = useState(
    localStorage.getItem("searchTitle") || "",
  );
  const [searchGenre, setSearchGenre] = useState(
    localStorage.getItem("searchGenre") || "",
  );
  const [searchDate, setSearchDate] = useState(
    localStorage.getItem("searchDate") || "",
  );
  const [searchEditor, setSearchEditor] = useState(
    localStorage.getItem("searchEditor") || "",
  );
  const [searchMinPlayer, setSearchMinPlayer] = useState(
    localStorage.getItem("searchMinPlayer"),
  );
  const [searchMaxPlayer, setSearchMaxPlayer] = useState(
    localStorage.getItem("searchMaxPlayer"),
  );
  const [searchMinAge, setSearchMinAge] = useState(
    localStorage.getItem("searchMinAge"),
  );
  const [searchMaxAge, setSearchMaxAge] = useState(
    localStorage.getItem("searchMaxAge"),
  );
  const [searchMinDuration, setSearchMinDuration] = useState(
    localStorage.getItem("searchMinDuration"),
  );
  const [searchMaxDuration, setSearchMaxDuration] = useState(
    localStorage.getItem("searchMaxDuration"),
  );

  const [searchStatus, setSearchStatus] = useState("");
  //get the size of the window
  const [width, setWidth] = useState(window.innerWidth);
  const [show, setShow] = useState(true);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const isAdmin = user && user.role === "admin";

  const getListOfGames = async () => {
    try {
      const endpoint = isAdmin ? "/api/games" : "/api/games/noimage";

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}${endpoint}`,
      );
      response.data.sort((a, b) => {
        if (a.title.toLowerCase() < b.title.toLowerCase()) {
          return -1;
        }
        if (a.title.toLowerCase() > b.title.toLowerCase()) {
          return 1;
        }
        return 0;
      });
      setListOfGames(response.data);
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la récupération des jeux");
    }
  };

  const openGamePopup = async (game) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/game/${game._id}`,
      );
      setSelectedGame(res.data);
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
        `${process.env.REACT_APP_API_URL}/api/games/random`,
      );

      setSelectedGame(response.data);
      openGamePopup(response.data);
    } catch (error) {
      console.log(error);
      toast.error("Erreur lors de la récupération du jeu");
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
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

      const maxWidth = 800;
      const maxHeight = 600;

      let newWidth = image.width;
      let newHeight = image.height;

      if (image.width > maxWidth) {
        newWidth = maxWidth;
        newHeight = (image.height * maxWidth) / image.width;
      }

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = (image.width * maxHeight) / image.height;
      }

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, newWidth, newHeight);

      const base64WebpData = canvas.toDataURL("image/webp");

      const gameData = {
        title,
        genre,
        description,
        date,
        editor,
        minPlayer,
        maxPlayer,
        minAge,
        duration,
        imageData: base64WebpData,
        addBy: user._id,
        status: "in pending",
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/game`,
        gameData,
      );

      toast.success("Jeu ajouté avec succès");
      getListOfGames();
      setListOfGames((prevGames) => [...prevGames, response.data]);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du jeu");
    }
  };

  // Reçoit maintenant le statut choisi directement (plus de state partagé)
  const updateGameStatus = async (id, newStatus) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/api/game/${id}`, {
        status: newStatus,
      });
      toast.success("Status du jeu mis à jour avec succès");
      getListOfGames();
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
    setSearchDate("");
    setSearchEditor("");
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
    setDate("");
    setEditor("");
    setMinPlayer("");
    setMaxPlayer("");
    setMinAge("");
    setDuration("");
    setSelectedFile(null);
    resetFilter();
  };

  const handleSearchTitle = (e) => {
    const value = e.target.value;
    setSearchTitle(value);
    localStorage.setItem("searchTitle", value);
  };

  const handleSearchGenre = (e) => {
    const value = e.target.value;
    setSearchGenre(value);
    localStorage.setItem("searchGenre", value);
  };

  const handleSearchDate = (e) => {
    const value = e.target.value;
    setSearchDate(value);
    localStorage.setItem("searchDate", value);
  };

  const handleSearchEditor = (e) => {
    const value = e.target.value;
    setSearchEditor(value);
    localStorage.setItem("searchEditor", value);
  };

  const handleSeachMinPlayer = (e) => {
    const value = e.target.value;
    setSearchMinPlayer(value);
    localStorage.setItem("searchMinPlayer", value);
  };

  const handleSeachMaxPlayer = (e) => {
    const value = e.target.value;
    setSearchMaxPlayer(value);
    localStorage.setItem("searchMaxPlayer", value);
  };

  const handleSeachMinAge = (e) => {
    const value = e.target.value;
    setSearchMinAge(value);
    localStorage.setItem("searchMinAge", value);
  };

  const handleSeachMaxAge = (e) => {
    const value = e.target.value;
    setSearchMaxAge(value);
    localStorage.setItem("searchMaxAge", value);
  };

  const handleSeachMinDuration = (e) => {
    const value = e.target.value;
    setSearchMinDuration(value);
    localStorage.setItem("searchMinDuration", value);
  };

  const handleSeachMaxDuration = (e) => {
    const value = e.target.value;
    setSearchMaxDuration(value);
    localStorage.setItem("searchMaxDuration", value);
  };

  const handleSearchStatus = (e) => {
    const value = e.target.value;
    if (value === "Tous") {
      setSearchStatus("");
      return;
    }
    setSearchStatus(value);
  };

  // Retire les accents avant de comparer, pour que "cesar" trouve "César"
  const normalizeText = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // Helper const to check if all words in the search term are present in the target string
  const containsAllWords = (target, searchTerm) => {
    const normalizedTarget = normalizeText(target);
    const searchWords = normalizeText(searchTerm).split(" ");
    return searchWords.every((word) => normalizedTarget.includes(word));
  };

  const filteredGames = listOfGames.filter((game) => {
    const matchesSearchTitle =
      !searchTitle || (game.title && containsAllWords(game.title, searchTitle));
    const matchesSearchdate =
      !searchDate || game.date === parseInt(searchDate, 10);
    const matchesSearchEditor =
      !searchEditor ||
      (game.editor && containsAllWords(game.editor, searchEditor));
    const matchesSearchGenre =
      !searchGenre || (game.genre && containsAllWords(game.genre, searchGenre));
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
      matchesSearchdate &&
      matchesSearchEditor &&
      matchesSearchMinPlayer &&
      matchesSearchMaxPlayer &&
      matchesSearchMinAge &&
      matchesSearchMaxAge &&
      matchesSearchMinDuration &&
      matchesSearchMaxDuration &&
      matchesSearchStatus
    );
  });

  // Scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScroll = () => {
    setShowScrollButton(window.scrollY > 100);
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
    setShow(newWidth >= 768);
  };

  // Callback function to update the game list
  const handleGameUpdate = () => {
    getListOfGames();
  };

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [width]);

  useEffect(() => {
    getListOfGames();
    resetFilter();
    //eslint-disable-next-line
  }, [user]);

  return (
    <div className="ludotheque-page">
      <div className="row">
        <h1 className="page-title">Ma Ludothèque</h1>
        <div>
          <div className="col-12 col-md-6 mx-auto">
            <div className="d-flex justify-content-around">
              {isAdmin &&
                (addNewGame ? (
                  <>
                    <CancelOutlinedIcon
                      onClick={() => cancelEditing()}
                      className="icon-button"
                    />
                    <GameForm
                      title={title}
                      genre={genre}
                      description={description}
                      date={date}
                      editor={editor}
                      minPlayer={minPlayer}
                      maxPlayer={maxPlayer}
                      minAge={minAge}
                      duration={duration}
                      selectedFile={selectedFile}
                      onTitleChange={(e) => setTitle(e.target.value)}
                      onGenreChange={(e) => setGenre(e.target.value)}
                      onDescriptionChange={(e) =>
                        setDescription(e.target.value)
                      }
                      onDateChange={(e) => setDate(e.target.value)}
                      onEditorChange={(e) => setEditor(e.target.value)}
                      onMinPlayerChange={(e) => setMinPlayer(e.target.value)}
                      onMaxPlayerChange={(e) => setMaxPlayer(e.target.value)}
                      onMinAgeChange={(e) => setMinAge(e.target.value)}
                      onDurationChange={(e) => setDuration(e.target.value)}
                      onFileSelected={handleFileSelected}
                      onSubmit={handleUploadGame}
                      onCancel={cancelEditing}
                    />
                  </>
                ) : (
                  showSearch === false && (
                    <AddCircleOutlineOutlinedIcon
                      onClick={() => {
                        setAddNewGame(true);
                        setShowSearch(false);
                      }}
                      className="icon-button"
                    />
                  )
                ))}

              {showSearch ? (
                <GameSearchPanel
                  searchTitle={searchTitle}
                  searchGenre={searchGenre}
                  searchDate={searchDate}
                  searchEditor={searchEditor}
                  searchMinPlayer={searchMinPlayer}
                  searchMaxPlayer={searchMaxPlayer}
                  searchMinAge={searchMinAge}
                  searchMaxAge={searchMaxAge}
                  searchMinDuration={searchMinDuration}
                  searchMaxDuration={searchMaxDuration}
                  searchStatus={searchStatus}
                  onSearchTitle={handleSearchTitle}
                  onSearchGenre={handleSearchGenre}
                  onSearchDate={handleSearchDate}
                  onSearchEditor={handleSearchEditor}
                  onSeachMinPlayer={handleSeachMinPlayer}
                  onSeachMaxPlayer={handleSeachMaxPlayer}
                  onSeachMinAge={handleSeachMinAge}
                  onSeachMaxAge={handleSeachMaxAge}
                  onSeachMinDuration={handleSeachMinDuration}
                  onSeachMaxDuration={handleSeachMaxDuration}
                  onSearchStatus={handleSearchStatus}
                  filteredCount={filteredGames.length}
                  totalCount={listOfGames.length}
                  show={show}
                  isAdmin={isAdmin}
                  onRandomGame={handleRandomGame}
                  onClose={() => {
                    setShowSearch(!showSearch);
                    resetFilter();
                  }}
                  onResetFilter={resetFilter}
                />
              ) : (
                addNewGame === false && (
                  <SearchOutlinedIcon
                    onClick={() => {
                      setShowSearch(!showSearch);
                      cancelEditing();
                    }}
                    className="icon-button"
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        {!isAdmin ? (
          <GameTablePublic
            games={filteredGames}
            totalCount={listOfGames.length}
            show={show}
            onOpenPopup={openGamePopup}
          />
        ) : (
          <GameTableAdmin
            games={filteredGames}
            totalCount={listOfGames.length}
            show={show}
            onOpenPopup={openGamePopup}
            onUpdateStatus={updateGameStatus}
            onDelete={deleteGameById}
          />
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

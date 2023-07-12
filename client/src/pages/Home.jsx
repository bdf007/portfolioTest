import React, { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";
import { Helmet } from "react-helmet";
import profil from "../assets/profil.png";

// design
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const Home = () => {
  const [showEmail, setShowEmail] = useState(false);
  const [showTel, setShowTel] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const { user } = useContext(UserContext);
  return (
    <>
      <div className="home">
        <Helmet>
          <meta
            name="description"
            content="Bienvenue sur mon portfolio - Christophe Midelet"
          />
          <meta
            name="keyword"
            content="portfolio, développeur web, fullstack, react, nodejs, express, mongodb, christophe midelet"
          />
        </Helmet>

        {user ? (
          <div>
            <h1>{user && <span>{user}'s</span>} Home</h1>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-danger">Bienvenue sur mon portfolio</h1>
            <img
              src={profil}
              alt="profil"
              className="rounded-circle border border-secondary "
            />
            <h2 className="text-primary">Christophe Midelet</h2>
            <h5 className="text-success">Développeur web fullstack</h5>
            {showEmail ? (
              <p>
                Email : christophemidelet650@gmail.com{" "}
                <IconButton
                  onClick={() => setShowEmail(!showEmail)}
                  aria-label="Toggle Email"
                >
                  {showEmail ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </p>
            ) : (
              <p>
                Email :{" "}
                <IconButton
                  onClick={() => setShowEmail(!showEmail)}
                  aria-label="Toggle Email"
                >
                  {showEmail ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </p>
            )}
            {showTel ? (
              <p>
                Téléphone : +33 6 81 29 75 80{" "}
                <IconButton
                  onClick={() => setShowTel(!showTel)}
                  aria-label="Toggle Telephone"
                >
                  {showTel ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </p>
            ) : (
              <p>
                Téléphone :{" "}
                <IconButton
                  onClick={() => setShowTel(!showTel)}
                  aria-label="Toggle Telephone"
                >
                  {showTel ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </p>
            )}
            {showAddress ? (
              <p>
                Adresse : 5 rue du pont de l'arche, Le Luat,
                Mittainvilliers-Vérigny 28190{" "}
                <IconButton
                  onClick={() => setShowAddress(!showAddress)}
                  aria-label="Toggle Address"
                >
                  {showAddress ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </p>
            ) : (
              <p>
                Adresse :{" "}
                <IconButton
                  onClick={() => setShowAddress(!showAddress)}
                  aria-label="Toggle Address"
                >
                  {showAddress ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Home;

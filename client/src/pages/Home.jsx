import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";
import { Helmet } from "react-helmet";
import profil from "../assets/profil.png";

const Home = () => {
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
            <h1>Welcome to my portfolio</h1>
            <img
              src={profil}
              alt="profil"
              className="img-thumbnail rounded-circle"
            />
            <h2>Christophe Midelet</h2>
            <h5>Développeur web fullstack</h5>
            <p>Email : christophemidelet650@gmail.com</p>
            <p>Téléphone : +33 81 29 75 80</p>
            <p>
              Adresse : 5 rue du pont de l'arche, Le luat, 28190
              Mittainvilliers-Vérigny, France
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;

import React, { useState } from "react";
import { Helmet } from "react-helmet";
import profil from "../assets/profil.png";
import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const CONTACTS = [
  { key: "email", label: "email", value: "christophemidelet650@gmail.com" },
  { key: "tel", label: "tel", value: "+33 6 81 29 75 80" },
  {
    key: "address",
    label: "adresse",
    value: "5 rue du pont de l'arche, Le Luat, Mittainvilliers-Vérigny 28190",
  },
];

/**
 * Une ligne de coordonnée masquée par défaut.
 * Remplace les 3 blocs ternaires dupliqués de l'ancienne version.
 */
const ContactLine = ({ label, value }) => {
  const [visible, setVisible] = useState(false);

  return (
    <p className="terminal-line">
      <span className="terminal-prompt">$</span>
      <span className="terminal-label">{label} :</span>
      <span className={`terminal-value ${visible ? "is-visible" : ""}`}>
        {visible ? value : "•".repeat(12)}
      </span>
      <IconButton
        size="small"
        onClick={() => setVisible((v) => !v)}
        aria-label={`Afficher ou masquer : ${label}`}
        className="terminal-toggle"
      >
        {visible ? (
          <VisibilityOffIcon fontSize="small" />
        ) : (
          <VisibilityIcon fontSize="small" />
        )}
      </IconButton>
    </p>
  );
};

const Home = () => {
  return (
    <div className="home-page">
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

      <section className="hero">
        <img
          src={profil}
          alt="Portrait de Christophe Midelet"
          className="hero-avatar"
        />
        <p className="hero-eyebrow">Bienvenue sur mon portfolio</p>
        <h1 className="hero-name">Christophe Midelet</h1>
        <h2 className="hero-role">Développeur web fullstack</h2>
      </section>

      <section className="terminal" aria-label="Coordonnées de contact">
        <div className="terminal-bar">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
          <span className="terminal-title">contact.sh</span>
        </div>
        <div className="terminal-body">
          <p className="terminal-line terminal-command">
            <span className="terminal-prompt">$</span> cat contact.txt
          </p>
          {CONTACTS.map((c) => (
            <ContactLine key={c.key} label={c.label} value={c.value} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;

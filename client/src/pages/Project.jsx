import React, { useState, useEffect } from "react";
import ProjectUploader from "../component/projectUploader";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const Project = () => {
  const [showScrollButton, setShowScrollButton] = useState(false);

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

  return (
    <div className="project-page">
      <h1 className="page-title">Mes projets</h1>
      <ProjectUploader />

      {showScrollButton && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          <ArrowUpwardIcon />
        </button>
      )}
    </div>
  );
};

export default Project;

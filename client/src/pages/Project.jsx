import React, { useState, useEffect } from "react";
import ProjectUploader from "../component/projectUploader";

//design
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const Project = () => {
  const [showScrollButton, setShowScrollButton] = useState(false);
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
  return (
    <div className="container " style={{ paddingBottom: "12rem" }}>
      <div>
        <h1 className="text-center text-danger">Mes Projets</h1>
        <ProjectUploader />
      </div>
      {showScrollButton && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          <ArrowUpwardIcon />
        </button>
      )}
    </div>
  );
};

export default Project;

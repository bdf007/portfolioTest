import React, { useState, useEffect } from "react";
import ExperienceUploader from "../component/experienceUploader";
import TechnologieUploader from "../component/tecchnologieUploader";

//design
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const Experience = () => {
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
        <ExperienceUploader />
      </div>
      <div>
        <TechnologieUploader />
      </div>
      {showScrollButton && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          <ArrowUpwardIcon />
        </button>
      )}
    </div>
  );
};

export default Experience;

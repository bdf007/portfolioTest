import React, { useState, useEffect } from "react";
import EducationUploader from "../component/educationUploader";
import CertificateUploader from "../component/certificateUploader";

// design
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const Education = () => {
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
    <div className="home accordion accordion-flush" id="accordionExample">
      <div className="accordion-item techno ">
        <h2 className="accordion-header" id="headingOne">
          <button
            className="accordion-button techno"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseOne"
            aria-expanded="false"
            aria-controls="collapseOne"
          >
            <h1 className="text-danger">Mes diplomes et certificats obtenus</h1>
          </button>
        </h2>
        <div
          id="collapseOne"
          className="accordion-collapse collapse show"
          aria-labelledby="headingOne"
          data-bs-parent="#accordionExample"
        >
          <div className="accordion-body">
            <EducationUploader />
          </div>
        </div>
      </div>
      <div className="accordion-item techno">
        <h2 className="accordion-header" id="headingTwo">
          <button
            className="accordion-button techno"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseTwo"
            aria-expanded="false"
            aria-controls="collapseTwo"
          >
            <h1 className="text-danger">Diplomes et Certificats</h1>
          </button>
        </h2>
        <div
          id="collapseTwo"
          className="accordion-collapse collapse show"
          aria-labelledby="headingTwo"
          data-bs-parent="#accordionExample"
        >
          <div className="accordion-body">
            <CertificateUploader />
          </div>
        </div>
      </div>
      {showScrollButton && (
        <button className="scroll-to-top" onClick={scrollToTop}>
          <ArrowUpwardIcon />
        </button>
      )}
    </div>
  );
};

export default Education;

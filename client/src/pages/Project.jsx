import React from "react";
import ProjectUploader from "../component/projectUploader";

//design
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

const Project = () => {
  // Scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="container " style={{ paddingBottom: "12rem" }}>
      <div>
        <h1 className="text-center text-danger">Mes Projets</h1>
        <ProjectUploader />
      </div>
      <button className="scroll-to-top" onClick={scrollToTop}>
        <ArrowUpwardIcon />
      </button>
    </div>
  );
};

export default Project;

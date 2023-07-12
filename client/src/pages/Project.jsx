import React from "react";
import ProjectUploader from "../component/projectUploader";

const Project = () => {
  return (
    <div className="home">
      <h1 className="text-center text-danger">Mes Projets</h1>
      <ProjectUploader />
    </div>
  );
};

export default Project;

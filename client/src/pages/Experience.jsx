import React from "react";
import ExperienceUploader from "../component/experienceUploader";
import TechnologieUploader from "../component/tecchnologieUploader";

const Experience = () => {
  return (
    <div className="row d-flex justify-content-center">
      <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
        <ExperienceUploader />
      </div>
      <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
        <TechnologieUploader />
      </div>
    </div>
  );
};

export default Experience;

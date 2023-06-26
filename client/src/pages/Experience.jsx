import React from "react";
import ExperienceUploader from "../component/experienceUploader";
import TechnologieUploader from "../component/tecchnologieUploader";

const Experience = () => {
  return (
    <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
      <ExperienceUploader />
      <TechnologieUploader />
    </div>
  );
};

export default Experience;

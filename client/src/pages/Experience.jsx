import React from "react";
import ExperienceUploader from "../component/experienceUploader";
import TechnologieUploader from "../component/tecchnologieUploader";

const Experience = () => {
  return (
    <div className="home">
      <div>
        <ExperienceUploader />
      </div>
      <div>
        <TechnologieUploader />
      </div>
    </div>
  );
};

export default Experience;

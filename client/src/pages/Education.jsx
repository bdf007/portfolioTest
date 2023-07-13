import React from "react";
import EducationUploader from "../component/educationUploader";
import CertificateUploader from "../component/certificateUploader";

const Education = () => {
  return (
    <div className="home accordion accordion-flush" id="accordionExample">
      <div className="accordion-item techno ">
        <h2 class="accordion-header" id="headingOne">
          <button
            class="accordion-button techno"
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
          class="accordion-collapse collapse show"
          aria-labelledby="headingOne"
          data-bs-parent="#accordionExample"
        >
          <div class="accordion-body">
            <EducationUploader />
          </div>
        </div>
      </div>
      <div className="accordion-item techno">
        <h2 class="accordion-header" id="headingTwo">
          <button
            class="accordion-button techno"
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
          class="accordion-collapse collapse show"
          aria-labelledby="headingTwo"
          data-bs-parent="#accordionExample"
        >
          <div class="accordion-body">
            <CertificateUploader />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Education;

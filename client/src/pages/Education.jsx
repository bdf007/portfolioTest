import React from "react";
import EducationUploader from "../component/educationUploader";
import CertificateUploader from "../component/certificateUploader";

const Education = () => {
  return (
    <div className="row d-flex justify-content-center border border-secondary">
      <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
        <EducationUploader />
      </div>
      <div className="container mt-0 mb-0 me-0 ms-0 col-10 col-sm-8 col-md-6 col-lg-5">
        <CertificateUploader />
      </div>
    </div>
  );
};

export default Education;

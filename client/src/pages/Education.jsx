import React from "react";
import EducationUploader from "../component/educationUploader";
import CertificateUploader from "../component/certificateUploader";

const Education = () => {
  return (
    <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
      <EducationUploader />
      <CertificateUploader />
    </div>
  );
};

export default Education;

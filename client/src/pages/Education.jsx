import React from "react";
import EducationUploader from "../component/educationUploader";
import CertificateUploader from "../component/certificateUploader";

const Education = () => {
  return (
    <div>
      <div>
        <EducationUploader />
      </div>
      <div>
        <CertificateUploader />
      </div>
    </div>
  );
};

export default Education;

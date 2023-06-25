import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";
import ProjectUploader from "../component/projectUploader";
import AboutUploader from "../component/aboutUploader";
import EducationUploader from "../component/educationUploader";
import ExperienceUploader from "../component/experienceUploader";
import TechnologieUploader from "../component/tecchnologieUploader";
import CertificateUploader from "../component/certificateUploader";

const Admin = () => {
  const { user } = useContext(UserContext);
  return !user ? (
    <div className="container text-center" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>Not autorized</h1>
      </div>
    </div>
  ) : (
    <div className="container text-center" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>
          {" "}
          <span className="text-success">{user}'s</span> Admin
        </h1>
      </div>
      <h1>Autheniticate with MERN</h1>
      <h2>Project</h2>
      <ProjectUploader />
      <h2>About</h2>
      <AboutUploader />
      <h2>Education</h2>
      <EducationUploader />
      <h2>Experience</h2>
      <ExperienceUploader />
      <h2>Technologie</h2>
      <TechnologieUploader />
      <h2>Certificates</h2>
      <CertificateUploader />
    </div>
  );
};

export default Admin;

import React, { useState, useEffect } from "react";
import axios from "axios";

const ProjectUploader = () => {
  const [listOfProjects, setListOfProjects] = useState([]);

  // get all the projects from the server
  useEffect(() => {
    axios.get("http://localhost:8000/projectWithImage").then((response) => {
      setListOfProjects(response.data);

      // Fetch corresponding image for each project
      response.data.forEach((project) => {
        if (project.imageID) {
          axios
            .get(`http://localhost:8000/image/getImage/${project.imageID}`)
            .then((res) => {
              const updatedProjects = [...listOfProjects];
              console.log(updatedProjects);
              const projectIndex = updatedProjects.findIndex(
                (p) => p._id === project._id
              );
              updatedProjects[projectIndex].image = res.data;

              setListOfProjects(updatedProjects);
              console.log(updatedProjects);
            })
            .catch((err) => console.log(err));
        }
      });
    });
  }, [listOfProjects]);

  return (
    <div>
      <h1>Project Uploader</h1>
      {listOfProjects.map((project) => (
        <div key={project._id}>
          <h2>{project.title}</h2>
          <p>{project.description}</p>
          {project.image && (
            <img
              src={`${project.image.url}?${Date.now()}`}
              alt={project.image.description}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProjectUploader;

import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import WIP from "../assets/WIP.png";
import "../App.css";

const ProjectUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [textProject, setTextProject] = useState("");
  const [linkToProject, setLinkToProject] = useState("");
  const [description, setDescription] = useState("");
  const [listOfProjects, setListOfProjects] = useState([]);
  const { user } = useContext(UserContext);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/project/projectWithImage`
      );
      setListOfProjects(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);
  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleTextProjectChange = (event) => {
    setTextProject(event.target.value);
  };

  const handleLinkToProjectChange = (event) => {
    setLinkToProject(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleUpload = async () => {
    try {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(selectedFile);

      fileReader.onloadend = async () => {
        const base64data = fileReader.result;

        const projectData = {
          title,
          textProject,
          linkToProject,
          description,
          imageData: base64data,
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/project/upload`,
          projectData
        );

        toast.success("Project uploaded successfully");
        setListOfProjects((prevProjects) => [
          ...prevProjects,
          response.data.project,
        ]);
        resetForm();
      };
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteProject = async (id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/project/deleteProject/${id}`
      );
      toast.success("Project deleted successfully");
      setListOfProjects((prevProjects) =>
        prevProjects.filter((project) => project._id !== id)
      );
    } catch (error) {
      console.log(error);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTextProject("");
    setLinkToProject("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="home">
      {user && (
        <>
          <h3>Project Uploader</h3>
          <div>
            <input
              type="file"
              id="file"
              accept="image/*"
              onChange={handleFileInputChange}
            />
            {selectedFile && (
              <div>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: "200px" }}
                />
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Title"
                />
                <textarea
                  value={textProject}
                  onChange={handleTextProjectChange}
                  placeholder="Text Project"
                />
                <input
                  type="text"
                  value={linkToProject}
                  onChange={handleLinkToProjectChange}
                  placeholder="Link Project"
                />
                <input
                  type="text"
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Description"
                />
                <button onClick={handleUpload}>Upload</button>
              </div>
            )}
          </div>
        </>
      )}
      <div>
        <div className="row row-cols-1 row-cols-md-4 g-2 home">
          {listOfProjects.length === 0 && (
            <img
              src={WIP}
              alt="WIP"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          )}
          {listOfProjects.map((project) => {
            return (
              <div key={project._id}>
                <div className="col">
                  <div className="card">
                    {project.linkToProject ? (
                      <a
                        href={project.linkToProject}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className="card-img-top"
                          src={project.imageData}
                          alt={project.description || ""}
                        />
                      </a>
                    ) : (
                      <img
                        className="card-img-top"
                        src={project.imageData}
                        alt={project.description || ""}
                      />
                    )}
                  </div>
                  <div className="card-body">
                    <h5 className="card-title text-center">
                      {project.title || ""}
                    </h5>
                    <pre>
                      <p className="card-text description text-start">
                        {project.textProject || ""}
                      </p>
                    </pre>
                    {user && (
                      <div className="card-footer d-grid gap-2 col-6 mx-auto">
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            deleteProject(project._id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectUploader;

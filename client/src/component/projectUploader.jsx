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
  const [editingProject, setEditingProject] = useState(null);

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

        if (editingProject) {
          // Update existing project
          const updatedProjectData = {
            title,
            textProject,
            linkToProject,
            description,
            imageData: selectedFile ? base64data : editingProject.imageData,
          };

          await axios.put(
            `${process.env.REACT_APP_API_URL}/api/project/projectWithImage/update/${editingProject._id}`,
            updatedProjectData
          );

          toast.success("Project updated successfully");
          setListOfProjects((prevProjects) => {
            const updatedProjects = prevProjects.map((project) => {
              if (project._id === editingProject._id) {
                return {
                  ...project,
                  title,
                  textProject,
                  linkToProject,
                  description,
                  imageData: selectedFile
                    ? base64data
                    : editingProject.imageData,
                };
              }
              return project;
            });
            return updatedProjects;
          });

          setEditingProject(null);
        } else {
          // Create new project
          const newProjectData = {
            title,
            textProject,
            linkToProject,
            description,
            imageData: base64data,
          };

          const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/project/upload`,
            newProjectData
          );

          toast.success("Project uploaded successfully");
          setListOfProjects((prevProjects) => [
            ...prevProjects,
            response.data.project,
          ]);
        }

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

  const editProject = (project) => {
    setTitle(project.title);
    setTextProject(project.textProject);
    setLinkToProject(project.linkToProject);
    setDescription(project.description);
    setEditingProject(project);
    setPreviewUrl(project.imageData);
  };

  const resetForm = () => {
    setTitle("");
    setTextProject("");
    setLinkToProject("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingProject(null);
    // clear file input
    document.getElementById("file").value = "";
    document.getElementById("title").value = "";
    document.getElementById("textProject").value = "";
    document.getElementById("linkToProject").value = "";
    document.getElementById("description").value = "";
  };

  return (
    <div className="home">
      {user && (
        <>
          <h3>Project Uploader</h3>
          <form>
            <div className="form-group">
              <input
                type="file"
                id="file"
                accept="image/*"
                onChange={handleFileInputChange}
              />
            </div>
            {selectedFile && (
              <div className="form-group">
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: "200px" }}
                />
              </div>
            )}
            <div className="form-group">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Title"
              />
            </div>
            <div className="form-group">
              <textarea
                value={textProject}
                onChange={handleTextProjectChange}
                placeholder="Text Project"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={linkToProject}
                onChange={handleLinkToProjectChange}
                placeholder="Link Project"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Description"
              />
            </div>
            <button onClick={handleUpload}>
              {editingProject ? "Update" : "Upload"}
            </button>
          </form>
        </>
      )}
      <div>
        <div className="row row-cols-1 row-cols-md-2 g-2 home">
          {listOfProjects.length === 0 && (
            <img
              src={WIP}
              alt="WIP"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          )}
          <div className="container">
            <div className="row justify-content-center">
              {listOfProjects.map((project) => {
                return (
                  <div className="col-md-auto" key={project._id}>
                    <div className="card">
                      {project.linkToProject ? (
                        <a
                          href={project.linkToProject}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            className="card-img-top"
                            src={
                              editingProject &&
                              editingProject._id === project._id
                                ? previewUrl || project.imageData
                                : project.imageData
                            }
                            alt={project.description || ""}
                          />
                        </a>
                      ) : (
                        <img
                          className="card-img-top"
                          src={
                            editingProject && editingProject._id === project._id
                              ? previewUrl || project.imageData
                              : project.imageData
                          }
                          alt={project.description || ""}
                        />
                      )}
                    </div>
                    <div className="card-body">
                      <h2 className="card-title text-center text-primary">
                        {project.title || ""}
                      </h2>
                      <pre>
                        <p className="card-text description text-center fs-6">
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
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              editProject(project);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectUploader;

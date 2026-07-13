import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import "../App.css";

const ProjectUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [textProject, setTextProject] = useState("");
  const [linkToProject, setLinkToProject] = useState("");
  const [description, setDescription] = useState("");
  const [orderList, setOrderList] = useState(0);
  const [listOfProjects, setListOfProjects] = useState([]);
  const { user } = useContext(UserContext);
  const [editingProject, setEditingProject] = useState(null);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/project/projectWithImage`,
      );
      const sortedData = response.data.sort(
        (a, b) => a.orderList - b.orderList,
      );
      setListOfProjects(sortedData);
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

  const handleTitleChange = (event) => setTitle(event.target.value);
  const handleTextProjectChange = (event) => setTextProject(event.target.value);
  const handleLinkToProjectChange = (event) =>
    setLinkToProject(event.target.value);
  const handleDescriptionChange = (event) => setDescription(event.target.value);
  const handleOrderChange = (event) => setOrderList(event.target.value);

  const handleUpload = async () => {
    try {
      const fileReader = new FileReader();
      let base64data = null;

      if (selectedFile) {
        base64data = await new Promise((resolve, reject) => {
          fileReader.onloadend = () => resolve(fileReader.result);
          fileReader.onerror = reject;
          fileReader.readAsDataURL(selectedFile);
        });

        const image = new Image();
        image.src = base64data;

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);

        base64data = canvas.toDataURL("image/webp");
      }

      if (editingProject) {
        const updatedProjectData = {
          title,
          textProject,
          linkToProject,
          description,
          orderList,
          imageData: base64data || null,
        };

        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/project/projectWithImage/update/${editingProject._id}`,
          updatedProjectData,
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
                orderList,
                imageData: base64data || null,
              };
            }
            return project;
          });
          return updatedProjects;
        });

        setEditingProject(null);
      } else {
        const newProjectData = {
          title,
          textProject,
          linkToProject,
          description,
          orderList,
          imageData: base64data || null,
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/project/upload`,
          newProjectData,
        );

        toast.success("Project uploaded successfully");
        setListOfProjects((prevProjects) => [
          ...prevProjects,
          response.data.project,
        ]);
      }

      resetForm();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteProject = async (id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/project/deleteProject/${id}`,
      );
      toast.success("Project deleted successfully");
      setListOfProjects((prevProjects) =>
        prevProjects.filter((project) => project._id !== id),
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
    setOrderList(project.orderList);
    setEditingProject(project);
    setPreviewUrl(project.imageData);
    const fileInput = document.getElementById("file");
    if (fileInput) {
      fileInput.value = "";
      fileInput.click();
    }
  };

  const resetForm = () => {
    setTitle("");
    setTextProject("");
    setLinkToProject("");
    setDescription("");
    setOrderList(0);
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingProject(null);
    document.getElementById("file").value = "";
    document.getElementById("title").value = "";
    document.getElementById("textProject").value = "";
    document.getElementById("linkToProject").value = "";
    document.getElementById("description").value = "";
    document.getElementById("orderList").value = "";
  };

  return (
    <div className="project-uploader">
      {user && user.role === "admin" && (
        <div className="admin-panel">
          <h3 className="admin-panel-title">Project Uploader</h3>
          <form>
            <input
              type="file"
              id="file"
              accept="image/*"
              className="field-file"
              onChange={handleFileInputChange}
            />
            {editingProject
              ? previewUrl && (
                  <div className="form-group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="field-preview"
                    />
                  </div>
                )
              : selectedFile && (
                  <div className="form-group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="field-preview"
                    />
                  </div>
                )}
            <div className="form-group">
              <input
                type="text"
                id="title"
                value={title}
                className="field-input"
                onChange={handleTitleChange}
                placeholder="Title"
              />
            </div>
            <div className="form-group">
              <textarea
                id="textProject"
                value={textProject}
                className="field-textarea"
                onChange={handleTextProjectChange}
                placeholder="Text Project"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="linkToProject"
                value={linkToProject}
                className="field-input"
                onChange={handleLinkToProjectChange}
                placeholder="Link Project"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="description"
                value={description}
                className="field-input"
                onChange={handleDescriptionChange}
                placeholder="Description"
              />
            </div>
            <div className="form-group">
              <input
                type="number"
                id="orderList"
                value={orderList}
                className="field-input"
                onChange={handleOrderChange}
                placeholder="Order"
              />
            </div>
            <button className="field-submit" onClick={handleUpload}>
              {editingProject ? "Update" : "Upload"}
            </button>
          </form>
        </div>
      )}

      <div className="terminal project-terminal">
        <div className="terminal-bar">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
          <span className="terminal-title">projects.log</span>
        </div>
        <div className="terminal-body">
          {listOfProjects.length === 0 && (
            <div className="entry-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}

          {listOfProjects.map((project) => {
            const imgSrc =
              editingProject && editingProject._id === project._id
                ? previewUrl || project.imageData
                : project.imageData;

            return (
              <div className="entry" key={project._id}>
                {imgSrc && (
                  <img
                    className="entry-image"
                    src={imgSrc}
                    alt={project.description || ""}
                  />
                )}
                <h3 className="entry-title">
                  #{" "}
                  {project.linkToProject ? (
                    <a
                      className="entry-link"
                      href={project.linkToProject}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {project.title}
                    </a>
                  ) : (
                    project.title
                  )}
                </h3>
                <p className="entry-description">{project.textProject || ""}</p>
                {user && user.role === "admin" && (
                  <div className="entry-actions">
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteProject(project._id)}
                    >
                      Delete
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => editProject(project)}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProjectUploader;

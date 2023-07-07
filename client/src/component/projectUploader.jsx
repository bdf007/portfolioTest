import React, { useEffect, useState, useContext } from "react";
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
  const [listOfprojects, setListOfprojects] = useState([]);
  const { user } = useContext(UserContext);

  // get all the projects from the server
  useEffect(() => {
    try {
      axios
        .get(`${process.env.REACT_APP_API_URL}/api/project/projectWithImage`)
        .then((response) => {
          setListOfprojects(response.data);
        });
    } catch (error) {
      console.log(error);
    }
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
      const formData = new FormData();
      formData.append("title", title);
      formData.append("textProject", textProject);
      formData.append("linkToProject", linkToProject);
      formData.append("file", selectedFile);
      formData.append("description", description);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/project/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Do something with the response, e.g., display success message or trigger further actions
      toast.success("Project uploaded successfully");
      setListOfprojects([
        ...listOfprojects,
        {
          _id: response.data.file._id,
          title: title,
          textProject: textProject,
          linkToProject: linkToProject,
          description: description,
          url: response.data.file.url,
        },
      ]);
      // reset the value
      setTitle("");
      setTextProject("");
      setLinkToProject("");
      setDescription("");
      setSelectedFile(null);
      setPreviewUrl(null);
      // clear the input field
      document.getElementById("title").value = "";
      document.getElementById("textProject").value = "";
      document.getElementById("linkToProject").value = "";
      document.getElementById("description").value = "";
      document.getElementById("file").value = "";
    } catch (error) {
      // Handle error, e.g., display error message to the user
      toast.error(error.response.data.msg);
    }
  };

  const deleteProject = (id) => {
    axios
      .delete(
        `${process.env.REACT_APP_API_URL}/api/project/deleteProject/${id}`
      )
      .then((response) => {
        toast.success("Project deleted successfully");
        console.log("project deleted successfully");
        setListOfprojects(
          listOfprojects.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div className="home">
      {user && (
        <>
          <h1>project Uploader</h1>
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
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Title"
                />
                <textarea
                  type="text"
                  id="textProject"
                  value={textProject}
                  onChange={handleTextProjectChange}
                  placeholder="Text Project"
                />

                <input
                  type="text"
                  id="linkToProject"
                  value={linkToProject}
                  onChange={handleLinkToProjectChange}
                  placeholder="Link Project"
                />
                <input
                  type="text"
                  id="description"
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
          {listOfprojects.length === 0 && (
            <img
              src={WIP}
              alt="WIP"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          )}
          {listOfprojects.map((project) => {
            return (
              <div key={project._id}>
                <div className="col">
                  <div className="card ">
                    {project.linkToProject ? (
                      <a
                        href={project.linkToProject}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className="card-img-top "
                          src={`${project.url}?${Date.now()}`}
                          alt={project.description || ""}
                        />
                      </a>
                    ) : (
                      <img
                        className="card-img-top"
                        src={`${project.url}?${Date.now()}`}
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

import React, { useEffect, useState } from "react";
import axios from "axios";

const ProjectUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [textProject, setTextProject] = useState("");
  const [linkProject, setLinkProject] = useState("");
  const [description, setDescription] = useState("");
  const [listOfprojects, setListOfprojects] = useState([]);

  // get all the projects from the server
  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/project/projectWithImage`)
      .then((response) => {
        setListOfprojects(response.data);
      });
  }, [listOfprojects]);

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

  const handleLinkProjectChange = (event) => {
    setLinkProject(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("textProject", textProject);
      formData.append("linkProject", linkProject);
      formData.append("file", selectedFile);
      formData.append("description", description);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/project/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Do something with the response, e.g., display success message or trigger further actions
      alert("Project uploaded successfully");
      setListOfprojects([
        ...listOfprojects,
        {
          _id: response.data.file._id,
          title: title,
          textProject: textProject,
          linkProject: linkProject,
          description: description,
          url: response.data.file.url,
        },
      ]);
      // reset the value
      setTitle("");
      setTextProject("");
      setLinkProject("");
      setDescription("");
      setSelectedFile(null);
      setPreviewUrl(null);
      // clear the input field
      document.getElementById("title").value = "";
      document.getElementById("textProject").value = "";
      document.getElementById("linkProject").value = "";
      document.getElementById("description").value = "";
      document.getElementById("file").value = "";
    } catch (error) {
      // Handle error, e.g., display error message to the user
      console.log(error);
    }
  };

  const deleteProject = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/project/deleteProject/${id}`)
      .then((response) => {
        alert("Project deleted successfully");
        console.log("project deleted successfully");
        setListOfprojects(
          listOfprojects.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      <h1>project Uploader</h1>
      <div className="imagesDisplay">
        <div className="row">
          {listOfprojects.map((project) => {
            return (
              <div className="col-sm-2 w-auto" key={project._id}>
                <div className="card">
                  <div className="card-body">
                    <img
                      className="card-img-top"
                      src={`${project.url}?${Date.now()}`}
                      alt={project.description || ""}
                      style={{ maxWidth: "100%", maxHeight: "200px" }}
                    />
                    <h5 className="card-title">{project.title || ""}</h5>
                    <p className="card-text">{project.textProject || ""}</p>
                    <a
                      href={project.linkProject || ""}
                      className="btn btn-primary"
                    >
                      {" "}
                      Link to the project
                    </a>

                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        deleteProject(project._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
            >
              {" "}
            </textarea>
            <input
              type="text"
              id="linkProject"
              value={linkProject}
              onChange={handleLinkProjectChange}
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
    </div>
  );
};

export default ProjectUploader;

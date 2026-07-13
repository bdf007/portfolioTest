import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import "../App.css";

const ExperienceUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linktoProject, setLinktoProject] = useState("");
  const [listOfExperience, setListOfExperience] = useState([]);
  const [editingExperience, setEditingExperience] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/experience`).then((res) => {
      setListOfExperience(res.data);
    });
  }, []);

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleDescriptionChange = (e) => setDescription(e.target.value);
  const handleLinkToPorjectChange = (e) => setLinktoProject(e.target.value);

  const handleUpload = () => {
    try {
      if (isEditing && editingExperience) {
        axios
          .put(
            `${process.env.REACT_APP_API_URL}/api/experience/update/${editingExperience._id}`,
            {
              title: title,
              description: description,
              linktoProject: linktoProject,
            },
          )
          .then((response) => {
            toast.success("Experience updated");
            setListOfExperience((prevList) => {
              const updatedList = prevList.map((experience) => {
                if (experience._id === response.data._id) {
                  return {
                    _id: response.data._id,
                    title: title,
                    description: description,
                    linktoProject: linktoProject,
                  };
                }
                return experience;
              });
              return updatedList;
            });
            setIsEditing(false);
            setEditingExperience(null);
          });
      } else {
        axios
          .post(`${process.env.REACT_APP_API_URL}/api/experience`, {
            title: title,
            description: description,
            linktoProject: linktoProject,
          })
          .then((response) => {
            toast.success("Experience uploaded");
            setListOfExperience([
              ...listOfExperience,
              {
                _id: response.data._id,
                title: title,
                description: description,
                linktoProject: linktoProject,
              },
            ]);
          });
      }

      setTitle("");
      setDescription("");
      setLinktoProject("");
      document.getElementById("title").value = "";
      document.getElementById("description").value = "";
      document.getElementById("linktoProject").value = "";
    } catch (error) {
      toast.error(error.response.data.msg);
    }
  };

  const deleteExperience = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/experience/${id}`)
      .then(() => {
        toast.success("Experience deleted");
        setListOfExperience(listOfExperience.filter((val) => val._id !== id));
      });
  };

  const editExperience = (experience) => {
    setIsEditing(true);
    setEditingExperience(experience);
    setTitle(experience.title);
    setDescription(experience.description);
    setLinktoProject(experience.linktoProject);
  };

  return (
    <div className="uploader">
      <h1 className="page-title">Mon expérience</h1>

      {user && user.role === "admin" && (
        <div className="admin-panel">
          <h3 className="admin-panel-title">Experience Uploader</h3>
          <form>
            <div className="form-group">
              <input
                value={title}
                id="title"
                className="field-input"
                placeholder="Title"
                onChange={handleTitleChange}
              />
            </div>
            <div className="form-group">
              <textarea
                value={description}
                id="description"
                className="field-textarea"
                placeholder="Description"
                onChange={handleDescriptionChange}
              />
            </div>
            <div className="form-group">
              <input
                value={linktoProject}
                id="linktoProject"
                className="field-input"
                placeholder="Link to Project"
                onChange={handleLinkToPorjectChange}
              />
            </div>
            <button className="field-submit" onClick={handleUpload}>
              {isEditing ? "Update" : "Upload"}
            </button>
          </form>
        </div>
      )}

      <div className="terminal">
        <div className="terminal-bar">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
          <span className="terminal-title">experience.log</span>
        </div>
        <div className="terminal-body">
          {listOfExperience.length === 0 ? (
            <div className="entry-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            listOfExperience.map((experience) => (
              <div className="entry" key={experience._id}>
                <h3 className="entry-title">
                  #{" "}
                  <a
                    className="entry-link"
                    href={experience.linktoProject}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {experience.title}
                  </a>
                </h3>
                <p className="entry-description">{experience.description}</p>
                {user && user.role === "admin" && (
                  <div className="entry-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => editExperience(experience)}
                    >
                      Edit Experience
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteExperience(experience._id)}
                    >
                      Delete Experience
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ExperienceUploader;

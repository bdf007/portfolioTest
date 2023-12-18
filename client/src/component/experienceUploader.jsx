import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

const ExperienceUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linktoProject, setLinktoProject] = useState("");
  const [listOfExperience, setListOfExperience] = useState([]);
  const [editingExperience, setEditingExperience] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // New state
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/experience`).then((res) => {
      setListOfExperience(res.data);
    });
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleLinkToPorjectChange = (e) => {
    setLinktoProject(e.target.value);
  };

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
            }
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
            setIsEditing(false); // Reset the isEditing state
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

      // reset the form
      setTitle("");
      setDescription("");
      setLinktoProject("");
      // clear the input field
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
        setListOfExperience(
          listOfExperience.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  const editExperience = (experience) => {
    setIsEditing(true); // Set the isEditing state
    setEditingExperience(experience);
    setTitle(experience.title);
    setDescription(experience.description);
    setLinktoProject(experience.linktoProject);
  };

  return (
    <div>
      <h1 className="text-danger">Mon expérience</h1>
      {user && user.role === "admin" && (
        <>
          <h3>Experience Uploader</h3>
          <form>
            <div className="form-group">
              <input
                value={title}
                id="title"
                size="small"
                className="form-control mb-3"
                placeholder="Title"
                label="Title"
                onChange={handleTitleChange}
              />
            </div>
            <div className="form-group">
              <textarea
                value={description}
                id="description"
                size="small"
                className="form-control mb-3"
                placeholder="Description"
                label="Description"
                onChange={handleDescriptionChange}
              >
                {" "}
              </textarea>
            </div>
            <div className="form-group">
              <input
                value={linktoProject}
                id="linktoProject"
                size="small"
                className="form-control mb-3"
                placeholder="Link to Project"
                label="Link to Project"
                onChange={handleLinkToPorjectChange}
              />
            </div>
            <button onClick={handleUpload}>
              {isEditing ? "Update" : "Upload"}
            </button>
          </form>
        </>
      )}
      <div>
        {listOfExperience.length === 0 && (
          <div
            className="d-flex justify-content-center"
            style={{ paddingTop: "5rem" }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}
        {listOfExperience.map((experience) => {
          return (
            <div key={experience._id}>
              <h3 className="text-primary">
                <a href={experience.linktoProject}>{experience.title}</a>
              </h3>
              <p>{experience.description}</p>

              {user && user.role === "admin" && (
                <>
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
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExperienceUploader;

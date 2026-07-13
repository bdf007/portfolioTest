import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import "../App.css";

const AboutUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfAbout, setListOfAbout] = useState([]);
  const [editingAbout, setEditingAbout] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // New state
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/about`).then((res) => {
      setListOfAbout(res.data);
    });
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleUpload = () => {
    try {
      if (isEditing && editingAbout) {
        axios
          .put(
            `${process.env.REACT_APP_API_URL}/api/about/update/${editingAbout._id}`,
            {
              title: title,
              description: description,
            },
          )
          .then((response) => {
            toast.success("About updated");
            setListOfAbout((prevList) => {
              const updatedList = prevList.map((about) => {
                if (about._id === response.data._id) {
                  return {
                    _id: response.data._id,
                    title: title,
                    description: description,
                  };
                }
                return about;
              });
              return updatedList;
            });
            setIsEditing(false); // Reset the isEditing state
            setEditingAbout(null);
          });
      } else {
        axios
          .post(`${process.env.REACT_APP_API_URL}/api/about`, {
            title: title,
            description: description,
          })
          .then((response) => {
            toast.success("About uploaded");
            setListOfAbout([
              ...listOfAbout,
              {
                _id: response.data._id,
                title: title,
                description: description,
              },
            ]);
          });
      }
      setTitle("");
      setDescription("");
      document.getElementById("title").value = "";
      document.getElementById("description").value = "";
    } catch (error) {
      toast.error(error.response.data.msg);
    }
  };

  const deleteAbout = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/about/${id}`)
      .then(() => {
        toast.success("About deleted");
        setListOfAbout((prevList) => prevList.filter((val) => val._id !== id));
      });
  };

  const editAbout = (about) => {
    setTitle(about.title);
    setDescription(about.description);
    setIsEditing(true); // Set isEditing to true
    setEditingAbout(about);
  };

  return (
    <div className="about-page">
      {user && user.role === "admin" && (
        <div className="about-admin-panel">
          <h3 className="about-admin-title">About Uploader</h3>
          <form className="about-form">
            <div className="form-group">
              <input
                value={title}
                id="title"
                className="about-input"
                placeholder="Title"
                onChange={handleTitleChange}
              />
            </div>
            <div className="form-group">
              <textarea
                value={description}
                id="description"
                className="about-textarea"
                placeholder="Description"
                onChange={handleDescriptionChange}
              />
              <button className="about-submit" onClick={handleUpload}>
                {isEditing ? "Update" : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="terminal about-readme">
        <div className="terminal-bar">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
          <span className="terminal-title">about.md</span>
        </div>

        <div className="terminal-body about-readme-body">
          {listOfAbout.length === 0 ? (
            <div className="about-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            listOfAbout.map((about) => (
              <div className="about-entry" key={about._id}>
                <h3 className="about-entry-title"># {about.title}</h3>
                <p className="about-entry-description">{about.description}</p>
                {user && user.role === "admin" && (
                  <div className="about-entry-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => editAbout(about)}
                    >
                      Edit About
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteAbout(about._id)}
                    >
                      Delete About
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

export default AboutUploader;

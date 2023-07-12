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
            }
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
    <div>
      {user && (
        <>
          <h3>About Uploader</h3>
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
              />
              <button onClick={handleUpload}>
                {isEditing ? "Update" : "Upload"}
              </button>
            </div>
          </form>
        </>
      )}
      <div className="mx-auto text-wrap" style={{ maxWidth: "75%" }}>
        {listOfAbout.length === 0 ? (
          <h3 className="mb-0">No About</h3>
        ) : (
          listOfAbout?.map((about) => {
            return (
              <div key={about._id}>
                <h3>{about.title}</h3>
                <pre>
                  <p className="description">{about.description}</p>
                </pre>
                {user && (
                  <>
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
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AboutUploader;

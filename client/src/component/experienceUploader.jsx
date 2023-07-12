import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

const ExperienceUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfExperience, setListOfExperience] = useState([]);
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

  const handleUpload = () => {
    try {
      axios
        .post(`${process.env.REACT_APP_API_URL}/api/experience`, {
          title: title,
          description: description,
        })
        .then((response) => {
          toast.success("Experience uploaded");
          setListOfExperience([
            ...listOfExperience,
            {
              _id: response.data._id,
              title: title,
              description: description,
            },
          ]);
          // reset the form
          setTitle("");
          setDescription("");
          // clear the input field
          document.getElementById("title").value = "";
          document.getElementById("description").value = "";
        });
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

  return (
    <div>
      {user && (
        <>
          <h3>Experience Uploader</h3>

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
            <button onClick={handleUpload}>Upload</button>
          </div>
        </>
      )}
      <div>
        {listOfExperience.length === 0 && <h3>Work in Progress</h3>}
        {listOfExperience.map((experience) => {
          return (
            <div key={experience._id}>
              <h3>{experience.title}</h3>
              <p>{experience.description}</p>
              {user && (
                <button
                  className="btn btn-danger"
                  onClick={() => deleteExperience(experience._id)}
                >
                  Delete Experience
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExperienceUploader;

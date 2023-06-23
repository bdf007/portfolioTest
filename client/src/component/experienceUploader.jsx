import React, { useEffect, useState } from "react";
import axios from "axios";

const ExperienceUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfExperience, setListOfExperience] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/experience`).then((res) => {
      setListOfExperience(res.data);
    });
  }, [listOfExperience]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleUpload = () => {
    axios
      .post(`${process.env.REACT_APP_API_URL}/experience`, {
        title: title,
        description: description,
      })
      .then((response) => {
        alert("Experience uploaded");
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
  };

  const deleteExperience = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/experience/${id}`)
      .then(() => {
        alert("Experience deleted");
        setListOfExperience(
          listOfExperience.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      <h1>Experience Uploader</h1>
      <div>
        {listOfExperience.map((experience) => {
          return (
            <div key={experience._id}>
              <h1>{experience.title}</h1>
              <p>{experience.description}</p>
              <button
                className="btn btn-danger"
                onClick={() => deleteExperience(experience._id)}
              >
                Delete Experience
              </button>
            </div>
          );
        })}
      </div>
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
    </div>
  );
};

export default ExperienceUploader;

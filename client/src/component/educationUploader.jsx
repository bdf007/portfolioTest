import React, { useEffect, useState } from "react";
import axios from "axios";

const EducationUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfEducation, setListOfEducation] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/education`).then((res) => {
      setListOfEducation(res.data);
    });
  }, [listOfEducation]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleUpload = () => {
    axios
      .post(`${process.env.REACT_APP_API_URL}/education`, {
        title: title,
        description: description,
      })
      .then((response) => {
        alert("Education uploaded");
        setListOfEducation([
          ...listOfEducation,
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

  const deleteEducation = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/education/${id}`)
      .then(() => {
        alert("Education deleted");
        setListOfEducation(
          listOfEducation.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      <h1>Education Uploader</h1>
      <div>
        {listOfEducation.map((education) => {
          return (
            <div key={education._id}>
              <h1>{education.title}</h1>
              <p>{education.description}</p>
              <button
                className="btn btn-danger"
                onClick={() => deleteEducation(education._id)}
              >
                Delete Education
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

export default EducationUploader;

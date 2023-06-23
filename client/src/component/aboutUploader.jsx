import React, { useEffect, useState } from "react";
import axios from "axios";

const AboutUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfAbout, setListOfAbout] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8000/about").then((res) => {
      setListOfAbout(res.data);
    });
  }, [listOfAbout]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleUpload = () => {
    axios
      .post("http://localhost:8000/about", {
        title: title,
        description: description,
      })
      .then((response) => {
        alert("About uploaded");
        setListOfAbout([
          ...listOfAbout,
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

  const deleteAbout = (id) => {
    axios.delete(`http://localhost:8000/about/${id}`).then(() => {
      alert("About deleted");
      setListOfAbout(
        listOfAbout.filter((val) => {
          return val._id !== id;
        })
      );
    });
  };

  return (
    <div>
      <h1>About Uploader</h1>
      <div>
        {listOfAbout.map((about) => {
          return (
            <div key={about._id}>
              <h1>{about.title}</h1>
              <p>{about.description}</p>
              <button
                className="btn btn-danger"
                onClick={() => deleteAbout(about._id)}
              >
                Delete About
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

export default AboutUploader;

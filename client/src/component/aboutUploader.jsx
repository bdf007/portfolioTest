import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

const AboutUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfAbout, setListOfAbout] = useState([]);
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/about`).then((res) => {
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
      .post(`${process.env.REACT_APP_API_URL}/about`, {
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
    axios.delete(`${process.env.REACT_APP_API_URL}/about/${id}`).then(() => {
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
      {user && (
        <>
          <h1>About Uploader</h1>

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
        {listOfAbout.map((about) => {
          return (
            <div key={about._id}>
              <h1>{about.title}</h1>
              <p>{about.description}</p>
              {user && (
                <button
                  className="btn btn-danger"
                  onClick={() => deleteAbout(about._id)}
                >
                  Delete About
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AboutUploader;

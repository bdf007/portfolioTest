import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

const EducationUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listOfEducation, setListOfEducation] = useState([]);
  const { user } = useContext(UserContext);

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
    try {
      axios
        .post(`${process.env.REACT_APP_API_URL}/education`, {
          title: title,
          description: description,
        })
        .then((response) => {
          toast.success("Education uploaded");
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
    } catch (error) {
      toast.error(error.response.data.msg);
    }
  };

  const deleteEducation = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/education/${id}`)
      .then(() => {
        toast.success("Education deleted");
        setListOfEducation(
          listOfEducation.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      {user && (
        <>
          <h1>Education Uploader</h1>

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
        {listOfEducation.length === 0 && <h1>No Education</h1>}
        {listOfEducation.map((education) => {
          return (
            <div key={education._id}>
              <h1>{education.title}</h1>
              <p>{education.description}</p>
              {user && (
                <button
                  className="btn btn-danger"
                  onClick={() => deleteEducation(education._id)}
                >
                  Delete Education
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EducationUploader;

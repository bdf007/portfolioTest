import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import "../App.css";

const EducationUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderList, setOrderList] = useState(0);
  const [listOfEducation, setListOfEducation] = useState([]);
  const [editingEducation, setEditingEducation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/education`).then((res) => {
      const sortedData = res.data.sort((a, b) => a.orderList - b.orderList);
      setListOfEducation(sortedData);
    });
  }, []);

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleDescriptionChange = (e) => setDescription(e.target.value);
  const handleOrderChange = (e) => setOrderList(e.target.value);

  const handleUpload = () => {
    try {
      if (isEditing && editingEducation) {
        axios
          .put(
            `${process.env.REACT_APP_API_URL}/api/education/update/${editingEducation._id}`,
            {
              title: title,
              description: description,
              orderList: orderList,
            },
          )
          .then((response) => {
            toast.success("Education updated");
            setListOfEducation((prevList) => {
              const updatedList = prevList.map((education) => {
                if (education._id === response.data._id) {
                  return {
                    _id: response.data._id,
                    title: title,
                    description: description,
                    orderList: orderList,
                  };
                }
                return education;
              });
              return updatedList;
            });
            setIsEditing(false);
            setEditingEducation(null);
          });
      } else {
        axios
          .post(`${process.env.REACT_APP_API_URL}/api/education`, {
            title: title,
            description: description,
            orderList: orderList,
          })
          .then((response) => {
            toast.success("Education uploaded");
            setListOfEducation([
              ...listOfEducation,
              {
                _id: response.data._id,
                title: title,
                description: description,
                orderList: orderList,
              },
            ]);
          });
      }
      setTitle("");
      setDescription("");
      document.getElementById("title").value = "";
      document.getElementById("description").value = "";
      document.getElementById("order").value = "";
    } catch (error) {
      toast.error(error.response.data.msg);
    }
  };

  const deleteEducation = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/education/${id}`)
      .then(() => {
        toast.success("Education deleted");
        setListOfEducation(listOfEducation.filter((val) => val._id !== id));
      });
  };

  const editEducation = (education) => {
    setIsEditing(true);
    setEditingEducation(education);
    setTitle(education.title);
    setDescription(education.description);
    setOrderList(education.orderList);
  };

  return (
    <div className="uploader">
      {user && user.role === "admin" && (
        <div className="admin-panel">
          <h3 className="admin-panel-title">Education Uploader</h3>
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
                value={orderList}
                id="order"
                className="field-input"
                placeholder="Order"
                onChange={handleOrderChange}
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
          <span className="terminal-title">education.log</span>
        </div>
        <div className="terminal-body">
          {listOfEducation.length === 0 ? (
            <div className="entry-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            listOfEducation.map((education) => (
              <div className="entry" key={education._id}>
                <h3 className="entry-title"># {education.title}</h3>
                <p className="entry-description">{education.description}</p>
                {user && user.role === "admin" && (
                  <div className="entry-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => editEducation(education)}
                    >
                      Edit Education
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteEducation(education._id)}
                    >
                      Delete Education
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

export default EducationUploader;

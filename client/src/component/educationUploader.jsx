import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

const EducationUploader = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderList, setOrderList] = useState(0); // New state
  const [listOfEducation, setListOfEducation] = useState([]);
  const [editingEducation, setEditingEducation] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // New state
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/education`).then((res) => {
      // Sort the data by the orderList property
      const sortedData = res.data.sort((a, b) => a.orderList - b.orderList);

      setListOfEducation(sortedData);
    });
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleOrderChange = (e) => {
    setOrderList(e.target.value);
  };

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
            }
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
            setIsEditing(false); // Reset the isEditing state
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
      // reset the form
      setTitle("");
      setDescription("");
      // clear the input field
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
        setListOfEducation(
          listOfEducation.filter((val) => {
            return val._id !== id;
          })
        );
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
    <div>
      {user && user.role === "admin" && (
        <>
          <h3>Education Uploader</h3>
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
                value={orderList}
                id="order"
                size="small"
                className="form-control mb-3"
                placeholder="Order"
                label="Order"
                onChange={handleOrderChange}
              />
            </div>
            <button onClick={handleUpload}>
              {isEditing ? "Update" : "Upload"}
            </button>
          </form>
        </>
      )}
      <div className="home">
        {listOfEducation.length === 0 && <h3>Work in Progress</h3>}
        {listOfEducation.map((education) => {
          return (
            <div key={education._id}>
              <h3 className="text-primary">{education.title}</h3>
              <p>{education.description}</p>
              {user && user.role === "admin" && (
                <>
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
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EducationUploader;

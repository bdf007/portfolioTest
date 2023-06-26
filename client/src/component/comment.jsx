import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

const CommentUploader = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const { user } = useContext(UserContext);

  const [listOfComment, setListOfComment] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/comment`).then((res) => {
      setListOfComment(res.data);
    });
  }, [listOfComment]);

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  const handleUpload = () => {
    axios
      .post(`${process.env.REACT_APP_API_URL}/comment`, {
        name: name,
        email: email,
        comment: comment,
      })
      .then((response) => {
        alert("Comment uploaded");
        setListOfComment([
          ...listOfComment,
          {
            _id: response.data._id,
            name: name,
            email: email,
            comment: comment,
          },
        ]);
        // reset the form
        setName("");
        setEmail("");
        setComment("");

        // clear the input field
        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.getElementById("comment").value = "";
      });
  };

  const deleteComment = (id) => {
    axios.delete(`${process.env.REACT_APP_API_URL}/comment/${id}`).then(() => {
      alert("Comment deleted");
      setListOfComment(
        listOfComment.filter((val) => {
          return val._id !== id;
        })
      );
    });
  };

  return (
    <div>
      {!user && (
        <>
          <h2>Leave a comment</h2>
          <div className="form-group">
            <input
              value={name}
              id="name"
              size="small"
              className="form-control mb-3"
              placeholder="Name"
              label="Name"
              onChange={handleNameChange}
            />
          </div>
          <div className="form-group">
            <input
              value={email}
              id="email"
              size="small"
              className="form-control mb-3"
              placeholder="Email"
              label="Email"
              onChange={handleEmailChange}
            />
          </div>
          <div className="form-group">
            <textarea
              value={comment}
              id="comment"
              size="small"
              className="form-control mb-3"
              placeholder="Comment"
              label="Comment"
              onChange={handleCommentChange}
            >
              {" "}
            </textarea>
            <button onClick={handleUpload}>Upload</button>
          </div>
        </>
      )}
      <div>
        {listOfComment.map((comment) => {
          return (
            <div key={comment._id}>
              <h1>{comment.name}</h1>
              <p>{comment.Date.slice(0, 10)}</p>
              <p>{comment.comment}</p>
              {user && (
                <div>
                  <p>{comment.email}</p>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteComment(comment._id)}
                  >
                    Delete Comment
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommentUploader;

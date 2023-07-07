import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import { Button } from "@mui/material";

const CommentUploader = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const { user } = useContext(UserContext);

  const [listOfComment, setListOfComment] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/comment`).then((res) => {
      setListOfComment(res.data);
    });
  }, []);

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
      .post(`${process.env.REACT_APP_API_URL}/api/comment`, {
        name: name,
        email: email,
        comment: comment,
      })
      .then((response) => {
        toast.success("Comment added");
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
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/comment/${id}`)
      .then(() => {
        toast.success("Comment deleted");
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
          <h2>Laissez moi un commentaire</h2>
          <div className="form-group">
            <input
              value={name}
              id="name"
              size="small"
              className="form-control mb-3"
              placeholder="Nom*"
              label="Nom*"
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
              placeholder="Commentaire*"
              label="Commentaire*"
              onChange={handleCommentChange}
            >
              {" "}
            </textarea>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={!name || !comment}
            >
              Envoyer
            </Button>
          </div>
        </>
      )}
      <div>
        {listOfComment.length === 0 && (
          <h1>Aucun Commentaire pour le moment</h1>
        )}
        {listOfComment.map((comment) => {
          return (
            <div key={comment._id}>
              <h1>{comment.name}</h1>
              {comment.Date && <p>{comment.Date.slice(0, 10)}</p>}
              <p>{comment.comment}</p>
              {user && (
                <div>
                  {comment.email ? <p>{comment.email}</p> : <p> No email</p>}
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

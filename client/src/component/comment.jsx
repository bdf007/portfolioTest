import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import spin from "../assets/Spin.gif";

const CommentUploader = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const { user } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);

  const [listOfComment, setListOfComment] = useState([]);

  // Email validation regular expression
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    setIsLoading(false);
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
    // Validate fields
    if (!name.trim() || !comment.trim()) {
      toast.error("Merci de remplir tous les champs.");
      return;
    }
    axios
      .post(`${process.env.REACT_APP_API_URL}/api/comment`, {
        name: name,
        email: email,
        comment: comment,
      })
      .then((response) => {
        toast.success("Comment added");
        setIsLoading(true);
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
        // document.getElementById("name").value = "";
        // document.getElementById("email").value = "";
        // document.getElementById("comment").value = "";
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
          <h2 className="text-danger">Laissez moi un commentaire</h2>
          {!isLoading ? (
            <form
              action="https://formsubmit.co/christophemidelet650@gmail.com"
              method="POST"
              onSubmit={(e) => {
                e.preventDefault(); // Prevent the default form submission behavior
                handleUpload(); // Perform your custom form submission logic
              }}
            >
              <div className="form-group">
                <label htmlFor="name">Nom, prénom ou surnom*</label>
                <input
                  value={name}
                  id="name"
                  name="name"
                  size="small"
                  className="form-control mb-3"
                  placeholder="Nom, prénom ou surnom*"
                  label="Nom*"
                  onChange={handleNameChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  value={email}
                  id="email"
                  name="email"
                  size="small"
                  className="form-control mb-3"
                  placeholder="Email"
                  label="Email"
                  onChange={handleEmailChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="comment">Commentaire*</label>
                <textarea
                  value={comment}
                  id="comment"
                  name="comment"
                  size="small"
                  className="form-control mb-3"
                  placeholder="Commentaire*"
                  label="Commentaire*"
                  onChange={handleCommentChange}
                >
                  {" "}
                </textarea>
                <p className="fs-6 text-muted">*: champs obligatoire</p>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={
                    !name || !comment || (email && !emailRegex.test(email))
                  }
                >
                  Envoyer
                </button>
              </div>
              <input type="hidden" name="_subject" value="Nouveau message" />
              <input type="hidden" name="_captcha" value="false" />
              <input
                type="hidden"
                name="_next"
                value="https://christophe-midelet.fr/Contact"
              />
            </form>
          ) : (
            <p>
              merci de patienter{" "}
              <span>
                <img
                  src={spin}
                  alt="loading"
                  className="spin"
                  style={{ width: "2rem", height: "2rem" }}
                />
              </span>
            </p>
          )}
        </>
      )}
      {!isLoading && (
        <div>
          {listOfComment.length === 0 && (
            <h3>Aucun Commentaire pour le moment</h3>
          )}
          {listOfComment.map((comment) => {
            return (
              <div key={comment._id}>
                <p>
                  <span className="text-primary fs-4">{comment.name}</span>{" "}
                  <span className="fs-5">{comment.comment}</span>
                  {comment.Date && (
                    <span className="text-success fs-6">
                      {comment.Date.slice(0, 10)}
                    </span>
                  )}
                </p>

                {user && (
                  <div>
                    {comment.email ? <p>{comment.email}</p> : <p> No email</p>}
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteComment(comment._id)}
                      style={{ marginBottom: "2rem" }}
                    >
                      Delete Comment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommentUploader;

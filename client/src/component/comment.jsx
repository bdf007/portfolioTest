import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

const CommentUploader = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const { user } = useContext(UserContext);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [listOfComment, setListOfComment] = useState([]);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/comment`).then((res) => {
      setListOfComment(res.data);
    });
  }, []);

  const handleNameChange = (e) => setName(e.target.value);
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handleCommentChange = (e) => setComment(e.target.value);

  const handleUpload = () => {
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
        setIsSubmitted(true);
        setListOfComment([
          ...listOfComment,
          {
            _id: response.data._id,
            name: name,
            email: email,
            comment: comment,
          },
        ]);
        setName("");
        setEmail("");
        setComment("");
      });
  };

  const deleteComment = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/comment/${id}`)
      .then(() => {
        toast.success("Comment deleted");
        setListOfComment(listOfComment.filter((val) => val._id !== id));
      });
  };

  return (
    <>
      {(!user || user.role !== "admin") && (
        <>
          <h2 className="panel-title">Laissez-moi un commentaire</h2>
          {!isSubmitted ? (
            <form
              action="https://formsubmit.co/christophemidelet650@gmail.com"
              method="POST"
              onSubmit={(e) => {
                e.preventDefault();
                handleUpload();
              }}
            >
              <div className="form-group">
                <label htmlFor="name" className="field-label">
                  Nom, prénom ou surnom*
                </label>
                <input
                  value={name}
                  id="name"
                  name="name"
                  className="field-input"
                  placeholder="Nom, prénom ou surnom*"
                  onChange={handleNameChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <input
                  value={email}
                  id="email"
                  name="email"
                  className="field-input"
                  placeholder="Email"
                  onChange={handleEmailChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="comment" className="field-label">
                  Commentaire*
                </label>
                <textarea
                  value={comment}
                  id="comment"
                  name="comment"
                  className="field-textarea"
                  placeholder="Commentaire*"
                  onChange={handleCommentChange}
                />
                <p className="field-hint">*: champs obligatoire</p>
                <button
                  className="field-submit"
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
            <div className="form-success">
              <p className="form-success-text">
                ✓ Merci, votre commentaire a bien été envoyé !
              </p>
              <button
                className="field-submit"
                onClick={() => setIsSubmitted(false)}
              >
                Laisser un autre commentaire
              </button>
            </div>
          )}
        </>
      )}

      <div className="terminal">
        <div className="terminal-bar">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
          <span className="terminal-title">comments.log</span>
        </div>
        <div className="terminal-body">
          {listOfComment.length === 0 && (
            <p className="entry-description">
              Aucun commentaire pour le moment.
            </p>
          )}
          {listOfComment.map((comment) => (
            <div key={comment._id} className="entry">
              <h3 className="entry-title"># {comment.name}</h3>
              <p className="entry-description">{comment.comment}</p>
              {comment.Date && (
                <p className="entry-meta">{comment.Date.slice(0, 10)}</p>
              )}
              {user && user.role === "admin" && (
                <div className="entry-actions">
                  <p className="entry-meta">{comment.email || "Pas d'email"}</p>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteComment(comment._id)}
                  >
                    Delete Comment
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CommentUploader;

import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import CommentUploader from "../component/comment";
import "../App.css";

const Contact = () => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [listOfContact, setListOfContact] = useState([]);
  const { user } = useContext(UserContext);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/contact`).then((res) => {
      setListOfContact(res.data);
    });
  }, []);

  const handleFirstnameChange = (e) => setFirstname(e.target.value);
  const handleLastnameChange = (e) => setLastname(e.target.value);
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handleMessageChange = (e) => setMessage(e.target.value);

  const handleUpload = () => {
    if (
      !firstname.trim() ||
      !lastname.trim() ||
      !email.trim() ||
      !message.trim()
    ) {
      toast.error("Merci de remplir tous les champs.");
      return;
    }

    axios
      .post(`${process.env.REACT_APP_API_URL}/api/contact`, {
        firstname: firstname,
        lastname: lastname,
        email: email,
        message: message,
      })
      .then((response) => {
        toast.success("Message sent");
        setIsSubmitted(true);
        setListOfContact([
          ...listOfContact,
          {
            _id: response.data._id,
            firstname: firstname,
            lastname: lastname,
            email: email,
            message: message,
          },
        ]);

        setFirstname("");
        setLastname("");
        setEmail("");
        setMessage("");
      });
  };

  const handleDelete = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/contact/${id}`)
      .then(() => {
        toast.success("Message deleted");
        setListOfContact(listOfContact.filter((value) => value._id !== id));
      });
  };

  return (
    <div className="contact-page">
      {user && user.role === "admin" ? (
        <>
          <div className="uploader">
            <h1 className="page-title">Messages reçus</h1>
            <div className="terminal">
              <div className="terminal-bar">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
                <span className="terminal-title">inbox.log</span>
              </div>
              <div className="terminal-body">
                {listOfContact.length === 0 && (
                  <p className="entry-description">
                    Aucun message pour le moment.
                  </p>
                )}
                {listOfContact.map((value) => (
                  <div key={value._id} className="entry">
                    <h3 className="entry-title">
                      # {value.firstname} {value.lastname}
                    </h3>
                    <p className="entry-meta">
                      {value.email} —{" "}
                      {new Date(value.date).toLocaleDateString("fr-FR")} à{" "}
                      {new Date(value.date).toLocaleTimeString("fr-FR")}
                    </p>
                    <p className="entry-description">{value.message}</p>
                    <div className="entry-actions">
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(value._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="uploader">
            <CommentUploader />
          </div>
        </>
      ) : (
        <div className="contact-grid">
          <div className="panel">
            <h2 className="panel-title">Contactez-moi</h2>
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
                  <label htmlFor="firstname" className="field-label">
                    Prénom*
                  </label>
                  <input
                    value={firstname}
                    name="firstname"
                    id="firstname"
                    className="field-input"
                    placeholder="Prénom"
                    onChange={handleFirstnameChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastname" className="field-label">
                    Nom*
                  </label>
                  <input
                    value={lastname}
                    id="lastname"
                    name="lastname"
                    className="field-input"
                    placeholder="Nom"
                    onChange={handleLastnameChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="field-label">
                    Email*
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
                  <label htmlFor="message" className="field-label">
                    Message*
                  </label>
                  <textarea
                    value={message}
                    id="message"
                    name="message"
                    className="field-textarea"
                    placeholder="Message"
                    onChange={handleMessageChange}
                  />
                  <p className="field-hint">*: champs obligatoire</p>
                  <button
                    className="field-submit"
                    type="submit"
                    disabled={
                      !firstname ||
                      !lastname ||
                      !email ||
                      !message ||
                      !emailRegex.test(email)
                    }
                  >
                    Envoyer
                  </button>
                </div>
                <input type="hidden" name="_subject" value="Nouveau Contact" />
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
                  ✓ Merci, votre message a bien été envoyé !
                </p>
                <button
                  className="field-submit"
                  onClick={() => setIsSubmitted(false)}
                >
                  Envoyer un autre message
                </button>
              </div>
            )}
          </div>

          <div className="panel">
            <CommentUploader />
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;

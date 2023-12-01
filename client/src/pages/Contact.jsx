import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import CommentUploader from "../component/comment";
import spin from "../assets/Spin.gif";

const Contact = () => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [listOfContact, setListOfContact] = useState([]);
  const { user } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/contact`).then((res) => {
      setListOfContact(res.data);
    });
  }, [listOfContact]);

  const handleFirstnameChange = (e) => {
    setFirstname(e.target.value);
  };

  const handleLastnameChange = (e) => {
    setLastname(e.target.value);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleUpload = () => {
    axios
      .post(`${process.env.REACT_APP_API_URL}/api/contact`, {
        firstname: firstname,
        lastname: lastname,
        email: email,
        message: message,
      })
      .then((response) => {
        toast.success("Message sent");
        setIsLoading(true);
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

        // reset the form
        setFirstname("");
        setLastname("");
        setEmail("");
        setMessage("");

        // clear the input field
        // document.getElementById("firstname").value = "";
        // document.getElementById("lastname").value = "";
        // document.getElementById("email").value = "";
        // document.getElementById("message").value = "";
      });
  };

  const handleDelete = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/contact/${id}`)
      .then(() => {
        toast.success("Message deleted");
        setListOfContact(
          listOfContact.filter((value) => {
            return value._id !== id;
          })
        );
      });
  };

  return (
    <div className="home">
      <div className=" row d-flex justify-content-around">
        <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5 g-2">
          {user ? (
            <div>
              {listOfContact.length === 0 && <h1>No message</h1>}
              {listOfContact.map((value) => {
                return (
                  <div key={value._id} className="card mb-3">
                    <div className="card-body">
                      <h5 className="card-title">
                        {value.firstname} {value.lastname}
                      </h5>
                      <h6 className="card-subtitle mb-2 text-muted">
                        {value.email}
                      </h6>
                      <p className="card-text">
                        <small>
                          {new Date(value.date).toLocaleDateString("fr-FR")} à{" "}
                          {new Date(value.date).toLocaleTimeString("fr-FR")}
                        </small>
                      </p>
                      <p className="card-text">{value.message}</p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        handleDelete(value._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <h2 className="text-danger">Contactez moi</h2>
              {!isLoading && (
                <form
                  action="https://formsubmit.co/christophemidelet650@gmail.com"
                  method="POST"
                >
                  <div className="form-group">
                    <label htmlFor="firstname">Prénom*</label>
                    <input
                      value={firstname}
                      name="firstname"
                      id="firstname"
                      size="small"
                      className="form-control mb-3"
                      placeholder="Prénom"
                      label="Prénom*"
                      onChange={handleFirstnameChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastname">Nom*</label>
                    <input
                      value={lastname}
                      id="lastname"
                      name="lastname"
                      size="small"
                      className="form-control mb-3"
                      placeholder="Nom"
                      label="Nom*"
                      onChange={handleLastnameChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email*</label>
                    <input
                      value={email}
                      id="email"
                      name="email"
                      size="small"
                      className="form-control mb-3"
                      placeholder="Email"
                      label="Email*"
                      onChange={handleEmailChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Message*</label>
                    <textarea
                      value={message}
                      id="message"
                      name="message"
                      size="small"
                      className="form-control mb-3"
                      placeholder="Message"
                      label="Message*"
                      onChange={handleMessageChange}
                    >
                      {""}
                    </textarea>
                    <p className="fs-6 text-muted">*: champs obligatoire</p>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      onClick={handleUpload}
                      disabled={!firstname || !lastname || !email || !message}
                    >
                      Envoyer
                    </button>
                  </div>
                  <input
                    type="hidden"
                    name="_subject"
                    value="Nouveau Contact"
                  />
                  <input type="hidden" name="_captcha" value="false" />
                </form>
              )}
              {isLoading && (
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
        </div>
        <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
          <CommentUploader />
        </div>
      </div>
    </div>
  );
};

export default Contact;

import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import { Button } from "@mui/material";
import CommentUploader from "../component/comment";

const Contact = () => {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [listOfContact, setListOfContact] = useState([]);
  const { user } = useContext(UserContext);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/contact`).then((res) => {
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

  const handleUpload = (e) => {
    e.preventDefault();
    try {
      axios
        .post(`${process.env.REACT_APP_API_URL}/contact`, {
          firstname: firstname,
          lastname: lastname,
          email: email,
          message: message,
        })
        .then((response) => {
          toast.success("Message sent");
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
          document.getElementById("firstname").value = "";
          document.getElementById("lastname").value = "";
          document.getElementById("email").value = "";
          document.getElementById("message").value = "";
        });
    } catch (error) {
      toast.error(error.response.data.msg);
    }
  };

  const handleDelete = (id) => {
    axios.delete(`${process.env.REACT_APP_API_URL}/contact/${id}`).then(() => {
      toast.success("Message deleted");
      setListOfContact(
        listOfContact.filter((value) => {
          return value._id !== id;
        })
      );
    });
  };

  return (
    <div className=" row d-flex justify-content-center">
      <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5 ">
        <h1>Contact page</h1>
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
                    <p className="card-text">{value.message}</p>
                    <p className="card-text">
                      <small className="text-muted">{value.Date}</small>
                    </p>
                  </div>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      handleDelete(value._id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label htmlFor="firstname">First name</label>
              <input
                value={firstname}
                id="firstname"
                size="small"
                className="form-control mb-3"
                placeholder="First name"
                label="First name"
                onChange={handleFirstnameChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastname">Last name</label>
              <input
                value={lastname}
                id="lastname"
                size="small"
                className="form-control mb-3"
                placeholder="Last name"
                label="Last name"
                onChange={handleLastnameChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
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
              <label htmlFor="message">Message</label>
              <textarea
                value={message}
                id="message"
                size="small"
                className="form-control mb-3"
                placeholder="Message"
                label="Message"
                onChange={handleMessageChange}
              >
                {""}
              </textarea>
              <Button
                variant="contained"
                color="primary"
                disabled={!firstname || !lastname || !email || !message}
                onClick={handleUpload}
              >
                Send
              </Button>
            </div>
          </form>
        )}
      </div>
      <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
        <CommentUploader />
      </div>
    </div>
  );
};

export default Contact;

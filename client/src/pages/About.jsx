import React, { useState, useEffect } from "react";
import axios from "axios";

const About = () => {
  const [listOfAbout, setListOfAbout] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/about`).then((res) => {
      setListOfAbout(res.data);
    });
  }, [listOfAbout]);

  return (
    <div className="container mt-5 mb-5 col-10 col-sm-8 col-md-6 col-lg-5">
      {listOfAbout.map((about) => {
        return (
          <div key={about._id}>
            <h1>{about.title}</h1>
            <p>{about.description}</p>
          </div>
        );
      })}
    </div>
  );
};

export default About;

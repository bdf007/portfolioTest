import React, { useEffect, useState } from "react";
import axios from "axios";

const AboutViewer = () => {
  const [listOfAbout, setListOfAbout] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/about`).then((res) => {
      setListOfAbout(res.data);
    });
  }, [listOfAbout]);

  return (
    <div>
      <h1>About</h1>
      <div>
        {listOfAbout.map((about) => {
          return (
            <div key={about._id}>
              <h1>{about.title}</h1>
              <p>{about.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AboutViewer;

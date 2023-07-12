import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import WIP from "../assets/WIP.png";
import "../App.css";

const TechnologieUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [listOftechnologies, setListOftechnologies] = useState([]);
  const { user } = useContext(UserContext);

  // get all the projects from the server
  const fetchtechnologies = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/technologie/getTechnologies`
      );
      setListOftechnologies(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchtechnologies();
  }, []);

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
  };

  const handleLinkChange = (event) => {
    setLink(event.target.value);
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleUpload = async () => {
    try {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(selectedFile);

      fileReader.onloadend = async () => {
        const base64data = fileReader.result;

        const technologieData = {
          title,
          link,
          description,
          imageData: base64data,
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/technologie/upload`,
          technologieData
        );

        toast.success("Technologie uploaded successfully");
        setListOftechnologies((prevTechnologies) => [
          ...prevTechnologies,
          response.data.technologie,
        ]);
        resetForm();
      };
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteTechnologie = async (id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/technologie/deleteTechnologie/${id}`
      );
      toast.success("Technologie deleted successfully");
      setListOftechnologies((prevTechnologies) =>
        prevTechnologies.filter((technologie) => technologie._id !== id)
      );
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const resetForm = () => {
    setTitle("");
    setLink("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl(null);
    // clear the input field
    document.getElementById("title").value = "";
    document.getElementById("link").value = "";
    document.getElementById("description").value = "";
    document.getElementById("file").value = "";
  };

  return (
    <div>
      {user && (
        <>
          <h3>technologie Uploader</h3>

          <div>
            <input
              type="file"
              id="file"
              accept="image/*"
              onChange={handleFileInputChange}
            />
            {selectedFile && (
              <div>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: "200px" }}
                />
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Title"
                />
                <input
                  type="text"
                  id="link"
                  value={link}
                  onChange={handleLinkChange}
                  placeholder="Link "
                />
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Description"
                />
                <button onClick={handleUpload}>Upload</button>
              </div>
            )}
          </div>
        </>
      )}
      <div>
        <div className="row row-cols-1 row-cols-md-6 g-3 home">
          {listOftechnologies.length === 0 && (
            <img
              src={WIP}
              alt="WIP"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          )}
          {listOftechnologies.map((technologie) => {
            return (
              <div className="col" key={technologie._id}>
                <div className="card techno border-0 pt-5">
                  <img
                    className="rounded mx-auto d-block "
                    src={technologie.imageData}
                    alt={technologie.description || ""}
                    style={{ maxWidth: "50%", maxHeight: "50%" }}
                  />

                  <div className="card-body">
                    <h5 className="card-title text-center">
                      {technologie.title || ""}
                    </h5>
                    {user && (
                      <div className="card-footer d-grid gap-2 col-6 mx-auto">
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            deleteTechnologie(technologie._id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TechnologieUploader;

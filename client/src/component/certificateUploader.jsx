import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

const CertificateUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [listOfcertificates, setListOfcertificates] = useState([]);
  const { user } = useContext(UserContext);

  // get all the projects from the server
  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/certificate/getCertificates`)
      .then((response) => {
        setListOfcertificates(response.data);
      });
  }, [listOfcertificates]);

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
      const formData = new FormData();
      formData.append("title", title);
      formData.append("link", link);
      formData.append("file", selectedFile);
      formData.append("description", description);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/certificate/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Do something with the response, e.g., display success message or trigger further actions
      alert("Certificate uploaded successfully");
      setListOfcertificates([
        ...listOfcertificates,
        {
          _id: response.data.file._id,
          title: title,
          link: link,
          description: description,
          url: response.data.file.url,
        },
      ]);
      // reset the value
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
    } catch (error) {
      // Handle error, e.g., display error message to the user
      console.log(error);
    }
  };

  const deleteCertificate = (id) => {
    axios
      .delete(
        `${process.env.REACT_APP_API_URL}/certificate/deleteCertificate/${id}`
      )
      .then((response) => {
        alert("Certificate deleted successfully");
        console.log("certificate deleted successfully");
        setListOfcertificates(
          listOfcertificates.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      {user && (
        <>
          <h1>certificate Uploader</h1>

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
      <div className="imagesDisplay">
        <div className="row">
          {listOfcertificates.map((certificate) => {
            return (
              <div className="col-sm-2 w-auto" key={certificate._id}>
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{certificate.title || ""}</h5>
                    {certificate.link ? (
                      <a
                        href={certificate.link}
                        className="btn btn-primary"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className="card-img-top"
                          src={`${certificate.url}?${Date.now()}`}
                          alt={certificate.description || ""}
                          style={{ maxWidth: "50%", maxHeight: "200px" }}
                        />
                      </a>
                    ) : (
                      <img
                        className="card-img-top"
                        src={`${certificate.url}?${Date.now()}`}
                        alt={certificate.description || ""}
                        style={{ maxWidth: "50%", maxHeight: "200px" }}
                      />
                    )}
                    {user && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          deleteCertificate(certificate._id);
                        }}
                      >
                        Delete
                      </button>
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

export default CertificateUploader;

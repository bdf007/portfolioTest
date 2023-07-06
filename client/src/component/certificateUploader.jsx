import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

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
      .get(`${process.env.REACT_APP_API_URL}/api/certificate/getCertificates`)
      .then((response) => {
        setListOfcertificates(response.data);
      });
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
      const formData = new FormData();
      formData.append("title", title);
      formData.append("link", link);
      formData.append("file", selectedFile);
      formData.append("description", description);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/certificate/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Do something with the response, e.g., display success message or trigger further actions
      toast.success("Certificate uploaded successfully");
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
      toast.error(error.response.data.message);
    }
  };

  const deleteCertificate = (id) => {
    axios
      .delete(
        `${process.env.REACT_APP_API_URL}/api/certificate/deleteCertificate/${id}`
      )
      .then((response) => {
        toast.success("Certificate deleted successfully");
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
      <div>
        <h1>Diploma and Certificate</h1>
        <div className="row row-cols-1 row-cols-md-4 g-4">
          {listOfcertificates.length === 0 && <h1>No certificates</h1>}
          {listOfcertificates.map((certificate) => {
            return (
              <div key={certificate._id}>
                <div className="col">
                  <div className="card">
                    {certificate.link ? (
                      <a
                        href={certificate.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className="card-img-top"
                          src={`${certificate.url}?${Date.now()}`}
                          alt={certificate.description || ""}
                          style={{ maxWidth: "100%", maxHeight: "100%" }}
                        />
                      </a>
                    ) : (
                      <img
                        className="card-img-top"
                        src={`${certificate.url}?${Date.now()}`}
                        alt={certificate.description || ""}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                    )}
                    <div className="card-body">
                      <h5 className="card-title text-center">
                        {certificate.title || ""}
                      </h5>
                      {user && (
                        <div className="card-footer d-grid gap-2 col-6 mx-auto">
                          <button
                            className="btn btn-danger"
                            onClick={() => {
                              deleteCertificate(certificate._id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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

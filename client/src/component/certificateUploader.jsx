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
  const [editingcertificate, setEditingcertificate] = useState(null);
  const { user } = useContext(UserContext);

  // get all the projects from the server
  const fetchcertificates = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/certificate/getCertificates`
      );
      setListOfcertificates(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchcertificates();
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

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      const fileReader = new FileReader();
      let base64data = null;

      if (selectedFile) {
        base64data = await new Promise((resolve, reject) => {
          fileReader.onloadend = () => resolve(fileReader.result);
          fileReader.onerror = reject;
          fileReader.readAsDataURL(selectedFile);
        });

        const image = new Image();
        image.src = base64data;

        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);

        base64data = canvas.toDataURL("image/webp");
      }

      if (editingcertificate) {
        // Update the certificate
        const updatedcertificateData = {
          title,
          link,
          description,
          imageData: selectedFile ? base64data : editingcertificate.imageData,
        };

        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/certificate/updateCertificate/${editingcertificate._id}`,
          updatedcertificateData
        );

        toast.success("Certificate updated successfully");
        setListOfcertificates((prevCertificates) => {
          const updatedCertificates = prevCertificates.map((certificate) => {
            if (certificate._id === editingcertificate._id) {
              return {
                ...certificate,
                title,
                link,
                description,
                imageData: selectedFile
                  ? base64data
                  : editingcertificate.imageData,
              };
            }
            return certificate;
          });
          return updatedCertificates;
        });

        setEditingcertificate(null);
      } else {
        const certificateData = {
          title,
          link,
          description,
          imageData: base64data,
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/certificate/upload`,
          certificateData
        );

        toast.success("Certificate uploaded successfully");
        setListOfcertificates((prevCertificates) => [
          ...prevCertificates,
          response.data.certificate,
        ]);
      }
      resetForm();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteCertificate = async (id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/certificate/deleteCertificate/${id}`
      );
      toast.success("Certificate deleted successfully");
      setListOfcertificates((prevCertificates) =>
        prevCertificates.filter((certificate) => certificate._id !== id)
      );
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const editCertificate = (certificate) => {
    setEditingcertificate(certificate);
    setTitle(certificate.title);
    setLink(certificate.link);
    setDescription(certificate.description);
    setPreviewUrl(certificate.imageData);
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
      {user && user.role === "admin" && (
        <>
          <h3 className="text-danger">certificate Uploader</h3>

          <div>
            <input
              type="file"
              id="file"
              accept="image/*"
              onChange={handleFileInputChange}
            />
            <form>
              {selectedFile && (
                <div className="form-group">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "200px" }}
                  />
                </div>
              )}
              <div className="form-group">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Title"
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  id="link"
                  value={link}
                  onChange={handleLinkChange}
                  placeholder="Link "
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Description"
                />
              </div>
              <button onClick={handleUpload}>
                {editingcertificate ? "Update" : "Upload"}
              </button>
            </form>
          </div>
        </>
      )}
      <div className="home">
        <div className="row g-3 home">
          {listOfcertificates.length === 0 && (
            <div
              className="d-flex justify-content-center"
              style={{ paddingTop: "5rem", paddingBottom: "12rem" }}
            >
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}
          <div className="container">
            <div className="row justify-content-center">
              {listOfcertificates.map((certificate) => {
                return (
                  <div className="col-5" key={certificate._id}>
                    <div className="card">
                      {certificate.link ? (
                        <a
                          href={certificate.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            className="card-img-top"
                            src={certificate.imageData}
                            alt={certificate.description || ""}
                            style={{ maxWidth: "100%", maxHeight: "100%" }}
                          />
                        </a>
                      ) : (
                        <img
                          className="card-img-top"
                          src={certificate.imageData}
                          alt={certificate.description || ""}
                          style={{ maxWidth: "100%", maxHeight: "100%" }}
                        />
                      )}
                      <div className="card-body">
                        <h5 className="card-title text-center text-primary">
                          {certificate.title || ""}
                        </h5>
                        {user && user.role === "admin" && (
                          <div className="card-footer d-grid gap-2 col-6 mx-auto">
                            <button
                              className="btn btn-danger"
                              onClick={() => {
                                deleteCertificate(certificate._id);
                              }}
                            >
                              Delete
                            </button>
                            <button
                              className="btn btn-primary"
                              onClick={() => {
                                editCertificate(certificate);
                              }}
                            >
                              Edit
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
      </div>
    </div>
  );
};

export default CertificateUploader;

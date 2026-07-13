import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";
import "../App.css";

const CertificateUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [listOfcertificates, setListOfcertificates] = useState([]);
  const [editingcertificate, setEditingcertificate] = useState(null);
  const { user } = useContext(UserContext);

  const fetchcertificates = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/certificate/getCertificates`,
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

  const handleTitleChange = (event) => setTitle(event.target.value);
  const handleLinkChange = (event) => setLink(event.target.value);
  const handleDescriptionChange = (event) => setDescription(event.target.value);

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
        const updatedcertificateData = {
          title,
          link,
          description,
          imageData: selectedFile ? base64data : editingcertificate.imageData,
        };

        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/certificate/updateCertificate/${editingcertificate._id}`,
          updatedcertificateData,
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
          certificateData,
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
        `${process.env.REACT_APP_API_URL}/api/certificate/deleteCertificate/${id}`,
      );
      toast.success("Certificate deleted successfully");
      setListOfcertificates((prevCertificates) =>
        prevCertificates.filter((certificate) => certificate._id !== id),
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
    document.getElementById("title").value = "";
    document.getElementById("link").value = "";
    document.getElementById("description").value = "";
    document.getElementById("file").value = "";
  };

  return (
    <div className="uploader">
      {user && user.role === "admin" && (
        <div className="admin-panel">
          <h3 className="admin-panel-title">Certificate Uploader</h3>
          <form>
            <input
              type="file"
              id="file"
              accept="image/*"
              className="field-file"
              onChange={handleFileInputChange}
            />
            {selectedFile && (
              <div className="form-group">
                <img src={previewUrl} alt="Preview" className="field-preview" />
              </div>
            )}
            <div className="form-group">
              <input
                type="text"
                id="title"
                value={title}
                className="field-input"
                onChange={handleTitleChange}
                placeholder="Title"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="link"
                value={link}
                className="field-input"
                onChange={handleLinkChange}
                placeholder="Link"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                id="description"
                value={description}
                className="field-input"
                onChange={handleDescriptionChange}
                placeholder="Description"
              />
            </div>
            <button className="field-submit" onClick={handleUpload}>
              {editingcertificate ? "Update" : "Upload"}
            </button>
          </form>
        </div>
      )}

      {listOfcertificates.length === 0 && (
        <div className="media-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )}

      <div className="media-grid">
        {listOfcertificates.map((certificate) => (
          <div className="media-card" key={certificate._id}>
            {certificate.link ? (
              <a href={certificate.link} target="_blank" rel="noreferrer">
                <img
                  className="media-card-img"
                  src={certificate.imageData}
                  alt={certificate.description || ""}
                />
              </a>
            ) : (
              <img
                className="media-card-img"
                src={certificate.imageData}
                alt={certificate.description || ""}
              />
            )}
            <h5 className="media-card-title">{certificate.title || ""}</h5>

            {user && user.role === "admin" && (
              <div className="media-card-actions">
                <button
                  className="btn btn-danger"
                  onClick={() => deleteCertificate(certificate._id)}
                >
                  Delete
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => editCertificate(certificate)}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificateUploader;

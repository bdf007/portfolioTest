import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { toast } from "react-toastify";

const TechnologieUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [orderList, setOrderList] = useState(0); // New state
  const [listOftechnologies, setListOftechnologies] = useState([]);
  const [editingtechnologie, setEditingtechnologie] = useState(null);
  const { user } = useContext(UserContext);

  // get all the projects from the server
  const fetchtechnologies = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/technologie/getTechnologies`,
      );
      const sortedData = response.data.sort(
        (a, b) => a.orderList - b.orderList,
      );
      setListOftechnologies(sortedData);
    } catch (error) {
      toast.error("Something went wrong");
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

  const handleOrderChange = (event) => {
    setOrderList(event.target.value);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      const fileReader = new FileReader();

      let base64data = null;

      if (selectedFile) {
        fileReader.readAsDataURL(selectedFile);

        base64data = await new Promise((resolve, reject) => {
          fileReader.onloadend = () => resolve(fileReader.result);
          fileReader.onerror = reject;
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

        // Convert the canvas content to base64 with WebP format
        base64data = canvas.toDataURL("image/webp");
      }

      if (editingtechnologie) {
        // update technologie
        const updatedTechnologieData = {
          title,
          link,
          description,
          orderList,
          imageData: base64data || null,
        };

        await axios.put(
          `${process.env.REACT_APP_API_URL}/api/technologie/updateTechnologie/${editingtechnologie._id}`,
          updatedTechnologieData,
        );

        toast.success("Technologie updated successfully");
        setListOftechnologies((prevTechnologies) => {
          const updatedTechnologies = prevTechnologies.map((technologie) => {
            if (technologie._id === editingtechnologie._id) {
              return {
                ...technologie,
                title,
                link,
                description,
                orderList,
                imageData: base64data || editingtechnologie.imageData,
              };
            }
            return technologie;
          });
          return updatedTechnologies;
        });

        setEditingtechnologie(null);
      } else {
        const technologieData = {
          title,
          link,
          description,
          orderList,
          imageData: base64data,
        };

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/technologie/upload`,
          technologieData,
        );

        toast.success("Technologie uploaded successfully");
        setListOftechnologies((prevTechnologies) => [
          ...prevTechnologies,
          response.data.technologie,
        ]);
      }
      resetForm();
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteTechnologie = async (id) => {
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/technologie/deleteTechnologie/${id}`,
      );
      toast.success("Technologie deleted successfully");
      setListOftechnologies((prevTechnologies) =>
        prevTechnologies.filter((technologie) => technologie._id !== id),
      );
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const editTechnologie = (technologie) => {
    setEditingtechnologie(technologie);
    setTitle(technologie.title);
    setLink(technologie.link);
    setDescription(technologie.description);
    setOrderList(technologie.orderList);
    setPreviewUrl(technologie.imageData);
    // Programmatically trigger the file input
    const fileInput = document.getElementById("file");
    if (fileInput) {
      fileInput.value = ""; // Clear the current selection
      fileInput.click(); // Simulate a click event
    }
  };

  const resetForm = () => {
    setTitle("");
    setLink("");
    setDescription("");
    setOrderList(0);
    setSelectedFile(null);
    setPreviewUrl(null);
    // clear the input field
    document.getElementById("title").value = "";
    document.getElementById("link").value = "";
    document.getElementById("description").value = "";
    document.getElementById("orderList").value = "";
    document.getElementById("file").value = "";
  };

  return (
    <div className="tech-uploader">
      <h1 className="text-danger">Technologies utilisées</h1>
      {user && user.role === "admin" && (
        <>
          <h3>technologie Uploader</h3>

          <form>
            <input
              type="file"
              id="file"
              accept="image/*"
              onChange={handleFileInputChange}
            />
            {editingtechnologie
              ? previewUrl && (
                  <div className="form-group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ maxWidth: "100%", maxHeight: "200px" }}
                    />
                  </div>
                )
              : selectedFile && (
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
            <div className="form-group">
              <input
                type="number"
                id="orderList"
                value={orderList}
                onChange={handleOrderChange}
                placeholder="Order"
              />
            </div>
            <button onClick={handleUpload}>
              {editingtechnologie ? "Edit" : "Upload"}
            </button>
          </form>
        </>
      )}

      {listOftechnologies.length === 0 && (
        <div className="tech-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )}

      <div className="tech-grid">
        {listOftechnologies.map((technologie) => (
          <div className="tech-card" key={technologie._id}>
            <img
              className="tech-card-img"
              src={technologie.imageData}
              alt={technologie.description || ""}
            />
            <h5 className="tech-card-title">{technologie.title || ""}</h5>

            {user && user.role === "admin" && (
              <div className="tech-card-actions">
                <button
                  className="btn btn-danger"
                  onClick={() => deleteTechnologie(technologie._id)}
                >
                  Delete
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => editTechnologie(technologie)}
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

export default TechnologieUploader;

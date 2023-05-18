import React, { useEffect, useState } from "react";
import axios from "axios";

const ImageUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [description, setDescription] = useState("");
  const [listOfimages, setListOfimages] = useState([]);
  const [image, setImage] = useState(null);

  // get all the images from the server
  useEffect(() => {
    axios.get("http://localhost:5000/image/getImages").then((response) => {
      setListOfimages(response.data);
      console.log(response.data);
    });
  }, []);

  // get the image with the id 6465e714e672131c3eaae308
  useEffect(() => {
    axios
      .get("http://localhost:5000/image/getImage/6465e714e672131c3eaae308")
      .then((response) => {
        setImage(response.data);
        console.log(response.data);
      });
  }, []);

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", description);

      const response = await axios.post(
        "http://localhost:5000/image/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log(response.data.file.filename); // Access the filename property

      // Do something with the response, e.g., display success message or trigger further actions
    } catch (error) {
      console.log(error);
      // Handle error, e.g., display error message to the user
    }
  };

  const deleteImage = (id) => {
    axios
      .delete(`http://localhost:5000/image/deleteImage/${id}`)
      .then((response) => {
        alert("Image deleted successfully");
        console.log("image deleted successfully");
        setListOfimages(
          listOfimages.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      <h1>Image Uploader</h1>
      <div className="imagesDisplay">
        {listOfimages.map((image) => {
          return (
            <div className="image" key={image._id}>
              <div className="imageInfo">
                <h1 className="imageDescription">
                  Description: {image.description || ""}
                </h1>
              </div>
              <img
                src={`http://localhost:5000/${image.url}`}
                alt={image.description || ""}
              />
              <button
                className="deleteButton"
                onClick={() => {
                  deleteImage(image._id);
                }}
              >
                Delete
              </button>
            </div>
          );
        })}
        {image && (
          <div className="image" key={image._id}>
            <div className="imageInfo">
              <h1 className="imageDescription">
                Description: {image.description || ""}
              </h1>
              <img src={image.url} alt={image.description || ""} />
            </div>
          </div>
        )}
      </div>
      <div>
        <input type="file" accept="image/*" onChange={handleFileInputChange} />
        {selectedFile && (
          <div>
            <img
              src={previewUrl}
              alt="Preview"
              style={{ maxWidth: "100%", maxHeight: "200px" }}
            />
            <input
              type="text"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Description"
            />
            <button onClick={handleUpload}>Upload</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;

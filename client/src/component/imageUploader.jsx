import React, { useEffect, useState } from "react";
import axios from "axios";

const ImageUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [description, setDescription] = useState("");
  const [listOfimages, setListOfimages] = useState([]);

  // get all the images from the server
  useEffect(() => {
    axios.get("http://localhost:8000/image/getImages").then((response) => {
      setListOfimages(response.data);
      console.log(response.data); // this is the array of images
    });
  }, [listOfimages]);

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
        "http://localhost:8000/image/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log(response.data.file._id);
      // Do something with the response, e.g., display success message or trigger further actions
      alert("Image uploaded successfully");
      setListOfimages([
        ...listOfimages,
        {
          _id: response.data.file._id,
          description: description,
          url: response.data.file.url,
        },
      ]);
      // reset the value
      setDescription("");
      setSelectedFile(null);
      setPreviewUrl(null);
      // clear the input field
      document.getElementById("description").value = "";
      document.getElementById("file").value = "";
    } catch (error) {
      // Handle error, e.g., display error message to the user
      console.log(error);
    }
  };

  const deleteImage = (id) => {
    axios
      .delete(`http://localhost:8000/image/deleteImage/${id}`)
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
        <div className="row">
          {listOfimages.map((image) => {
            return (
              <div className="col-sm-2 w-auto" key={image._id}>
                <div className="card">
                  <div className="card-body">
                    <img
                      className="card-img-top"
                      src={`${image.url}?${Date.now()}`}
                      alt={image.description || ""}
                      style={{ maxWidth: "100%", maxHeight: "200px" }}
                    />
                    <h5 className="card-title">{image.description || ""}</h5>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        deleteImage(image._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
              id="description"
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

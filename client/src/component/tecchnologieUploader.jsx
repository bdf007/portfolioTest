import React, { useEffect, useState } from "react";
import axios from "axios";

const TechnologieUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [listOftechnologies, setListOftechnologies] = useState([]);

  // get all the projects from the server
  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/technologie/getTechnologies`)
      .then((response) => {
        setListOftechnologies(response.data);
      });
  }, [listOftechnologies]);

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
        `${process.env.REACT_APP_API_URL}/technologie/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Do something with the response, e.g., display success message or trigger further actions
      alert("Technologie uploaded successfully");
      setListOftechnologies([
        ...listOftechnologies,
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

  const deleteTechnologie = (id) => {
    axios
      .delete(
        `${process.env.REACT_APP_API_URL}/technologie/deleteTechnologie/${id}`
      )
      .then((response) => {
        alert("Technologie deleted successfully");
        console.log("technologie deleted successfully");
        setListOftechnologies(
          listOftechnologies.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      <h1>technologie Uploader</h1>
      <div className="imagesDisplay">
        <div className="row">
          {listOftechnologies.map((technologie) => {
            return (
              <div className="col-sm-2 w-auto" key={technologie._id}>
                <div className="card">
                  <div className="card-body">
                    <img
                      className="card-img-top"
                      src={`${technologie.url}?${Date.now()}`}
                      alt={technologie.description || ""}
                      style={{ maxWidth: "100%", maxHeight: "200px" }}
                    />
                    <h5 className="card-title">{technologie.title || ""}</h5>
                    {technologie.link && (
                      <a href={technologie.link} className="btn btn-primary">
                        {" "}
                        Link to the technologie
                      </a>
                    )}

                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        deleteTechnologie(technologie._id);
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
    </div>
  );
};

export default TechnologieUploader;

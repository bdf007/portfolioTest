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
  const [listOftechnologies, setListOftechnologies] = useState([]);
  const { user } = useContext(UserContext);

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
      toast.success("Technologie uploaded successfully");
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
      toast.error("Something went wrong");
    }
  };

  const deleteTechnologie = (id) => {
    axios
      .delete(
        `${process.env.REACT_APP_API_URL}/technologie/deleteTechnologie/${id}`
      )
      .then((response) => {
        toast.success("Technologie deleted successfully");
        setListOftechnologies(
          listOftechnologies.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      {user && (
        <>
          <h1>technologie Uploader</h1>

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
        <div className="row row-cols-1 row-cols-md-6 g-4">
          {listOftechnologies.length === 0 && <h1>No technologie</h1>}
          {listOftechnologies.map((technologie) => {
            return (
              <div key={technologie._id}>
                <div className="col">
                  <div className="card border-0">
                    {technologie.link ? (
                      <a
                        href={technologie.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          className="rounded mx-auto d-block img-thumbnail"
                          src={`${technologie.url}?${Date.now()}`}
                          alt={technologie.description || ""}
                          style={{ maxWidth: "50%", maxHeight: "50%" }}
                        />
                      </a>
                    ) : (
                      <img
                        className="rounded mx-auto d-block img-thumbnail"
                        src={`${technologie.url}?${Date.now()}`}
                        alt={technologie.description || ""}
                        style={{ maxWidth: "50%", maxHeight: "50%" }}
                      />
                    )}
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TechnologieUploader;

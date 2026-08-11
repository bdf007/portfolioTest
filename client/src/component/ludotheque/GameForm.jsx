import React, { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";

// ---------- Utilitaire de rognage (canvas) ----------

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImageFile(imageSrc, croppedAreaPixels, fileName) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Le rognage a échoué"));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

// ---------- Composant ----------

const GameForm = ({
  title,
  genre,
  description,
  date,
  editor,
  minPlayer,
  maxPlayer,
  minAge,
  duration,
  selectedFile,
  onTitleChange,
  onGenreChange,
  onDescriptionChange,
  onDateChange,
  onEditorChange,
  onMinPlayerChange,
  onMaxPlayerChange,
  onMinAgeChange,
  onDurationChange,
  onFileSelected,
  onSubmit,
  onCancel,
}) => {
  // Fichier final (déjà rogné), affiché en aperçu
  const [previewUrl, setPreviewUrl] = useState(null);

  // Étape de rognage : fichier brut pas encore validé
  const [rawFile, setRawFile] = useState(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(4 / 3);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const ASPECT_OPTIONS = [
    { label: "Paysage", value: 4 / 3 },
    { label: "Portrait", value: 3 / 4 },
    { label: "Carré", value: 1 },
    { label: "Très haut", value: 9 / 16 },
    { label: "Très large", value: 16 / 9 },
  ];

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleRawFilePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRawFile(file);
    setRawPreviewUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCropping(true);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const cancelCropping = () => {
    if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
    setRawFile(null);
    setRawPreviewUrl(null);
    setIsCropping(false);
  };

  const confirmCrop = async () => {
    if (!rawFile || !croppedAreaPixels) return;
    try {
      const croppedFile = await getCroppedImageFile(
        rawPreviewUrl,
        croppedAreaPixels,
        rawFile.name.replace(/\.[^/.]+$/, "") + ".jpg",
      );
      onFileSelected(croppedFile);
    } catch (err) {
      console.error(err);
    } finally {
      cancelCropping();
    }
  };

  return (
    <form>
      {selectedFile && !isCropping && (
        <>
          <div className="form-group">
            <label htmlFor="title">Titre</label>
            <input
              type="text"
              id="title"
              value={title}
              className="form-control"
              placeholder="titre"
              onChange={onTitleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="genre">Genre</label>
            <input
              type="text"
              id="genre"
              value={genre}
              className="form-control"
              placeholder="genre"
              onChange={onGenreChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Résumé</label>
            <textarea
              id="description"
              value={description}
              placeholder="description"
              onChange={onDescriptionChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="number"
              id="date"
              value={date}
              className="form-control"
              placeholder="date"
              onChange={onDateChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="editor">Editeur</label>
            <input
              type="text"
              id="editor"
              value={editor}
              className="form-control"
              placeholder="editeur"
              onChange={onEditorChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="minPlayer">Nombre de joueurs</label>
            <label htmlFor="minPlayer">min:</label>
            <input
              type="number"
              id="minPlayer"
              value={minPlayer}
              className="form-control"
              placeholder="nombre de joueur minimum"
              onChange={onMinPlayerChange}
            />
            <label htmlFor="maxPlayer">max:</label>
            <input
              type="number"
              id="maxPlayer"
              value={maxPlayer}
              className="form-control"
              placeholder="nombre de joueur maximum"
              onChange={onMaxPlayerChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="minAge">Age minimum</label>
            <input
              type="number"
              id="minAge"
              value={minAge}
              className="form-control"
              placeholder="age minimum"
              onChange={onMinAgeChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="duration">Durée</label>
            <input
              type="number"
              id="duration"
              value={duration}
              className="form-control"
              placeholder="durée"
              onChange={onDurationChange}
            />
          </div>
        </>
      )}

      <div className="form-group">
        <label htmlFor="file" className="field-label">
          Couverture
        </label>

        {isCropping && rawPreviewUrl ? (
          <>
            <div className="game-cover-aspect-picker">
              {ASPECT_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={`game-cover-aspect-btn ${
                    aspect === option.value ? "is-active" : ""
                  }`}
                  onClick={() => setAspect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="game-cover-cropper">
              <Cropper
                image={rawPreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="game-cover-zoom"
              aria-label="Zoom"
            />
            <div className="game-cover-crop-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={confirmCrop}
              >
                Valider le cadrage
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={cancelCropping}
              >
                Annuler
              </button>
            </div>
          </>
        ) : (
          <>
            {selectedFile && previewUrl && (
              <div className="game-cover-preview">
                <img
                  src={previewUrl}
                  alt="Aperçu de la couverture"
                  className="field-preview"
                />
              </div>
            )}

            <div className="game-cover-picker-group">
              <div className="game-cover-picker-item">
                <input
                  type="file"
                  id="file"
                  accept="image/*"
                  className="game-cover-input"
                  onChange={handleRawFilePick}
                />
                <label htmlFor="file" className="game-cover-picker">
                  Galerie
                </label>
              </div>
              <div className="game-cover-picker-item">
                <input
                  type="file"
                  id="file-camera"
                  accept="image/*"
                  capture="environment"
                  className="game-cover-input"
                  onChange={handleRawFilePick}
                />
                <label htmlFor="file-camera" className="game-cover-picker">
                  Appareil photo
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="d-flex justify-content-around">
        {selectedFile && !isCropping && (
          <button type="submit" className="btn btn-success" onClick={onSubmit}>
            Ajouter
          </button>
        )}
        <button className="btn btn-warning" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
};

export default GameForm;

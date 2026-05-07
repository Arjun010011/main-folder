import React, { useEffect, useState } from "react";
// import { AiOutlineCheckCircle, AiOutlineCloudUpload } from "react-icons/ai";
import "./styles.scss";
import { Clear } from "@material-ui/icons";

//ref
//https://medium.com/@dprincecoder/creating-a-drag-and-drop-file-upload-component-in-react-a-step-by-step-guide-4d93b6cc21e0

const DragAndDropFile = ({ onFilesSelected, width, height }) => {
  const [files, setFiles] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFiles(selectedFile);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const newFiles = Array.from(droppedFiles);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleRemoveFile = () => {
    setFiles(null);
  };

  useEffect(() => {
    onFilesSelected(files);
  }, [files, onFilesSelected]);

  return (
    <section className="drag-drop" style={{ width: width, height: height }}>
      <div
        className={`document-uploader ${
          files ? "upload-box active" : "upload-box"
        }`}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <>
          <div className="upload-info">
            {/* <AiOutlineCloudUpload /> */}
            <div>
              <p>Drag and drop your profile photo here</p>
              <p>Limit 10MP per file. Supported files: .PNG, .JPEG, .JPG</p>
            </div>
          </div>
          <input
            type="file"
            hidden
            id="browse"
            onChange={handleFileChange}
            accept=".PNG,.JPEG,.JPG"
          />
          <label htmlFor="browse" className="browse-btn">
            Browse photo
          </label>
        </>

        {files && (
          <div className="file-list">
            <div className="file-list__container d-flex">
              <div className="file-info">
                <p>{files.name}</p>
                <p>{files.type}</p>
              </div>
              <div className="file-actions">
                <Clear onClick={() => handleRemoveFile()} />
              </div>
            </div>
          </div>
        )}

        {files && (
          <div className="success-file">
            {/* <AiOutlineCheckCircle
              style={{ color: "#6DC24B", marginRight: 1 }}
            /> */}
            <p> Profile photo selected</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DragAndDropFile;

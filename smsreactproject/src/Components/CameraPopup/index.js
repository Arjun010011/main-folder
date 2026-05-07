import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";
import Webcam from "react-webcam";
import { Camera, CloudUpload } from "@material-ui/icons";
import DragAndDropFile from "Components/DragAndDropFile";

function CameraPopup(props) {
  const [imageSrc, setImageSrc] = React.useState("");
  const [files, setFiles] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const [selected_tab, set_selected_tab] = React.useState("camera");
  const [deviceId, setDeviceId] = React.useState({});
  const [devices, setDevices] = React.useState([]);
  const videoConstraints = {
    width: 500,
    // height: 300,
    facingMode: "user",
  };
  const webcamRef = React.useRef(null);
  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImageSrc(imageSrc);
    setFiles(dataURLtoFile(imageSrc));
    var reader = new FileReader();
    var url = reader.readAsDataURL(dataURLtoFile(imageSrc));
    reader.onloadend = function (e) {
      setPreview(reader.result);
    }.bind(this);
  }, [webcamRef]);

  const dataURLtoFile = (dataurl) => {
    var arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[arr.length - 1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], `profile_pic.jpeg`, { type: mime });
  };

  const handleTemplateOpen = () => {};
  const submitTemplate = () => {
    if(props.submit){
      console.log(files,"--files")
      props.submit(files)
    }
  };

  const handleClick = (value) => {
    set_selected_tab(value);
  };

  const handleSetFile = (files) => {
    if (files) {
      setFiles(files);
      var reader = new FileReader();
      var url = reader.readAsDataURL(files);
      reader.onloadend = function (e) {
        setPreview(reader.result);
      }.bind(this);
    } else {
      setFiles(null);
      setPreview(null);
    }
  };

  const handleDevices = React.useCallback(
    (mediaDevices) =>
      setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput")),
    [setDevices]
  );

  React.useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices);
  }, [handleDevices]);

  return (
    <div>
      <Dialog
        open={true}
        className={"action-new-custom-form-width"}
        aria-labelledby="form-dialog-title"
        onClose={props.handleCloseCamera}
      >
        <DialogTitle id="form-dialog-title"></DialogTitle>
        <DialogContent>
          <DialogContentText>Upload Profile Pic</DialogContentText>
          <div className="d-flex">
            <div
              onClick={() => handleClick("camera")}
              className="pv-10 ph-40 mb-20 pointer"
              style={
                selected_tab === "camera"
                  ? { backgroundColor: "#d9d9d9", border: "3px solid #796b6b" }
                  : { border: "3px solid #796b6b" }
              }
            >
              <Camera className="fs-50" />
            </div>
            <div
              className="pv-10 ph-40 mb-20 pointer"
              onClick={() => handleClick("upload")}
              style={
                selected_tab === "upload"
                  ? {
                      backgroundColor: "#d9d9d9",
                      border: "3px solid #796b6b",
                      borderLeft: "none",
                    }
                  : { border: "3px solid #796b6b", borderLeft: "none" }
              }
            >
              <CloudUpload className="fs-50" />
            </div>
          </div>
          {selected_tab === "camera" && (
            <div className="d-flex">
              <div>
                <div>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={400}
                    videoConstraints={videoConstraints}
                  />
                </div>
                <div>
                  <button onClick={capture}>Capture photo</button>
                </div>
              </div>
              <div className="ml-20">
                <img src={imageSrc} style={{ width: 400 }} />
              </div>
            </div>
          )}
          {selected_tab === "upload" && (
            <div className="d-flex">
              <DragAndDropFile onFilesSelected={handleSetFile} width="50%" />
              {preview && (
                <div>
                  <img src={preview} style={{ width: 300, height: 356 }} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            onClick={props.handleCloseCamera}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            className="submit"
            onClick={submitTemplate}
          >
            Select
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default CameraPopup;

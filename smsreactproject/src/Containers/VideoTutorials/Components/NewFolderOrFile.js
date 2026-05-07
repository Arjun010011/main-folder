import React, { Component } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Tooltip,
  TextField,
  Grid,
  CircularProgress,
  withStyles,
  ListItemIcon,
  MenuItem,
  Menu,
  ListItemText,
} from "@material-ui/core";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import Swal from "sweetalert2";
import AddCircleOutlineOutlined from "@material-ui/icons/AddCircleOutlineOutlined";

import { Dropdown } from "Components/DropDown";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import { maxFileSize } from "Constants";
import {
  support_videos_global,
  support_docs_upload,
} from "Containers/VideoTutorials/Constants";
import QuestionSetVideo from "Containers/VideoTutorials/Components/QuestionSetVideo";
import { setPreviewVideo } from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { supported_images_types } from "Containers/VideoTutorials/Constants";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { image_formats } from "Containers/Expenses/Constants";

const StyledMenu = withStyles({
  paper: {
    border: "1px solid #d3d4d5",
  },
})((props) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "center",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "center",
    }}
    {...props}
  />
));

const fileDetails_global = [
  {
    label: "File Name",
    regex: null,
    autoFocus: true,
    name: "fileName",
    md: 12,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "Description",
    regex: null,
    autoFocus: false,
    name: "fileDescription",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: 6,
    type: "text",
    maxLength: 200,
    multiline: true,
  },
];

const videoDetails_global = [
  {
    label: "Video Title",
    regex: null,
    autoFocus: true,
    name: "fileName",
    md: 12,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "Description",
    regex: null,
    autoFocus: false,
    name: "fileDescription",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: 6,
    type: "text",
    maxLength: 200,
    multiline: true,
  },
];

const multipleDetails_global = [
  {
    label: "Name",
    regex: null,
    autoFocus: true,
    name: "fileName",
    md: 12,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "Description",
    regex: null,
    autoFocus: false,
    name: "fileDescription",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: 6,
    type: "text",
    maxLength: 200,
    multiline: true,
  },
];

export default class NewFolderOrFile extends Component {
  constructor() {
    super();

    this.state = {
      open: false,
      folderDetails: [],
      fieldValue: { fileId: "", imagesPreview: [] },
      fieldError: {},
      infoContent: "",
      openNewMenu: false,
      anchorEl: null,
      uploadingFile: false,
      cancelUpload: false,
      uploadedFile: "",
      fileName: "",
      previewVideo: "",
      setQuestionsOpened: false,
      imageUploading: false,
      largeImagePreview: "",
    };
    this.QuestionSetVideo = React.createRef();
  }

  setDefaultValues = (fieldDetails) => {
    let fieldDetail = fieldDetails;
    let { fieldValue, fieldError, folderDetails } = this.state;
    fieldDetail.map((fields) => {
      fieldValue[fields.name] = fields.default;
      fieldError[fields.name] = "";
    });
    folderDetails = fieldDetail;
    fieldValue["imagesPreview"] = [];
    this.setState({ ...fieldValue, ...fieldError, folderDetails });
  };

  handleOpen = (name) => {
    let { label, submit, submitDisable, infoContent } = this.state;
    let { folderDetails_global } = this.props;
    if (name === "folder") {
      label = "Please Enter Folder Details";
      submit = "Create Folder";
      infoContent = "";
      submitDisable = false;
      this.setDefaultValues(folderDetails_global);
    } else if (name === "file") {
      label = "Please Enter Document Details";
      submit = "Upload Document";
      this.setDefaultValues(fileDetails_global);
      infoContent = "Please Attach Document To upload";
      submitDisable = true;
    } else if (name === "video") {
      label = "Please Enter Video Details";
      submit = "Upload Video";
      this.setDefaultValues(videoDetails_global);
      infoContent = "Please Attach Video To upload";
      submitDisable = true;
    } else if (name === "multiple") {
      label = "Please Upload Multiple Photos";
      submit = "Upload Multiple Photos";
      infoContent = "Please Attach photos To upload";
      submitDisable = true;
      this.setDefaultValues([]);
    }
    this.setState({
      openNewMenu: false,
      label: label,
      submit: submit,
      open: true,
      status: name,
      submitDisable,
      infoContent,
      uploadedFile: "",
      cancelUpload: false,
      errorContent: "",
    });
  };

  handleClose = () => {
    let { fieldValue, uploadingFile } = this.state;
    if (uploadingFile) {
      this.props.uploadingDetails(fieldValue.fileName, "info");
    }
    this.setState({
      open: false,
    });
  };

  validate = (status) => {
    let { fieldValue, fieldError, folderDetails } = this.state;
    let test = true;
    folderDetails.forEach((field) => {
      let value = fieldValue[field.name];
      let name = field.name;
      if (field.required && (value === "" || value === null || value === 0)) {
        fieldError[name] = `${field.label} is Mandatory`;
        test = false;
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldError[name] = field.regex.errorText;
        test = false;
      }
    });
    if (status === "file" && fieldValue["fileId"] === "") {
      test = false;
    }
    this.setState({
      fieldError,
    });
    return test;
  };

  submit = () => {
    const { status, fieldValue, fileName, fieldError, cancelUpload } =
      this.state;
    this.setState({ submitDisable: true });
    const { folderId } = this.props;
    let url;
    let postData;
    if (!cancelUpload) {
      if (status === "folder") {
        url = POST_URL.createfolder.api + "?path=tutorials" + "/";
        postData = {
          data: {
            parent_id: folderId,
            name: fieldValue["folderName"],
            description: fieldValue["folderDescription"],
            folder_type: "Folder",
          },
        };
      } else if (status === "file" || status === "video") {
        url = POST_URL.createfile.api + "?path=tutorials" + "/";
        postData = {
          parent_id: folderId,
          name: fieldValue["fileName"],
          upload_file: fieldValue["fileId"],
          file_type: fieldValue["fileExtension"].toLowerCase(),
          description: fieldValue["fileDescription"],
          size: fieldValue["size"],
        };
      } else if (status === "multiple") {
        url = POST_URL.createfile.api + "?path=tutorials" + "/";
        postData = {
          parent_id: folderId,
          is_multiple: true,
          data_list: fieldValue["imagesPreview"],
        };
      }
      let props = { ...this.props };
      props["return_error_message"] = true;
      postRequest(url, postData, props).then((response) => {
        if (response && response.status === 200) {
          this.setState({ submitDisable: false, uploadingFile: false }, () => {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            }).then(this.props.getFolderDetails(folderId));
            if (status !== "folder") {
              this.props.uploadingDetails("Multiple Upload", "success", {
                type: status,
                tree_ids: response.data.tree_item_ids,
              });
            } else {
              this.props.uploadingDetails(fieldValue["folderName"], "success", {
                description: fieldValue["folderDescription"],
                type: status,
                tree_id: response.data.tree_item_id,
              });
            }
            this.handleClose();
          });
        } else {
          if (!cancelUpload && status !== "folder")
            this.props.uploadingDetails(
              fieldValue["fileName"],
              "error",
              response
            );
          this.setState({
            uploadingFile: false,
            open: true,
            errorContent: response,
            uploadedFile: fileName,
            fieldError,
          });
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleChange = (e) => {
    let { name, value } = e.target;
    let { fieldValue, fieldError } = this.state;
    fieldValue[name] = value;
    fieldError[name] = "";
    this.setState({
      fieldValue,
      fieldError,
    });
  };

  handleMultipleChange = (e, index) => {
    let { name, value } = e.target;
    let { fieldValue, fieldError } = this.state;
    fieldValue.imagesPreview[index][name] = value;
    this.setState({
      fieldValue,
      fieldError,
    });
  };

  handleChangeProfile = async (event, acceptFileType) => {
    let { fieldValue, cancelUpload, status } = this.state;
    this.setState({ uploadingFile: true });
    let previewVideo = "";
    let size = event.target.files[0]["size"];
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let error;
    let support_test = true;
    if (status === "file") {
      support_test = support_docs_upload.file_types.includes(file_extension);
      error = support_docs_upload.error;
    } else {
      support_test = support_videos_global.video_types.includes(file_extension);
      error = support_videos_global.error;
      if (support_test) {
        let preview = {
          url: URL.createObjectURL(event.target.files[0]),
          name: fieldValue.fileName,
          description: fieldValue.description,
        };
        setPreviewVideo(preview);
        this.setState(
          {
            previewVideo,
            openNewMenu: false,
          },
          () => {
            this.props.uploadingDetails(fieldValue.fileName, "info");
          }
        );
      }
    }
    if (event.target.files[0]) {
      if (support_test) {
        if (size < maxFileSize[acceptFileType].size) {
          let post = new FormData();
          post.append("file", event.target.files[0]);
          post.append("store_id", String("storeId"));
          const url = POST_URL.uploads.api;
          postRequest(url, post, this.props).then((response) => {
            if (response && response.status === 200) {
              fieldValue["fileExtension"] = file_extension;
              fieldValue["size"] = size;
              fieldValue["fileId"] = response.data.data.id;
              this.setState(
                {
                  fieldValue,
                  submitDisable: false,
                  infoContent: "",
                  errorContent: "",
                  error: "",
                  fileName,
                },
                () => {
                  if (!cancelUpload) {
                    this.submit();
                  }
                }
              );
            } else {
              this.props.uploadingDetails(fieldValue.fileName, "error");
            }
          });
        } else {
          this.setState({
            errorContent: maxFileSize[acceptFileType].errorText,
            uploadingFile: false,
            submitDisable: false,
          });
        }
      } else {
        this.setState({
          errorContent: error,
          uploadingFile: false,
        });
      }
    }
  };

  handleClickMenu = (e) => {
    this.setState({
      anchorEl: e.currentTarget,
      openNewMenu: Boolean(e.currentTarget),
    });
  };

  handleMenuClose = () => {
    this.setState({
      openNewMenu: false,
    });
  };

  getIcon = () => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 36 36"
      >
        <path fill="#34A853" d="M16 16v14h4V20z" />
        <path fill="#4285F4" d="M30 16H20l-4 4h14z" />
        <path fill="#FBBC05" d="M6 16v4h10l4-4z" />
        <path fill="#EA4335" d="M20 16V6h-4v14z" />
        <path fill="none" d="M0 0h36v36H0z" />
      </svg>
    );
  };

  cancelUploading = () => {
    this.setState({
      cancelUpload: true,
      uploadingFile: false,
    });
  };

  clearFileName = () => {
    let { infoContent } = this.state;
    infoContent = "Please Attach Document";
    this.setState({
      uploadedFile: "",
      infoContent,
    });
  };

  handleMultipleUploadImages = (event, acceptFileType) => {
    let { fieldValue } = this.state;
    let file_list = event.target.files;
    let file_name = "";
    let file_extension = "";
    let validateImage = true;
    let is_supported_image_type = true;
    let is_image_size_limit = true;
    let post = new FormData();
    for (const data in file_list) {
      file_name = file_list[data]["name"];
      if (file_name && !isNaN(data)) {
        file_extension = `${file_name.slice(
          (Math.max(0, file_name.lastIndexOf(".")) || Infinity) + 1
        )}`;
        is_supported_image_type = supported_images_types.image_type.includes(
          file_extension.toLowerCase()
        );
        if (file_list[data].size > maxFileSize[acceptFileType].size) {
          is_image_size_limit = false;
          validateImage = false;
        }
        if (is_supported_image_type) {
          post.append(file_name, file_list[data]);
        } else {
          validateImage = false;
        }
      }
    }
    if (validateImage) {
      let url = POST_URL.multipleupload.api;
      this.setState({ imageUploading: true });
      postRequest(url, post, this.props).then((response) => {
        if (response && response.status === 200) {
          let uploadedId = "";
          let imagePreview = "";
          let imageName = "";
          let file_extension = "";
          let temp_file = {};
          response.data.data.map((data) => {
            uploadedId = data.id;
            imagePreview = data.file;
            imageName = data.file_name.split(".").slice(0, -1).join(".");
            file_extension = `${data.file_name.slice(
              (Math.max(0, data.file_name.lastIndexOf(".")) || Infinity) + 1
            )}`;
            temp_file = {
              file_type: file_extension,
              file: data,
              upload_file: uploadedId,
              url: imagePreview,
              name: imageName,
              size: data.size,
            };
            fieldValue.imagesPreview.push(temp_file);
          });
          this.setState({
            fieldValue,
            uploadedFile: fieldValue.imagesPreview.length > 0 ? true : false,
            submitDisable: fieldValue.imagesPreview.length > 0 ? false : true,
            imageUploading: false,
            fileName: "Multiple",
          });
        }
      });
    } else {
      this.setState({
        errorContent: is_supported_image_type
          ? maxFileSize[acceptFileType].errorText
          : supported_images_types.error,
        alertData: is_supported_image_type
          ? maxFileSize[acceptFileType].errorText
          : supported_images_types.error,
        openSnackbar: true,
      });
    }
  };

  deleteUploadedImage = (index) => {
    let { fieldValue } = this.state;
    fieldValue.imagesPreview.splice(index, 1);
    // const url = DEL_URL.uploads.api + transaction['receipt'] + '/'
    // deleteRequest(url, {}, this.props).then(response => {
    //     if (response && response.status === 200) {
    //         transaction['receipt'] = ''
    //         transaction['receipt_preview'] = ''
    //         transaction['receipt_name'] = ''
    //         transaction['receipt_extension'] = ''
    //         this.setState({
    //             transaction,
    //             upload_name: 'Upload Receipt'
    //         })
    //     }
    // })
    this.setState({
      fieldValue,
    });
  };

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  render() {
    const {
      open,
      fieldValue,
      fieldError,
      submitDisable,
      folderDetails,
      status,
      label,
      submit,
      uploadingFile,
      infoContent,
      errorContent,
      openNewMenu,
      anchorEl,
      uploadedFile,
      imageUploading,
      largeImagePreview,
    } = this.state;
    return (
      <Box className="end-flex-prop">
        {largeImagePreview && (
          <Box className="set-question-large-image-preview-box">
            <img
              src={largeImagePreview}
              alt="Image Preview"
              className="set-question-large-image-preview"
            />
            <Tooltip title="Close Image" placement="top-start">
              <Box
                className="set-question-large-image-remove-icon-box"
                onClick={this.handleCloseLargeImage}
              >
                <HighlightOffIcon className="set-question-large-image-remove-icon" />
              </Box>
            </Tooltip>
          </Box>
        )}
        <Button
          aria-controls="customized-menu"
          aria-haspopup="true"
          variant="contained"
          onClick={(e) => this.handleClickMenu(e)}
          className="upload-new-button"
        >
          <AddCircleOutlineOutlined className="visibility-icon" /> New
        </Button>

        <StyledMenu
          className="margin-top-10"
          id="customized-menu"
          anchorEl={anchorEl}
          keepMounted
          open={openNewMenu}
          onClose={this.handleMenuClose}
        >
          <MenuItem onClick={() => this.handleOpen("folder")}>
            <ListItemIcon>
              <Box>New Folder</Box>
            </ListItemIcon>
          </MenuItem>
          <MenuItem
            onClick={() => this.handleOpen("file")}
            disabled={uploadingFile}
          >
            <ListItemIcon>
              <Box>New Document</Box>
            </ListItemIcon>
          </MenuItem>
          <MenuItem
            onClick={() => this.handleOpen("video")}
            disabled={uploadingFile}
          >
            <ListItemIcon>
              <Box>Upload Video</Box>
            </ListItemIcon>
          </MenuItem>
          <MenuItem
            onClick={() => this.handleOpen("multiple")}
            disabled={uploadingFile}
          >
            <ListItemIcon>
              <Box>Multiple Photos</Box>
            </ListItemIcon>
          </MenuItem>
        </StyledMenu>
        <Dialog
          open={open}
          className={
            status === "multiple"
              ? "action-view-bank-width"
              : "action-basic-detail-width"
          }
          onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
        >
          <Box className="close-icon-top-end">
            <HighlightOffIcon
              className="end-flex-prop"
              onClick={this.handleClose}
            />
          </Box>
          <DialogContent>
            <DialogContentText className="flex-justify-center-flex-prop ">
              {label}
            </DialogContentText>
            {folderDetails.map((field, index) => (
              <Grid
                item
                md={field.md}
                key={index}
                xs={12}
                sm={12}
                className="margin-top-20"
              >
                {field.type === "text" && (
                  <TextField
                    id={field.id}
                    multiline={field.multiline}
                    label={field.label}
                    name={field.name}
                    value={fieldValue[field.name]}
                    className={field.className}
                    autoFocus={field.autoFocus}
                    rows={field.rows}
                    variant="outlined"
                    inputProps={{ maxLength: field.maxLength }}
                    helperText={
                      field.name === "fileDescription" ||
                      field.name === "folderDescription"
                        ? fieldValue[field.name].length > 180 &&
                          "Maximum Of 200 Characters Allowed"
                        : fieldError[field.name]
                    }
                    error={fieldError[field.name] === "" ? false : true}
                    onChange={(e) => this.handleChange(e)}
                  />
                )}
                {field.type === "dropDown" &&
                  fieldValue[field.name] !== undefined && (
                    <Dropdown
                      data={field.list}
                      name={field.name}
                      value={fieldValue[field.name]}
                      onChange={(e) => this.handleSearchChange(e, field)}
                      error={fieldError[field.name]}
                      label={field.label}
                      style={field.className}
                      disabled={field.disabled}
                      required={field.required}
                    />
                  )}
              </Grid>
            ))}
            {(status === "file" || status === "video") &&
              !uploadingFile &&
              uploadedFile === "" && (
                <Box className="upload-document-logo">
                  <label
                    htmlFor={fieldValue["fileName"] ? "upload-pic" : ""}
                    onClick={() =>
                      !fieldValue["fileName"] ? this.validate(status) : ""
                    }
                  >
                    <Button
                      variant="raised"
                      component="span"
                      className="upload-document-logo-button"
                    >
                      Upload {status}
                      <Box className="upload-icon">
                        <i class="fa fa-upload" aria-hidden="true"></i>
                      </Box>
                    </Button>
                  </label>
                  <input
                    type="file"
                    id="upload-pic"
                    className="display-none"
                    onChange={(e) => this.handleChangeProfile(e, status)}
                    onClick={(e) => (e.target.value = null)}
                  />
                </Box>
              )}
            {status === "multiple" && (
              <Box className="">
                <div className="text-align-center">
                  <label
                    htmlFor={`upload-pic`}
                    className={imageUploading ? "upload-icon-uploading" : ""}
                  >
                    <Button
                      variant="raised"
                      component="span"
                      disabled={imageUploading}
                      className="set-question-upload-images-button"
                    >
                      Upload Images
                      <Box className="upload-icon">
                        <i className="fa fa-upload" aria-hidden="true"></i>
                      </Box>
                    </Button>
                    <Box
                      className={
                        imageUploading
                          ? "image-uploading-circular-icon"
                          : "display-none"
                      }
                    >
                      <CircularProgress className="set-question-upload-image-loading" />{" "}
                    </Box>
                  </label>
                  <input
                    disabled={imageUploading}
                    multiple
                    type="file"
                    id={`upload-pic`}
                    className="display-none"
                    onChange={(e) => this.handleMultipleUploadImages(e, "img")}
                    onClick={(e) => (e.target.value = null)}
                  />
                </div>
                <Box className="">
                  {fieldValue.imagesPreview &&
                    fieldValue.imagesPreview.map((temp, index) => {
                      return (
                        <div className="d-flex mt-20">
                          <Box className="set-question-image-preview-outer-box">
                            <Tooltip
                              title="Preview Image"
                              placement="top-start"
                            >
                              <img
                                src={temp.url}
                                alt="image"
                                className="set-question-uploaded-image"
                              />
                            </Tooltip>
                            <Box
                              onClick={() =>
                                this.handleLargePreview(
                                  temp.file_extension,
                                  temp.url
                                )
                              }
                              className="set-question-image-preview-icon"
                            >
                              <VisibilityOutlinedIcon />{" "}
                            </Box>
                          </Box>
                          <TextField
                            className="width-350px"
                            id={index}
                            label={"Title"}
                            name={"name"}
                            value={temp["name"]}
                            variant="outlined"
                            inputProps={{ maxLength: 200 }}
                            helperText={
                              fieldError[temp.name] && fieldError[temp.name]
                            }
                            error={
                              fieldError[temp.name] && fieldError[temp.name]
                            }
                            onChange={(e) =>
                              this.handleMultipleChange(e, index)
                            }
                            size="small"
                          />
                          <Box
                            className=""
                            onClick={() => this.deleteUploadedImage(index)}
                          >
                            <DeleteOutlineIcon className="add-icon-stock-item text-red pointer" />
                          </Box>
                        </div>
                      );
                    })}
                </Box>
              </Box>
            )}
            {uploadedFile != "" && status !== "multiple" && (
              <Box className="display-flex">
                <Box>{uploadedFile}</Box>
                <Box onClick={() => this.clearFileName()}>
                  <HighlightOffIcon className="close-icon--new-file-uploading" />
                </Box>
              </Box>
            )}
            {(status === "file" || status === "video") &&
              uploadingFile &&
              uploadedFile === "" && (
                <Box className="flex-justify-center">
                  <CircularProgress />
                </Box>
              )}
            {infoContent && !errorContent && (
              <Box className="new-file-attache-text">{infoContent}</Box>
            )}
            {errorContent && (
              <Box className="new-file-error-text">{errorContent}</Box>
            )}
          </DialogContent>
          {(status === "folder" || uploadedFile !== "") && (
            <DialogActions>
              <Button onClick={() => this.handleClose()} color="secondary">
                Cancel
              </Button>
              <Button
                texttransform="none"
                disabled={submitDisable}
                onClick={() => this.submit()}
                color="primary"
              >
                {submit}
              </Button>
            </DialogActions>
          )}
        </Dialog>
        <QuestionSetVideo ref={this.QuestionSetVideo} />
      </Box>
    );
  }
}

import React from "react";
import {
  Paper,
  Box,
  Breadcrumbs,
  Button,
  Tooltip,
  CircularProgress,
  Grow,
  Grid,
} from "@material-ui/core";
import FolderRoundedIcon from "@material-ui/icons/FolderRounded";
import HomeOutlinedIcon from "@material-ui/icons/HomeOutlined";
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import loadingBar from "images/loading.gif";
import Swal from "sweetalert2";
import CloseRoundedIcon from "@material-ui/icons/CloseRounded";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

import MoveToFolder from "Containers/VideoTutorials/Components/MoveToFolder";
import NewFolderOrFile from "Containers/VideoTutorials/Components/NewFolderOrFile";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import RenameFolderOrFile from "Containers/VideoTutorials/Components/RenameFolderOrFile";
import ViewFolderDetails from "Containers/VideoTutorials/Components/ViewFolderDetails";
import SetupPage from "Containers/VideoTutorials/Components/SetupPage";
import {
  folderMenu_Global,
  fileMenu_Global,
  general_Global,
  file_default_image,
  support_docs_global,
  supported_images_types,
} from "Containers/VideoTutorials/Constants";
import QuestionSetVideo from "Containers/VideoTutorials/Components/QuestionSetVideo";
import { Actions } from "Constants/permissions";
import SetPermissions from "Containers/VideoTutorials/Components/SetPermissions";
import "./styles.scss";
import { getUrlParam } from "Includes/functions";

function Alert(props) {
  return <MuiAlert elevation={2} variant="filled" {...props} />;
}

const folderDetails_global = [
  {
    label: "Folder Name",
    regex: null,
    autoFocus: true,
    name: "folderName",
    md: 12,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
    list: [],
  },
  {
    label: "Description",
    regex: null,
    autoFocus: false,
    name: "folderDescription",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: 3,
    type: "text",
    maxLength: 200,
    multiline: true,
  },
];

class UploadVideo extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      folderList: [],
      fileList: [],
      breadcrumbsList: [],
      folderItems: [],
      generalItems: [],
      fileItems: [],
      selectedFolderList: [],
      selectedFileList: [],
      selectedFolderMenuList: [],
      selectedFolder: "",
      selectedFile: "",
      loading: true,
      folderLoading: false,
      folderSetup: false,
      openPreview: false,
      previewUrl: "",
      previewType: "",
      fieldDetails: [],
      uploading: { uploadingStatus: "false", uploadingName: "" },
      isMobileScreen: false,
      folderId: 1,
      getFolderDetails: this.getFolderDetails.bind(this),
    };
    this.QuestionSetVideo = React.createRef();
    this.newFolderOrFile = React.createRef();
    this.setPermission = React.createRef();
  }

  static getDerivedStateFromProps(props, state) {
    let { id } = getUrlParam();
    if (!id) {
      id = 1;
    }
    if (state.folderId && id != state.folderId) {
      return {
        model: state.getFolderDetails(id),
      };
    }
  }

  componentDidMount() {
    let { id } = getUrlParam();
    if (!id) {
      id = 1;
    }
    this.getFolderDetails(id);
    window.addEventListener("resize", this.resize.bind(this));
    this.resize();
  }

  resize() {
    this.setState({ isMobileScreen: window.innerWidth <= 760 });
  }

  getFolderDetails = async (id) => {
    let { fieldDetails } = this.state;
    fieldDetails = [...folderDetails_global];
    const url = GET_URL.getfoldercontent.api + id + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = [...response.data.breadcrumbs];
        let temp = tempList.pop();
        let parentFolder = 1;
        if (temp) {
          parentFolder = temp.tree_id;
        }
        this.setState(
          {
            folderList: response.data?.folders ?? [],
            fileList: response.data?.files ?? [],
            breadcrumbsList: response.data.breadcrumbs,
            folderId: id,
            loading: false,
            folderLoading: false,
            parentFolder,
            selectedFolder: "",
            selectedFile: "",
            fieldDetails,
          },
          () => {
            this.refs.MoveToFolder.updateFolderList(response.data);
          }
        );
      }
    });
  };

  setupPageList = (id) => {
    let fieldValue;
    let params;
    if (id === 0) {
      fieldValue = {
        label: "Academic Year",
        name: "name",
        url: GET_URL.getacademicyear.api,
      };
      params = [{ key: "is_active", value: true }];
    } else if (id === 1) {
      fieldValue = {
        label: "Standard",
        name: "name",
        url: GET_URL.getstandard.api,
      };
      params = [{ key: "is_active", value: true }];
    }
    this.refs.setupPage.getList(fieldValue, params);
  };

  handleOpenFolder = (id) => {
    const { folderId } = this.state;
    if (id && parseInt(folderId) !== parseInt(id)) {
      this.setState({
        folderLoading: true,
      });
      this.handleClearSelectedFolder();
      this.routeToFolderDetails(id);
    }
  };

  routeToFolderDetails = (id) => {
    let sectionInformation = {
      id: id,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.upload_tutorials.create.url,
      search: searchParam,
    });
  };

  handleClickBreadCrumb = (event) => {
    event.preventDefault();
  };

  handleCustomOpen = (status, temp) => {
    let {
      folderItems,
      generalItems,
      fileItems,
      selectedFile,
      selectedFolder,
      selectedFolderName,
      selectedFolderDetails,
      selectedFileDetails,
      selectedFileName,
    } = this.state;
    let id;
    let name;
    if (temp) {
      id = temp.tree_id;
      name = temp.name;
    }
    if (status === "general") {
      generalItems = general_Global;
    } else if (status === "folder") {
      folderItems = folderMenu_Global;
      selectedFolder = id;
      selectedFolderName = name;
      selectedFolderDetails = temp;
    } else if (status === "file") {
      fileItems = fileMenu_Global;
      selectedFile = id;
      selectedFileName = name;
      selectedFileDetails = temp;
    }
    this.setState({
      folderItems,
      generalItems,
      fileItems,
      selectedFolder,
      selectedFile,
      selectedFolderName,
      selectedFileName,
      selectedFolderDetails,
      selectedFileDetails,
    });
  };

  handleGeneralCustomMenu = (id) => {
    if (id === 1) {
      this.newFolderOrFile.current.handleOpen("folder");
    } else if (id === 2) {
      this.newFolderOrFile.current.handleOpen("file");
    } else if (id === 3) {
      this.newFolderOrFile.current.handleOpen("video");
    }
  };

  handleSelectedFolder = (e, temp) => {
    e.stopPropagation();
    let {
      selectedFolderList,
      selectedFolderMenuList,
      selectedFolder,
      selectedFolderName,
      selectedFolderDetails,
    } = this.state;
    let id = temp.tree_id;
    let name = temp.name;
    selectedFolderMenuList = folderMenu_Global;
    if (!selectedFolderList.includes(id)) {
      selectedFolder = id;
      selectedFolderName = name;
      temp.permission = parseInt(temp.permission);
      selectedFolderDetails = temp;
      if (selectedFolderList.length === 0) {
        selectedFolderList.push(id);
      } else {
        selectedFolderList = [];
        selectedFolderList.push(id);
      }
    } else if (selectedFolderList.includes(id)) {
      selectedFolderList.map((data, index) => {
        if (data === id) {
          selectedFolderList.splice(index, 1);
        }
      });
    }
    this.setState({
      selectedFolderList,
      selectedFolderMenuList,
      selectedFolder,
      selectedFileList: [],
      selectedFolderName,
      selectedFolderDetails,
    });
  };

  handleSelectedFile = (e, temp) => {
    e.stopPropagation();
    let {
      selectedFileList,
      selectedFileMenuList,
      selectedFile,
      selectedFileName,
      selectedFileDetails,
    } = this.state;
    let id = temp.tree_id;
    let name = temp.name;
    selectedFileMenuList = fileMenu_Global;
    if (!selectedFileList.includes(id)) {
      selectedFile = id;
      selectedFileName = name;
      temp.permission = parseInt(temp.permission);
      selectedFileDetails = temp;
      if (selectedFileList.length === 0) {
        selectedFileList.push(id);
      } else {
        selectedFileList = [];
        selectedFileList.push(id);
      }
    } else if (selectedFileList.includes(id)) {
      selectedFileList.map((data, index) => {
        if (data === id) {
          selectedFileList.splice(index, 1);
        }
      });
    }
    this.setState({
      selectedFileList,
      selectedFile,
      selectedFileMenuList,
      selectedFolderList: [],
      selectedFileName,
      selectedFileDetails,
    });
  };

  handleClearSelectedFolder = () => {
    this.setState({
      selectedFolderList: [],
      selectedFileList: [],
    });
  };

  handleFolderCustomMenu = (id) => {
    let { selectedFolder, selectedFolderName, selectedFolderDetails } =
      this.state;
    if (id === 1) {
      let ref = this.refs[`folder_${selectedFolder}`];
      this.handleOpenFolder(selectedFolder);
    } else if (id === 2) {
      this.refs.viewFolderDetails.handleOpen("folder", selectedFolderDetails);
    } else if (id === 3) {
      this.refs.renameFolderOrFile.handleOpen(
        "folder",
        selectedFolder,
        selectedFolderName
      );
    } else if (id === 4) {
      let ref = this.refs[`folder_${selectedFolder}`];
      this.refs.MoveToFolder.handleClick(ref);
    } else if (id === 5) {
      this.deleteFoldersOrFile("folder");
    } else if (id === 6) {
      this.setPermission.current.handleOpen("folder", selectedFolderDetails);
    }
  };

  handleFileCustomMenu = (id) => {
    let {
      selectedFile,
      selectedFileName,
      selectedFileDetails,
      previewUrl,
      previewType,
    } = this.state;
    if (id === 1) {
      this.refs.viewFolderDetails.handleOpen("file", selectedFileDetails);
    } else if (id === 2) {
      this.refs.renameFolderOrFile.handleOpen(
        "file",
        selectedFile,
        selectedFileName
      );
    } else if (id === 3) {
      let ref = this.refs[`file_${selectedFile}`];
      this.refs.MoveToFolder.handleClick(ref);
    } else if (id === 4) {
      this.deleteFoldersOrFile("file");
    } else if (id === 5) {
      previewUrl = selectedFileDetails["document_url"]["file"];
      previewType = selectedFileDetails["file_type"];
      this.setState({
        previewUrl,
        previewType,
        openPreview: true,
      });
    } else if (id === 6) {
      this.setPermission.current.handleOpen("file", selectedFileDetails);
    }
  };

  handleClickPreview = (temp) => {
    let { previewUrl, previewType } = this.state;
    previewUrl = temp.document_url.file;
    previewType = temp.file_type;
    this.setState({
      previewUrl,
      previewType,
      openPreview: true,
    });
  };

  deleteFoldersOrFile = (name) => {
    let {
      selectedFolderList,
      selectedFolder,
      folderId,
      selectedFileList,
      selectedFile,
    } = this.state;
    let deleteList = [];
    let url;
    let data;
    if (name === "folder") {
      if (selectedFolderList && selectedFolderList.length > 0) {
        deleteList = selectedFolderList;
      } else {
        deleteList.push(selectedFolder);
      }
      url = DEL_URL.createfolder.api + folderId + "/";
      data = {
        data: deleteList,
      };
    } else if (name === "file") {
      if (selectedFileList && selectedFileList.length > 0) {
        deleteList = selectedFileList;
      } else {
        deleteList.push(selectedFile);
      }
      url = DEL_URL.createfile.api + folderId + "/";
      data = {
        data: deleteList,
      };
    }

    deleteRequest(url, data, this.props).then((response) => {
      if (response && response.status === 200) {
        this.getFolderDetails(folderId);
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  handleClosePreview = () => {
    this.setState({
      openPreview: false,
    });
  };

  uploadingDetails = (name, status, reason) => {
    let { uploading, parentFolder } = this.state;
    let parent_tree_id = parentFolder === 1 ? "" : parentFolder;
    if (status === "info") {
      uploading = {
        uploadingStatus: status,
        uploadingName: `${name} is Uploading`,
      };
    } else if (status === "success") {
      uploading = {
        uploadingStatus: status,
        uploadingName: `${name} is uploaded`,
      };
      this.setState(
        {
          uploading,
          
        },
        () => {
          // if (reason.type === "multiple") {
          //   this.setPermission.current.handleOpen(
          //     "multiple",
          //     reason,
          //     parent_tree_id
          //   );
          // } else {
          //   this.setPermission.current.handleOpen(
          //     reason?.type,
          //     {
          //       tree_id: reason?.tree_id,
          //       name: name,
          //       description: reason?.description,
          //       file_type: reason?.file_type,
          //     },
          //     parent_tree_id
          //   );
          // }
        }
      );
    } else if (status === "error") {
      uploading = { uploadingStatus: status, uploadingName: `${reason}` };
    }
    this.setState({
      uploading,
    });
  };

  closeUploading = () => {
    let { uploading } = this.state;
    uploading = { uploadingStatus: "false", uploadingName: "" };
    this.setState({
      uploading,
    });
    this.newFolderOrFile.current.cancelUploading();
  };

  handleDownloadFile = () => {
    const { previewUrl } = this.state;
    window.open(previewUrl, "_blank");
    this.handleClosePreview();
  };

  handleButtonPress = (name, temp) => {
    this.buttonPressTimer = setTimeout(
      () => this.handleCustomOpen(name, temp),
      200
    );
  };

  handleButtonRelease = () => {
    clearTimeout(this.buttonPressTimer);
  };

  render() {
    const {
      folderList,
      fileList,
      breadcrumbsList,
      folderId,
      folderItems,
      generalItems,
      selectedFolderList,
      selectedFolderMenuList,
      moveId,
      loading,
      folderLoading,
      selectedFolder,
      fileItems,
      selectedFile,
      selectedFileList,
      selectedFileMenuList,
      parentFolder,
      folderSetup,
      openPreview,
      previewUrl,
      fieldDetails,
      uploading,
      selectedFileName,
      selectedFolderName,
      previewType,
      isMobileScreen,
      selectedFolderDetails,
      selectedFileDetails,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Paper className="upload-video-background">
          <Box className="heading">Video Tutorials</Box>
          <Grid container className="upload-handle-reverse">
            <Grid item xs={12} md={10}>
              <Breadcrumbs
                maxItems={5}
                aria-label="breadcrumb"
                className="breadcrumb-margin"
              >
                <Button
                  className="breadcrumb"
                  onClick={() => this.handleOpenFolder("1")}
                >
                  <HomeOutlinedIcon />
                  Home
                </Button>
                {breadcrumbsList.map((temp) => {
                  return (
                    <Button
                      className="breadcrumb"
                      onClick={() => this.handleOpenFolder(temp.tree_id)}
                    >
                      {temp.name}
                    </Button>
                  );
                })}
              </Breadcrumbs>
            </Grid>
            <Grid item xs={12} md={2}>
              <NewFolderOrFile
                folderId={folderId}
                getFolderDetails={this.getFolderDetails}
                uploadingDetails={this.uploadingDetails}
                folderDetails_global={fieldDetails}
                ref={this.newFolderOrFile}
              />
            </Grid>
          </Grid>

          <RenameFolderOrFile
            folderId={folderId}
            getFolderDetails={this.getFolderDetails}
            ref="renameFolderOrFile"
          />

          <ViewFolderDetails
            folderId={folderId}
            getFolderDetails={this.getFolderDetails}
            ref="viewFolderDetails"
          />
          {openPreview && (
            <Box className="view-details-preview-background">
              <Box className="view-details-preview-close-icon">
                <CloseRoundedIcon
                  onClick={this.handleClosePreview}
                  className="view-details-close-icon"
                />
              </Box>
              {support_docs_global.file_types.includes(previewType) && (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${previewUrl}`}
                  width={isMobileScreen ? "100%" : "90%"}
                  height="100%"
                ></iframe>
              )}
              {!support_docs_global.file_types.includes(previewType) && (
                <Box>{this.handleDownloadFile}</Box>
              )}
            </Box>
          )}
          {folderSetup && <SetupPage ref="setupPage" />}

          {folderLoading && !folderSetup && (
            <Box display="flex" className="custom-menu-height">
              <CircularProgress className="loading" />
            </Box>
          )}
          <ContextMenuTrigger
            id="general_identifier"
            holdToDisplay={isMobileScreen ? "400" : -1}
            disable={isMobileScreen}
          >
            {!folderLoading && !folderSetup && (
              <Box
                onClick={() => this.handleClearSelectedFolder()}
                onContextMenu={() => this.handleCustomOpen("general")}
                className="custom-menu-height"
              >
                {folderList.length > 0 && (
                  <Box className="header-align">Folders</Box>
                )}
                <Box className="header-align folders-list-box">
                  {folderList.map((temp, index) => {
                    return (
                      <Box key={index} className="folder-box">
                        <Box className="handle-width-availability">
                          <ContextMenuTrigger
                            id="folder_identifier"
                            holdToDisplay={isMobileScreen ? "400" : -1}
                          >
                            <Button
                              onTouchStart={() =>
                                this.handleButtonPress("folder", temp)
                              }
                              onTouchEnd={() => this.handleButtonRelease()}
                              aria-describedby={moveId}
                              ref={`folder_${temp.tree_id}`}
                              onContextMenu={() =>
                                this.handleCustomOpen("folder", temp)
                              }
                              onDoubleClick={() =>
                                !isMobileScreen &&
                                this.handleOpenFolder(temp.tree_id)
                              }
                              className={
                                selectedFolderList.includes(temp.tree_id)
                                  ? "selectedFolder folder"
                                  : "folder"
                              }
                              onClick={(e) =>
                                isMobileScreen
                                  ? this.handleOpenFolder(temp.tree_id)
                                  : this.handleSelectedFolder(e, temp)
                              }
                            >
                              <FolderRoundedIcon />
                              <Box className="handle-folder-name-overflow">
                                {temp.name}
                              </Box>
                            </Button>
                          </ContextMenuTrigger>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {fileList && fileList.length > 0 && (
                  <Box className="header-align">Files</Box>
                )}
                <Box className="header-align">
                  <Box className="file-outer-box">
                    {fileList.map((temp, index) => {
                      return (
                        <ContextMenuTrigger
                          key={index}
                          id="file_identifier"
                          holdToDisplay={isMobileScreen ? "400" : -1}
                        >
                          <Box
                            className={
                              selectedFileList.includes(temp.tree_id)
                                ? "selectedFile file-inner-box"
                                : "file-inner-box"
                            }
                            onClick={(e) =>
                              isMobileScreen
                                ? this.handleClickPreview(temp)
                                : this.handleSelectedFile(e, temp)
                            }
                            ref={`file_${temp.tree_id}`}
                            onTouchStart={() =>
                              isMobileScreen
                                ? this.handleButtonPress("file", temp)
                                : ""
                            }
                            onTouchEnd={() =>
                              isMobileScreen ? this.handleButtonRelease() : ""
                            }
                            onDoubleClick={(e) =>
                              !isMobileScreen
                                ? this.handleClickPreview(temp)
                                : ""
                            }
                            onContextMenu={() =>
                              this.handleCustomOpen("file", temp)
                            }
                          >
                            <Box className="file-list-upper-box1">
                              <Box className="file-display-block">
                                <Box className="file-list-upper-box2">
                                  <Box className="file-list-upper-box3"></Box>
                                  <Box className="file-list-upper-box4"></Box>
                                  <Box className="file-list-upper-box5">
                                    {supported_images_types.image_type.includes(
                                      temp.file_type
                                    ) && (
                                      <Box
                                        className="file-list-image-box"
                                        onTouchStart={() =>
                                          this.handleButtonPress("file", temp)
                                        }
                                        onTouchEnd={this.handleButtonRelease}
                                      >
                                        <img
                                          src={temp.document_url.file}
                                          className="file-list-image-height"
                                        />
                                      </Box>
                                    )}
                                    {!supported_images_types.image_type.includes(
                                      temp.file_type
                                    ) && (
                                      <Box
                                        className={
                                          file_default_image[
                                            `${temp.file_type}`
                                          ]["className"]
                                        }
                                        onTouchStart={() =>
                                          this.handleButtonPress("file", temp)
                                        }
                                        onTouchEnd={this.handleButtonRelease}
                                      >
                                        {
                                          file_default_image[
                                            `${temp.file_type}`
                                          ]["tag"]
                                        }
                                      </Box>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                            <Tooltip
                              title={temp.name.length > 35 ? temp.name : ""}
                              enterDelay={500}
                              enterNextDelay={400}
                              placement="top-start"
                              classes={{ tooltip: "tooltip-show-data" }}
                            >
                              <Box
                                className={
                                  temp.name.length > 35
                                    ? "handle-file-name-overflow"
                                    : "file-name"
                                }
                              >
                                {temp.name}
                              </Box>
                            </Tooltip>
                          </Box>
                        </ContextMenuTrigger>
                      );
                    })}
                  </Box>
                </Box>
                {selectedFolderList.length > 0 && (
                  <Grow
                    in={true}
                    style={{ transformOrigin: "0 0 0" }}
                    {...(true ? { timeout: 1000 } : {})}
                  >
                    <Box className="selected-menu-list-alignment">
                      {selectedFolderMenuList.map((temp, index) => {
                        return (
                          <Box key={index}>
                            {temp["permission_mode"].includes(
                              selectedFolderDetails.permission
                            ) &&
                              selectedFolderList.length > 1 &&
                              temp.id === 5 && (
                                <Tooltip
                                  title={temp.label}
                                  enterDelay={700}
                                  enterNextDelay={600}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <Box
                                    className="selected-menu-options"
                                    onClick={() =>
                                      this.handleFolderCustomMenu(temp.id)
                                    }
                                  >
                                    {temp.icon}
                                  </Box>
                                </Tooltip>
                              )}
                            {temp["permission_mode"].includes(
                              selectedFolderDetails.permission
                            ) &&
                              selectedFolderList.length < 2 && (
                                <Tooltip
                                  title={temp.label}
                                  enterDelay={700}
                                  enterNextDelay={600}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <Box
                                    className="selected-menu-options"
                                    onClick={() =>
                                      this.handleFolderCustomMenu(temp.id)
                                    }
                                  >
                                    {temp.icon}
                                  </Box>
                                </Tooltip>
                              )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Grow>
                )}

                {selectedFileList.length > 0 && (
                  <Grow
                    in={true}
                    style={{ transformOrigin: "0 0 0" }}
                    {...(true ? { timeout: 1000 } : {})}
                  >
                    <Box className="selected-menu-list-alignment">
                      {selectedFileMenuList.map((temp, index) => {
                        return (
                          <Box key={index}>
                            {temp["permission_mode"].includes(
                              selectedFileDetails.permission
                            ) &&
                              selectedFileList.length > 1 &&
                              temp.id === 4 && (
                                <Tooltip
                                  title={temp.label}
                                  enterDelay={700}
                                  enterNextDelay={600}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <Box
                                    className="selected-menu-options"
                                    onClick={() =>
                                      this.handleFileCustomMenu(temp.id)
                                    }
                                  >
                                    {temp.icon}
                                  </Box>
                                </Tooltip>
                              )}
                            {temp["permission_mode"].includes(
                              selectedFileDetails.permission
                            ) &&
                              selectedFileList.length < 2 && (
                                <Tooltip
                                  title={temp.label}
                                  enterDelay={700}
                                  enterNextDelay={600}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <Box
                                    className="selected-menu-options"
                                    onClick={() =>
                                      this.handleFileCustomMenu(temp.id)
                                    }
                                  >
                                    {temp.icon}
                                  </Box>
                                </Tooltip>
                              )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Grow>
                )}

                {/* {folderItems.length > 0 && */}
                <ContextMenu id="folder_identifier" className="context-menu">
                  {folderItems.map((data, index) => {
                    return (
                      <Box key={index}>
                        {data["permission_mode"].includes(
                          selectedFolderDetails.permission
                        ) &&
                          selectedFolderList.length > 1 &&
                          data.id === 5 && (
                            <MenuItem
                              onClick={() =>
                                this.handleFolderCustomMenu(data.id)
                              }
                              className="menu-item-box"
                            >
                              {data.icon}
                              <Box className="custom-menu-label">
                                {data.label}
                              </Box>
                            </MenuItem>
                          )}
                        {data["permission_mode"].includes(
                          selectedFolderDetails.permission
                        ) &&
                          selectedFolderList.length < 2 && (
                            <MenuItem
                              onClick={() =>
                                this.handleFolderCustomMenu(data.id)
                              }
                              className="menu-item-box"
                            >
                              {data.icon}
                              <Box className="custom-menu-label">
                                {data.label}
                              </Box>
                            </MenuItem>
                          )}
                      </Box>
                    );
                  })}
                </ContextMenu>
                {/* } */}

                <ContextMenu id="file_identifier" className="context-menu">
                  {fileItems.map((data, index) => {
                    return (
                      <Box key={index}>
                        {data["permission_mode"].includes(
                          selectedFileDetails.permission
                        ) &&
                          selectedFileList.length > 1 &&
                          data.id === 4 && (
                            <MenuItem
                              onClick={() => this.handleFileCustomMenu(data.id)}
                              className="menu-item-box"
                            >
                              {data.icon}
                              <Box className="custom-menu-label">
                                {data.label}
                              </Box>
                            </MenuItem>
                          )}
                        {data["permission_mode"].includes(
                          selectedFileDetails.permission
                        ) &&
                          selectedFileList.length < 2 && (
                            <MenuItem
                              onClick={() => this.handleFileCustomMenu(data.id)}
                              className="menu-item-box"
                            >
                              {data.icon}
                              <Box className="custom-menu-label">
                                {data.label}
                              </Box>
                            </MenuItem>
                          )}
                      </Box>
                    );
                  })}
                </ContextMenu>

                <ContextMenu id="general_identifier" className="context-menu">
                  {generalItems.map((data, index) => {
                    return (
                      <MenuItem
                        key={index}
                        onClick={() => this.handleGeneralCustomMenu(data.id)}
                        className="menu-item-box"
                      >
                        {data.icon}
                        <Box className="custom-menu-label">{data.label}</Box>
                      </MenuItem>
                    );
                  })}
                </ContextMenu>

                <ContextMenuTrigger id="move_folder_identifier">
                  <MoveToFolder
                    folderId={folderId}
                    parentFolder={parentFolder}
                    folderList={folderList}
                    parentSelectedFolder={
                      selectedFolder ? selectedFolder : selectedFile
                    }
                    breadcrumbsList={breadcrumbsList}
                    getFolderDetails={this.getFolderDetails}
                    selectedFolderName={selectedFolderName}
                    selectedName={
                      selectedFileName ? selectedFileName : selectedFolderName
                    }
                    isMobileScreen={isMobileScreen}
                    ref="MoveToFolder"
                  />
                </ContextMenuTrigger>
              </Box>
            )}
          </ContextMenuTrigger>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={uploading.uploadingStatus === "false" ? false : true}
          >
            <Alert
              className="align-alert-message"
              severity={uploading.uploadingStatus}
            >
              <Box className="uploading-outer-box">
                {uploading.uploadingName}
                <Box
                  className={
                    uploading.uploadingStatus === "info"
                      ? "uploading-loading-icon-box"
                      : "display-none"
                  }
                >
                  <CircularProgress className="uploadingLoadingIcon" />
                </Box>
                <Box onClick={this.closeUploading}>
                  <HighlightOffIcon className="close-icon-uploading" />
                </Box>
              </Box>
            </Alert>
          </Snackbar>
          <QuestionSetVideo ref={this.QuestionSetVideo} />
          <SetPermissions ref={this.setPermission} />
        </Paper>
      );
    }
  }
}

export default withRouter(UploadVideo);

import React, { Component } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import FolderRoundedIcon from "@material-ui/icons/FolderRounded";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import EditTwoToneIcon from "@material-ui/icons/EditTwoTone";
import Swal from "sweetalert2";
import PlayCircleOutlineIcon from "@material-ui/icons/PlayCircleOutline";
import { Tabs, Tab } from "@material-ui/core";
import PropTypes from "prop-types";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { getKeyValueMap } from "Includes/functions";
import {
  file_default_image_view_details,
  supported_images_types,
} from "Containers/VideoTutorials/Constants";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import GroupPermission from "Containers/VideoTutorials/Components/GroupPermission";
import UserPermission from "Containers/VideoTutorials/Components/UserPermission";
import StandardPermission from "./StandardPermission";
import SectionPermission from "./SectionPermission";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

export default class SetPermissions extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      submitDisable: false,
      isEditDescription: false,
      description: "",
      selectedDetails: {},
      tabValue: 0,
      groupList: [],
      loadingData: false,
      group_id: [],
      user_id: [],
      standard_id: [],
      section_id: [],
      updateDisable: false,
      group_post_data: null,
      user_post_data: null,
      standard_post_data: null,
      section_post_data: null,
      opensnackbar: false,
      updateParentData: false,
      alertData: "",
      resetState: false,
      userDataExist: false,
      showTabAndData: true,
      isPermissionFromParent: false,
      login_user_id: "",
      user_permission: "",
      is_public: false,
    };
    this.userRef = React.createRef();
  }

  handleOpen = (status, selectedDetails, parentFolder) => {
    const user = JSON.parse(localStorage.getItem("user"));
    let treeId =
      status === "multiple"
        ? selectedDetails?.tree_ids[0]
        : selectedDetails?.tree_id;
    let tree_ids = selectedDetails?.tree_ids ?? [];
    let description = selectedDetails?.description;
    let name = selectedDetails?.name;
    let user_permission = parentFolder ? 4 : selectedDetails?.permission ?? 4;
    let label;
    if (status === "folder") {
      label = `${name} folder details`;
    } else {
      label = `${name} file details`;
    }
    this.setState(
      {
        status,
        tree_ids,
        user_permission,
        treeId,
        name,
        open: true,
        label,
        selectedDetails,
        description,
        tabValue: 0,
        group_post_data: null,
        user_post_data: null,
        standard_post_data: null,
        section_post_data: null,
        resetState: false,
        parentFolder,
        groupList: [],
        login_user_id: parentFolder ? user?.id : selectedDetails?.created_by,
      },
      () => {
        if (!parentFolder) {
          this.setState(
            {
              isPermissionFromParent: false,
            },
            () => {
              this.getGroupsList();
            }
          );
        } else {
          this.setState({
            showTabAndData: false,
            loadingData:false
          });
        }
      }
    );
  };

  handleCopyAction = (isCopy) => {
    const { parentFolder, treeId, status, tree_ids } = this.state;
    if (isCopy) {
      this.setState({ loadingData: true });
      let url = POST_URL.copypermission.api;
      let post_data = {
        copy_from_tree_id: parentFolder,
      };
      if (status === "multiple") {
        post_data["copy_to_tree_ids"] = tree_ids;
      } else {
        post_data["copy_to_tree_id"] = treeId;
      }
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState(
            {
              showTabAndData: true,
              isPermissionFromParent: true,
              loadingData: false,
            },
            () => {
              this.getGroupsList();
            }
          );
        }
      });
    } else {
      this.setState(
        {
          showTabAndData: true,
        },
        () => {
          this.getGroupsList();
        }
      );
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
      isEditDescription: false,
      resetState: true,
    });
  };

  handleEdit = () => {
    this.setState({
      isEditDescription: true,
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  getGroupsList = () => {
    this.setState({ loadingData: true });
    const { treeId, isPermissionFromParent, parentFolder } = this.state;
    let id = isPermissionFromParent ? parentFolder : treeId;
    const params = { tree_item: id };
    getRequest(GET_URL.tutorialgrouppermission.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let groupList = response.data.data.groups;
          let groupMap = getKeyValueMap(groupList, "id", "name");
          this.setState({
            groupList,
            group: 0,
            group_name: "",
            groupMap,
            loadingData: false,
          });
        }
      }
    );
  };

  handleSubmit = () => {
    this.setState({ updateDisable: true });
    if (this.state.userDataExist) {
      this.setState({ updateParentData: true }, () => {
        this.submit();
      });
    } else {
      this.submit();
    }
  };

  submit = async (name) => {
    let {
      group_post_data,
      standard_post_data,
      updateParentData,
      user_post_data,
      section_post_data,
      isPermissionFromParent,
      is_public
    } = this.state;
    let payload = this.validatePayLoad();
    if (payload && !updateParentData) {
      if (is_public) {
        postRequest(
          POST_URL.tutorialgrouppermission.api,
          { "is_public": 1 },
          this.props
        ).then((response) => {
          if (response && response.status === 200) {
            alert(1);
          } else {
            alert(2);
          }
        });
      } else {
        try {
          const res = await Promise.all([
            group_post_data
              ? postRequest(
                  POST_URL.tutorialgrouppermission.api,
                  group_post_data,
                  this.props
                )
              : "",
            standard_post_data
              ? postRequest(
                  POST_URL.tutorialstandardpermission.api,
                  standard_post_data,
                  this.props
                )
              : "",
            user_post_data
              ? postRequest(
                  POST_URL.tutorialuserpermission.api,
                  user_post_data,
                  this.props
                )
              : "",
            section_post_data
              ? postRequest(
                  POST_URL.tutorialstandardsectionpermission.api,
                  section_post_data,
                  this.props
                )
              : "",
          ]);
          if (
            ((res[0] && res[0].status === 200) || res[0] === "") &&
            ((res[1] && res[1].status === 200) || res[1] === "") &&
            ((res[2] && res[2].status === 200) || res[2] === "") &&
            ((res[3] && res[3].status === 200) || res[3] === "")
          ) {
            if (name !== "dontSubmit") {
              this.handleClose();
            }
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Data updated succesfully",
              showConfirmButton: false,
              timer: 1500,
            });
          }
          this.setState({
            updateDisable: false,
          });
        } catch {
          throw Error("Promise failed");
        }
      }
    } else if (!updateParentData && !isPermissionFromParent) {
      this.setState({
        opensnackbar: true,
        alertData: "Select atleast one permission",
        updateDisable: false,
      });
    } else if (isPermissionFromParent) {
      Swal.fire({
        position: "top-end",
        type: "success",
        title: "Data updated succesfully",
        showConfirmButton: false,
        timer: 1500,
      });
      this.handleClose();
      this.setState({
        updateDisable: false,
      });
    }
  };

  validatePayLoad = () => {
    let returnData = false;
    let {
      group_post_data,
      user_post_data,
      standard_post_data,
      section_post_data,
    } = this.state;
    if (
      group_post_data ||
      user_post_data ||
      standard_post_data ||
      section_post_data
    ) {
      returnData = true;
    }
    return returnData;
  };

  handleTabChange = (e, value) => {
    this.setState({
      tabValue: value,
    });
  };

  updateGroupId = (post_data) => {
    let group_temp = post_data;
    this.setState({
      group_post_data: { ...group_temp },
    });
  };

  updateUserId = (post_data) => {
    let user_post_data = post_data;
    this.setState(
      {
        user_post_data,
      },
      () => {
        if (this.state.updateParentData) {
          this.setState(
            {
              updateParentData: false,
            },
            () => {
              this.submit();
            }
          );
        }
      }
    );
  };

  updateStandardId = (post_data) => {
    let standard_temp = post_data;
    this.setState({
      standard_post_data: { ...standard_temp },
    });
  };

  updateStandardSectionId = (post_data) => {
    let section_post_temp = post_data;
    this.setState({
      section_post_data: { ...section_post_temp },
    });
  };

  displayLabel = (name, length, color) => {
    return (
      <div className="w-webkit-fill-available justify-space-even align-items-center">
        <div>{name}</div>
      </div>
    );
  };

  handleCloseSnackBar = () => {
    this.setState({ opensnackbar: false });
  };

  handleUserDataExist = (value) => {
    this.setState({
      userDataExist: value,
    });
  };

  handlePublicAllAction = () => {
    this.setState({
      is_public: !this.state.is_public,
      updateParentData: true,
    });
  };

  render() {
    let {
      open,
      name,
      updateDisable,
      tabValue,
      status,
      selectedDetails,
      resetState,
      showTabAndData,
      groupList,
      loadingData,
      group_id,
      user_id,
      standard_id,
      section_id,
      treeId,
      opensnackbar,
      alertData,
      login_user_id,
      user_permission,
      tree_ids,
      is_public,
    } = this.state;
    let formatType =
      file_default_image_view_details[`${selectedDetails.file_type}`];
    return (
      <div>
        {status && (
          <Dialog
            open={open}
            className="dialog-custom-video-setquestion-form"
            onClose={this.handleClose}
            aria-labelledby="form-dialog-title"
          >
            <Box>
              <div className="d-flex flex-justify-space-between">
                <div className="ml-20 mt-10">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={is_public}
                        name="isEnquiry"
                        value={is_public}
                        color="primary"
                        onChange={(e) => this.handlePublicAllAction(e)}
                      />
                    }
                    label="Is Public"
                  />
                </div>
                <div className="close-icon-top-end">
                  <HighlightOffIcon
                    className="end-flex-prop"
                    onClick={this.handleClose}
                  />
                </div>
              </div>
            </Box>
            <DialogContent
              className={is_public ? "set-permission-content" : ""}
            >
              <Box className="view-details-title">
                {status === "folder" && (
                  <FolderRoundedIcon className="view-details-folder" />
                )}
                {!supported_images_types.image_type.includes(
                  selectedDetails.file_type
                ) &&
                  status === "file" && (
                    <Box className={formatType["className"]}>
                      {formatType["tag"]}
                    </Box>
                  )}
                <Box className="view-details-name">{name}</Box>
              </Box>
              {loadingData && (
                <Box className="loading">
                  <CircularProgress />
                </Box>
              )}
              {!showTabAndData && !loadingData && (
                <div className="copy-permission-div">
                  <Box>
                    Are you sure, want to copy the permission from parent folder
                  </Box>
                  <Box className="leave-pending-approve-reject">
                    <Button
                      className="apply-leave-button"
                      onClick={(e) => this.handleCopyAction(true)}
                    >
                      Copy
                    </Button>
                    <Button
                      className="apply-leave-reset-button "
                      onClick={(e) => this.handleCopyAction(false)}
                    >
                      Don't Copy
                    </Button>
                  </Box>
                </div>
              )}
              {showTabAndData && !loadingData && (
                <Tabs
                  value={tabValue}
                  onChange={this.handleTabChange}
                  aria-label="basic tabs example"
                >
                  <Tab
                    label={this.displayLabel(
                      "Group List",
                      group_id?.length,
                      ""
                    )}
                  />
                  <Tab
                    label={this.displayLabel(
                      "User List",
                      user_id?.length,
                      "orange"
                    )}
                  />
                  <Tab
                    label={this.displayLabel(
                      `${alias_names["standard"]}(s)`,
                      standard_id?.length,
                      "blue"
                    )}
                  />
                  <Tab
                    label={this.displayLabel(
                      `${alias_names["section"]}(s)`,
                      section_id?.length,
                      "sky-blue"
                    )}
                  />
                </Tabs>
              )}
              {showTabAndData && (
                <TabPanel value={tabValue} index={0}>
                  {loadingData ? (
                    <Box className="loading">
                      <CircularProgress />
                    </Box>
                  ) : (
                    <GroupPermission
                      groupList={groupList}
                      updateToParent={this.updateGroupId}
                      treeId={treeId}
                      resetState={resetState}
                      user_permission={user_permission}
                      status={status}
                      tree_ids={tree_ids}
                    />
                  )}
                </TabPanel>
              )}
              <TabPanel value={tabValue} index={1}>
                {loadingData ? (
                  <Box className="loading">
                    <CircularProgress />
                  </Box>
                ) : (
                  <UserPermission
                    updateToParent={this.updateUserId}
                    tabValue={tabValue}
                    treeId={treeId}
                    updateParentData={this.state.updateParentData}
                    resetState={resetState}
                    handleUserDataExist={this.handleUserDataExist}
                    submit={this.submit}
                    login_user_id={login_user_id}
                    user_permission={user_permission}
                    status={status}
                    tree_ids={tree_ids}
                  />
                )}
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                {loadingData ? (
                  <Box className="loading">
                    <CircularProgress />
                  </Box>
                ) : (
                  <StandardPermission
                    updateToParent={this.updateStandardId}
                    tabValue={tabValue}
                    treeId={treeId}
                    resetState={resetState}
                    user_permission={user_permission}
                    status={status}
                    tree_ids={tree_ids}
                  />
                )}
              </TabPanel>
              <TabPanel value={tabValue} index={3}>
                {loadingData ? (
                  <Box className="loading">
                    <CircularProgress />
                  </Box>
                ) : (
                  <SectionPermission
                    updateToParent={this.updateStandardSectionId}
                    tabValue={tabValue}
                    treeId={treeId}
                    user_permission={user_permission}
                    status={status}
                    tree_ids={tree_ids}
                  />
                )}
              </TabPanel>
            </DialogContent>
            {showTabAndData && (
              <DialogActions>
                <Button onClick={this.handleClose} color="secondary">
                  Close
                </Button>
                <Button
                  disabled={updateDisable}
                  onClick={this.handleSubmit}
                  color="primary"
                >
                  Update
                </Button>
              </DialogActions>
            )}
          </Dialog>
        )}
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={opensnackbar}
          autoHideDuration={10000}
          onClose={this.handleCloseSnackBar}
        >
          <Alert onClose={this.handleCloseSnackBar} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </div>
    );
  }
}

import React, { PureComponent } from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import { Grid, Paper, Box, CircularProgress, Button } from "@material-ui/core";
import _ from "lodash";
import Snackbar from "@material-ui/core/Snackbar";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";

import { getRequest, patchRequest } from "Includes/api/apicall";
import { GET_URL, PATCH_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { getKeyValueMap, Alert, getFullName } from "Includes/functions";
import { Actions, screenTypes } from "Constants/permissions";
import AssignPermissionsTable from "./Components/AssignPermissionsTable";
import { getMobileApplicationSetting } from "Containers/GroupsPermissions/functions";
import "./styles.scss";

class PermissionsView extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      permissions: {},
      permissionNames: {},
      group_name: "",
      groupPermissions: [],
      group: 0,
      groupMap: {},
      userMap: {},
      fetchingPermissions: false,
      submittingData: false,
      alertData: "",
      snackbar: false,
      group_permission_codenames: [],
      menu_type: "web",
      MobileAppActions: {},
      isChanged: false
    };
  }

  getGroupsList = () => {
    const params = {};
    getRequest(GET_URL.groups.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const groupList = response.data.data;
        let groupMap = getKeyValueMap(groupList, "id", "name");
        this.setState({ groupList, group: 0, group_name: "", groupMap });
      }
    });
  };
  componentDidMount() {
    // this.getPermissionList();
    this.getGroupsList();
  }
  onChange = async (e) => {
    let { groupPermissions, user, userMap, permissionNames, submittingData, fetchingPermissions } = this.state;
    let { value, name } = e.target;

    if (name === "group") {
      groupPermissions = [];
      user = 0;
      userMap = {};
    }
    if (name === "user") {
      user = value;
      groupPermissions = [];
      permissionNames = {};
      submittingData = false;
      fetchingPermissions = false;
    }
    if (name === "group" && value === 0) {
      this.setState({
        permissionNames: {},
        groupPermissions: [],
        group: 0,
        userMap: {},
        fetchingPermissions: false,
        submittingData: false,
      });
    } else {
      this.setState({ [name]: value, permissionNames, submittingData, fetchingPermissions, groupPermissions, user, userMap }, () => {
        if (name === "group" && value !== 0) {
          this.getGroupPermissions();
          this.getGroupUsers();
        } else if (name === "user" && value === 0) {
          this.getGroupPermissions();
        } else if (name === "user" && value !== 0) {
          this.getUserPermissions();
        }
      });
    }
  };

  getGroupPermissions = () => {
    const { group, menu_type } = this.state;
    const params = { menu_type };
    const url = `${GET_URL.groups.api}${group}/`;
    this.setState({ fetchingPermissions: true, menu_type });
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const responsePermissions = response.data.data;
        const permissions = response.data.data.group.permissions;
        let assigned_permission_codes = [];
        for (const permission of permissions) {
          assigned_permission_codes.push(permission["codename"]);
        }
        this.setState(
          { permissions, assigned_permission_codes, responsePermissions },
          () => {
            this.getPermissionViewList("group");
          }
        );
      }
    });
  };

  getUserPermissions = () => {
    const { user, menu_type } = this.state;
    const params = { menu_type };
    const url = `${GET_URL.users.api}${user}/`;
    this.setState({ fetchingPermissions: true });
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const responsePermissions = response.data.data;
        let user_permissions = responsePermissions.user.user_permissions;
        const groups = responsePermissions.user.groups;
        let group_permissions = [];
        let group_permission_codenames = [];
        for (const permission of groups) {
          group_permissions = group_permissions.concat(permission.permissions);
          group_permissions.forEach((permission) => {
            group_permission_codenames.push(permission.codename);
          });
        }
        user_permissions = user_permissions.concat(group_permissions);
        let assigned_permission_codes = [];
        for (const permission of user_permissions) {
          assigned_permission_codes.push(
            permission["codename"]
          );
        }
        this.setState(
          {
            permissions: user_permissions,
            assigned_permission_codes,
            responsePermissions,
            group_permission_codenames,
          },
          () => {
            this.getPermissionViewList("user");
          }
        );
      }
    });
  };

  getGroupUsers = () => {
    const { group } = this.state;
    const params = { groups: group, is_active: true };
    getRequest(GET_URL.users.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const data = response.data.data;
        let userList = [];
        for (const user of data) {
          let name = user.username;
          if (user.staff) {
            name = getFullName(user.staff.first_name, user.staff.middle_name, user.staff.last_name)
          } else if (user.student) {
            name = getFullName(user.student.first_name, user.student.middle_name, user.student.last_name)
          }
          const userData = { id: user.id, name: name };
          userList.push(userData);
        }
        let userMap = getKeyValueMap(data, "id", "username");
        this.setState({ userList, user: 0, user_name: "", userMap });
      }
    });
  };

  // getPermissionList = () => {
  //     const params = {};
  //     getRequest(GET_URL.permissions.api, params, this.props).then((response) => {
  //         if (response && response.status === 200) {
  //             const permissions = response.data.data;
  //             let permission_id_code_map = {}
  //             for (const permission in permissions){
  //                 permission_id_code_map[permissions[permission]['codename']] = permissions[permission]['id'];
  //             }
  //             this.setState({ permissions, permission_id_code_map });
  //         }
  //     });
  // }

  checkValues = (data, name, checkAll) => {
    let permissionNames = _.cloneDeep(this.state.permissionNames);
    let permissionTypes = ["view", "create", "update", "delete"];
    let isGroupPermissionEnabled = false;
    const { group_permission_codenames, user } = this.state;
    let isErrorFound = false;
    if (!data[name]?.['isDisabled']) {
      for (const action in permissionNames) {
        for (const type in permissionNames[action]) {
          if (permissionNames[action][type] === data["name"]) {
            if (checkAll === true || checkAll === false) {
              for (const index in permissionNames[action]) {
                if (screenTypes.includes(index)) {
                  isGroupPermissionEnabled = false;
                  if (user !== 0) {
                    permissionTypes.forEach((permissionName) => {
                      if (
                        permissionName in data &&
                        data[permissionName].checked
                      ) {
                        if (
                          group_permission_codenames.includes(
                            permissionNames[action][index].action_code
                          )
                        ) {
                          isGroupPermissionEnabled = true;
                        }
                      }
                    });

                    if (isGroupPermissionEnabled) {
                      this.setState({
                        alertData: `Cannot remove group permission when user is selected!!`,
                        snackbar: true,
                        severity: "error",
                      });
                      isErrorFound = true;
                    }
                  }
                  if (!isErrorFound) {
                    permissionNames[action][index].checked = !checkAll;
                  }
                }
              }
            } else {
              let check_status = !data[name].checked;

              //if user is selected to give permission then group permissions cannot be removed
              if (user !== 0 && data[name].checked) {
                if (
                  group_permission_codenames.includes(
                    permissionNames[action][name].action_code
                  )
                ) {
                  this.setState({
                    alertData: `Cannot remove group permission when user is selected!!`,
                    snackbar: true,
                    severity: "error",
                  });
                  isErrorFound = true;
                }
              }
              //if view action is disabled, then other actions also need to be disabled
              if (name === "view" && !check_status) {
                Object.keys(permissionNames[action]).forEach((key) => {
                  if (screenTypes.includes(key)) {
                    permissionNames[action][key].checked = check_status;
                  }
                });
              }
              //view status to be enabled, if any other status is enabled
              else if (
                name !== "view" &&
                check_status &&
                "view" in permissionNames[action]
              ) {
                permissionNames[action]["view"].checked = check_status;
              }
              permissionNames[action][name].checked = check_status;
            }
          }
        }
      }
    }
    if (!isErrorFound) {
      this.setState({ permissionNames, isChanged: true });
    }
  };


  checkAllValues = (screen, index) => {
    let { screens } = this.state;
    screens[index]['checked'] = !screens[index]['checked']
    this.setState({ screens })
    let permissionNames = _.cloneDeep(this.state.permissionNames);
    let isErrorFound = false;
    const bodyData = Object.keys(permissionNames);
    bodyData.map((data) => {
      const type = permissionNames[data].type;
      if (screen.name === type) {
        Object.keys(permissionNames[data]).forEach((key) => {
          if (screenTypes.includes(key) && !permissionNames[data][key]['isDisabled']) {
            permissionNames[data][key].checked = screens[index]['checked'];
          }
        });
        if (!isErrorFound) {
          this.setState({ permissionNames, isChanged: true });
        }
      };
    })
  }

  getPermissionViewList = (accessType) => {
    const { menu_type } = this.state;
    if (menu_type === "app") {
      const url = GET_URL.permissionlist.api;
      const params = { is_active: true, menu_type: "mobile" };
      getRequest(url, params, {}).then((response) => {
        if (response && response.status === 200) {
          let updatedData = getMobileApplicationSetting(response.data.data);
          this.setState(
            {
              MobileAppActions: updatedData,
            },
            () => {
              this.getUpdateViewList(accessType);
            }
          );
        }
      });
    }
    else if (menu_type === "staff_app") {
      const url = GET_URL.staffpermissionlist.api;
      const params = { is_active: true };
      getRequest(url, params, {}).then((response) => {
        if (response && response.status === 200) {
          let updatedData = getMobileApplicationSetting(response.data.data);
          this.setState(
            {
              MobileAppActions: updatedData,
            },
            () => {
              this.getUpdateViewList(accessType);
            }
          );
        }
      });
    } else {
      this.getUpdateViewList(accessType);
    }
  };

  getUpdateViewList = async (accessType) => {
    const { assigned_permission_codes, menu_type, MobileAppActions } =
      this.state;
    let groupPermissions =
      accessType === "group" ? [] : this.state.groupPermissions;
    let permissionNames =
      (menu_type === "app" || menu_type === "staff_app") ? MobileAppActions : _.cloneDeep(Actions);
    let screens = new Set();
    for (const action in permissionNames) {
      let permissionNeededFound = false;
      for (const type in permissionNames[action]) {
        if (
          screenTypes.includes(type) &&
          permissionNames[action][type]["permission_needed"]
        ) {
          let codeNameFound = true;
          const { action_code } = permissionNames[action][type];
          if (!assigned_permission_codes.includes(action_code)) {
            codeNameFound = false;
          } else if (accessType === "group") {
            groupPermissions.push(action_code);
          }
          permissionNeededFound = true;
          permissionNames[action][type]["checked"] = codeNameFound;
        } else if (screenTypes.includes(type)) {
          delete permissionNames[action][type];
        }
      }
      if (!permissionNeededFound) {
        delete permissionNames[action];
      }
      if (permissionNames[action] && "type" in permissionNames[action]) {
        screens.add(permissionNames[action]["type"]);
      }
    }
    screens = Array.from(screens).sort();
    groupPermissions = Array.from(new Set(groupPermissions));
    let tempScreens = []
    screens.map((data) => {
      tempScreens.push({ name: data, checked: false })
    })
    this.setState({
      permissionNames,
      groupPermissions,
      fetchingPermissions: false,
      screens: [...tempScreens],
    });
  };
  onChangeGroupName = (e) => {
    const { value, name } = e.target;
    this.setState({ [name]: value });
  };

  getPermissionCodes = () => {
    let permission_ids = [];
    const { permissionNames, user, groupPermissions } = this.state;
    for (const action in permissionNames) {
      for (const type in permissionNames[action]) {
        if (
          screenTypes.includes(type) &&
          permissionNames[action][type]["checked"]
        ) {
          let { action_code } = permissionNames[action][type];
          if (user !== 0 && groupPermissions.includes(action_code)) {
            continue;
          }
          permission_ids.push(action_code);
        }
      }
    }
    return Array.from(new Set(permission_ids));
  };
  // checkGroupPermissionRemoval = (permission_codes) => {
  //     const { group_permission_codenames } = this.state;
  //     for (let permission of group_permission_codenames){
  //         if (!permission_codes.includes(permission)){
  //             return false;
  //         }
  //     }
  //     return true;
  // }
  submitPermissions = () => {
    const { group, user, userMap, groupMap, menu_type } = this.state;
    let params = { menu_type: menu_type };
    let url = `${PATCH_URL.groups.api}${group}/`;
    let permission_codes = this.getPermissionCodes();
    let removeGroup = "";
    if (user !== 0) {
      // if(!this.checkGroupPermissionRemoval(permission_codes)){
      //     this.setState({ alertData: `Cannot remove group permission when user is selected!!`, snackbar: true, severity: "error" });
      //     return;
      // }
      params["user_permissions"] = permission_codes;
      url = `${PATCH_URL.users.api}${user}/`;
      removeGroup = `user: ${userMap[user]}`;
    } else {
      params["permissions"] = permission_codes;
      removeGroup = `group: ${groupMap[group]}`;
    }
    this.setState({ submittingData: true });
    if (permission_codes.length === 0) {
      Swal.fire({
        title: "Are you sure?",
        text: `You want to remove all the permissions for ${removeGroup}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, remove it!",
      }).then(async (result) => {
        if (result.value) {
          this.callPermissionService(url, params);
        } else {
          this.setState({ submittingData: false });
        }
      });
    } else {
      this.callPermissionService(url, params);
    }
  };
  callPermissionService = (url, params) => {
    patchRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: `Assigned permissions`, // to ${group_name}
          showConfirmButton: false,
          timer: 1500,
        });
        // this.getPermissionViewList();
        this.setState({ group_name: "", submittingData: false, isChanged: false });
      } else {
        this.setState({ submittingData: false });
      }
    });
  };
  handleClose = () => {
    this.setState({
      snackbar: false,
    });
  };
  changeToggle = (event, value) => {
    if (this.state.isChanged) {
      Swal.fire({
        title: `<strong>Are you sure want to change the tab</strong>`,
        text: "updated value will not save untill you submit!",
        type: 'info',
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        confirmButtonColor: 'green',
        cancelButtonColor: 'orange',
      }).then((result) => {
        if (result.value) {
          const { group, user } = this.state;
          if (value != null) {
            let formatedselectedToggle = value.replace(/\s/g, "");
            this.setState({ menu_type: formatedselectedToggle, isChanged: false }, () => {
              if (user && user !== 0) {
                this.getUserPermissions();
              } else if (group && group !== 0) {
                this.getGroupPermissions();
              }
            });
          }

        }
      });
    }
    else {
      const { group, user } = this.state;
      if (value != null) {
        let formatedselectedToggle = value.replace(/\s/g, "");
        this.setState({ menu_type: formatedselectedToggle }, () => {
          if (user && user !== 0) {
            this.getUserPermissions();
          } else if (group && group !== 0) {
            this.getGroupPermissions();
          }
        });
      }
    }
  };
  render() {
    const {
      permissionNames,
      groupList,
      group,
      userList,
      user,
      groupMap,
      userMap,
      fetchingPermissions,
      submittingData,
      screens,
      alertData,
      snackbar,
      menu_type,
    } = this.state;
    return (
      <>
        <Paper className="">
          <Box className="cover-screen blue-background">
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading">View Permissions</Box>
                {/* 
                                <Box className='page-info-align sub-heading'>
                                    Assign permissions to desigred groups and users
                                </Box> */}
              </Grid>
              <Grid item md={5} xs={false} sm={false}></Grid>
              <Grid item md={4} xs={12} sm={12}>
                <Box className="md-up-justify-space-between md-down-flex-column padding-y-20">
                  <Dropdown
                    data={groupList}
                    name="group"
                    value={group}
                    onChange={this.onChange}
                    label="Select Group"
                  />
                </Box>
              </Grid>
              <Grid item md={4} xs={12} sm={12}>
                {group !== 0 && (
                  <Box className="md-up-justify-space-between md-down-flex-column padding-y-20">
                    <Dropdown
                      data={userList}
                      name="user"
                      value={user}
                      onChange={this.onChange}
                      label="Select User"
                    />
                  </Box>
                )}
              </Grid>
              <Grid item md={4} xs={12} sm={12}>
                {group !== 0 && !fetchingPermissions && (
                  <Box className="end-flex-prop">
                    <ToggleButtonGroup
                      size="small"
                      value={menu_type}
                      exclusive
                      onChange={this.changeToggle}
                    >
                      <ToggleButton key={1} value="web">
                        Web
                      </ToggleButton>
                      <ToggleButton key={2} value="app">
                        Student App
                      </ToggleButton>
                      <ToggleButton key={3} value="staff_app">
                        Staff App
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}
              </Grid>
              {group !== 0 && (
                <Grid item md={12} xs={12} sm={12} className="assign-perm-note">
                  {" "}
                  Note: permissions of{" "}
                  {user === 0
                    ? `role ${groupMap[group]}`
                    : `user ${userMap[user]}`}{" "}
                </Grid>
              )}
              {group !== 0 && (
                <Grid item md={12} xs={12} sm={12}>
                  {!fetchingPermissions ? (
                    <AssignPermissionsTable
                      group={group}
                      permissionNames={permissionNames}
                      checkValues={this.checkValues}
                      checkAllValues={this.checkAllValues}
                      screens={screens}
                    />
                  ) : (
                    <CircularProgress />
                  )}
                </Grid>
              )}
              {group !== 0 && !fetchingPermissions && (
                <Box className="fee-ter-submit-box">
                  <Button
                    className="submit fee-ter-submit-button"
                    variant="contained"
                    onClick={() => this.submitPermissions()}
                    disabled={submittingData}
                  >
                    Submit
                  </Button>
                </Box>
              )}
            </Grid>
          </Box>

          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={snackbar}
            autoHideDuration={10000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Paper>
      </>
    );
  }
}

export default withRouter(PermissionsView);

import React, { PureComponent } from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Grid,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Snackbar,
} from "@material-ui/core";
import _ from "lodash";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Actions, screenTypes } from "Constants/permissions";
import { Alert } from "Includes/functions";
import AssignPermissionsTable from "./Components/AssignPermissionsTable";
import "./styles.scss";

class AssignPermissions extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      permissions: {},
      permissionNames: {},
      snackbar: { show: false, data: "" },
      group_name: "",
      error: false,
      screens: [],
    };
  }

  componentDidMount() {
    // this.getPermissionList();
    this.getPermissionViewList();
  }

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
    let permissionNames = { ...this.state.permissionNames };
    for (const action in permissionNames) {
      for (const type in permissionNames[action]) {
        if (permissionNames[action][type] === data["name"]) {
          if (checkAll === true || checkAll === false) {
            for (const index in permissionNames[action]) {
              if (screenTypes.includes(index))
                permissionNames[action][index].checked = !checkAll;
            }
          } else {
            permissionNames[action][name].checked = !data[name].checked;
            if (name === "view" && !data[name].checked) {
              Object.keys(permissionNames[action]).forEach((key) => {
                if (screenTypes.includes(key)) {
                  permissionNames[action][key].checked = false;
                }
              });
            } else if (name !== "view" && data[name].checked) {
              permissionNames[action]["view"].checked = true;
            }
          }
        }
      }
    }
    this.setState({ permissionNames });
  };

  getPermissionViewList = () => {
    let permissionNames = _.cloneDeep(Actions);
    let screens = new Set();
    for (const action in permissionNames) {
      let permissionNeededFound = false;
      for (const type in permissionNames[action]) {
        if (screenTypes.includes(type)) {
          permissionNames[action][type]["checked"] = false;
          if (!permissionNames[action][type].permission_needed) {
            delete permissionNames[action][type];
          } else {
            permissionNeededFound = true;
          }
        }
      }
      if (!permissionNeededFound) {
        delete permissionNames[action];
      }
      if (permissionNames[action]) {
        screens.add(permissionNames[action]["type"]);
      }
    }
    screens = Array.from(screens).sort();
    this.setState({ permissionNames, screens });
  };
  onChangeGroupName = (e) => {
    const { value, name } = e.target;
    this.setState({ [name]: value, error: false });
  };
  getPermissionIds = () => {
    let permission_ids = [];
    const { permissionNames } = this.state;
    for (const action in permissionNames) {
      for (const type in permissionNames[action]) {
        if (
          screenTypes.includes(type) &&
          permissionNames[action][type]["checked"]
        ) {
          let { action_code } = permissionNames[action][type];
          // let code_id = permission_id_code_map[action_code];
          permission_ids.push(action_code);
        }
      }
    }
    return Array.from(new Set(permission_ids));
  };
  submitPermissions = () => {
    const { group_name } = this.state;
    const permissions = this.getPermissionIds();
    if (permissions.length === 0) {
      const snackbar = {
        data: "Please select atleast one permission!!",
        show: true,
      };

      this.setState({ snackbar });
    } else if (group_name && group_name !== "") {
      const params = {
        name: group_name,
        permissions,
      };
      const url = POST_URL.groups.api;
      postRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: `Created group ${group_name}`,
            showConfirmButton: false,
            timer: 1500,
          });
          this.getPermissionViewList();
          this.setState({ group_name: "" });
        }
      });
    } else {
      window.scrollTo(0, 0);
      this.setState({ error: true });
    }
  };

  handleCloseSnackbar = () => {
    const snackbar = { show: false, data: "" };
    this.setState({ snackbar });
  };
  render() {
    const { group_name, error, snackbar, screens } = this.state;
    return (
      <>
        <Paper>
          <Box className="blue-background">
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading">Assign Permissions</Box>

                {/* <Box className='page-info-align page-sub-head'>
                                    Assign permissions to desigred groups and users
                                </Box> */}
              </Grid>
              <Grid item md={5} xs={false} sm={false}></Grid>
              <Grid item md={3} xs={12} sm={12}>
                <Box className="md-up-justify-space-between md-down-flex-column">
                  <TextField
                    id="outlined-name"
                    label="Group Name"
                    value={group_name}
                    onChange={(e) => {
                      this.onChangeGroupName(e);
                    }}
                    name="group_name"
                    autoComplete="off"
                    margin="normal"
                    variant="outlined"
                    helperText={error ? "Enter a Valid Group" : ""}
                    error={error}
                  />
                </Box>
              </Grid>
              <Grid item md={12} xs={12} sm={12}>
                <AssignPermissionsTable
                  permissionNames={this.state.permissionNames}
                  screens={screens}
                  checkValues={this.checkValues}
                />
              </Grid>
              <Box className="width-100 end-flex-prop">
                <Button
                  className="submit permission-submit-button"
                  variant="contained"
                  onClick={() => this.submitPermissions()}
                >
                  Submit
                </Button>
              </Box>
            </Grid>
          </Box>
        </Paper>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar.show}
          autoHideDuration={2000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="error">
            {snackbar.data}
          </Alert>
        </Snackbar>
      </>
    );
  }
}

export default withRouter(AssignPermissions);

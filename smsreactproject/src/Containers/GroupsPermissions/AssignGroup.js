import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Grid,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
} from "@material-ui/core";
import ClearIcon from "@material-ui/icons/Clear";

import { getRequest, postRequest, patchRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PATCH_URL } from "Includes/urls";
import { SUPER_ADMIN_ID } from "Constants";
import { Dropdown } from "Components/DropDown";
import GroupViewTable from "./Components/GroupViewTable";
import "./styles.scss";
import { getKeyValueInArray } from "Includes/functions";

class AssignGroup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      permissions: {},
      permissionNames: {},
      group: 0,
      usersList: [],
      enrollingUserIds: [],
      checkedAll: false,
      reportingGroup: {},
      reportingUser: 0,
    };
    this.bodyDataKeys = [
      {
        name: "id",
        show: false,
        key: true,
        canDelete: null,
        class_name: "width-10",
      },
      {
        name: "name",
        show: true,
        key: false,
        head: "User",
        textAlign: "text-center",
        canDelete: null,
        class_name: "width-20",
      },
      {
        name: "group_names",
        show: true,
        key: false,
        head: "Group",
        textAlign: "text-center",
        canDelete: "",
        class_name: "width-30",
      },
      {
        name: "reporting_group",
        show: true,
        key: false,
        head: "Reporting Group",
        textAlign: "text-center",
        canDelete: "",
        class_name: "width-20",
      },
      {
        name: "reporting_name",
        show: true,
        key: false,
        head: "Reporting User",
        textAlign: "text-center",
        canDelete: "",
        class_name: "width-20",
      },
    ];
  }

  componentDidMount() {
    this.getUsersList();
    this.getGropsList();
  }

  checkRow = (data) => {
    let { usersList, checkedAll } = this.state;
    let enrollingUserIds = [];
    if (data === "all") {
      checkedAll = !checkedAll;
      usersList.forEach((student, index) => {
        student.checked = checkedAll;
        if (checkedAll) {
          enrollingUserIds.push(student.id);
        }
      });
    } else {
      usersList.forEach((student) => {
        if (student.id === data.id) {
          student.checked = !student.checked;
        }
        if (student.checked) {
          enrollingUserIds.push(student.id);
        }
      });
    }
    checkedAll = enrollingUserIds.length === usersList.length;
    this.setState({ usersList, checkedAll, enrollingUserIds });
  };

  getUsersList = () => {
    const params = {};
    getRequest(GET_URL.usergroups.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const users = response.data.data;
        let usersList = [];
        users.forEach((user) => {
          let group_names = [];
          let group_data = "";
          user.groups.forEach((data) => {
            group_data = (
              <div className="group-name">
                <div>{data.name}</div>
              </div>
            );
            // group_names.push(group_data);
          });
          user.group_names = <div className="group-col">{group_data}</div>;
          user.checked = false;
          user.show = true;
          if (user.staff) {
            user.name = user.staff.full_name ? user.staff.full_name : "";
          } else if (user.student) {
            user.name = user.student.fullname ? user.student.fullname : "";
          } else {
            user.name = user.username;
          }
          if (user.reporting_to) {
            if (user.reporting_to.staff) {
              user.reporting_name = user.reporting_to.staff.full_name
                ? user.reporting_to.staff.full_name
                : "";
            } else if (user.reporting_to.student) {
              user.reporting_name = user.reporting_to.student.full_name
                ? user.reporting_to.student.full_name
                : "";
            } else {
              user.reporting_name = user.reporting_to.username;
            }
          }
          user.reporting_group =
            user.reporting_to && user.reporting_to.username;
          if (
            (user.groups.length > 0 && user.groups[0].id !== SUPER_ADMIN_ID) ||
            user.groups.length === 0
          ) {
            usersList.push(user);
          }
        });
        this.setState({ usersList, enrollingUserIds: [] });
      }
    });
  };
  getPatchParams = (userData, group) => {
    const { usersList } = this.state;
    let groupIds = [];
    usersList.forEach((user) => {
      user.groups.forEach((data) => {
        if (user.id === userData.id && group.id !== data.id) {
          groupIds.push(data.id);
        }
      });
    });
    return groupIds;
  };
  removeUserGroup = (user, data) => {
    const params = { groups: this.getPatchParams(user, data) };
    const url = `${PATCH_URL.usergroups.api}${user.id}/`;
    patchRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.getUsersList();
      }
    });
  };

  getGropsList = () => {
    const params = {};
    getRequest(GET_URL.groups.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let allGroupList = response.data.data;
        let groupList = allGroupList.filter((group) => group.id !== 1);
        this.setState({ groupList, allGroupList });
      }
    });
  };

  onChangeGroup = (e) => {
    let value = e.target.value;
    let name = e.target.name;
    let { allGroupList, reportingGroup, reportingUser } = this.state;
    if (name === "group") {
      let reportingGroupId = getKeyValueInArray(
        allGroupList,
        "id",
        parseInt(value),
        "reporting_group"
      );
      for (let group of allGroupList) {
        if (parseInt(group.id) === parseInt(reportingGroupId)) {
          reportingGroup = group;
        }
      }
    }
    if (value !== 0) {
      this.setState({ [name]: value, reportingGroup }, () => {
        if (name === "group") {
          this.getReporingUserList();
        }
      });
    }
  };
  getReporingUserList = () => {
    const url = GET_URL.users.api;
    const { reportingGroup } = this.state;
    const params = { groups: reportingGroup.id , is_active:true};
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let reportingUserList = response.data.data;
        reportingUserList.map((data) => {
          data.name = data.username;
        });
        this.setState({
          reportingUserList,
          reportingUser: 0,
        });
      }
    });
  };
  removeEnrollingUsers = (data, index) => {
    let { usersList, checkedAll, enrollingUserIds } = this.state;
    usersList.forEach((user, index) => {
      if (user.id === data.id) {
        user.checked = !user.checked;
        checkedAll = false;

        if (enrollingUserIds.includes(user.id)) {
          const index = enrollingUserIds.indexOf(user.id);
          enrollingUserIds.splice(index, 1);
        }
        return;
      }
    });
    this.setState({ usersList, checkedAll, enrollingUserIds });
  };

  searchNames = (value) => {
    const search_name = value.toLowerCase();
    let usersList = [...this.state.usersList];
    usersList.forEach((user) => {
      let username = user["username"] ? user["username"].toLowerCase() : "";
      user.show = false;
      if (search_name === "" || username.includes(search_name)) {
        user.show = true;
      }
    });
    this.setState({ usersList });
  };

  handleSearchChange = (e) => {
    const { value } = e.target;
    this.setState({ search_name: value }, () => {
      this.searchNames(value);
    });
  };

  onChangeGroupName = (e) => {
    const { value, name } = e.target;
    this.setState({ [name]: value });
  };
  getParams = () => {
    let params = [];
    const { usersList, group, reportingUser } = this.state;
    for (const user of usersList) {
      if (user.checked) {
        let groups = [];
        user.groups.forEach((data) => {
          groups.push(data.id);
        });
        groups.push(group);
        const data = { user: user.id, groups, reporting_to: reportingUser };
        params.push(data);
      }
    }
    return params;
  };
  submit = () => {
    const params = this.getParams();
    const url = POST_URL.usergroups.api;
    postRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.getUsersList();
      }
    });
  };
  render() {
    const {
      enrollingUserIds,
      usersList,
      group,
      groupList,
      search_name,
      reportingUserList,
      reportingUser,
      reportingGroup,
    } = this.state;
    return (
      <>
        <Paper>
          <Box className="blue-background cover-screen">
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box mb={4} className="header-align heading">
                  Assign Group
                </Box>

                {/* <Box className='page-info-align page-sub-head'>
                                    Assign group to desigred users
                                </Box> */}
              </Grid>
              <Grid item md={5} xs={false} sm={false}></Grid>
              <Grid item md={8} xs={12} sm={12} className="">
                <Box className={"assign-group-student-table-grid"}>
                  <Box className="end-flex-prop assign-group-search-box">
                    {/* <Box className='section-details table-head-fast-enrollment'> {selectedTab} students {section!==0 && ` for ${section}`}</Box> */}
                    <TextField
                      id="outlined-textarea"
                      className="search-selectable-table"
                      label="Search"
                      multiline
                      value={search_name}
                      onChange={this.handleSearchChange}
                      maxWidth="220px"
                    />
                  </Box>
                  <Box>
                    <GroupViewTable
                      bodyData={usersList}
                      bodyDataKeys={this.bodyDataKeys}
                      checkRow={this.checkRow}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item md={4} xs={false} sm={false} className="">
                <Box className="enrolling-students-block">
                  <Box className="enroll-block-item sec-sub-head">
                    To add users into the group. Please select user.
                  </Box>
                  <Box className="enroll-block-item">
                    <Dropdown
                      data={groupList}
                      name="group"
                      value={group}
                      onChange={this.onChangeGroup}
                      label="Select Group"
                    />
                  </Box>
                  {group !== 0 && (
                    <Box className="enroll-block-item green-text sec-sub-head">
                      Reporting Group: {reportingGroup.name}
                    </Box>
                  )}

                  {group !== 0 && (
                    <Box className="enroll-block-item sec-sub-head">
                      Select reporting user.
                    </Box>
                  )}
                  {group !== 0 && (
                    <Box className="enroll-block-item">
                      <Dropdown
                        data={reportingUserList}
                        name="reportingUser"
                        value={reportingUser}
                        onChange={this.onChangeGroup}
                        label="Select User"
                      />
                    </Box>
                  )}
                  <Box className="enroll-block-item">
                    {usersList &&
                      usersList.map((user, ind) => {
                        if (user.checked) {
                          return (
                            <Box className="enrolling-student-bock" key={ind}>
                              <Box className="enrolling-student">
                                {user.username}
                              </Box>
                              <Box
                                className="close-enrolling-student pointer"
                                onClick={() =>
                                  this.removeEnrollingUsers(user, ind)
                                }
                              >
                                <ClearIcon fontSize="7px" />
                              </Box>
                            </Box>
                          );
                        }
                      })}
                  </Box>
                  <Box className="enroll-block-item">
                    {enrollingUserIds.length > 0 && reportingUser !== 0 && (
                      <Button
                        variant="contained"
                        color="primary"
                        className="submit fast-enrollment-submit"
                        onClick={(e) => this.submit()}
                      >
                        Submit
                      </Button>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </>
    );
  }
}

export default withRouter(AssignGroup);

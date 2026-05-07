import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Icon,
  CircularProgress,
  TextField,
} from "@material-ui/core";
import { Link } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";
import { Dropdown } from "Components/DropDown";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

import StudentGridCard from "Components/ProfileGridCard";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  getIsGridOrListView,
  setIsGridOrListView,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { multiOptions } from "Constants";

class StaffList extends Component {
  constructor() {
    super();
    this.state = {
      staffList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      filterList: [],
      groupTypeList: [],
      groupType: "",
      is_group_type: isFormDefinitionEnabled(
        "staff_configuration",
        "is_staff_group_type",
        1
      ),
      columns: [
        {
          name: "full_name",
          label: "Staff Name",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align">{value}</div>
              );
            },
          },
        },
        {
          name: "group_name",
          label: "groups",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <Box>{value && value[0]}</Box>;
            },
          },
        },
        {
          name: "email",
          label: "Email",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align text-transform-none">
                  {value}
                </div>
              );
            },
          },
        },
        {
          name: "mobile_num",
          label: "Mobile No",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "username",
          label: "User Name",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "dob",
          label: "DOB",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY");
            },
          },
        },
        {
          name: "id",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "Actions",
          label: "Action",
          options: {
            display: this.updatePermissions("display"),
            filter: false,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[6]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteStudent}
                    editURL={Actions.staff_list.update.url}
                    viewURL={Actions.general_staff.view.url}
                    enabledActions={this.state.enabledActions}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount() {
    let { GridEnabled, ListEnabled } = this.state;
    this.getStaffList();
    this.getGroupTypeList();
    let options = { ...multiOptions };
    this.updatePermissions("actions");
    options["selectableRows"] = "none";
    options["filter"] = true;
    options["filterType"] = "dropdown";
    options["downloadOptions"]["filename"] = "Staff_List.csv";
    options["onDownload"] = (buildHead, buildBody, columns, data) => {
      data.map((columnValue, index) => {
        columnValue.data.map((objectValue, subIndex) => {
          if (subIndex == 5) {
            data[index]["data"][subIndex] = dateFormat(
              objectValue,
              "DD-MM-YYYY"
            );
          }
        });
      });
      return "\uFEFF" + buildHead(columns) + buildBody(data);
    };
    if (getIsGridOrListView()) {
      let isGridView = getIsGridOrListView() === "true";
      if (isGridView) {
        GridEnabled = true;
        ListEnabled = false;
      }
    }
    this.setState({
      options: options,
      GridEnabled,
      ListEnabled,
    });
  }

  getGroupTypeList = () => {
    const url = GET_URL.grouptypes.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let groupTypeList = response.data.data;
        let temp = { id: "all", name: "All" };
        groupTypeList.unshift(temp);
        this.setState({
          groupTypeList,
          groupType: "all",
        });
      }
    });
  };

  updatePermissions = (name) => {
    let test = true;
    const hasViewPermission = isUserHasPermission("general_staff", "view");
    const hasEditPermission = isUserHasPermission("staff_list", "update");
    const hasDeletePermission = isUserHasPermission("staff_list", "delete");
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    }
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        columns: this.state.columns,
      });
    }
  };

  getStaffList = () => {
    const { groupType } = this.state;
    const url = GET_URL.staff.api;
    const params = { is_active: true };
    if (groupType !== "all") {
      params["group_type"] = groupType;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          staffList: response.data.data,
          AllStaffList: response.data.data,
          dataReady: true,
          loading: false,
        });
      }
    });
  };

  deleteStudent = async (id, index) => {
    this.setState({ tableUpdating: true });
    let { staffList } = this.state;
    const del_url = DEL_URL.staff.api;
    const url = del_url + id + "/";
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        staffList.splice(index, 1);
        this.setState({
          staffList: [...staffList],
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  onChangeHandleView = (name) => {
    let { AllStaffList, staffList, filterList } = this.state;
    let GridEnabled = false;
    let ListEnabled = false;
    let setValue = false;
    if (name === "GridEnabled") {
      setValue = true;
      GridEnabled = true;
      if (filterList.length !== 0) staffList = [...filterList];
    } else {
      staffList = [...AllStaffList];
      ListEnabled = true;
    }
    setIsGridOrListView(setValue);
    this.setState({
      GridEnabled,
      ListEnabled,
      staffList,
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { staffList, AllStaffList } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = AllStaffList.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      staffList = filterList;
    } else {
      staffList = [...AllStaffList];
      filterList = [];
    }
    this.setState({
      [name]: value,
      staffList,
      filterList,
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getStaffList();
      }
    );
  };

  render() {
    let {
      ListEnabled,
      GridEnabled,
      loading,
      staffList,
      tableUpdating,
      options,
      enabledActions,
      searchStudent,
      groupType,
      groupTypeList,
      is_group_type,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid 
              item
              lg={7}
              md={4}
              xs={12}
              className={classNames("header-align")}
            >
              <Box className="heading">Staffs</Box>
            </Grid>
            <Grid item lg={2} md={5} xs={12} className="margin-top-10">
              <Box className="list-grid-toggle-outer-div header-align end-flex-prop">
                <Button
                  className={
                    ListEnabled === true
                      ? "list-selected-toggle"
                      : "grid-selected-toggle"
                  }
                  onClick={(e) => this.onChangeHandleView("ListEnabled")}
                  disabled={this.state.ListEnabled === true}
                >
                  <Box
                    className={
                      ListEnabled === true
                        ? "list-selected-toggle-text"
                        : "grid-selected-toggle-text"
                    }
                  >
                    List View
                  </Box>
                  <Icon
                    className={classNames(
                      ListEnabled === true
                        ? "list-selected-toggle-icon"
                        : "grid-selected-toggle-icon",
                      "fa fa-bars"
                    )}
                  />
                </Button>
                <Button
                  className={
                    GridEnabled === true
                      ? "list-selected-toggle"
                      : "grid-selected-toggle"
                  }
                  onClick={(e) => this.onChangeHandleView("GridEnabled")}
                  disabled={this.state.GridEnabled === true}
                >
                  <Box
                    className={
                      GridEnabled === true
                        ? "list-selected-toggle-text"
                        : "grid-selected-toggle-text"
                    }
                  >
                    Grid View
                  </Box>
                  <Icon
                    className={classNames(
                      GridEnabled === true
                        ? "list-selected-toggle-icon"
                        : "grid-selected-toggle-icon",
                      "fa fa-th-large"
                    )}
                  />
                </Button>
              </Box>
            </Grid>
            <Grid item lg={3} md={3} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("staff_list", "create") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.staff_list.create.url}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineIcon className="visibility-icon" />{" "}
                    {Actions.staff_list.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          {is_group_type && (
            <div className="flex-gaping">
              <Dropdown
                data={groupTypeList}
                name="groupType"
                value={groupType}
                onChange={this.onChange}
                label={"Group Type"}
                className="width-100"
                hideSelect={true}
                size={"small"}
              />
            </div>
          )}
          {GridEnabled && (
            <Box className="end-flex-prop header-align">
              <TextField
                id="outlined-name"
                value={searchStudent}
                placeholder=""
                label="Search Staff"
                name="searchStudent"
                onChange={(e) => {
                  this.handleFilter(e);
                }}
              />
            </Box>
          )}
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12}>
              {GridEnabled && (
                <StudentGridCard
                  list={staffList}
                  delete={this.deleteStudent}
                  enabledActions={enabledActions}
                  name="Staff"
                  editURL={Actions.staff_list.update.url}
                  viewURL={Actions.general_staff.view.url}
                />
              )}
              {ListEnabled && (
                <Paper>
                  <AllMUIDataTable
                    key={staffList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={staffList}
                    columns={this.state.columns}
                    options={options}
                  />
                </Paper>
              )}
            </Grid>
          </Grid>
        </Paper>
      );
    }
  }
}

export default StaffList;
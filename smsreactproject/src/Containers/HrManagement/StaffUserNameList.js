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
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { multiOptions } from "Constants";

class StaffUserNameList extends Component {
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
          name: "username",
          label: "User Name",
          options: {
            filter: false,
            sort: true,
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
          name: "last_activity",
          label: "Last Activity",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return value && dateFormat(value, "DD-MM-YYYY hh:mm A");
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
      ],
    };
  }

  componentDidMount() {
    let { GridEnabled, ListEnabled } = this.state;
    this.getStaffList();
    let options = { ...multiOptions };
    this.updatePermissions("actions");
    options["selectableRows"] = "none";
    options["filter"] = true;
    options["print"] = false;
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
    const url = GET_URL.staff.api;
    const params = { is_active: true, ordering: "first_name" };
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
              <Box className="heading">Staffs User Name List</Box>
            </Grid>
            <Grid item lg={5} md={3} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("staff_usernames", "create") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.staff_usernames.create.url}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineIcon className="visibility-icon" />{" "}
                    {Actions.staff_usernames.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Paper className="header-align">
            <AllMUIDataTable
              key={staffList}
              title={
                tableUpdating ? <CircularProgress className="white-text" /> : ""
              }
              data={staffList}
              columns={this.state.columns}
              options={options}
            />
          </Paper>
        </Paper>
      );
    }
  }
}

export default StaffUserNameList;

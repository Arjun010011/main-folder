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
  getAcademicYear,
  SetAcademicYear,
  getPaginationProps,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { DEFAULT_PAGINATION_PROPS_ID_LIST, multiOptions } from "Constants";

class StaffList extends Component {
  constructor() {
    super();
    this.state = {
      staffList: [],
      dataReady: false,
      loading: true,
      tableUpdating: false,
      filterList: [],
      groupTypeList: [],
      groupType: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST},
      columns: [
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
          name: "leave_details",
          label: "No Of Leaves",
          options: {
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align">{value.total_leaves_taken+value.total_leaves_available}</div>
              );
            },
          },
        },
        {
          name: "leave_details",
          label: "No Of Leaves Taken",
          options: {
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align">{value.total_leaves_taken}</div>
              );
            },
          },
        },
        {
          name: "leave_details",
          label: "No Of Leaves Available",
          options: {
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align">{value.total_leaves_available}</div>
              );
            },
          },
        },
        {
          name: "leave_details",
          label: "Leaves Taken This Month",
          options: {
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align">{value.leaves_taken_ds_month}</div>
              );
            },
          },
        }
      ],
    };
  }

  componentDidMount() {
    let { GridEnabled, ListEnabled } = this.state;
    this.getStaffList();
    let options = { ...multiOptions };
    options["selectableRows"] = "none";
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

  getStaffList = (paginationProps) => {
    const { groupType, pagination } = this.state;
    const url = GET_URL.staff_leave_plan_report.api;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const params = { ...pagination_params,is_active: true };
    if (groupType !== "all") {
      params["group_type"] = groupType;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          staffList: response.data.data.staff_data,
          AllStaffList: response.data.data.staff_data,
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
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
              <Box className="heading">Staff Leave Plan Report</Box>
            </Grid>
          </Grid>
          <Grid container>
            <Grid
              item
              xs={12}
              className={classNames("header-align")}
            >
              <AllMUIDataTable
                key={staffList}
                title={
                  tableUpdating ? <CircularProgress className="white-text" /> : ""
                }
                data={staffList}
                columns={this.state.columns}
                options={options}
                onTableChange={this.getStaffList}
                serverSide={true}
                pagination={this.state.pagination}
                count={staffList.count}
              />
            </Grid>
          </Grid>
        </Paper>
      );
    }
  }
}

export default StaffList;

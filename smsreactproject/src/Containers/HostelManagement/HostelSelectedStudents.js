import React, { Component } from "react";
import {
  TextField,
  Box,
  Grid,
  Button,
  Tooltip,
  CircularProgress,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
} from "@material-ui/core";
import AllMUIDataTable from "Components/AllMUIDataTable";
import CloseIcon from "@material-ui/icons/Close";
import { withRouter } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import ErrorIcon from "@material-ui/icons/Error";
import InfoIcon from "@material-ui/icons/Info";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";

import { Dropdown } from "Components/DropDown";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import {
  isUserHasPermission,
  numberWithCommas,
  getUrlParam,
  getPaginationProps,
  dateFormat,
} from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import PropTypes from "prop-types";
import commonMessages from "Constants/messages";
import messages from "./messages";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class HostelSelectedStudents extends Component {
  constructor(props) {
    super(props);

    this.state = {
      pageLoading: false,
      academicYearId: user.other_details.academic_year.id,
      finalStudentList: [],
      lowBalanceList: [],
      searchStudent: "",
      rowsSelected: [],
      reasonOpen: false,
      upcoming: { student: [], staff: [] },
      current: { student: [], staff: [] },
      allFinalStudentList: [],
      standardList: [],
      selectedStandard: "all",
      ListLoading: false,
      pagination: DEFAULT_PAGINATION_PROPS,
      openDialog: false,
      data_list: [],
      finalStudentIds: [],
      tableUpdating: true,
      visit_date: "",
      isSorted: true,
      selectedFloor: "all",
      floorList: [],
      updateSortStudents: this.updateSortStudents.bind(this),
      student: { type: "current" },
      student_columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: false,
          },
        },
        {
          name: "name",
          label: "Name",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "standard",
          label: "Standard",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "allocation_details",
          label: "Floor (Room)",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "deposited_amount",
          label: "Total Deposited",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value) => {
              return <div>{numberWithCommas(value ? value : 0)}</div>;
            },
          },
        },
        {
          name: "withdrawed_amount",
          label: "Total Distributed",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value) => {
              return <div>{numberWithCommas(value ? value : 0)}</div>;
            },
          },
        },
        {
          name: "balance",
          label: "Balance",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value) => {
              return (
                <div className="text-green">
                  {numberWithCommas(value ? value : 0)}
                </div>
              );
            },
          },
        },
        {
          name: "mobile_num",
          label: "Mobile Number",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "email",
          label: "Email",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "current_reg_num",
          label: "Register Number",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
      ],
    };
  }

  addStudentStaff = (name) => {
    this.setState(
      {
        openDialog: true,
        selected_name: name,
        tableUpdating: true,
        data_list: null,
        ListLoading: true,
      },
      () => {
        this.getFloorList();
        this.getDataList();
        this.getStandardList();
      }
    );
  };

  getDataList = (paginationProps) => {
    const {
      pagination,
      selected_name,
      finalStudentIds,
      selectedStandard,
      selectedFloor,
      academicYearId,
      student,
    } = this.state;
    let currentPagination = pagination;
    let building = this.props.selectedBuilding;
    if (paginationProps) {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      pagination: true,
      academic_year: academicYearId,
      building: building,
    };
    if (selectedStandard !== "all") {
      params["standard"] = selectedStandard;
    }
    if (selectedFloor !== "all") {
      params["floor"] = selectedFloor;
    }
    if (student.type === "upcoming") {
      params["is_upcoming"] = true;
    }
    const url = GET_URL.studenttransactionlist.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let rowsSelected = [];
        response.data.data.data_list.map((data, index) => {
          if (finalStudentIds.includes(data["id"])) {
            rowsSelected.push(index);
          }
          data.allocation_details = `${data.roomallocation_student["floor_name"]} (${data.roomallocation_student["room_name"]})`;
        });
        this.setState({
          data_list: response.data.data,
          pagination: currentPagination,
          rowsSelected,
          tableUpdating: false,
          ListLoading: false,
        });
        if (response.data.data.length === 0) {
          this.setState({
            blankData: `There is no ${selected_name}`,
            data_list: null,
          });
        }
      }
    });
  };

  handleClose = () => {
    this.setState({
      openDialog: false,
    });
  };

  getFloorList = () => {
    let building = this.props.selectedBuilding;
    const url = GET_URL.buildingdata.api + building + "/";
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let temp = { id: "all", name: "All" };
        response.data.data.floor_building.unshift(temp);
        this.setState({
          floorList: response.data.data.floor_building,
          floorLoading: false,
          selectedFloor: "all",
        });
      }
    });
  };

  getStandardList = async () => {
    const f_url = GET_URL.getstandardandsection.api;
    const param = { is_active: true, academic_year: this.state.academicYearId };
    await getRequest(f_url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let temp = { id: "all", name: "All" };
        response.data.data.unshift(temp);
        this.setState({
          standardList: response.data.data,
        });
      }
    });
  };

  onChange = async (e) => {
    let { value, name } = e.target;
    if (value !== 0) {
      this.setState(
        {
          [name]: value,
        },
        () => {
          this.getDataList();
        }
      );
    }
  };

  handleSubmit = (selectedRows) => {
    const { data_list } = this.state;
    let finalStudentList = [];
    let finalStudentIds = [];
    selectedRows.data.map((data) => {
      finalStudentList.push(data_list.data_list[data.dataIndex]);
      finalStudentIds.push(data_list.data_list[data.dataIndex]["id"]);
    });
    this.setState({
      finalStudentList,
      allFinalStudentList: finalStudentList,
      finalStudentIds,
      rowsSelected: [],
      data_list: null,
      openDialog: false,
    });
    this.props.updateFinalStudents(finalStudentList, finalStudentIds);
  };

  handleDelete = (index) => {
    let { finalStudentIds, finalStudentList } = this.state;
    finalStudentList.splice(index, 1);
    finalStudentIds.splice(index, 1);
    this.setState({
      finalStudentIds,
      finalStudentList,
    });
    this.props.updateFinalStudents(finalStudentList, finalStudentIds);
  };

  static getDerivedStateFromProps(props, state) {
    if (state.isSorted && props.neededSort) {
      return {
        model: state.updateSortStudents(props.amount, props.transaction_type),
        isSorted: false,
      };
    }
  }

  updateSortStudents = (amount, transaction_type) => {
    let { finalStudentList } = this.state;
    let lowBalanceList = [];
    let eligableStudents = [];
    finalStudentList.map((data) => {
      if (
        ((!data["balance"] && parseFloat(amount)) ||
          parseFloat(data["balance"]) < parseFloat(amount)) &&
        transaction_type === "Distribute"
      ) {
        data["is_low_balance"] = true;
        lowBalanceList.push(data);
      } else {
        data["is_low_balance"] = false;
        eligableStudents.push(data);
      }
    });
    let updatedList = [];
    updatedList = [...lowBalanceList, ...eligableStudents];
    this.setState({
      finalStudentList: [...updatedList],
    });
    this.props.updatedSortSuccess(lowBalanceList);
    this.setState({
      isSorted: true,
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { allFinalStudentList, finalStudentList } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = allFinalStudentList.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      finalStudentList = filterList;
    } else {
      finalStudentList = [...allFinalStudentList];
      filterList = [];
    }
    this.setState({
      [name]: value,
      filterList,
      finalStudentList,
    });
  };

  changeToggle = (event, value) => {
    let { student } = this.state;
    if (value !== null) {
      student.type = value;
      this.setState(
        {
          student,
        },
        () => {
          this.getDataList();
        }
      );
    }
  };

  render() {
    const {
      blankData,
      pagination,
      data_list,
      standardList,
      selectedStandard,
      ListLoading,
      openDialog,
      searchStudent,
      finalStudentList,
      tableUpdating,
      student_columns,
      staff_columns,
      selected_name,
      floorList,
      selectedFloor,
      student,
    } = this.state;
    const { data_is_there } = this.props;
    const options = {
      selectableRows: "multiple",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      selectToolbarPlacement: "replace",
      rowsSelected: this.state.rowsSelected,
      textLabels: {
        body: {
          noMatch: tableUpdating
            ? this.state.loadingText
            : "Sorry, there is no matching data to display",
        },
      },
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type, onFilterChange);
      },
      customToolbarSelect: (selectedRows) => (
        <MuiToolbar
          name={<FormattedMessage {...messages.enrollStudents} />}
          selectedRows={selectedRows}
          submitSelectedStudents={this.handleSubmit}
        />
      ),
    };

    return (
      <Box>
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Button
              disabled={data_is_there}
              className={
                data_is_there
                  ? "add-modify-button disable-button"
                  : "add-modify-button"
              }
              onClick={(e) => this.addStudentStaff("student")}
            >
              {finalStudentList.length > 0 ? "Modify Students" : "Add Students"}
            </Button>
          </Grid>
          <Grid item md={6} xs={12} className="end-flex-prop">
            <TextField
              id="outlined-name"
              value={searchStudent}
              placeholder=""
              label="Search Student"
              name="searchStudent"
              onChange={(e) => {
                this.handleFilter(e);
              }}
            />
          </Grid>
        </Grid>

        <div className="hostel-student-paper">
          <table width="100%" className="selectable-row-table mt-20">
            <thead className="table-select-hostel-thead">
              <th className={`selectable-table-head`}> Student Name </th>
              <th className={`selectable-table-head`}>
                {" "}
                {`${alias_names["standard"]}`}{" "}
              </th>
              <th className={`selectable-table-head`}> Floor (Room) </th>
              <th className={`selectable-table-head`}> Balance </th>
              <th className={`selectable-table-head`}> Action </th>
            </thead>
            <tbody className="selectable-row-table-body">
              {finalStudentList.map((student, index) => {
                return (
                  <tr
                    key={index}
                    className={
                      student.is_low_balance
                        ? "selectable-row-table-row text-red"
                        : "selectable-row-table-row"
                    }
                  >
                    <td
                      className={
                        student.is_low_balance
                          ? "textAlign"
                          : "textAlign pl-15 "
                      }
                    >
                      <Box display="flex">
                        {student.is_low_balance && (
                          <Tooltip
                            title={"Balance is low"}
                            enterDelay={400}
                            enterNextDelay={400}
                            placement="top-start"
                            classes={{ tooltip: "tooltip-show-data" }}
                          >
                            <InfoIcon className="cursor-pointer" />
                          </Tooltip>
                        )}
                        <Box>{student.name}</Box>
                      </Box>
                    </td>
                    <td className={"textAlign pl-15 "}>{student.standard}</td>
                    <td className={"textAlign pl-15 "}>
                      {student.allocation_details}
                    </td>
                    <td className={"textAlign pl-15 "}>
                      {numberWithCommas(student?.balance ?? 0)}
                    </td>
                    <td className={"textAlign pl-15 "}>
                      <DeleteOutlineIcon
                        onClick={() => this.handleDelete(index)}
                        className="text-red cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
              {finalStudentList.length === 0 && (
                <tr className="text-center font-weight-bold">No Data Found</tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog fullScreen open={openDialog} onClose={this.handleClose}>
          <AppBar style={{ position: "fixed", backgroundColor: "#4680FF" }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={this.handleClose}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6">Select Students</Typography>
            </Toolbar>
          </AppBar>
          <Box className="student-route-table-popup margin-top">
            {ListLoading && (
              <Box display="flex">
                <img src={loadingBar} className="loading" alt="loading" />
              </Box>
            )}
            {!ListLoading && data_list && selected_name === "student" && (
              <Grid container>
                <Grid item md={3} xs={12} className="margin-top-15">
                  <ToggleButtonGroup
                    size="medium"
                    value={student.type}
                    exclusive
                    onChange={this.changeToggle}
                    style={{ backgroundColor: "white" }}
                  >
                    <ToggleButton
                      key={1}
                      value="current"
                      className={
                        student.type == "current"
                          ? "selected-transaction-type"
                          : "not-selected-transaction-type"
                      }
                    >
                      Current
                    </ToggleButton>
                    <ToggleButton
                      key={2}
                      value="upcoming"
                      className={
                        student.type == "upcoming"
                          ? "selected-transaction-type"
                          : "not-selected-transaction-type"
                      }
                    >
                      Upcoming
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
                {student.type !== "upcoming" && (
                  <Grid item md={3} xs={12}>
                    <Dropdown
                      data={standardList}
                      name="selectedStandard"
                      value={selectedStandard}
                      onChange={this.onChange}
                      label="Select Standard"
                      className="width-100"
                      hideSelect={true}
                    />
                  </Grid>
                )}
                <Grid item md={3} xs={12}>
                  <Dropdown
                    data={floorList}
                    name="selectedFloor"
                    value={selectedFloor}
                    onChange={this.onChange}
                    label="Select Floor"
                    className="width-100"
                    hideSelect={true}
                  />
                </Grid>
              </Grid>
            )}
            {!ListLoading && data_list && (
              <Box className="header-align">
                <AllMUIDataTable
                  key={data_list.data_list}
                  data={data_list.data_list}
                  columns={
                    selected_name === "student"
                      ? student_columns
                      : staff_columns
                  }
                  options={options}
                  title={
                    tableUpdating ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                  onTableChange={this.getDataList}
                  serverSide={true}
                  pagination={pagination}
                  count={data_list.count}
                />
              </Box>
            )}
            {!data_list && <BlankPagewithIcon data={blankData} />}
          </Box>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(HostelSelectedStudents);

const MuiToolbar = ({ selectedRows, submitSelectedStudents }) => {
  return (
    <div className="toolbar-select">
      <Button
        variant="contained"
        color="primary"
        className="mr-20 submit"
        onClick={() => submitSelectedStudents(selectedRows)}
      >
        <FormattedMessage {...commonMessages.select} />
      </Button>
    </div>
  );
};

MuiToolbar.propTypes = {
  selectedRows: PropTypes.array.isRequired,
  submitSelectedStudents: PropTypes.func.isRequired,
};

import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  FormControl,
  TextareaAutosize,
  FormHelperText,
  Icon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Tooltip,
  TextField,
} from "@material-ui/core";
import Swal from "sweetalert2";
import classNames from "classnames";
import _ from "lodash";
import { withRouter } from "react-router-dom";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

import AllMUIDataTable from "Components/AllMUIDataTable";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  getPaginationProps,
  dateFormat,
  getFullName,
  validateDate,
  getAcademicYear,
  SetAcademicYear,
} from "Includes/functions";
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class LibCheckinChekout extends Component {
  constructor() {
    super();
    this.state = {
      checkInOutList: { student_list: [] },
      fieldValue: { checkIn: null, checkOut: null },
      fieldError: {},
      buildingList: [],
      selectedYear: "",
      selected_id: "",
      errorContent: "",
      selectedDate: null,
      loading: false,
      submitDisable: false,
      selectedToDelete: [],
      allocation_detail: {},
      user_name: "",
      tableUpdating: false,
      openDialog: false,
      bankLoaded: false,
      fieldDetails: null,
      tab_menu: 1,
      checkinMinDate: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      enabledActions: [],
      selected_user: "student",
      selected_action: "",
      bank_id: "",
      id: "",
      bank_name: "",
      account_num: "",
      fee_name: "",
      dateRangeValue: {},
      errors: {},
      largeImagePreview: "",
      isOpenedDateRange: false,
      admission_num: "",
      yearList: [],
      standardList: [],
      selectedStandard: "",
      dateRangeDropdownList: [
        { id: "l1m", name: "Last 1 Month" },
        { id: "l3m", name: "Last 3 Months" },
        { id: "l6m", name: "Last 6 Months" },
        { id: "l1y", name: "Last 1 Year" },
      ],
      isDateRange: false,
      dateRangeDropdown: "l1m",
      isBlankPage: true,
      blankData: "Select Academic Year",
      student_columns: [
        {
          name: "user_id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
            download: false,
          },
        },
        {
          name: "full_name",
          label: "Student Name",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "current_standard_name",
          label: `${alias_names["standard"]}`,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        // {
        //   name: "current_reg_num",
        //   label: "Register Num",
        //   options: {
        //     filter: false,
        //     sort: true,
        //     search: true,
        //   },
        // },
        {
          name: "admission_num",
          label: "Admission Number",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "checkincheckouttiming",
          label: "Last In/Out Timing",
          options: {
            display: isUserHasPermission("checkIn_checkOut_List", "create"),
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {tableMeta?.rowData[6]?.["attendance_checkout"] ? (
                    <Tooltip
                      title={"Last Checked Out"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Box>
                        {dateFormat(
                          tableMeta.rowData[6]["attendance_checkout"],
                          "DD-MM-YYYY hh:mm A"
                        )}
                      </Box>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={"Last Checked In"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Box>
                        {/* {dateFormat(
                          tableMeta?.rowData?.[6]?.["attendance_checkin"],
                          "DD-MM-YYYY hh:mm A"
                        )} */}
                      </Box>
                    </Tooltip>
                  )}
                  {!tableMeta?.rowData[6]?.["attendance_checkout"] &&
                    !tableMeta?.rowData[6]?.["attendance_checkin"] && (
                      <Box>Not yet checked in</Box>
                    )}
                </div>
              );
            },
          },
        },
        {
          name: "roomallocation_student",
          label: "In/Out",
          options: {
            display: isUserHasPermission("checkIn_checkOut_List", "create"),
            filter: false,
            sort: false,
            viewColumns: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value?.["attendance_checkout"] ||
                  (!value?.["attendance_checkin"] &&
                    !value?.["attendance_checkout"]) ? (
                    <Button
                      className="add-modify-button"
                      onClick={(e) =>
                        this.handleCheckInOut(
                          tableMeta.rowData[0],
                          tableMeta.rowData[1],
                          "CheckIn",
                        )
                      }
                    >
                      Check In
                    </Button>
                  ) : (
                    value["attendance_checkin"] &&
                    !value["attendance_checkout"] && (
                      <Button
                        className="add-modify-button"
                        onClick={(e) =>
                          this.handleCheckInOut(
                            tableMeta.rowData[0],
                            tableMeta.rowData[1],
                            "CheckOut",
                          )
                        }
                      >
                        Check Out
                      </Button>
                    )
                  )}
                </div>
              );
            },
          },
        },
      ],
      staff_columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
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
          },
        },
        {
          name: "group_name",
          label: "Group",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <Box>{value?.[0]}</Box>;
            },
          },
        },
        {
          name: "mobile_num",
          label: "Mobile Number",
          options: {
            filter: false,
            sort: true,
            search: true,
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
          name: "checkincheckouttiming",
          label: "Last In/Out Timing",
          options: {
            display: isUserHasPermission("checkIn_checkOut_List", "create"),
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {tableMeta?.rowData[6]?.["attendance_checkout"] ? (
                    <Tooltip
                      title={"Last Checked Out"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Box>
                        {dateFormat(
                          tableMeta.rowData[6]["attendance_checkout"],
                          "DD-MM-YYYY hh:mm A"
                        )}
                      </Box>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={"Last Checked In"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Box>
                        {dateFormat(
                          tableMeta.rowData[6]?.["attendance_checkin"],
                          "DD-MM-YYYY hh:mm A"
                        )}
                      </Box>
                    </Tooltip>
                  )}
                  {!tableMeta.rowData[6]?.["attendance_checkout"] &&
                    !tableMeta.rowData[6]?.["attendance_checkin"] && (
                      <Box>Not yet checked in</Box>
                    )}
                </div>
              );
            },
          },
        },
        {
          name: "roomallocation_staff",
          label: "In/Out",
          options: {
            display: isUserHasPermission("checkIn_checkOut_List", "create"),
            filter: false,
            sort: false,
            viewColumns: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value?.["attendance_checkout"] ||
                  (!value?.["attendance_checkin"] &&
                    !value?.["attendance_checkout"]) ? (
                    <Button
                      className="add-modify-button"
                      onClick={(e) =>
                        this.handleCheckInOut(
                          tableMeta.rowData[1],
                          value,
                          "CheckIn"
                        )
                      }
                    >
                      {" "}
                      Check In
                    </Button>
                  ) : (
                    value["attendance_checkin"] &&
                    !value["attendance_checkout"] && (
                      <Button
                        className="add-modify-button"
                        onClick={(e) =>
                          this.handleCheckInOut(
                            tableMeta.rowData[1],
                            value,
                            "CheckOut"
                          )
                        }
                      >
                        Check Out
                      </Button>
                    )
                  )}
                </div>
              );
            },
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  deleteCheckInOut = (id, index) => {
    this.setState({ tableUpdating: true });
    let { checkInOutList, student_columns, staff_columns } = this.state;
    const del_url = DEL_URL.usercheckincheckout.api;
    const url = del_url + id + "/";
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        checkInOutList.student_list.splice(index, 1);
        this.setState({
          checkInOutList,
          student_columns: [...student_columns],
          staff_columns: [...staff_columns],
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

  handleCheckInOut = (
    user_id,
    user_name,
    selected_action,
  ) => {
    this.setState({
      user_id,
      user_name,
      openDialog: true,
      selected_action,
      errorContent: "",
      fieldValue: { checkIn: new Date(), checkOut: new Date() },
      fieldError: {},
    });
  };

  getCheckInOutList = (paginationProps) => {
    this.setState({ tableUpdating: true });
    let {
      pagination,
      selectedStandard,
      selectedSection,
      selected_group,
      selectedYear,
    } = this.state;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = GET_URL.student.api;
    let params;
    if (selectedStandard && selectedStandard !== "all") {
      params = {
        ...pagination_params,
        is_active: true,
        current_standard: selectedStandard,
      };
      if (selectedSection !== "all") {
        let secTemp = { standard_section: selectedSection };
        params = { ...params, ...secTemp };
      }
    } else {
      params = { ...pagination_params, is_active: true };
    }
    let prop = { ...this.props };
    if (paginationProps === "download") {
      params["download_excel"] = 1;
      prop.responseType = "blob";
    }
    if (selected_group) {
      params["student_group"] = selected_group;
    }
    if (selectedYear) {
      params["student_academic_year"] = selectedYear;
    }
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `Student_List.xlsx`);
          document.body.appendChild(link);
          link.click();
          this.setState({
            tableUpdating: false,
            loading: false,
          });
          return;
        }
        this.callApi = true;
        const studentList = response.data.data;
        studentList.student_list.map((data) => {
          data["full_name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
        });
        this.setState({
          checkInOutList: studentList,
          AllStudentList: [],
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
    return false;
  };

  updatePermissions = (name) => {
    let test = true;
    const hasViewPermission = isUserHasPermission(
      "checkIn_checkOut_Individual",
      "view"
    );
    // const hasDeletePermission = isUserHasPermission('checkIn_checkOut_List', 'delete')
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    }
    // if (hasDeletePermission) {
    //     enabledActions.push('delete')
    // }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
      });
    }
  };

  componentDidMount = () => {
    this.getYearList();
    this.getStandardList();
    this.updatePermissions();
    this.getHostelBuildingList();
    // const { selectedYear, user } = getUrlParam();
    if (getAcademicYear()) {
      this.setState(
        {
          selectedYear: getAcademicYear(),
          isBlankPage: false,
          // selected_user: user,
        },
        () => {
          this.getCheckInOutList();
        }
      );
    }
  };

  getYearList = () => {
    const url = GET_URL.getacademicyear.api;
    getRequest(url, { is_active: true }, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          yearList: response.data.data,
        });
      }
    });
  };

  getStandardList = () => {
    const { selectedYear } = this.state;
    const url = GET_URL.getstandard.api;
    const param = { is_active: true, academic_year: selectedYear };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let standardList = [...response.data.data];
        let temp = { id: "all", name: "All" };
        standardList.unshift(temp);
        let selectedStandard = "all";
        this.setState({
          standardList,
          selectedStandard,
          loading: false,
        });
      }
    });
  };

  getHostelBuildingList = () => {
    const url = GET_URL.buildingdata.api;
    const params = { is_active: true, building_type: "Hostel" };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          buildingList: response.data.data,
          loading: false,
        });
      }
    });
  };

  onChangeHandleView = (user) => {
    const { selectedYear } = this.state;
    this.setState(
      {
        selected_user: user,
        checkInOutList: [],
      },
      () => {
        if (selectedYear) {
          this.getCheckInOutList();
        }
      }
    );
  };

  onChange = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
        isBlankPage: false,
      },
      () => {
        if (name === "selectedYear") {
          this.getStandardList();
          SetAcademicYear(value);
        }
        this.getCheckInOutList();
      }
    );
  };

  handleChangeCheckInOut = (e, name) => {
    let { fieldValue, fieldError } = this.state;
    if (name === "checkIn") {
      delete fieldError["checkIn"];
    } else {
      delete fieldError["checkIn"];
    }
    fieldValue[name] = e;
    this.setState({
      fieldValue,
      fieldError,
    });
  };

  handleClose = () => {
    this.setState({
      openDialog: false,
    });
    this.getCheckInOutList();
  };

  submit = () => {
    let returnValue = this.validation();
    if (returnValue) {
      this.setState({
        submitDisable: true,
      });
      let propsValue = { ...this.props };
      propsValue["return_error_message"] = true;
      const url = POST_URL.libraryuserattendance.api;
      let post_data = {
        fordate_time: dateFormat(new Date(), "YYYY-MM-DD hh:mm:ss"),
        user_id: this.state.user_id,
      };
      postRequest(url, post_data, propsValue).then((response) => {
        if (response && response.status === 200) {
          this.getCheckInOutList();
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState({
            openDialog: false,
          });
        } else {
          this.setState({
            errorContent: response,
          });
        }
        this.setState({
          submitDisable: false,
        });
      });
    }
  };

  validation = () => {
    const {
      fieldValue,
      fieldError,
      selected_user,
      selected_action,
      allocation_detail,
      selected_id,
    } = this.state;
    let returnValue = true;
    let error = "";
    let value = "";
    let name = "";
    let minDate = "";
    if (selected_action === "CheckIn") {
      name = "checkIn";
      value = fieldValue["checkIn"];
      minDate = allocation_detail["attendance_checkout"]
        ? allocation_detail["attendance_checkout"]
        : allocation_detail["checkin"];
    } else {
      name = "checkOut";
      value = fieldValue["checkOut"];
      minDate = allocation_detail["attendance_checkin"];
    }
    if (value === null) {
      error = `Please Enter Start Date`;
      returnValue = false;
    } else {
      error = validateDate(value, minDate, new Date(), "time");
    }
    if (!fieldValue["reason"] && selected_action === "CheckOut") {
      returnValue = false;
      fieldError["reason"] = `Please Enter Reason`;
    }
    if (error !== "") {
      returnValue = false;
      fieldError[name] = `Date should be within ${
        selected_action === "CheckIn"
          ? allocation_detail["attendance_checkout"]
            ? "last checked-out"
            : "start date"
          : "last Checked-in"
      } (${dateFormat(minDate, "DD-MM-YYYY hh:mm A")}) To Current time`;
    }
    this.setState({
      fieldValue,
      fieldError,
    });

    if (returnValue) {
      returnValue = { attendance_data: [] };
      let post_data = {
        reason: selected_action === "CheckOut" ? fieldValue["reason"] : "",
        checkin:
          selected_action === "CheckIn"
            ? dateFormat(fieldValue["checkIn"], "YYYY-MM-DD HH:mm:ss")
            : allocation_detail["attendance_checkin"]
            ? dateFormat(
                allocation_detail["attendance_checkin"],
                "YYYY-MM-DD HH:mm:ss"
              )
            : null,
        checkout:
          selected_action === "CheckOut"
            ? dateFormat(fieldValue["checkOut"], "YYYY-MM-DD HH:mm:ss")
            : null,
        roomallocation: allocation_detail["id"],
        student:
          selected_user === "student" ? allocation_detail["student"] : null,
        staff: selected_user === "staff" ? allocation_detail["staff"] : null,
      };
      if (allocation_detail["attendance_id"] && selected_action == "CheckOut") {
        post_data["id"] = allocation_detail["attendance_id"];
      }
      returnValue.attendance_data.push(post_data);
    }
    return returnValue;
  };

  onChangeReason = (e) => {
    const { fieldError, fieldValue } = this.state;
    let { name, value } = e.target;
    fieldValue[name] = value;
    delete fieldError[name];
    this.setState({
      fieldValue,
      fieldError,
    });
  };

  handleKeyDown = () => {};

  render() {
    const {
      loading,
      checkInOutList,
      openDialog,
      fieldValue,
      fieldError,
      errorContent,
      submitDisable,
      selected_action,
      user_name,
      checkinMinDate,
      pagination,
      isBlankPage,
      selectedYear,
      blankData,
      buildingList,
      errors,
      selected_user,
      tableUpdating,
      student_columns,
      staff_columns,
      admission_num,
      yearList,
      standardList,
      tab_menu,
      selectedStandard,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      downloadOptions: {
        filename: "Checkin_Checkout_List.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
    };
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Grid container spacing={2}>
            <Grid item md={3} xs={12} className="mt-20">
              <Dropdown
                data={yearList}
                name="selectedYear"
                fullWidth
                value={selectedYear}
                onChange={this.onChange}
                label="Academic Year"
                hideSelect={true}
                error={errors.selectedYear}
                size={"small"}
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <Dropdown
                data={standardList}
                name="selectedStandard"
                fullWidth
                value={selectedStandard}
                onChange={this.onChange}
                label="Standard"
                hideSelect={true}
                error={errors.selectedStandard}
                size={"small"}
              />
            </Grid>
            <Grid
              item
              md={3}
              xs={12}
              className="align-self-center end-flex-prop"
            >
              <Box
                className="list-grid-toggle-outer-div header-align"
                style={{ width: "224px" }}
              >
                <Button
                  className={
                    selected_user === "student"
                      ? "list-selected-toggle"
                      : "grid-selected-toggle"
                  }
                  onClick={(e) => this.onChangeHandleView("student")}
                  disabled={selected_user === "student"}
                >
                  <Box
                    className={
                      selected_user === "student"
                        ? "list-selected-toggle-text"
                        : "grid-selected-toggle-text"
                    }
                  >
                    Student
                  </Box>
                  <Icon
                    className={classNames(
                      selected_user === "student"
                        ? "list-selected-toggle-icon"
                        : "grid-selected-toggle-icon",
                      "fa fa-bars"
                    )}
                  />
                </Button>
                <Button
                  className={
                    selected_user === "staff"
                      ? "list-selected-toggle"
                      : "grid-selected-toggle"
                  }
                  onClick={(e) => this.onChangeHandleView("staff")}
                  disabled={selected_user === "staff"}
                >
                  <Box
                    className={
                      selected_user === "staff"
                        ? "list-selected-toggle-text"
                        : "grid-selected-toggle-text"
                    }
                  >
                    Staff
                  </Box>
                  <Icon
                    className={classNames(
                      selected_user === "staff"
                        ? "list-selected-toggle-icon"
                        : "grid-selected-toggle-icon",
                      "fa fa-th-large"
                    )}
                  />
                </Button>
              </Box>
            </Grid>
          </Grid>
          {isBlankPage && (
            <Box className="header-align mt-20">
              <BlankPagewithIcon data={blankData} />
            </Box>
          )}
          {!isBlankPage && (
            <Grid container className={classNames("header-align mt-20")}>
              <Grid item md={12} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    key={checkInOutList.student_list}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={checkInOutList.student_list}
                    columns={
                      selected_user === "student"
                        ? student_columns
                        : staff_columns
                    }
                    options={options}
                    onTableChange={this.getCheckInOutList}
                    serverSide={true}
                    pagination={pagination}
                    count={checkInOutList.count}
                  />
                </Paper>
              </Grid>
            </Grid>
          )}
          <Dialog
            open={openDialog}
            className="action-basic-detail-width"
            onClose={this.handleClose}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title"></DialogTitle>
            <DialogContent className={""}>
              <DialogContentText
                style={{
                  textAlign: "center",
                  fontSize: "20px",
                  fontWeight: "700",
                }}
              >
                {`Enter Details for ${user_name}`}
              </DialogContentText>
              <Box>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  {selected_action === "CheckIn" && (
                    <KeyboardDateTimePicker
                      autoComplete="off"
                      variant="dialog"
                      ampm={true}
                      className="width-100"
                      autoOk
                      inputVariant="outlined"
                      label="Check In"
                      name="checkIn"
                      minDate={checkinMinDate}
                      maxDate={new Date()}
                      format="dd-MM-yyyy hh:mm a"
                      value={fieldValue["checkIn"]}
                      onChange={(e) =>
                        this.handleChangeCheckInOut(e, "checkIn")
                      }
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      inputProps={{ maxLength: 50 }}
                      helperText={
                        !fieldError["checkIn"]
                          ? "Format DD-MM-YYYY"
                          : fieldError["checkIn"]
                      }
                      error={fieldError["checkIn"] ? true : false}
                    />
                  )}
                  {selected_action === "CheckOut" && (
                    <KeyboardDateTimePicker
                      autoComplete="off"
                      variant="dialog"
                      ampm={true}
                      className="width-100"
                      autoOk
                      inputVariant="outlined"
                      label="Check Out"
                      name="checkOut"
                      minDate={checkinMinDate}
                      maxDate={new Date()}
                      format="dd-MM-yyyy hh:mm a"
                      value={fieldValue["checkOut"]}
                      onChange={(e) =>
                        this.handleChangeCheckInOut(e, "checkOut")
                      }
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      inputProps={{ maxLength: 50 }}
                      helperText={
                        !fieldError["checkOut"]
                          ? "Format DD-MM-YYYY"
                          : fieldError["checkOut"]
                      }
                      error={fieldError["checkOut"] ? true : false}
                    />
                  )}
                </MuiPickersUtilsProvider>
              </Box>
              {selected_action === "CheckOut" && (
                <FormControl
                  fullWidth
                  error={
                    fieldError["reason"] &&
                    (fieldError["reason"] ? true : false)
                  }
                >
                  <Box className="leave-pending-staff-label">Reason</Box>
                  <TextareaAutosize
                    aria-label="minimum height"
                    className="check-in-out-text-area-auto-size-reason"
                    value={fieldValue["reason"]}
                    name="reason"
                    onChange={this.onChangeReason}
                    required
                  />
                  {fieldError["reason"] && (
                    <FormHelperText>{fieldError["reason"]}</FormHelperText>
                  )}
                </FormControl>
              )}
              <Box className="error-content flex-justify-center margin-top-10">
                {errorContent}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleClose} color="secondary">
                Close
              </Button>
              <Button
                disabled={submitDisable}
                onClick={this.submit}
                color="primary"
              >
                Submit
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }
  }
}
export default withRouter(LibCheckinChekout);

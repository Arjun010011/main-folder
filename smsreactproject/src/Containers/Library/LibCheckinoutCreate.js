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
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import moment from "moment";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import _ from "lodash";
import { withRouter } from "react-router-dom";
import StudentListActions from "Includes/StudentListActions";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
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
  getUrlParam,
  getPaginationProps,
  dateFormat,
  getFullName,
  numberWithCommas,
  validateDate,
  getAcademicYear,
  getStandard,
  SetAcademicYear,
} from "Includes/functions";
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import { image_formats } from "Containers/Expenses/Constants";
import LibCheckinCheckout from "./LibCheckinCheckout";
import { CheckInOutUserDetails } from "./Components/CheckInOutUserDetails";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class LibCheckinoutcreate extends Component {
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
      bookList: [],
      bankLoaded: false,
      fieldDetails: null,
      tab_menu: 1,
      checkinMinDate: "",
      user_details: null,
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
      bar_code: "",
      yearList: [],
      standardList: [],
      selectedStandard: "",
      book_status: [],
      autoFocusBook: true,
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
          name: "visited_type",
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
          label: "Name",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "standard",
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
          name: "fordate_time",
          label: "Last In/Out Timing",
          options: {
            display: isUserHasPermission("library_checkin_checkout", "create"),
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {tableMeta?.rowData[0] === 1 ? (
                    <Tooltip
                      title={"Last Checked In"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Box className="text-green">
                        {`Checked In
                        ${dateFormat(value, "DD-MM-YYYY hh:mm A")}
                      `}
                      </Box>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={"Last Checked Out"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Box className="text-red">
                        {`Checked Out
                        ${dateFormat(value, "DD-MM-YYYY hh:mm A")}
                      `}
                      </Box>
                    </Tooltip>
                  )}
                  {/* {!tableMeta?.rowData[0] &&
                    !tableMeta?.rowData[6]?.["attendance_checkin"] && (
                      <Box>Not yet checked in</Box>
                    )} */}
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
    user_name,
    allocation_detail,
    selected_action,
    checkinMinDate
  ) => {
    if (selected_action === "CheckIn") {
      checkinMinDate = allocation_detail?.["attendance_checkout"]
        ? allocation_detail["attendance_checkout"]
        : allocation_detail?.["checkin"];
    } else {
      checkinMinDate = allocation_detail["attendance_checkin"];
    }
    this.setState({
      allocation_detail,
      user_name,
      openDialog: true,
      selected_action,
      checkinMinDate,
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
    const url = GET_URL.libraryuserattendance.api;
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
          data["full_name"] = data?.user?.student?.name
            ? data.user.student.name
            : `${data?.user?.staff?.full_name} (staff)`;
          data["standard"] = data?.user?.student
            ? data.user.student.current_standard_name
            : (data?.user?.staff ? "-" : "-");
          data["admission_num"] = data?.user?.student
            ? data.admission_num
            : (data?.user?.staff ? "-" : "-");
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
        if (getStandard()) {
          selectedStandard = getStandard();
        }
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
    this.setState({
      [name]: value,
      isBlankPage: false,
    });
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
      let postUrl = POST_URL.usercheckincheckout.api;
      postRequest(postUrl, returnValue, propsValue).then((response) => {
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
      fieldError[name] = `Date should be within ${selected_action === "CheckIn"
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

  handleKeyDown = (e) => {
    if (e.key === "Enter" && this.state.bar_code) {
      this.setState({ tableUpdating: true }, () => {
        this.updateCheckinoutStatus();
      });
    }
  };

  searchStudent = (params) => {
    let { book_details, book_status } = this.state;
    const url = GET_URL.bookandusersearch.api;
    let prop = { ...this.props };
    prop["autoHideError"] = true;
    prop["timing"] = 2000;
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        const user_details = response.data
        // const user_details = {
        //   id: response.data.id,
        //   is_staff: false,
        //   staff: null,
        //   student: response.data.student,
        //   assigned_books: response.data.assigned_books,
        //   staff_details: null,
        //   total_fine_amount: response.data.total_fine_amount,
        //   student_details: {
        //     id: response.data.id,
        //     name: response.data?.student_details?.name,
        //     mobile_num: response.data?.student_details?.mobile_num,
        //     standard_name: response.data?.student_details?.standard_name,
        //     section_name: response.data?.student_details?.section_name,
        //     number_of_books_issues: response.data.assigned_books.length,
        //     profile_pic_details: response.data?.student_details?.profile_pic_details,

        //   },
        // };
        if (book_details && book_status.includes("RETURN")) {
          book_details = null;
        }
        if (
          Array.isArray(user_details.assigned_books) &&
          user_details.assigned_books.length > 0 &&
          !book_details
        ) {
          book_details = user_details.assigned_books[0];
          book_status = ["RETURN", "RENEW"];
        }
        this.setState({
          user_details,
          bookList: user_details.assigned_books,
          book_details,
          book_status,
        });
      }
      this.setState({ bar_code: "" });
    });
  };

  updateCheckinoutStatus = () => {
    const url = POST_URL.libraryuserattendance.api;
    let post_data = {
      fordate_time: dateFormat(new Date(), "YYYY-MM-DD HH:mm:ss"),
      bar_code: this.state.bar_code,
    };
    let prop = { ...this.props };
    prop["autoHideError"] = true;
    prop["timing"] = 2000;
    postRequest(url, post_data, prop).then((response) => {
      if (response && response.status === 200) {
        this.searchStudent({ user_bar_code: this.state.bar_code });
        this.getCheckInOutList();
      }
      else {
        this.setState({ bar_code: '' });
      }
      this.setState({ tableUpdating: false });
    });
  };

  changeToggle = (e, value) => {
    if (value !== this.state.tab_menu) {
      this.setState(
        {
          tab_menu: value,
        },
        () => {
          if (value === 1) {
            this.getCheckInOutList();
          }
        }
      );
    }
  };

  onChangeYear = (e) => {
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
      bar_code,
      book_details,
      standardList,
      tab_menu,
      user_details,
      bookList,
      yearList,
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
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Library Check In-Out List</Box>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item md={9} xs={12} className="mt-20 text-align-center">
                <div className="d-flex align-items-center">
                  <div>
                    <TextField
                      autoFocus
                      id="bar_code"
                      autoComplete="off"
                      label="Search Barcode Num"
                      name="bar_code"
                      variant="outlined"
                      value={bar_code}
                      onKeyDown={(e) => this.handleKeyDown(e)}
                      className="width-350px"
                      inputProps={{ maxLength: 50 }}
                      size="large"
                      onChange={(e) => this.onChange(e)}
                      error={errors["bar_code"]}
                      helperText={errors["bar_code"]}
                    />
                  </div>
                  <div className="ml-20">
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={submitDisable}
                      onClick={this.updateCheckinoutStatus}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
              </Grid>
              <Grid
                item
                md={3}
                xs={12}
                className={classNames("header-align", "text-align-end")}
              >
                <ToggleButtonGroup
                  size="small"
                  value={tab_menu}
                  exclusive
                  onChange={this.changeToggle}
                >
                  {/* <ToggleButton key={1} value={1}>
                    Check in/out
                  </ToggleButton> */}
                  {/* <ToggleButton key={2} value={2}>
                    Status List
                  </ToggleButton> */}
                </ToggleButtonGroup>
              </Grid>
            </Grid>
            <CheckInOutUserDetails
              user_details={user_details}
              book_details={book_details}
              bookList={bookList}
            />
            {tab_menu == 2 ? (
              <>
                <LibCheckinCheckout />
              </>
            ) : (
              <>
                {/* <Grid container className={classNames("header-align mt-20")}>
                  <Grid item md={4} xs={12} className="mt-20">
                    <Dropdown
                      data={yearList}
                      name="selectedYear"
                      fullWidth
                      value={selectedYear}
                      onChange={this.onChangeYear}
                      label="Academic Year"
                      hideSelect={true}
                      error={errors.selectedYear}
                      size={"small"}
                    />
                  </Grid>
                </Grid> */}
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
                          columns={student_columns}
                          options={options}
                          onTableChange={this.getCheckInOutList}
                          serverSide={true}
                          pagination={pagination}
                          count={checkInOutList.count}
                          autoFocus={false}
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </>
            )}
          </Paper>
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
export default withRouter(LibCheckinoutcreate);

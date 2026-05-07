import React, { Component } from "react";
import {
  Paper,
  Box,
  CircularProgress,
  Grid,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@material-ui/core";
import Swal from "sweetalert2";
import { Link, withRouter } from "react-router-dom";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { Actions } from "Constants/permissions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import moment from "moment";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import { minDate, options, staffAttendanceMaxDate } from "Constants";
import {
  dateFormat,
  validateDate,
  getUrlParam,
  timeFormat,
} from "Includes/functions";
import "./styles.scss";
import { TrendingUpOutlined } from "@material-ui/icons";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class HrAssignShift extends Component {
  state = {
    yearList: [],
    loading: true,
    loadingStaff: false,
    year: "",
    fromDate: "",
    check_in: null,
    check_out: null,
    toDate: "",
    errors: {},
    shiftTypeList: [],
    selectedShift: "",
    openFromCalender: false,
    openToCalender: false,
    staffList: [],
    selectedToggle: "financial",
    staffIndex: [],
    staffids: [],
    submitDisable: false,
    yearError: "",
    customDate: false,
    applyDisable: true,
    enableTitle: false,
    start_time: null,
    end_time: null,
    date: null,
    isAbsent: false,
    isPresent: true,
    selectedStatus: "",
    statusList: {},
    show_present_in_web_to_mark_present: isFormDefinitionEnabled(
      "staff_attendance",
      "show_present_in_web_to_mark_present",
      1
    ),
    columns: [
      {
        name: "Serial Number",
        label: "SL No   ",
        options: {
          filter: false,
          sort: false,
          search: false,
          customBodyRender: (value, tableMeta, updateValue) => {
            return tableMeta.rowIndex + 1;
          },
        },
      },
      {
        name: "staff_name",
        label: "Staff Name",
        options: {
          selectableRows: "none",
          filter: true,
          sort: true,
        },
      },
      {
        name: "start_time",
        label: "Shift Timings",
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return (
              <Box>
                {value &&
                  `${timeFormat(value)} - ${timeFormat(tableMeta.rowData[3])}`}
              </Box>
            );
          },
        },
      },
      {
        name: "end_time",
        label: "Out Time",
        options: {
          filter: false,
          sort: false,
          display: false,
        },
      },
      {
        name: "id",
        label: "id",
        options: {
          filter: true,
          sort: false,
          display: false,
        },
      },
    ],
  };

  componentDidMount = async () => {
    let { selected_date } = getUrlParam();
    this.setState(
      {
        selected_date: selected_date,
        check_in: moment(selected_date),
      },
      () => {
        this.getStaffList();
      }
    );
    this.setOptionsForTable();
  };

  getStaffList = async () => {
    let validate = this.onBlurValidation();
    if (validate) {
      let { selected_date } = this.state;
      this.setState({ loadingStaff: true });
      const shift_url = GET_URL.staffunmarkedattendance.api;
      const param = { fordate: dateFormat(selected_date, "YYYY-MM-DD") };
      await getRequest(shift_url, param, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState({
            staffList: response.data.data,
            loading: false,
            loadingStaff: false,
          });
        }
      });
      
      // Also fetch status list from attendance API
      const attendance_url = GET_URL.staffattendance.api;
      const attendance_param = { 
        from_date: dateFormat(selected_date, "YYYY-MM-DD"), 
        to_date: dateFormat(selected_date, "YYYY-MM-DD") 
      };
      await getRequest(attendance_url, attendance_param, this.props).then((response) => {
        if (response && response.status === 200 && response.data.status_list) {
          this.setState({
            statusList: response.data.status_list,
          });
        }
      });
    }
  };

  setOptionsForTable = () => {
    let newOptions = { ...options };
    newOptions["selectableRows"] = "multiple";
    newOptions["customToolbarSelect"] = () => {};
    newOptions["onRowsClick"] = (data) => {};
    newOptions["onTableChange"] = (action, tableState) => {
      if (action === "rowSelectionChange") {
        let { errors } = this.state;
        delete errors["NotSelectedStaff"];
        this.setState({
          staffIndex: tableState.selectedRows.data,
          errors,
          open: false,
        });
      }
    };
    this.setState({
      options: newOptions,
    });
  };

  submit = () => {
    let {
      staffList,
      selected_date,
      check_in,
      check_out,
      staffIndex,
      errors,
      isAbsent,
      isPresent,
      selectedStatus,
    } = this.state;
    let validate = this.onBlurValidation("submit");
    if (validate) {
      this.setState({ disable: true });
      let staff_ids = [];
      staffIndex.map((data) => {
        staff_ids.push(staffList[data.dataIndex].id);
      });
      let postData = {};
      if (selectedStatus) {
        // If a status is selected, use it
        postData = {
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
          status: selectedStatus,
          staff_ids: staff_ids,
        };
      } else {
        // Default to present status - checkin and checkout will be set automatically
        postData = {
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
          status: "present",
          staff_ids: staff_ids,
        };
      }
      // Remove the else block that used check_in/check_out since we always use present status
      if (false) {
        postData = {
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
          in_time: dateFormat(check_in, "YYYY-MM-DD HH:mm:ss"),
          out_time: check_out
            ? dateFormat(check_out, "YYYY-MM-DD HH:mm:ss")
            : null,
          staff_ids: staff_ids,
        };
      }
      const url = POST_URL.staffattendance.api;
      postRequest(url, postData, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Marked Attendance Successful",
            showConfirmButton: false,
            timer: 1500,
          });
          this.handleViewAttendanceButton();
        }
        this.setState({ disable: false });
      });
    } else {
      this.setState({ errors });
    }
  };

  onBlurValidation = (name) => {
    let { check_in, errors, check_out, staffIndex, isPresent, selectedStatus } = this.state;
    let returnValue = true;
    let error_check_in = "";
    // Since we always use present status, no need to validate check_in/check_out
    // They will be set automatically based on shift timings
    if (false) {
      // This block is kept for reference but won't execute
      if (check_in === null && !isPresent && !selectedStatus) {
        error_check_in = `Please Enter In Time or Select a Status`;
        returnValue = false;
      } else if (!selectedStatus) {
        error_check_in = validateDate(check_in, minDate);
      }
    }
    if (error_check_in !== "") {
      errors["check_in"] = error_check_in;
      returnValue = false;
    }
    if (name === "submit") {
      if (staffIndex.length === 0) {
        returnValue = false;
        errors["NotSelectedStaff"] = "Please select at-least one staff";
        this.setState({
          open: true,
          alertData: "Please select at-least one staff to mark attendance",
        });
      }
      if (check_out !== null) {
        let error_check_out = "";
        error_check_out = validateDate(check_out, check_in);
        if (error_check_out !== "") {
          errors["check_out"] = `Minimum time ${dateFormat(
            check_in,
            "DD-MM-YYYY hh:mm A"
          )}`;
          returnValue = false;
        }
        if (check_in && check_out && returnValue) {
          let DutyDayStartTime = moment(check_in, "YYYY-MM-DD HH:mm");
          let DutyDayEndTime = moment(check_out, "YYYY-MM-DD HH:mm");
          let diffTime = DutyDayEndTime.diff(DutyDayStartTime, "minutes");
          if (diffTime < 5) {
            errors["check_in"] = "At least maintain min 5 Minutes";
            errors["check_out"] = "At least maintain min 5 Minutes";
            returnValue = false;
          } else if (diffTime > 720) {
            errors["check_in"] = "Should not exceed 12 hours";
            errors["check_out"] = "Should not exceed 12 hours";
            returnValue = false;
          }
        }
      }
    }
    this.setState({
      errors,
    });
    return returnValue;
  };

  onChangeAbsent = () => {
    let { isAbsent, errors } = this.state;
    delete errors["check_in"];
    delete errors["check_out"];
    this.setState({
      isAbsent: !isAbsent,
      check_in: null,
      isPresent: false,
      selectedStatus: "",
      check_out: null,
      errors,
    });
  };

  onChangePresent = () => {
    let { isPresent, errors } = this.state;
    delete errors["check_in"];
    delete errors["check_out"];
    this.setState({
      isPresent: !isPresent,
      isAbsent: false,
      selectedStatus: "",
      check_in: null,
      check_out: null,
      errors,
    });
  }
  
  handleStatusChange = (e) => {
    let { errors } = this.state;
    delete errors["check_in"];
    delete errors["check_out"];
    this.setState({
      selectedStatus: e.target.value,
      isAbsent: false,
      isPresent: false,
      check_in: null,
      check_out: null,
      errors,
    });
  }

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleViewAttendanceButton = () => {
    let { date } = this.state;
    let dateInformation = {
      selected_date: date,
    };
    let searchParam = "?" + new URLSearchParams(dateInformation).toString();
    if (date !== null) {
      this.props.history.push({
        pathname: Actions.manage_staff_attendance.view.url,
        search: searchParam,
      });
    } else {
      this.props.history.push(Actions.manage_staff_attendance.view.url);
    }
  };

  handleCheckInOut = (e, name) => {
    let { errors, selected_date, check_in, check_out, loadingStaff } =
      this.state;
    delete errors["check_in"];
    delete errors["check_out"];
    if (name === "check_in") {
      selected_date = e;
      check_in = e;
      loadingStaff = true;
    } else {
      check_out = e;
    }
    this.setState({
      errors,
      selected_date,
      loadingStaff,
      check_in,
      check_out,
    });
  };

  render() {
    const {
      loading,
      alertData,
      open,
      loadingStaff,
      errors,
      options,
      check_in,
      check_out,
      date,
      selected_date,
      disable,
      fromDate,
      toDate,
      yearName,
      isAbsent,
      isPresent,
      selectedStatus,
      statusList,
    } = this.state;

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
              <Grid item md={9} xs={12} className={classNames("header-align")}>
                <Box className="heading">Mark Staff Attendance</Box>
              </Grid>
              <Grid item md={3} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  <Button
                    variant="contained"
                    onClick={this.handleViewAttendanceButton}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.manage_staff_attendance.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={3}>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="staff-list-assigned-shift">
                  Note: Only Staffs who are assigned to Shift{" "}
                </Box>
                <Grid container className="end-flex-prop">
                  <Grid item md={12}>
                    <AllMUIDataTable
                      title={
                        loadingStaff ? (
                          <CircularProgress className="white-text" />
                        ) : selected_date ? (
                          `Marking Attendance for Date ${dateFormat(
                            selected_date,
                            "DD-MM-YYYY"
                          )}`
                        ) : (
                          "Select Date"
                        )
                      }
                      data={this.state.staffList}
                      columns={this.state.columns}
                      options={options}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                item
                md={4}
                xs={12}
                className="flex-justify-center header-align "
              >
                <Paper className="mark-attendance-card margin-top-15">
                  <Box className="header-align" style={{ marginBottom: "20px" }}>
                    <FormControl variant="outlined" fullWidth>
                      <InputLabel>Select Status</InputLabel>
                      <Select
                        value={selectedStatus}
                        onChange={this.handleStatusChange}
                        label="Select Status"
                      >
                        <MenuItem value="">
                          <em>None (Use Check In/Out)</em>
                        </MenuItem>
                        {Object.keys(statusList).map((statusKey) => (
                          <MenuItem key={statusKey} value={statusKey}>
                            {statusList[statusKey].description}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box className="header-align">
                    <Box style={{ 
                      padding: "12px", 
                      backgroundColor: "#e3f2fd", 
                      borderRadius: "4px",
                      border: "1px solid #2196f3",
                      marginTop: "10px",
                      marginBottom: "10px"
                    }}>
                      <Box style={{ fontWeight: 500, color: "#1976d2", marginBottom: "4px" }}>
                        Status: Present
                      </Box>
                      <Box style={{ fontSize: "13px", color: "#1565c0" }}>
                        Check-in and Check-out time will be set automatically based on shift timings.
                      </Box>
                    </Box>
                  </Box>
                  <Box className="attendance-selected-date">Select Timing</Box>
                  <Box className="margin-top-20">
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardDateTimePicker
                        autoComplete="off"
                        variant="dialog"
                        ampm={true}
                        className="width-90"
                        required={true}
                        autoOk
                        inputVariant="outlined"
                        label="Check In"
                        name="check_in"
                        minDate={minDate}
                        maxDate={new Date()}
                        format="dd-MM-yyyy hh:mm a"
                        value={check_in}
                        disabled={true}
                        onChange={(e) => this.handleCheckInOut(e, "check_in")}
                        onClose={(e) => this.getStaffList()}
                        onBlur={(e) => this.getStaffList()}
                        KeyboardButtonProps={{
                          "aria-label": "change date",
                        }}
                        inputProps={{ maxLength: 50 }}
                        helperText={
                          !errors["check_in"] ? "" : errors["check_in"]
                        }
                        error={errors["check_in"]}
                      />
                    </MuiPickersUtilsProvider>
                  </Box>
                  <Box className="margin-top-20">
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardDateTimePicker
                        autoComplete="off"
                        variant="dialog"
                        ampm={true}
                        className="width-90"
                        autoOk
                        inputVariant="outlined"
                        label="Check Out"
                        name="check_out"
                        minDate={check_in}
                        maxDate={new Date()}
                        format="dd-MM-yyyy hh:mm a"
                        value={check_out}
                        disabled={true}
                        onChange={(e) => this.handleCheckInOut(e, "check_out")}
                        KeyboardButtonProps={{
                          "aria-label": "change date",
                        }}
                        inputProps={{ maxLength: 50 }}
                        helperText={
                          !errors["check_out"] ? "" : errors["check_out"]
                        }
                        error={errors["check_out"]}
                      />
                    </MuiPickersUtilsProvider>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="center"
                    marginTop={
                      errors["check_in"] || errors["check_out"]
                        ? "16px"
                        : "50px"
                    }
                  >
                    <Button
                      display="flex"
                      alignItems="center"
                      className="attendance-present"
                      onClick={() => this.submit()}
                      disabled={disable}
                    >
                      Submit
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={open}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Box>
      );
    }
  }
}

export default withRouter(HrAssignShift);

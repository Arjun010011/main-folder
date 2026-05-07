import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  MenuItem,
  Checkbox,
  CircularProgress,
  Snackbar,
} from "@material-ui/core";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Swal from "sweetalert2";
import { Actions } from "Constants/permissions";

import {
  dateFormat,
  printPDFService,
  checkLocalAcademicYear,
  SetAcademicYear,
  updatePermissions,
  Alert,
  getKeyValueMap,
  getCurrentAndPreviousAcademicYears,
  getPaginationProps,
  validateDate,
  getStandard,
  SetStandard,
  getAcademicYear,
  getStandardSection,
  setStandardSection,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { DEFAULT_PAGINATION_PROPS_USERNAME_LIST } from "Constants";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { minDate, options } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import moment from "moment";
import { DateRange } from "Components/DateRange";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class StudentRfidAttendanceReport extends Component {
  constructor() {
    super();
    let date = new Date();
    this.permission = updatePermissions("student_rfid_attendance_history", [
      "view",
    ]);
    this.state = {
      year: "",
      errors: {},
      yearList: [],
      standard: "",
      isAbsent: false,
      standardList: [],
      standard_section: "",
      selectAll: false,
      loadingList: false,
      check_in: null,
      check_out: null,
      section_list: [],
      localOptions: {},
      standard_section_mapping: {},
      startDate: dateFormat(
        new Date(date.getFullYear(), date.getMonth(), 1),
        "YYYY-MM-DD"
      ),
      endDate: dateFormat(date, "YYYY-MM-DD"),
      selected_date: new Date(),
      minDate: "",
      maxDate: "",
      loading: true,
      pagination: { ...DEFAULT_PAGINATION_PROPS_USERNAME_LIST },
      tableLoading: false,
      date_range: { minDate: "", maxDate: "" },
      updating_date_range: false,
      columns: [
        {
          name: "id",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "select",
          label: "Select",
          options: {
            filter: false,
            sort: false,
            search: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Checkbox
                  edge="end"
                  checked={value}
                  defaultChecked={value}
                  onChange={() => this.handleTableClick(tableMeta.rowIndex)}
                  className={"padding-0"}
                />
              );
            },
          },
        },
        {
          name: "student_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
            search: false,
          },
        },
        {
          name: "current_reg_num",
          label: <FormattedMessage {...commonMessages.regNum} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "total_present_days",
          label: "Total Present Days",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Box className="cloumn-width white-space">
                  <Box textTransform="capitalize">{value}</Box>
                </Box>
              );
            },
          },
        },
      ],
    };
  }

  onChangeSelect = (index) => {
    let { studentList } = this.state;
    let data_list_temp = { ...studentList };
    let isAllSelected = true;
    data_list_temp.data_list[index]["checked"] =
      !data_list_temp.data_list[index]["checked"];
    data_list_temp.data_list.map((data) => {
      if (isAllSelected && !data["checked"]) {
        isAllSelected = false;
      }
    });
    this.setState({
      studentList: { ...data_list_temp },
      selectAll: isAllSelected,
    });
  };

  onChangeSelectAll = () => {
    const { selectAll, studentList } = this.state;
    const newSelectAll = !selectAll;
    const updatedStudentList = studentList.data_list.map(student => ({
      ...student,
      checked: newSelectAll,
    }));
    this.setState({
      selectAll: newSelectAll,
      studentList: { ...studentList, data_list: updatedStudentList },
    });
  };

  componentDidMount() {
    this.getAcademicYear();
    if (getAcademicYear()) {
      this.setState(
        {
          year: getAcademicYear(),
        },
        () => {
          this.getStandard();
        }
      );
    }
    let newOptions = { ...options };
    newOptions["rowsPerPageOptions"] = [10, 25, 50];
    newOptions["rowsPerPage"] = 10;
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
      localOptions: newOptions,
    });
  }

  handleCheckInOut = (e, name) => {
    let { errors, selected_date, check_in, check_out } = this.state;
    delete errors["check_in"];
    delete errors["check_out"];
    if (name === "check_in") {
      selected_date = e;
      check_in = e;
    } else {
      check_out = e;
    }
    this.setState({
      errors,
      selected_date,
      check_in,
      check_out,
    });
  };

  getAcademicYear = () => {
    const param = { is_active: true };
    getRequest(GET_URL.getacademicyear.api, param, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = getCurrentAndPreviousAcademicYears(
            response.data.data
          );
          let start_date_object = getKeyValueMap(yearList, "id", "start_date");
          let end_date_object = getKeyValueMap(yearList, "id", "end_date");
          const year = checkLocalAcademicYear(yearList);
          this.setState(
            { yearList, start_date_object, end_date_object },
            () => {
              if (year) {
                let date_range = {};
                date_range["minDate"] = start_date_object[year];
                date_range["maxDate"] = end_date_object[year];
                this.setState({ date_range, year });
              } else {
                this.setState({
                  loading: year ? true : false,
                });
              }
            }
          );
        }
      }
    );
  };

  getStandard = () => {
    let { year, standard, standard_section } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let standard_section_mapping = [];
          response.data.data.map((data) => {
            standard_section_mapping[data["id"]] = data?.sections ?? [];
          });
          if (response.data.data.length == 1) {
            standard = response.data.data[0];
          } else if (getStandard()) {
            standard = getStandard();
          }
          if (standard) {
            if (standard_section_mapping[standard].length === 1) {
              standard_section =
                standard_section_mapping[standard][0]["standard_section"];
            } else if (getStandardSection()) {
              standard_section = getStandardSection();
            }
          }
          this.setState(
            {
              standardList: response.data.data,
              standard: standard,
              loading: standard_section ? true : false,
              standard_section_mapping,
              standard_section,
            },
            () => {
              if (standard_section) {
                this.getStudentList();
              }
            }
          );
        }
      }
    );
  };

  getAttendanceReport = (studentid) => {
    let { standard_section } = this.state;
    let props = { ...this.props };
    let { from_date, to_date } = this.getDataParams();
    props.url = `${GET_URL.attendance.api}${studentid}/?from_date=${from_date}&to_date=${to_date}&standard_section=${standard_section}`;
    printPDFService(props);
  };

  onChange = async (e) => {
    const { start_date_object, end_date_object } = this.state;
    let value = e.target.value;
    const name = e.target.name;
    if (value) {
      if (name === "year") {
        this.setState({ updating_date_range: true }, () => {
          let date_range = {};
          date_range["minDate"] = start_date_object[value];
          date_range["maxDate"] = end_date_object[value];
          this.setState(
            {
              [name]: value,
              standard: "",
              standard_section: "",
              studentList: { data_list: [] },
              date_range,
              updating_date_range: false,
            },
            () => {
              this.getStandard();
              SetAcademicYear(value);
              SetStandard("");
              setStandardSection("");
            }
          );
        });
      } else if (name === "standard") {
        this.setState(
          {
            [name]: value,
            standard_section: "",
            studentList: { data_list: [] },
          },
          () => {
            SetStandard(value);
            setStandardSection("");
          }
        );
      } else if (name === "standard_section") {
        this.setState(
          {
            [name]: value,
            studentList: { data_list: [] },
          },
          () => {
            this.getStudentList();
            setStandardSection(value);
          }
        );
      }
    }
  };

  getStudentList = (paginationProps) => {
    this.setState({ loadingList: true });
    let { pagination, year, standard, standard_section, selected_date } =
      this.state;
    if (!standard_section) return;
    this.currentPagination = pagination;
    let pagination_params = getPaginationProps(this.currentPagination);
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    const url = GET_URL.rfidattendance.api;
    const params = {
      ...pagination_params,
      academic_year: year,
      standard: standard,
      standard_section: standard_section,
      for_date: dateFormat(selected_date, "YYYY-MM-DD"),
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data;
        studentList.data.data_list.map((data) => {
          data["checked"] = false;
        });
        this.setState({
          studentList: studentList.data,
          AllStudentList: [],
          dataReady: true,
          loading: false,
          loadingList: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  handleChangeDateRange = (value) => {
    this.setState(
      {
        dateRangeValue: value,
        startDate: "",
        endDate: "",
      },
      () => {
        this.getStudentList();
      }
    );
  };

  getBlankPageMessage = () => {
    let { standard_section, standard, year } = this.state;
    if (!standard_section) {
      if (!standard) {
        if (!year) {
          return `Select the Academic year, ${alias_names["standard"]} and  ${alias_names["section"]} to view the student List`;
        }
        return `Select the ${alias_names["standard"]} and  ${alias_names["section"]} to view the student List`;
      }
      return `Select the  ${alias_names["section"]} to view the student List`;
    }
  };

  downloadRfidReport = (status) => {
    const { year, standard } = this.state;
    let params = {
      download_excel: 1,
      academic_year: year,
    };
    if (status !== "All") {
      params["standard_id"] = standard;
    }
    let prop = { ...this.props };
    prop.responseType = "blob";
    const url = GET_URL.rfidattendance.api;
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
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
    });
    return false;
  };

  onChangeSelectedDate = (e, fromDate, toDate) => {
    const { errors } = this.state;
    this.setState(
      {
        selected_date: e,
      },
      () => {
        let error = "";
        if (e === null) {
          this.setState({
            isBlankPage: true,
          });
          error = `Select Date`;
        } else {
          error = validateDate(e, fromDate, toDate);
        }
        if (error !== "" && error !== "Invalid Date") {
          errors["selected_date"] = error;
        } else {
          errors["selected_date"] = "";
          if (error !== "Invalid Date") {
            this.setState({
              tableUpdating: true,
            });
            this.getStudentList();
          }
        }
        this.setState({ errors });
      }
    );
  };

  validation = () => {
    let { check_in, errors, check_out, selected_date, studentList, isAbsent } =
      this.state;
    let student_id = [];
    studentList.data_list.map((data) => {
      if (data["checked"]) {
        student_id.push(data.student);
      }
    });
    let returnValue = true;
    let error_check_in = "";
    if (check_in === null && !isAbsent) {
      error_check_in = `Please Enter In Time`;
      returnValue = false;
    } else if (!isAbsent) {
      error_check_in = validateDate(check_in, minDate);
    }
    if (error_check_in !== "") {
      errors["check_in"] = error_check_in;
      returnValue = false;
    }
    if (student_id.length === 0) {
      returnValue = false;
      errors["NotSelectedStaff"] = "Please select at-least one student";
      this.setState({
        open: true,
        alertData: "Please select at-least one student to mark attendance",
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
    this.setState({
      errors,
    });
    if (returnValue) {
      let postData = {};
      if (isAbsent) {
        postData = {
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
          status: "absent",
          student_id: student_id,
        };
      } else {
        postData = {
          for_date: dateFormat(selected_date, "YYYY-MM-DD"),
          in_time: dateFormat(check_in, "YYYY-MM-DD HH:mm:ss"),
          out_time: check_out
            ? dateFormat(check_out, "YYYY-MM-DD HH:mm:ss")
            : null,
          status: "present",
          student_id: student_id,
        };
      }
      returnValue = postData;
    }
    return returnValue;
  };

  submit = () => {
    let validate = this.validation();
    if (validate) {
      this.setState({ submitDisable: true });
      let url = POST_URL.rfidattendance.api;
      postRequest(url, validate, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.handleViewButton();
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleViewButton = () => {
    this.props.history.push({
      pathname: Actions.student_rfid_attendance_report.view.url,
    });
  };

  onChangeAbsent = () => {
    let { isAbsent, errors } = this.state;
    delete errors["check_in"];
    delete errors["check_out"];
    this.setState({
      isAbsent: !isAbsent,
      check_in: null,
      check_out: null,
      errors,
    });
  };

  render() {
    let {
      loading,
      date_range,
      yearList,
      standardList,
      standard,
      studentList,
      year,
      standard_section,
      standard_section_mapping,
      fromDate,
      selected_date,
      errors,
      loadingList,
      isAbsent,
      check_in,
      check_out,
      disableSubmit,
      selectAll,
      alertData,
      open,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      const options = {
        selectableRows: "none",
        filterType: "dropdown",
        responsive: "simple",
        filter: false,
        download: true,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        onDownload: () => {
          return this.downloadRfidReport();
        },
      };
      return (
        <Paper
          className={classNames("paper-background")}
          style={{ background: "transparent", boxShadow: "none" }}
        >
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Student RFID Attendance Report</Box>
            </Grid>
          </Grid>
          <Grid container spacing={2} className={classNames("header-align")}>
            <Grid item lg={3} md={3} xs={6}>
              <Dropdown
                data={yearList}
                name="year"
                value={year}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "year")}
                label={<FormattedMessage {...commonMessages.academicYear} />}
              />
            </Grid>
            <Grid item lg={3} md={3} xs={6}>
              <Dropdown
                data={standardList}
                name="standard"
                value={standard}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "standard")}
                label={<FormattedMessage {...commonMessages.standard} />}
              />
            </Grid>
            <Grid item lg={3} md={3} xs={6}>
              {standard_section_mapping?.[standard]?.length > 0 && (
                <Dropdown
                  data={standard_section_mapping?.[standard]}
                  name="standard_section"
                  customId={"standard_section"}
                  value={standard_section}
                  required={true}
                  hideSelect={true}
                  onChange={(e) => this.onChange(e, "standard_section")}
                  label={<FormattedMessage {...commonMessages.section} />}
                />
              )}
            </Grid>
          </Grid>
          {standard_section && (
            <div className="mt-20">
              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <KeyboardDatePicker
                  autoOk
                  variant="inline"
                  inputVariant="outlined"
                  label="Select Date"
                  name="selected_date"
                  minDate={fromDate}
                  maxDate={new Date()}
                  format="dd-MM-yyyy"
                  value={selected_date}
                  onChange={(e) =>
                    this.onChangeSelectedDate(e, fromDate, new Date())
                  }
                  KeyboardButtonProps={{
                    "aria-label": "change date",
                  }}
                  helperText={
                    !errors.selected_date
                      ? "Valid Format DD-MM-YYYY"
                      : errors.selected_date
                  }
                  error={
                    errors.selected_date &&
                    (errors.selected_date ? true : false)
                  }
                />
              </MuiPickersUtilsProvider>
            </div>
          )}

          {!standard_section && (
            <BlankPagewithIcon data={this.getBlankPageMessage()} />
          )}
          <Grid container spacing={3}>
            <Grid item md={8} xs={12} className="header-align">
              {standard_section && (
                <Paper>
                  {loadingList ? (
                    <CircularProgress />
                  ) : (
                    <table width="100%" className="selectable-row-table mt-20">
                      <thead className="table-select-hostel-thead">
                        <th className={`selectable-table-head`}>
                          <MenuItem
                            value={selectAll}
                            onClick={() => this.onChangeSelectAll()}
                            className="padding-0"
                          >
                            <Checkbox
                              className="padding-0"
                              color="secondary"
                              checked={selectAll}
                            />
                          </MenuItem>
                        </th>
                        <th className={`selectable-table-head`}>
                          Student Name
                        </th>
                        <th className={`selectable-table-head`}>
                          Admission No.
                        </th>
                        <th className={`selectable-table-head`}>In Time</th>
                        <th className={`selectable-table-head`}>Out Time</th>
                        <th className={`selectable-table-head`}>Status</th>
                      </thead>
                      <tbody className="selectable-row-table-body">
                        {studentList?.data_list.map((student, index) => {
                          return (
                            <tr
                              key={index}
                              className={"selectable-row-table-row"}
                            >
                              <td className="pl-15">
                                <MenuItem
                                  value={student.checked}
                                  onClick={() => this.onChangeSelect(index)}
                                  className="padding-0"
                                >
                                  <Checkbox
                                    className="padding-0"
                                    color="secondary"
                                    checked={student.checked}
                                  />
                                </MenuItem>
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {student.student_name}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {student.admission_num}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {student?.in_time
                                  ? dateFormat(
                                      student.in_time,
                                      "DD-MM-YYYY hh:mm A"
                                    )
                                  : ""}
                              </td>
                              <td className={"textAlign pl-15 "}>
                                {student?.out_time
                                  ? dateFormat(
                                      student.out_time,
                                      "DD-MM-YYYY hh:mm A"
                                    )
                                  : ""}
                              </td>
                              <td
                                className={`textAlign pl-15 text-captilize ${
                                  student.status === "absent"
                                    ? "text-red"
                                    : "text-green"
                                }`}
                              >
                                {student.status}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </Paper>
              )}
            </Grid>
            <Grid
              item
              md={4}
              xs={12}
              className="flex-justify-center header-align "
            >
              <Paper className="mark-attendance-card margin-top-15">
                <Box className="header-align">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isAbsent}
                        name="isAbsent"
                        value={isAbsent}
                        color="primary"
                        onChange={(e) => this.onChangeAbsent(e)}
                      />
                    }
                    label="Is Absent"
                  />
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
                      onChange={(e) => this.handleCheckInOut(e, "check_in")}
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      inputProps={{ maxLength: 50 }}
                      helperText={!errors["check_in"] ? "" : errors["check_in"]}
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
                    errors["check_in"] || errors["check_out"] ? "16px" : "50px"
                  }
                >
                  <Button
                    display="flex"
                    alignItems="center"
                    className="attendance-present"
                    onClick={() => this.submit()}
                    disabled={disableSubmit}
                  >
                    Submit
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
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
        </Paper>
      );
    }
  }
}

export default withRouter(StudentRfidAttendanceReport);

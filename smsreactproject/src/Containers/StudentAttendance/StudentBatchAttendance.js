import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Avatar,
  Tooltip,
  TextField,
  CircularProgress,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import { LEAVEOPTIONS } from "Constants";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import {
  getFullName,
  getUrlParam,
  dateFormat,
} from "Includes/functions";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";
import { makeStyles } from "@material-ui/core/styles";
import moment from "moment";
import { cloneDeep } from "lodash";
import { minDate, maxDate } from "Constants";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { Subject } from "@material-ui/icons";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const useStyles = makeStyles(() => ({
  selected: (props) => {
    let backgroundColor;
    if (props.value === "present") {
      backgroundColor = "#99ff99";
    } else {
      backgroundColor = "#ff9999";
    }
    return {
      "&&": {
        backgroundColor: backgroundColor,
        color: "#ffffff",
      },
    };
  },
}));

function MyToggleButton(props) {
  const { ...other } = props;
  const classes = useStyles({ ...other });
  return <ToggleButton classes={classes} {...other} />;
}

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
  {
    label: "Attendance",
    name: "status",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDown",
    autoFocus: true,
    list: [
      { name: "Present", id: "present" },
      { name: "Absent", id: "absent" },
    ],
  },
];

class StudentBatchAttendance extends Component {
  constructor() {
    super();
    let {
      session,
      year,
      standard_section,
      section,
      standard,
      selecteddate,
      is_view,
      standard_name,
      section_name,
      subject_name,
      subject_id,
      period_start_time,
      period_end_time,
      from_time,
      to_time,
      transaction_id,
      timetable_schedule,
      is_subject_wise,
      attendance_batch,
    } = getUrlParam();
    is_view = is_view === "1";
    this.is_view = is_view;
    // this.permission =
    //   session !== "0"
    //     ? updatePermissions("studentattendance_attendance", ["update"])
    //     : [];
    const selectedToggle = session === "0" || is_view ? "Session1" : "Session2";
    this.state = {
      studentObj: {},
      selectedToggle: selectedToggle,
      studentList: [],
      year: year,
      standard_section: standard_section,
      section: section,
      standard: standard,
      session: parseInt(session),
      selecteddate: selecteddate,
      is_subject_wise:is_subject_wise,
      displayToggle: true,
      options: LEAVEOPTIONS,
      loading: true,
      open: false,
      submit: false,
      is_view: 1,
      tableLoading: false,
      yearDetails: {},
      dateRangeValueDefault: moment().format("YYYY-MM-DD"),
      isSession1Only: isFormDefinitionEnabled(
        "student_attendance_configuration",
        "number_of_session",
        1
      ),
      standard_name: standard_name,
      section_name: section_name,
      attendance_batch:attendance_batch,
      subject: {
        subject_name: subject_name,
        subject_id: subject_id,
        period_start_time: period_start_time,
        period_end_time: period_end_time,
        from_time: from_time,
        to_time: to_time,
        transaction_id: transaction_id,
        timetable_schedule:timetable_schedule,
      },
      fieldError: {},
      columns: [
        // {
        //     name: "profile_pic_details",
        //     label: <FormattedMessage {...commonMessages.profilePic} />,
        //     options: {
        //         filter: false,
        //         sort: false,
        //         search: false,
        //         customBodyRender: (value, tableMeta) => {
        //             return (<div className='mui-table-custom-value-left-align'>
        //                 {tableMeta.rowData[0] != undefined &&
        //                     <Box>
        //                         <Avatar alt='Profile Pic' src={tableMeta.rowData[0].file} className='student-profile-pic' />
        //                     </Box>
        //                 }
        //                 {tableMeta.rowData[0] === null &&
        //                     <Box>
        //                         <Avatar alt={tableMeta.rowData[2]} src='Profile Pic' className='student-profile-pic' />
        //                     </Box>
        //                 }
        //             </div>)

        //         },
        //     }
        // },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <div className="mui-table-custom-value-left-align">
                  {getFullName(
                    tableMeta.rowData[1],
                    tableMeta.rowData[2],
                    tableMeta.rowData[3]
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "student_first_name",
          label: <FormattedMessage {...commonMessages.firstName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "student_middle_name",
          label: <FormattedMessage {...commonMessages.middleName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "student_last_name",
          label: <FormattedMessage {...commonMessages.lastName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
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
          },
        },
        {
          name: "student",
          label: "student",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "current_reg_num",
          label: <FormattedMessage {...commonMessages.regNum} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta) => {
              return (
                <div className="mui-table-custom-value-left-align">
                  {tableMeta.rowData[6]}
                </div>
              );
            },
          },
        },
        {
          name: "ToggleStatus",
          label: <FormattedMessage {...messages.markAttendance} />,
          options: {
            filter: false,
            sort: false,
            display: true,
            customBodyRender: (value, tableMeta) => {
              return (
                <>
                  <ToggleButtonGroup
                    key={tableMeta.rowData[6]}
                    value={this.getStudentObjectValue(tableMeta.rowData[5])}
                    exclusive
                    onChange={(e, value) =>
                      this.handleChange(tableMeta.rowData[5], value)
                    }
                  >
                    <MyToggleButton
                      key={tableMeta.rowData[5] + 1}
                      value="present"
                      className="button-attendance"
                    >
                      <FormattedMessage {...commonMessages.present} />
                    </MyToggleButton>
                    <MyToggleButton
                      key={tableMeta.rowData[5] + 2}
                      value="absent"
                      className="button-attendance"
                    >
                      <FormattedMessage {...commonMessages.absent} />
                    </MyToggleButton>
                  </ToggleButtonGroup>
                  {/* <Box>{tableMeta.rowData[9]}</Box> */}
                </>
              );
            },
          },
        },
        {
          name: "status",
          label: <FormattedMessage {...commonMessages.status} />,
          options: {
            filter: false,
            sort: false,
            display: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Box className="cloumn-width white-space">
                  {(this.getStudentObjectValue(tableMeta.rowData[5]) ===
                    "present" ||
                    tableMeta.rowData[8] === "present") && (
                      <Box color="green" fontSize="18px">
                        <FormattedMessage {...commonMessages.present} />
                      </Box>
                    )}
                  {(this.getStudentObjectValue(tableMeta.rowData[5]) ===
                    "absent" ||
                    tableMeta.rowData[8] === "absent") && (
                      <Box color="red" fontSize="18px">
                        <FormattedMessage {...commonMessages.absent} />
                      </Box>
                    )}
                </Box>
              );
            },
          },
        }
        
      ],
    };
    this.dateRange = React.createRef();
  }

  componentDidMount() {
    const { is_view } = this.state;
    if (is_view) {
      this.viewAttendance();
    } else {
      this.getStudentList();
    }
  }

  getStudentList = () => {
    const { year, section, standard, attendance_batch } = this.state;
    const url = GET_URL.getbatchstudents.api;
    const params = {
      academic_year: year,
      attendance_batch: attendance_batch,
    };
    this.getData(url, params);
  };

  viewAttendance = () => {
    const { standard_section, selecteddate, selectedToggle, attendance_batch } = this.state;
    const url = GET_URL.batchattendance.api;
    const params = {
      for_date: selecteddate,
      attendance_batch:attendance_batch,
    };
    this.getData(url, params);
  };

  getData = (url, params) => {
    this.setState({ tableLoading: true });
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        const studentListTemp = response.data.data;
        if (
          this.state.studentList.length !== 0 &&
          this.state.studentList.length !== studentListTemp.length
        ) {
          if (this.state.is_view) {
            this.is_view = false;
            this.getStudentList();
          } else {
            this.viewAttendance();
          }
        }
        let studentObjTemp = {};
        studentListTemp.map((data) => {
          if (data?.status) {
            studentObjTemp[data["student"]] = data.status;
          }
        });
        this.setState(
          {
            studentList: [...studentListTemp],
            loading: false,
            tableLoading: false,
            studentObj: { ...studentObjTemp },
          },
          () => {
            const { selecteddate } = this.state;
            this.setState(
              {
                dateRangeValueDefault: selecteddate,
                //   start: selecteddate,
                //   end: selecteddate,
                // },
              },
              // () => {
              //   if (studentListTemp.length > 0)
              //     this.dateRange.current.onChange(
              //       moment.range(
              //         moment(selecteddate).clone(),
              //         moment(selecteddate).clone()
              //       )
              //     );
              // }
              () => {
                if (studentListTemp.length > 0 && this.dateRange?.current) {
                  this.dateRange.current.onChange(moment(selecteddate));
                }
              }
            );
          }
        );
      }
    });
  };

  handleChange = (student, value) => {
    if (value) {
      let { studentObj, options } = this.state;
      if (Object.keys(studentObj).length === 0) {
        this.setState(
          {
            tableLoading: true,
          },
          () => {
            if (value !== null) {
              studentObj[student] = value;
            } else {
              delete studentObj[student];
            }
            options["data"] = { ...studentObj };
            this.setState({
              studentObj,
              options,
              submit: true,
              tableLoading: false,
            });
          }
        );
      } else {
        if (value !== null) {
          studentObj[student] = value;
        } else {
          delete studentObj[student];
        }
        options["data"] = { ...studentObj };
        this.setState({
          studentObj,
          options,
          submit: true,
        });
      }
    }
  };


  changeNow = (event, value) => {
    let { is_view, selectedToggle } = this.state;
    if (value !== selectedToggle) {
      this.setState(
        {
          selectedToggle: value,
        },
        () => {
          if (is_view) {
            this.viewAttendance();
          } else {
            this.getStudentList();
          }
        }
      );
    }
    // let displayToggle = true;
    // if (session === 1 && value === 'Session1' || session === 2) {
    //     displayToggle = false;
    // }
    // for (let obj of columns) {
    //     if (obj.name === 'ToggleStatus') {
    //         obj.options.display = displayToggle;
    //     }
    //     else if (obj.name === 'status') {
    //         obj.options.display = !displayToggle;
    //     }
    //     else if (obj.name === 'Actions') {
    //         obj.options.display = !displayToggle && this.permission.length > 0;
    //     }
    // }
    // this.setState({
    //     selectedToggle: value,
    //     displayToggle,
    //     columns,
    //     studentObj: {},
    //     submit: false
    // }, () => {
    //     if (displayToggle) {
    //         this.getStudentList();
    //     }
    //     else {

    // }
    //
    // });
  };

  saveData = () => {
    let {
      selectedToggle,
      studentList,
      studentObj,
      selecteddate,
      session,
      dateRangeValueDefault,
      attendance_batch
    } = this.state;

    let errors = {};
    if (Object.keys(errors).length > 0) {
      this.setState({ errors });
      return;
    }

    if (studentList.length !== Object.keys(studentObj).length) {
      return this.markAttendanceError(
        <FormattedMessage {...messages.errorMarkAllAttendance} />
      );
    }
    if (session === 0 && selectedToggle === "Session2") {
      return this.markAttendanceError(
        <FormattedMessage {...messages.errorMorningSession} />
      );
    }
    let post_data = {
      new_format: true,
      from_date: dateFormat(dateRangeValueDefault, "YYYY-MM-DD"),
      to_date: dateFormat(dateRangeValueDefault, "YYYY-MM-DD"),
      // for_date: selecteddate,
      attendance_batch: attendance_batch,
      attendance: studentObj,
    };
    let url;

      url = POST_URL.batchattendance.api;
    postRequest(url, post_data).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        const { year, section, standard } = this.state;
        let searchState = {
          year: year,
          attendance_batch:attendance_batch,
          date: selecteddate,
        };
        let searchParam = "?" + new URLSearchParams(searchState).toString();
        this.props.history.push({
          pathname: Actions.studentbatchattendance.view.url,
          search: searchParam,
        });
      }
    });
    this.setState({
      submit: false,
      errors: {}
    });
  };

  markAttendanceError = (alertMsg) => {
    this.setState({
      open: true,
      alertData: alertMsg,
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  viewPage = () => {
    const { year, standard_section, section, standard, selecteddate } =
      this.state;
    let searchState = {
      year: year,
      standard: standard,
      standard_section: standard_section,
      section: section,
      date: selecteddate,
    };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.studentattendance_register.view.url,
      search: searchParam,
    });
  };

  getStudentObjectValue = (key) => {
    return this.state.studentObj[key];
  };

  onChangeDate = (value) => {
    const formattedDate = moment(value).format("YYYY-MM-DD");
    this.setState({
      dateRangeValueDefault: formattedDate,
    })
  };

  handleMarkAll = (value) => {
    let { studentList, options, columns } = this.state;
    let studentTemp = {};
    studentList.map((data) => {
      studentTemp[data["student"]] = value;
    });
    options["data"] = { ...studentTemp };
    this.setState(
      {
        tableLoading: true,
      },
      () => {
        this.setState({
          columns: cloneDeep(columns),
          studentObj: { ...studentTemp },
          options,
          submit: true,
          tableLoading: false,
        });
      }
    );
  };

  render() {
    let {
      loading,
      studentList,
      columns,
      alertData,
      open,
      submit,
      options,
      dateRangeValueDefault,
      tableLoading,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    }
    let option = {
      ...options,
      textLabels: {
        body: {
          noMatch: tableLoading
            ? "Loading..."
            : "Sorry, there is no matching data to display",
        },
      },
    };
    return (
      <>
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={8} xs={12} className="header-align">
              <Box className="heading">
                <FormattedMessage {...messages.attendanceRegister} />
              </Box>
              <Box className="md-down-justify-start md-up-justify-start mb-y-20">
                <Box className="year-std-box mr-40">
                  <Box className="academic-std-head">
                    Batch Name
                  </Box>
                  <Box className=" exam-mark-add-heading-bg">
                    Batch 
                  </Box>
                </Box>
              </Box>
              {studentList.length > 0 && !tableLoading && (
                <Box className="staff-list-assigned-shift">
                  Note: If any holiday present for selected date, it will not
                  consider
                </Box>
              )}
            </Grid>
            <Grid item md={4} xs={12}>
              <Box className="header-align end-flex-prop">
                <Button
                  variant="contained"
                  className="editbutton-view"
                  onClick={() => this.viewPage()}
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />
                  <FormattedMessage {...commonMessages.attendance} />
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box display="flex" flexWrap="wrap" alignItems="center">
            <Box flex="0 0 auto" style={{ marginRight: 10 }}>
              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <KeyboardDatePicker
                  autoOk
                  size="small"
                  variant="inline"
                  inputVariant="outlined"
                  label={<FormattedMessage {...commonMessages.date} />}
                  fullWidth
                  minDate={minDate}
                  maxDate={maxDate}
                  name="start_date"
                  format="dd-MM-yyyy"
                  value={dateRangeValueDefault}
                  onChange={(value) => this.onChangeDate(value)}
                  KeyboardButtonProps={{
                    "aria-label": "change date",
                  }}
                />
              </MuiPickersUtilsProvider>
            </Box>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" width="100%">
            {studentList.length > 0 && !tableLoading && (
              <Box display="flex" gap={2}>
                <Tooltip
                  title={"Mark All present at a time"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Button
                    className={"exam-enter-marks-button"}
                    onClick={() => this.handleMarkAll("present")}
                    style={{ height: "40px", alignSelf: "center" }}
                    // disabled={this.state.is_view}
                  >
                    <Box>Mark All Present</Box>
                  </Button>
                </Tooltip>

                <Tooltip
                  title={"Mark All absent at a time"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Button
                    className={"exam-mark-absent-button ml-10"}
                    onClick={() => this.handleMarkAll("absent")}
                    style={{ height: "40px", alignSelf: "center" }}
                    // disabled={this.state.is_view}
                  >
                    <Box>Mark All Absent</Box>
                  </Button>
                </Tooltip>
              </Box>
            )}
            {tableLoading && (
              <Box className="loading">
                <CircularProgress />
              </Box>
            )}
          </Box>
          {!tableLoading && (
            <Grid container spacing={3} className="flex-justify-center mt-10">
              <Grid item md={12} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    data={studentList}
                    columns={columns}
                    options={option}
                  />
                </Paper>
              </Grid>
            </Grid>
          )}
          <Box display="flex" justifyContent="flex-end" marginTop="60px">
            {submit && (
              <Button
                variant="contained"
                className="submit"
                onClick={() => this.saveData()}
              >
                <FormattedMessage {...commonMessages.submit} />
              </Button>
            )}
          </Box>
          {open && (
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={open}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>
          )}
        </Paper >
      </>
    );
  }
}

export default withRouter(StudentBatchAttendance);

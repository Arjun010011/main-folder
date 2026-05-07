import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Button, Grid, Tooltip, Dialog, DialogActions, DialogTitle, DialogContent, TextField } from "@material-ui/core";
import classNames from "classnames";
import { Dropdown } from "Components/DropDown";
import "./styles.scss";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { cloneDeep, filter } from "lodash";
import { AWS_BUCKET_URL } from "Constants";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { dateFormat, getKeyValueInArray } from "Includes/functions";

import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import {
  isUserHasPermission,
  checkLocalAcademicYear,
  SetAcademicYear,
  printPDFService,
} from "Includes/functions";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import CheckCircle from "@material-ui/icons/CheckCircle";
import Cancel from "@material-ui/icons/Cancel";
import { Actions } from "Constants/permissions";
import { getUrlParam, timeFormat } from "Includes/functions";
import moment from "moment";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";
const teacher_dash = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/teacher_d.png`;

class StudentAttendanceRegister extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yearList: [],
      loading: true,
      selecteddate: "",
      errorMessage: "",
      holiday_reason: "",
      standardList: [],
      sections: [],
      year: "",
      sectionList: [],
      section: "",
      standard_section: "",
      timeTableList: [],
      dialogOpen: false,
      new_from_time: "",
      new_to_time: "",
      subjectList: [],
      selectedSubject: "",
      is_subject_wise: isFormDefinitionEnabled(
        "student_attendance_configuration",
        "is_subject_wise",
        1
      ),
      columns: [
        {
          name: "is_marked",
          label: "Marked Status",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <Tooltip
                      title={"Attendance Is Marked"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <CheckCircle className="text-green pointer" />
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={"Attendance Is Not Marked"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Cancel className="text-red pointer" />
                    </Tooltip>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "standard_section__section__name",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "subject_id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "timing",
          label: (
            <span>
              Timetable<br />Timing
            </span>
          ),
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "subject__name",
          label: "Subject",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "period_start_time",
          label: "period_start_time",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "period_end_time",
          label: "period_end_time",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "staff_name",
          label: "Staff Name",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "strength",
          label: "Total Students",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "total_present",
          label: "Present",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "total_absent",
          label: "Absent",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "changed_timing",
          label: (
            <span>
              Marked<br />Timing
            </span>
          ),
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "from_time",
          label: "From time",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "to_time",
          label: "Totime",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "transaction_id",
          label: "Transaction Id",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "timetable_schedule",
          label: "Time table Schedule",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },

        {
          name: "Actions",
          label: "Actions",
          options: {
            filter: true,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              const isAttendanceMarked = tableMeta.rowData[0];
              return (
                <div style={{ display: "flex", gap: "10px" }}>
                  {isUserHasPermission("studentattendance_attendance", "create") && (
                    <Tooltip
                      title="Mark Attendance"
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <div
                        className="text-blue cursor-pointer pl-10"
                        onClick={() =>
                          this.Attendance(
                            this.state.standard_section,
                            this.state.section,
                            [],
                            isAttendanceMarked ? "update" : "mark",
                            tableMeta.rowData[1],
                            tableMeta.rowData[4],
                            tableMeta.rowData[2],
                            tableMeta.rowData[5],
                            tableMeta.rowData[6],
                            tableMeta.rowData[12],
                            tableMeta.rowData[13],
                            tableMeta.rowData[14],
                            tableMeta.rowData[15],
                          )
                        }
                      >
                        {isAttendanceMarked ? (
                          <EditOutlinedIcon />
                        ) : (
                          <AddCircleOutlineOutlinedIcon />
                        )}
                      </div>
                    </Tooltip>
                  )}

                  {isUserHasPermission("studentattendance_attendance", "view") && (
                    <Tooltip
                      title={isAttendanceMarked ? "View Attendance" : "Attendance Not Marked"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <div
                        className={`pl-10 ${!isAttendanceMarked ? "cursor-not-allowed opacity-50" : "text-blue cursor-pointer"}`}
                        onClick={() => {
                          if (!isAttendanceMarked) return;
                          this.Attendance(
                            this.state.standard_section,
                            this.state.section,
                            [],
                            "view",
                            tableMeta.rowData[1],
                            tableMeta.rowData[4],
                            tableMeta.rowData[2],
                            tableMeta.rowData[5],
                            tableMeta.rowData[6],
                            tableMeta.rowData[12],
                            tableMeta.rowData[13],
                            tableMeta.rowData[14],
                            tableMeta.rowData[15],
                          );
                        }}
                      >
                        <VisibilityOutlinedIcon />
                      </div>
                    </Tooltip>
                  )}
                </div>
              );
            },
          },
        },
      ],
      options: {
        filterType: "dropdown",
        responsive: "scroll",
        filter: false,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [10, 25, 50, 100],
        rowsPerPage: 10,
        selectableRows: "none",
      },
    };
  }

  componentDidMount = () => {
    let { standard, date, section, standard_section } = getUrlParam();
    let { is_subject_wise } = this.state;
    standard = standard ? parseInt(standard) : "";
    section = section ? parseInt(section) : "";
    standard_section = standard_section ? parseInt(standard_section) : "";
    date = date ? date : dateFormat(new Date(), "YYYY-MM-DD");
    is_subject_wise = is_subject_wise
    this.setState(
      {
        standard,
        selecteddate: date,
        section: section,
        standard_section: standard_section,
        is_subject_wise: is_subject_wise
      },
      () => {
        this.getAcademicYearsList();
      }
    );
  };

  getAcademicYearsList = () => {
    const param = { is_active: true };
    getRequest(GET_URL.getacademicyear.api, param, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data;
          let { selecteddate, standard_section, standard } = this.state;
          selecteddate = moment(selecteddate).format("YYYY-MM-DD");
          // let currentacademicyearlist = [];
          // yearList.map((data) => {
          //   if (
          //     moment(data.start_date).isSameOrBefore(selecteddate) ||
          //     moment(selecteddate).isBetween(
          //       data.start_date,
          //       data.end_date,
          //       undefined,
          //       "[]"
          //     )
          //   ) {
          //     currentacademicyearlist.push(data);
          //   }
          // });
          // yearList = currentacademicyearlist;
          let mindate = yearList[0].start_date;
          let year = user.other_details.academic_year.id;
          this.setState(
            {
              yearList,
              year: year ? year : "",
              loading: false,
              mindate,
              maxdate: new Date(),
              selecteddate,
            },
            () => {
              if (year) {
                this.getStandard();
              }
              if (selecteddate && standard && standard_section) {
                this.getSubjectWiseList();
              }
            }
          );
        }
      }
    );
  };

  getSubjectWiseList = () => {
    let { selecteddate, standard_section, year } = this.state;
    const url = GET_URL.subjectattendancedetail.api;

    let start_date = new Date(new Date(selecteddate).setHours(0, 0, 0, 0)).toISOString().slice(0, -5)
    let end_date = new Date(new Date(selecteddate).setHours(23, 59, 0, 0)).toISOString().slice(0, -5)
    const params = {
      academic_year: year,
      standard_section: standard_section,
      for_date: selecteddate,
      from_date: selecteddate,
      to_date: selecteddate,
    };
    getRequest(url, params).then((response) => {
      let response_data = response.data.data.data_list
      response_data.map((data) => {
        data["is_marked"] = data.total_present || data.total_absent;
        data["timing"] = `${timeFormat(
          data.period_start_time,
          "hh:mm:ss",
          "hh:mm A"
        )} - ${timeFormat(data.period_end_time, "hh:mm:ss", "hh:mm A")}`;
        data["changed_timing"] = `${timeFormat(
          data.from_time.split("T")[1],
          "hh:mm:ss",
          "hh:mm A"
        )} - ${timeFormat(
          data.to_time.split("T")[1],
          "hh:mm:ss",
          "hh:mm A"
        )}`;
      });

      this.setState({
        timeTableList: response_data,
      });
      if (response && response.status === 200) {
        this.setState({
          timeTableList: response_data,
        });
      }
    });
  };

  getStandardSectionsList = () => {
    let { year, standard, selecteddate } = this.state;
    const url = GET_URL.attendancedetail.api;
    const params = {
      academic_year: year,
      standard: standard,
      for_date: selecteddate,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        let section_data = response.data.data;
        let section_data_list = [];
        let session_temp = [];
        section_data.data_list.map((data) => {
          session_temp = [];
          data.sessions.map((sessionData) => {
            if (sessionData.present || sessionData.absent) {
              session_temp.push(sessionData);
            }
          });
          data["sessions"] = cloneDeep(session_temp);
          section_data_list.push(data);
        });
        this.setState({
          sections: section_data.data_list,
          holiday_reason: section_data.holiday_reason,
        });
      }
    });
  };

  getSectionList = () => {
    const { year, standard, standard_section } = this.state;
    const url = GET_URL.getsection.api;
    const params = {
      academic_year: year,
      standard: standard,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          sections: response.data.data,
        });
        if (!standard_section) {
          this.setState({
            timeTableList: [],
          });
        }
      }
    });
  };

  onChange = async (e) => {
    let { value, name } = e.target;
    const { selecteddate } = this.state;
    let { is_subject_wise } = this.state;
    if (value) {
      if (name === "year") {
        this.setState({ [name]: value, standard: "" }, () => {
          SetAcademicYear(value);
          this.getStandard();
        });
      } else if (name === "standard") {
        this.setState({ [name]: value, sections: [], timeTableList: [] }, () => {
          this.getStandardAttendanceConfiguration();
          if (this.state.is_subject_wise) {
            this.setState(
              {
                standard_section: "",
              },
              () => {
                this.getSectionList();
              }
            );
          }
          else {
            this.setState(
              {
                section: "",
              },
              () => {
                this.getStandardSectionsList();
              }
            );
          }
        });
      } else if (name === "standard_section") {
        this.setState({ [name]: value }, () => {
          if (selecteddate) {
            this.getSubjectWiseList();
          }
        });
      }
    }
  };

  getStandardAttendanceConfiguration = () => {
    let { standard, year, is_subject_wise } = this.state;
    let params = {
      academic_year: year,
      standard: standard,
    };
    getRequest(GET_URL.standardattendanceconfig.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardattendanceList = response.data.data;
        standardattendanceList.map((attendance_type) => {
          this.setState({ is_subject_wise: false });
          if (standard == attendance_type['standard']) {
            if (attendance_type['attendance_type'] === 3) {
              is_subject_wise = true;
              this.getSectionList();
            }
            else {
              is_subject_wise = false;
              this.getStandardSectionsList();
            }
          }
        })
        this.setState({ is_subject_wise });
      }
    });
  };

  getStandard = () => {
    let { standard, year } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        this.setState({ standardList, loading: false, standard }, () => {
          if (standard) {
            this.getStandardAttendanceConfiguration();
            if (this.state.is_subject_wise) {
              this.getSectionList();
            } else {
              this.getStandardSectionsList();
            }
          }
        });
      }
    });
  };

  Attendance = (
    standard_section,
    section,
    sessions,
    action,
    section_name,
    subject_name,
    subject_id,
    period_start_time,
    period_end_time,
    from_time,
    to_time,
    transaction_id,
    timetable_schedule,
  ) => {
    let { selecteddate, standard, year, standardList, is_subject_wise } = this.state;
    const session = sessions.length;
    const standardName = getKeyValueInArray(
      standardList,
      "id",
      standard,
      "name"
    );
    let searchState = {
      year: year,
      standard: standard,
      standard_name: standardName,
      section_name: section_name,
      standard_section: standard_section,
      section: section,
      selecteddate: selecteddate,
      session: session,
      subject_name: subject_name,
      subject_id: subject_id,
      period_start_time: period_start_time,
      period_end_time: period_end_time,
      from_time: from_time,
      to_time: to_time,
      transaction_id: transaction_id,
      timetable_schedule: timetable_schedule,
      is_subject_wise: is_subject_wise
    };
    searchState["is_view"] = action === "mark" ? 0 : 1;
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.studentattendance_attendance.view.url,
      search: searchParam,
    });
  };

  getBlankPageMessage = () => {
    let { standard, year, section } = this.state;
    if (this.state.is_subject_wise) {
      if (!standard) {
        if (!year) {
          return `Select the Academic year and ${alias_names["standard"]} to view the Attendance Details`;
        }
        return `Select the ${alias_names["standard"]} to view the Attendance Details`;
      } else if (!section) {
        return `Select the ${alias_names["section"]} to view the Attendance Details`;
      }
    } else if (!standard) {
      if (!year) {
        return `Select the Academic year and ${alias_names["standard"]} to view the Attendance Details`;
      }
      return `Select the ${alias_names["standard"]} to view the Attendance Details`;
    }
  };

  onChangeDate = (e) => {
    let { mindate, errorMessage, standard, standard_section } = this.state;
    let selecteddate = moment(e).format("YYYY-MM-DD");
    if (
      !moment(selecteddate).isBetween(
        mindate,
        moment(new Date()).format("YYYY-MM-DD"),
        undefined,
        "[]"
      )
    ) {
      errorMessage = "Enter a Date lesser than Today.";
      this.setState({
        errorMessage,
        selecteddate,
      });
    } else {
      errorMessage = "";
      this.setState(
        {
          errorMessage,
          selecteddate,
        },
        () => {
          if (standard) {
            if (!this.state.is_subject_wise) {
              return this.getStandardSectionsList();
            }
            if (standard_section) this.getSubjectWiseList();
          }
        }
      );
    }
  };

  handleDuplicateAttendance = () => {
    this.setState({
      dialogOpen: true,
    }, () => {
      this.getSubjectList();
    });
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
    });
  };

  handleChangePeriod = (e) => {
    let { name, value } = e.target;
    this.setState({
      [name]: `${value}:00`,
      fieldError: {},
    });
  };

  getSubjectList = () => {
    const { year, standard_section } = this.state;
    const url = GET_URL.getAssignSubject.api;
    let params = { is_active: true, academic_year: year, standard_section: standard_section };

    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        const assignedSubjects = response.data.data.assigned_subjects;
        const subjectList = assignedSubjects.map((subject) => ({
          id: subject.subject_id,
          name: subject.subject_name,
        }));
        this.setState({ subjectList }, () => {
        });
      }
    });
  };

  handleDropDownSearchChange = (newValue) => {
    if (newValue && newValue.id && newValue.name) {
      this.setState({
        selectedSubject: { id: newValue.id, name: newValue.name },
      });
    } else {
      this.setState({ selectedSubject: null });
    }
  };

  getAttendanceReport = () => {
    let { selecteddate } = this.state;
    let temp = { 'url': "" };
    temp.url = `${GET_URL.subjectattendancedetail.api}?for_date=${selecteddate}&print_report=1`;
    console.log(temp, 'propssssss')
    printPDFService(temp);
  };

  render() {
    let {
      loading,
      yearList,
      year,
      standardList,
      standard,
      sections,
      mindate,
      maxdate,
      selecteddate,
      errorMessage,
      holiday_reason,
      standard_section,
      timeTableList,
      columns,
      options,
      dialogOpen,
      selectedSubject,
      subjectList,
      is_subject_wise,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    }
    return (
      <Paper
        className={classNames("paper-background")}
        style={{ background: "transparent", boxShadow: "none" }}
      >
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">
              <FormattedMessage {...messages.attendanceRegister} />
            </Box>
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classNames("header-align")}>
          <Grid item lg={3} md={4} xs={6}>
            <Dropdown
              data={yearList}
              name="year"
              value={year}
              hideSelect={true}
              onChange={this.onChange}
              label={<FormattedMessage {...commonMessages.academicYear} />}
              size="small"
            />
          </Grid>
          <Grid item lg={3} md={4} xs={6}>
            <Dropdown
              data={standardList}
              name="standard"
              value={standard}
              hideSelect={true}
              onChange={this.onChange}
              label={<FormattedMessage {...commonMessages.standard} />}
              size="small"
            />
          </Grid>
          {is_subject_wise && (
            <Grid item lg={3} md={4} xs={6}>
              <Dropdown
                data={sections}
                name="standard_section"
                value={standard_section}
                hideSelect={true}
                onChange={this.onChange}
                label={<FormattedMessage {...commonMessages.section} />}
                size="small"
                customId="standard_section"
              />
            </Grid>
          )}
          {((is_subject_wise && standard_section) ||
            (!is_subject_wise && year && standard)) && (
              <Grid item lg={3} md={4} xs={6}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <KeyboardDatePicker
                    autoOk
                    size="small"
                    variant="inline"
                    inputVariant="outlined"
                    label={<FormattedMessage {...commonMessages.date} />}
                    fullWidth
                    name="start_date"
                    minDate={mindate}
                    maxDate={maxdate}
                    format="dd-MM-yyyy"
                    value={selecteddate}
                    onChange={(e) => this.onChangeDate(e)}
                    KeyboardButtonProps={{
                      "aria-label": "change date",
                    }}
                    helperText={errorMessage}
                    error={errorMessage ? true : false}
                  />
                </MuiPickersUtilsProvider>
              </Grid>
            )}
        </Grid>
        <Grid container className={classNames("header-align")}>
          {holiday_reason && (
            <Box display="flex" className="warning-message">
              {holiday_reason}
            </Box>
          )}
        </Grid>
        <Grid
          container
          className={classNames("flex-justify-center", "header-align")}
        >
          <Grid item md={12} xs={12} className={classNames("header-align")}>
            <Box className="card-alignment">
              {!is_subject_wise &&
                standard !== 0 && sections && sections[0]?.sessions &&
                sections.map((data) => {
                  return (
                    <Paper elevation={6} className="attendance-dashboard-paper">
                      <div className="d-flex flex-wrap align-items-center justify-content-space-between">
                        <div className="mt-5">
                          <div>Section : {data.section_name}</div>
                          <div className="d-flex mt-5 align-items-center">
                            <div className="icon-attendance-dash">
                              <img
                                src={teacher_dash}
                                className="height-width-25px"
                              />
                            </div>
                            <div style={{ fontSize: "20px" }}>
                              {data.total_present}/{data.strength}
                            </div>
                          </div>
                          {isUserHasPermission(
                            "studentattendance_attendance",
                            "create"
                          ) &&
                            data.sessions.length === 0 && (
                              <Button
                                size="medium"
                                className="text-center white-space button-color"
                                onClick={() =>
                                  this.Attendance(
                                    data.standard_section,
                                    data.section,
                                    data.sessions,
                                    "mark",
                                    data.section_name
                                  )
                                }
                              >
                                <FormattedMessage
                                  {...messages.markAttendance}
                                />
                              </Button>
                            )}
                          {isUserHasPermission(
                            "studentattendance_attendance",
                            "view"
                          ) &&
                            data.sessions.length !== 0 && (
                              <Button
                                size="medium"
                                className="text-center white-space button-color"
                                onClick={() =>
                                  this.Attendance(
                                    data.standard_section,
                                    data.section,
                                    data.sessions,
                                    "view",
                                    data.section_name
                                  )
                                }
                              >
                                {data.sessions.length === 1 && (
                                  <FormattedMessage
                                    {...messages.markAttendance}
                                  />
                                )}
                                {data.sessions.length === 2 && (
                                  <FormattedMessage
                                    {...messages.viewAttendance}
                                  />
                                )}
                              </Button>
                            )}
                        </div>
                        {data.is_multiple_sessions && (
                          <div style={{ fontSize: "16px", color: "#424242", textAlign: "left", paddingRight: "15px" }}>
                            <div style={{ marginBottom: "5px" }}>Morning: <strong>{data.session1_present}</strong></div>
                            <div>Afternoon: <strong>{data.session2_present}</strong></div>
                          </div>
                        )}
                      </div>
                    </Paper>
                  );
                })}
            </Box>
          </Grid>
        </Grid>
        {is_subject_wise && standard && standard_section && (
          <div className="mt-10 mb-20 text-align-end">
            <Tooltip
              title={<span style={{ fontSize: "14px" }}>Click to mark attendance for same subject</span>}
              arrow
            >
              <Button variant="contained" color="primary" onClick={this.handleDuplicateAttendance}>
                Mark Attendance
              </Button>
            </Tooltip>
            <Button
              className="add-modify-button"
              onClick={() =>
                this.getAttendanceReport()
              }
            >
              Staff Report
            </Button>
          </div>
        )}
        <Dialog
          open={dialogOpen}
          onClose={this.handleDialogClose}
          aria-labelledby="refund-dialog-title"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="form-dialog-title" className="text-center">
            Mark attendance for subject if any duplicate subjects present
          </DialogTitle>
          <hr />
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2} marginBottom={2}>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <TextField
                    name="new_from_time"
                    label="Start Time"
                    type="time"
                    size="small"
                    defaultValue={this.state.new_from_time}
                    onChange={(e) => this.handleChangePeriod(e)}
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    error={!!this.state.errors?.period_start_time}
                    helperText={this.state.errors?.period_start_time}
                    style={{ width: "150px", marginRight: "10px" }}
                  />
                </MuiPickersUtilsProvider>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  <TextField
                    name="new_to_time"
                    label="End Time"
                    type="time"
                    size="small"
                    defaultValue={this.state.to_from_time}
                    onChange={(e) => this.handleChangePeriod(e)}
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    InputProps={{ readOnly: this.state.is_view }}
                    style={{ width: "150px" }}
                  />
                </MuiPickersUtilsProvider>
              </Box>
              <Box marginBottom={2}>
                <DropDownWithSearch
                  id="combo-box-demo"
                  options={subjectList}
                  autoComplete="off"
                  value={selectedSubject}
                  onChange={(event, newValue) => this.handleDropDownSearchChange(newValue)}
                  label="Subject"
                  size="small"
                  style={{ width: "320px" }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleDialogClose} color="secondary">
              <FormattedMessage {...commonMessages.close} />
            </Button>
            {isUserHasPermission("studentattendance_attendance", "create") && (
              <Button
                size="medium"
                className="text-center white-space button-color"
                onClick={() => {
                  const { new_from_time, new_to_time, standard_section, selectedSubject, section, sections } = this.state;
                  const period_start_time = new_from_time;
                  const period_end_time = new_to_time;
                  const subject_id = selectedSubject.id;
                  let section_name = sections.find(data => data.standard_section === standard_section)?.name;
                  this.setState({ period_start_time, period_end_time }, () => {
                    this.Attendance(
                      standard_section,
                      section,
                      [],
                      "mark",
                      section_name,
                      selectedSubject.name,
                      subject_id,
                      period_start_time,
                      period_end_time,
                    );
                  });
                }}
              >
                <FormattedMessage {...messages.markAttendance} />
              </Button>
            )}
          </DialogActions>
        </Dialog>
        {is_subject_wise && standard && standard_section && (
          <Paper>
            <AllMUIDataTable
              key={timeTableList}
              title={"Time Table List"}
              data={timeTableList}
              columns={columns}
              options={options}
            />
          </Paper>
        )}
        {((is_subject_wise && !standard_section) ||
          (!is_subject_wise && !standard)) && (
            <BlankPagewithIcon data={this.getBlankPageMessage()} />
          )}
      </Paper>
    );
  }
}

export default withRouter(StudentAttendanceRegister);

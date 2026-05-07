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
import { AWS_BUCKET_URL } from "Constants";
import { dateFormat, getKeyValueInArray } from "Includes/functions";

import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import {
  SetAcademicYear,
} from "Includes/functions";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { Actions } from "Constants/permissions";
import { getUrlParam, timeFormat } from "Includes/functions";
import moment from "moment";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";
const teacher_dash = `${AWS_BUCKET_URL}companies-images/web-images/dashboard/teacher_d.png`;

class StudentBatchAttendanceRegister extends Component {
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
      attendance_batch:"",
      year: "",
      section: "",
      standard_section: "",
      timeTableList: [],
      dialogOpen: false,
      new_from_time: "",
      new_to_time: "",
      subjectList: [],
      selectedSubject: "",
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
    let { standard, date, attendance_batch } = getUrlParam();
    standard = standard ? parseInt(standard) : "";
    date = date ? date : dateFormat(new Date(), "YYYY-MM-DD");
    this.setState(
      {
        standard,
        selecteddate: date,
        attendance_batch: attendance_batch
      },
      () => {
        this.getAcademicYearsList();
      }
    );
    if (this.attendance_batch && this.selecteddate) {
      this.getAttendanceBatchList();
    }
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
              this.getStandard();
            }
          );
        }
      }
    );
  };


  getAttendanceBatchList = () => {
    let { year, selecteddate } = this.state;
    const url = GET_URL.batchattendancedetail.api;
    const params = {
      academic_year: year,
      for_date: selecteddate,
    };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        let section_data = response.data.data;
        let section_data_list = [];
        let session_temp = [];
        section_data.data_list.map((data) => {
          section_data_list.push(data);
        });
        this.setState({
          AttendanceBatchList:section_data.data_list,
          sections: section_data.data_list,
          holiday_reason: section_data.holiday_reason,
        });
      }
    });
  };

  onChange = async (e) => {
    let { value, name } = e.target;
    const { selecteddate } = this.state;
    if (value) {
      if (name === "year") {
        this.setState({ [name]: value, standard: "" }, () => {
          SetAcademicYear(value);
        });
      }
      if (name ===  "start_date" || name === "attendance_batch"){
        this.getAttendanceBatchList();
      }
    }
  };

  getStandard = () => {
    let { standard, year } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.attendancebatch.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        this.setState({ standardList, loading: false, standard }, () => {
          if (standard) {
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
    attendance_batch,
    action,
    attendance_batch_name,
  ) => {
    let { selecteddate, year, AttendanceBatchList } = this.state;
    const attendanceBatchName = getKeyValueInArray(
      AttendanceBatchList,
      "id",
      attendance_batch_name,
      "name"
    );
    let searchState = {
      year: year,
      attendance_batch: attendance_batch,
      attendance_batch_name: attendanceBatchName,
      selecteddate: selecteddate,
    };
    searchState["is_view"] = action === "mark" ? 0 : 1;
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.studentbatchattendance_attendance.view.url,
      search: searchParam,
    });
  };

  getBlankPageMessage = () => {
    let { year } = this.state;
    if (!year) {
      return `Select the Academic year and ${alias_names["standard"]} to view the Attendance Details`;
    }
  };

  onChangeDate = (e) => {
    let { mindate, errorMessage, standard, standard_section } = this.state;
    let selecteddate = moment(e).format("YYYY-MM-DD");
    this.getAttendanceBatchList();
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
      this.getAttendanceBatchList();
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

  render() {
    let {
      loading,
      yearList,
      year,
      standardList,
      sections,
      mindate,
      maxdate,
      selecteddate,
      errorMessage,
      holiday_reason,
      attendance_batch,
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
              name="attendance_batch"
              value={attendance_batch}
              hideSelect={true}
              onChange={this.onChange}
              label="Batch"
              size="small"
            />
          </Grid>
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
              {

                sections.map((data) => {
                  return (
                    <Paper elevation={6} className="attendance-dashboard-paper">
                      <div className="d-flex flex-wrap align-items-center justify-content-space-between">
                        <div className="mt-5">
                          <div>Batch Name : {data.name}</div>
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
                          {
                            (
                              <Button
                                size="medium"
                                className="text-center white-space button-color"
                                onClick={() =>
                                  this.Attendance(
                                    data.id,
                                    "mark",
                                    data.name
                                  )
                                }
                              >
                                <FormattedMessage
                                  {...messages.markAttendance}
                                />
                              </Button>
                            )}
                          {
                            (
                              <Button
                                size="medium"
                                className="text-center white-space button-color"
                                onClick={() =>
                                  this.Attendance(
                                    data.id,
                                    "view",
                                    data.name
                                  )
                                }
                              >

                              </Button>
                            )}
                        </div>
                      </div>
                    </Paper>
                  );
                })}
            </Box>
          </Grid>
        </Grid>
        {(!year) && (
          <BlankPagewithIcon data={this.getBlankPageMessage()} />
        )}
      </Paper>
    );
  }
}

export default withRouter(StudentBatchAttendanceRegister);

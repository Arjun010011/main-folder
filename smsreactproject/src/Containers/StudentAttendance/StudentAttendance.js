import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
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
  updatePermissions,
  dateFormat,
} from "Includes/functions";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";
import { makeStyles } from "@material-ui/core/styles";
import ActionColumn from "Components/ActionColumnNew";
import { DateRange } from "Components/DateRange";
import moment from "moment";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { cloneDeep } from "lodash";
import { minDate, maxDate } from "Constants";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { Subject } from "@material-ui/icons";
import { Dropdown } from "Components/DropDown";

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

class StudentAttendance extends Component {
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
    } = getUrlParam();
    is_view = is_view === "1";
    this.is_view = is_view;
    this.permission =
      session !== "0"
        ? updatePermissions("studentattendance_attendance", ["update"])
        : [];
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
      is_view: is_view,
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
      subject: {
        subject_name: subject_name,
        subject_id: subject_id,
        period_start_time: period_start_time,
        period_end_time: period_end_time,
        period_day_mapping:'',
        from_time: from_time,
        to_time: to_time,
        transaction_id: transaction_id,
        timetable_schedule:timetable_schedule,
      },
      isPeriodwise: isFormDefinitionEnabled(
        "student_attendance_configuration",
        "is_subject_period_wise",
        1
      ),
      fieldError: {},
      perioddaymappingList:[],
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
          label: 'Student Name',
          options: {
            filter: false,
            sort: true,
            search: false,
            download:true,
            customHeadLabelRender: () => (
              <FormattedMessage {...commonMessages.studentName} /> // ✅ still shows translated text in table UI
            ),
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
            download: false
          },
        },
        {
          name: "student_middle_name",
          label: <FormattedMessage {...commonMessages.middleName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
            download: false,
          },
        },
        {
          name: "student_last_name",
          label: <FormattedMessage {...commonMessages.lastName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
            download: false,
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
            download: false
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
            download: false
          },
        },
        {
          name: "current_reg_num",
          label: <FormattedMessage {...commonMessages.regNum} />,
          options: {
            filter: true,
            sort: true,
            download: false,
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
            download: false,
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
          label: "Status",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: true,
            customHeadLabelRender: () => (
              <FormattedMessage {...commonMessages.status} />
            ),
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
        },
        {
          name: "Actions",
          options: {
            display: this.permission.length > 0 && this.is_view,
            filter: false,
            sort: false,
            viewColumns: false,
            download: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[4]}
                    fieldValues={[tableMeta.rowData[8]]}
                    label={`Edit Attendance - ${tableMeta.rowData[9]}`}
                    fieldDetails={fieldDetails}
                    updateUrl={PUT_URL.attendance.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.permission}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  componentDidMount() {
    let { is_view, is_subject_wise,isPeriodwise } = this.state;
    if (is_subject_wise === "true"){
      is_subject_wise = true;
    }
    else{
      is_subject_wise = false;
    }
    this.setState ({
      is_subject_wise
    });
    if (is_subject_wise) {
      this.SubjectWiseAttendance();
      if(isPeriodwise){
        this.GetTodayTimeTablePeriod();
      }
    } else if (is_view) {
      this.viewAttendance();
    } else {
      this.getStudentList();
    }
  }

  GetTodayTimeTablePeriod = () => {
    let {perioddaymappingList,selecteddate,standard} = this.state;
    let params = { 'for_date':selecteddate ,'standard':standard}
    getRequest(GET_URL.gettodaytimetableperiod.api, params).then((response) => {
      if (response && response.status === 200) {
        perioddaymappingList = response.data.data;
        perioddaymappingList.forEach((data) => {
          if (data) {
            data['id'] = data['id'];
            data['name'] = data['period_name'];
          }
        });
        this.setState({
          perioddaymappingList,
        });
      }
    });
  }

  getStudentList = () => {
    const { year, section, standard } = this.state;
    const url = GET_URL.getenrolledstudents.api;
    const params = {
      academic_year: year,
      standard: standard,
      section: section,
    };
    this.getData(url, params);
  };

  SubjectWiseAttendance = () => {
    const { standard_section, subject, selecteddate, is_view, dateRangeValueDefault } = this.state;
    let params = {
      subject: parseInt(subject.subject_id),
      standard_section: standard_section,
      for_date: selecteddate,
    };
    if (subject.transaction_id !== 'undefined' ) {
      params.transaction_id = subject.transaction_id;
    }
    if (subject.timetable_schedule !== 'undefined' ){
      params.timetable_schedule = subject.timetable_schedule;
    }
    if (is_view) {
      params.from_time = subject.from_time;
      params.to_time = subject.to_time;
    }
    this.setState({ tableLoading: true });
    getRequest(GET_URL.subjectattendance.api, params).then((response) => {
      if (response && response.status === 200) {
        const studentListTemp = response.data.data;
        let studentObjTemp = {};
        let period_start_time = subject.period_start_time;
        let period_end_time = subject.period_end_time;
        let newDateRangeValueDefault = selecteddate;
        studentListTemp.forEach((data) => {
          if (data?.status) {
            studentObjTemp[data["student"]] = data.status;
          }
          if (is_view) {
            period_start_time = moment(data.from_time).format("HH:mm:ss");
            period_end_time = moment(data.to_time).format("HH:mm:ss");
            newDateRangeValueDefault = moment(data.for_date).format("YYYY-MM-DD");
          }
        });
        this.setState({
          studentList: studentListTemp,
          loading: false,
          tableLoading: false,
          studentObj: studentObjTemp,
          subject: { ...subject, period_start_time, period_end_time },
          dateRangeValueDefault: newDateRangeValueDefault,
        });
      }
    });
  };

  viewAttendance = () => {
    const { standard_section, selecteddate, selectedToggle } = this.state;
    const url = GET_URL.attendance.api;
    const params = {
      for_date: selecteddate,
      session: selectedToggle,
      standard_section: standard_section,
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
          if (data?.status && data.session === this.state.selectedToggle) {
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

  handleChangePeriod = (e) => {
    let { name, value } = e.target;
    let { subject } = this.state;
    if (name === 'period_start_time' || name === 'period_end_time') {
      value = `${value}:00`
    }
    subject[name] = value;
    this.setState({
      subject,
      fieldError: {},
      errorContent: ''
    })
  }

  onChange = (e) => {
    let { name, value } = e.target;
    let { subject,perioddaymappingList } = this.state;
    if (name == 'perioddaymapping'){
      subject.period_day_mapping = value
    }
    perioddaymappingList.map((data) =>
    {
      if(value == data['id']){
        subject.period_start_time=data['start_time'];
        subject.period_end_time=data['end_time'];
      }
    }
    )
    this.setState({
      subject,
      fieldError: {},
      errorContent: ''
    })
  }

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

  changeToggle = (event, value) => {
    if (value) {
      let { submit } = this.state;
      if (submit) {
        Swal.fire({
          title: "Are you sure?",
          text: "Attendance is not yet submitted.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "OK",
        }).then((result) => {
          if (result.value) {
            this.changeNow(event, value);
          }
        });
        return;
      } else {
        this.changeNow(event, value);
      }
    }
  };

  saveData = () => {
    let {
      selectedToggle,
      studentList,
      studentObj,
      standard_section,
      selecteddate,
      session,
      dateRangeValueDefault,
      subject,
      is_subject_wise
    } = this.state;

    let errors = {};
    if (!subject.period_start_time) {
      errors.period_start_time = "Start time is required.";
    }

    if (!subject.period_end_time) {
      errors.period_end_time = "End time is required.";
    }

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
      session_list: [selectedToggle],
      standard_section: standard_section,
      attendance: studentObj,
    };
    let url;
    if (this.state.is_subject_wise) {
      const selected_date = dateFormat(dateRangeValueDefault, "YYYY-MM-DD");
      post_data["subject"] = [
        {
          subject_id: parseInt(subject.subject_id),
          attendance: Object.entries(this.state.studentObj).map(([studentId, details]) => {
            return {
              student_id: parseInt(studentId),
              status: details,
            };
          }),
        },
      ];
      post_data["from_time"] = `${selected_date}T${subject.period_start_time}`;
      post_data["to_time"] = `${selected_date}T${subject.period_end_time}`;
      post_data["from_date"] = dateFormat(dateRangeValueDefault, "YYYY-MM-DD");
      post_data["to_date"] = dateFormat(dateRangeValueDefault, "YYYY-MM-DD");
      post_data["standard_section"] = parseFloat(standard_section);
      if (subject.period_day_mapping!= "undefined" && subject.period_day_mapping){
        post_data['period_day_mapping'] = subject.period_day_mapping;
      }
      if (subject.transaction_id != "undefined" && subject.transaction_id) {
      post_data['transaction_id'] = subject.transaction_id;
      }
      url = POST_URL.subjectattendance.api;
    } else {
      url = POST_URL.attendance.api;
    }
    postRequest(url, post_data).then((attendanceRes) => {
      if (attendanceRes && attendanceRes.status === 200) {
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
          standard: standard,
          standard_section: standard_section,
          section: section,
          date: selecteddate,
          is_subject_wise:is_subject_wise
        };
        let searchParam = "?" + new URLSearchParams(searchState).toString();
        this.props.history.push({
          pathname: Actions.studentattendance_register.view.url,
          search: searchParam,
        });
      }
    });
    this.setState({
      submit: false,
      errors: {}
    });
  };

  updatePostFormat = (newData) => {
    let { selectedToggle, selecteddate } = this.state;
    let payload = {
      status: newData.status,
      for_date: selecteddate,
      session: selectedToggle,
    };
    return payload;
  };

  updateType = (newData, id) => {
    let studentList = this.state.studentList;
    let studentObjTemp = this.state.studentObj;
    for (const data of studentList) {
      if (data.id === id) {
        data.status = newData.status;
        studentObjTemp[data.student] = newData.status;
        break;
      }
    }
    this.setState({
      studentList: [...studentList],
      studentObj: { ...studentObjTemp },
    });
    return true;
  };

  navigateToLessonPlanStatus = () => {
    const { year, standard_section, section, standard, subject, is_subject_wise, dateRangeValueDefault, standard_name, section_name } = this.state;
    const searchParam = new URLSearchParams({
      year,
      standard,
      standard_section,
      section,
      date: dateRangeValueDefault,
      is_subject_wise: is_subject_wise ? '1' : '0',
      ...(standard_name != null && { standard_name }),
      ...(section_name != null && { section_name }),
      ...(subject?.subject_id && {
        subject_id: subject.subject_id,
        subject_name: subject.subject_name || '',
      }),
    }).toString();
    this.props.history.push({
      pathname: Actions.lesson_plan_status?.view?.url,
      search: `?${searchParam}`,
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
    const {isPeriodwise,subject} = this.state;
    const formattedDate = moment(value).format("YYYY-MM-DD");
    subject.period_day_mapping='';
    this.setState({
      subject
    })
    if(isPeriodwise){
      this.GetTodayTimeTablePeriod();
    }
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
      selectedToggle,
      columns,
      alertData,
      open,
      submit,
      options,
      yearDetails,
      dateRangeValueDefault,
      tableLoading,
      isSession1Only,
      standard_name,
      section_name,
      subject,
      perioddaymappingList,
      isPeriodwise,
      standard_section,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    }
    let option = {
      ...options,
      download: true,
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
                    {alias_names["standard"]}
                  </Box>
                  <Box className=" exam-mark-add-heading-bg">
                    {standard_name}
                  </Box>
                  <Box className="exam-mark-heading-box">
                    {alias_names["section"]}
                  </Box>
                  <Box className=" exam-mark-add-heading-bg">
                    {section_name}
                  </Box>
                  {this.state.is_subject_wise && (
                    <Box className="exam-mark-heading-box"> Subject</Box>
                  )}
                  {this.state.is_subject_wise && (
                    <Box className=" exam-mark-add-heading-bg">
                      {subject.subject_name}
                    </Box>
                  )}
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
            {this.state.is_subject_wise && !isPeriodwise &&
             (
              <>
                <Box flex="0 0 auto" style={{ marginRight: "10px" }}>
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <TextField
                      name="period_start_time"
                      label="Start Time"
                      type="time"
                      size="small"
                      defaultValue={subject.period_start_time}
                      onChange={(e) => this.handleChangePeriod(e)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      variant="outlined"
                      error={!!this.state.errors?.period_start_time}
                      helperText={this.state.errors?.period_start_time}
                      disabled={subject?.timetable_schedule && subject?.timetable_schedule  !== 'undefined'}
                    />
                  </MuiPickersUtilsProvider>
                </Box>
                <Box flex="0 0 auto" style={{ marginRight: "10px" }}>
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <TextField
                      name="period_end_time"
                      label="End Time"
                      type="time"
                      size="small"
                      defaultValue={subject.period_end_time}
                      onChange={(e) => this.handleChangePeriod(e)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      variant="outlined"
                      error={!!this.state.errors?.period_end_time}
                      helperText={this.state.errors?.period_end_time}
                      disabled={subject?.timetable_schedule && subject?.timetable_schedule  !== 'undefined'}
                    />
                  </MuiPickersUtilsProvider>
                </Box>
              </>
            )}
            {this.state.is_subject_wise && isPeriodwise &&
             (
              <>
                <Box flex="0 0 auto" style={{ marginRight: "10px" }}>
                  <Dropdown
                    data={perioddaymappingList}
                    name="perioddaymapping"
                    value={subject.period_day_mapping}
                    hideSelect={true}
                    onChange={this.onChange}
                    label="Period"
                    size="small"
                  />
                </Box>
              </>
            )}
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
            {studentList.length > 0 && !isSession1Only && !this.state.is_subject_wise && (
              <Box display="flex" justifyContent="flex-end">
                <ToggleButtonGroup
                  size="small"
                  value={selectedToggle}
                  exclusive
                  onChange={this.changeToggle}
                >
                  <ToggleButton key={1} value="Session1">
                    <FormattedMessage {...messages.morningSession} />
                  </ToggleButton>
                  <ToggleButton key={2} value="Session2">
                    <FormattedMessage {...messages.afterNoonSession} />
                  </ToggleButton>
                </ToggleButtonGroup>
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
          <Box display="flex" justifyContent="flex-end" alignItems="center" marginTop="60px" flexWrap="wrap" style={{ gap: 12 }}>
            {standard_section && !tableLoading && (
              <Button
                variant="outlined"
                color="primary"
                onClick={this.navigateToLessonPlanStatus}
              >
                Update Today&apos;s Status
              </Button>
            )}
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

export default withRouter(StudentAttendance);

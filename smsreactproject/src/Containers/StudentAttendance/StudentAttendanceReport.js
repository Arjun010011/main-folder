import React, { Component } from "react";
import { Paper, Box, Button, Grid, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@material-ui/core";
import Cancel from "@material-ui/icons/Cancel";
import CheckCircle from "@material-ui/icons/CheckCircle";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
// import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import Swal from "sweetalert2";
import ErrorHandler from "Components/ErrorHandler";
import {
  dateFormat,
  printPDFService,
  checkLocalAcademicYear,
  SetAcademicYear,
  getKeyValueInArray,
  getFullName,
  getKeyValueMap,
  getCurrentAndPreviousAcademicYears,
  getSettingValue,
} from "Includes/functions";
import Chart from "react-apexcharts";
import {getRequest,deleteRequest,putRequest, postRequest} from "Includes/api/apicall";
import LoadingGif from "Components/LoadingGif";
import { LEAVEOPTIONS, minDate } from "Constants";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { roundOffDecimal } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import moment from "moment";
import { DateRange } from "Components/DateRange";
import AttendanceChart from "./Components/AttendanceChart";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import DateFnsUtils from "@date-io/date-fns";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";
let is_subject_wise =
  localStorage.getItem("branches") &&
  localStorage.getItem("branches") !== "undefined"
    ? JSON.parse(localStorage.getItem("branches"))
    : false;

// is_subject_wise = is_subject_wise.length === 0 ? false : true;
is_subject_wise = false;
class StudentAttendanceReport extends Component {
  constructor() {
    super();
    let date = new Date();
    this.state = {
      year: "",
      yearList: [],
      standard: "",
      standardList: [],
      standard_section: "",
      section_list: [],
      subject_list:[],
      timelist:[],
      subject:"",
      startDate: dateFormat(new Date(), "YYYY-MM-DD"),
      endDate: dateFormat(date, "YYYY-MM-DD"),
      showChart: "showtable",
      minDate: "",
      maxDate: "",
      loading: true,
      tableLoading: false,
      date_range: { minDate: "", maxDate: "" },
      updating_date_range: false,
      selectedAttendanceStatus: "all",
      selectedTab: "monthwise",
      is_subject_wise: isFormDefinitionEnabled(
              "student_attendance_configuration",
              "is_subject_wise",
              1
            ),
      is_rfid_wise:parseInt(
        getSettingValue("studentattendancetype")),
      selectedForDate: new Date(),
      SubjectSectionReport:{},
      showSatsDownloadDialog: false,
      selectedStandardsForSats: [],
      satsSelectedMonth: "",
      satsSelectedYear: "",
      satsMonthList: [],
      downloadingSatsAttendance: false,
      columns: [
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
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
          name: "first_name",
          label: <FormattedMessage {...commonMessages.firstName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "middle_name",
          label: <FormattedMessage {...commonMessages.middleName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "last_name",
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
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "present",
          label: "present status",
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "Status",
          label: <FormattedMessage {...commonMessages.status} />,
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Box className="cloumn-width white-space">
                  <Box textTransform="capitalize">
                    {tableMeta.rowData[7]}/{this.state.noOfDays}
                  </Box>
                </Box>
              );
            },
          },
        },
        {
          name: "Percentage",
          label: <FormattedMessage {...commonMessages.percentage} />,
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              let percentage = 0;
              if (tableMeta.rowData[7] && this.state.noOfDays) {
                percentage = (tableMeta.rowData[7] / this.state.noOfDays) * 100;
                percentage = percentage.toFixed(roundOffDecimal);
              }
              return (
                <Box className="cloumn-width white-space">
                  <Box textTransform="capitalize">
                    {percentage}
                    {"%"}
                  </Box>
                </Box>
              );
            },
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            filter: true,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <div>
                  <Button
                    className="add-modify-button"
                    onClick={() =>
                      this.getAttendanceReport(tableMeta.rowData[4])
                    }
                  >
                    <FormattedMessage {...messages.generateReport} />
                  </Button>
                </div>
              );
            },
          },
        },
      ],
      columnsReportWise: [
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
          name: "attendance_marked_staff",
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
          name: "period_day_mapping__period__name",
          label: "Period",
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
        }
      ],
      columnsDayWise : [
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
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
          name: "first_name",
          label: <FormattedMessage {...commonMessages.firstName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "middle_name",
          label: <FormattedMessage {...commonMessages.middleName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "last_name",
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
          name: "present",
          label: "present status",
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "session1_todays_status",
          label: "session1_todays_status",
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "session2_todays_status",
          label: "session2_todays_status",
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "Status",
          label: <FormattedMessage {...commonMessages.status} />,
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Box className="cloumn-width white-space">
                  { tableMeta.rowData[7] != tableMeta.rowData[8] ?
                    <>{tableMeta.rowData[7]} / {tableMeta.rowData[8]}</>
                  : 
                    <>{tableMeta.rowData[7]}</>
                  } 
                </Box>
              );
            },
          },
        }
      ],
      columnsDayWisesubjectwise : [
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
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
          name: "first_name",
          label: <FormattedMessage {...commonMessages.firstName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "middle_name",
          label: <FormattedMessage {...commonMessages.middleName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "last_name",
          label: <FormattedMessage {...commonMessages.lastName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "current_reg_num",
          label: "Reg Number",
          options: {
            filter: true,
            sort: false,
            display: true,
          },
        },

      ],
      columnsDayWiseRFID : [
        {
          name: "student_name",
          label: "Standent Name",
          options: {
            filter: true,
            sort: false,
            display: true,
          },
        },
        {
          name: "admission_num",
          label: "Admission Number",
          options: {
            filter: true,
            sort: false,
            display: true,
          },
        },
        {
          name: "intime_modified",
          label: "Intime",
          options: {
            filter: true,
            sort: false,
            display: true,
          },
        },
        {
          name: "outtime_modified",
          label: "Outtime",
          options: {
            filter: true,
            sort: false,
            display: true,
          },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: true,
            sort: false,
            display: true,
          },
        },
      ],
    };
  }

  componentDidMount() {
    let {is_subject_graph,is_subject_wise } = this.state
    this.getAcademicYear();
    is_subject_graph = is_subject_wise;
    if (is_subject_wise){
    this.getSubjectWiseStandardSection();}
    this.setState({
    is_subject_graph})
  }

  getSubjectWiseStandardSection = () => {
    this.setState({ tableLoading: true });
    let { SubjectSectionReport,selectedForDate } = this.state;
    const url = GET_URL.subjectattendancedetail.api;
    let params = {'attendance_report':1};
    params['for_date'] = moment(selectedForDate).format('YYYY-MM-DD');
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          SubjectSectionReport = response.data.data.data_list;
          this.setState({
            SubjectSectionReport,
            tableLoading: false,
          });
        }
      });
    }

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
          const year = user.other_details.academic_year.id;
          this.setState(
            {
              yearList,
              year: year ? year : "",
              start_date_object,
              end_date_object,
            },
            () => {
              if (year) {
                let date_range = {};
                date_range["minDate"] = start_date_object[year];
                date_range["maxDate"] = end_date_object[year];
                this.setState({ date_range }, () => {
                  this.getStandard();
                });
              } else {
                this.setState({
                  loading: false,
                });
              }
            }
          );
        }
      }
    );
  };

  getStandard = () => {
    let { year } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let standardList = response.data.data;
          this.setState(
            {
              standardList,
              loading: false,
            },
            () => this.getSections()
          );
        }
      }
    );
  };

  getSections = () => {
    let { standard, standardList , is_subject_wise } = this.state;
    if (standard) {
      const section_list = getKeyValueInArray(
        standardList,
        "id",
        standard,
        "sections"
      );
      if (is_subject_wise) {
        this.setState(
          {
            section_list,
            standard_section: section_list?.[0]?.["standard_section"],
          },
          () => {
            this.getSubjects();
          }
        );
      }
      else {
      this.setState(
        {
          section_list,
          standard_section: section_list?.[0]?.["standard_section"],
        },
        () => {
          this.getStudentList();
        }
      );}
    }
  };

  getSubjects = () => {
    let { standard_section , selectedForDate , is_subject_wise} = this.state;
    const params = { standard_section };
    getRequest(GET_URL.getAssignSubject.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let subject_list = response.data.data.assigned_subjects;
          if (is_subject_wise && this.state.subject) {
            this.setState(
              {
                subject_list,
                loading: false,
              },
              () => {
                this.getStudentList();
              }
            );
          }
          else {this.setState(
            {
              subject_list,
              loading: false,
            },
          );}
        }
      }
    );
  };

  getAttendanceReport = (studentid) => {
  let { standard_section } = this.state;
  let props = { ...this.props };
  let { from_date, to_date } = this.getDataParams();

  // Generate a unique transaction_id (timestamp + random)
  let transaction_id = Date.now() + Math.floor(Math.random() * 1000);

  props.url = `${GET_URL.download_daywise_attendance_report.api}?from_date=${from_date}&to_date=${to_date}&standard_section=${standard_section} & download_excel=1&long_running_process=1&transaction_id=${transaction_id}`;

  printPDFService(props);
};



  getStandardAttendanceConfiguration = () => {
      let { standard , is_subject_wise, is_rfid_wise} = this.state;
      let params = {
        'standard':standard
      }
      getRequest(GET_URL.standardattendanceconfig.api , params , this.props).then((response) => {
        if (response && response.status === 200) {
          const standardattendanceList = response.data.data;
          standardattendanceList.map((attendance_type) => {
            if (standard === attendance_type['standard']) {
              if(attendance_type['attendance_type'] === 3) {
                is_subject_wise = true;
                is_rfid_wise = false;
              }
              else if (attendance_type['attendance_type'] === 2) {
                is_subject_wise = false;
                is_rfid_wise = true;
              }
              else {
                is_subject_wise = false;
                is_rfid_wise = false;
              }
            }
          })
          this.setState({ is_subject_wise , is_rfid_wise},
            () => {
              this.getSections();
            }
          );
        }
      });
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
              studentList: [],
              date_range,
              updating_date_range: false,
            },
            () => {
              this.getStandard();
              SetAcademicYear(value);
            }
          );
        });
      } else if (name === "standard") {
        this.setState(
          {
            [name]: value,
            standard_section: "",
            studentList: [],
          },
          () => {this.getStandardAttendanceConfiguration();},
          () => {
            this.getSections();
          }
        );
      }
      else if (name === "subject") {
        this.setState(
          {
            [name]: value,
            studentList: [],
          },
          () => {
            this.getSubjects();
          }
        );
      }
       else if (name === "standard_section" || name === "selectedAttendanceStatus") {
        this.setState(
          {
            [name]: value,
            studentList: [],
          },
          () => {
            this.getStudentList();
          }
        );
      }
    }
  };

  getDataParams = () => {
    let { dateRangeValue, startDate, endDate,selectedAttendanceStatus, selectedTab , is_rfid_wise , standard_section , selectedForDate, is_subject_wise , subject,date_range } = this.state;
    let from_date, to_date;
    if (dateRangeValue) {
      from_date = dateRangeValue.start;
      to_date = dateRangeValue.end;
    } else {
      from_date = date_range['minDate'];
      to_date = date_range['maxDate'];
    }
    let temp = {
      from_date: moment(from_date).format("YYYY-MM-DD"),
      to_date: moment(to_date).format("YYYY-MM-DD"),
    }
    if (is_subject_wise) {
      temp['subject'] = subject
      temp['is_report']=1
    }
    if ( selectedTab == 'daywise') {
      temp['standard_section'] = standard_section
      temp['for_date'] = moment(selectedForDate).format("YYYY-MM-DD")
      delete temp['from_date']
      delete temp['to_date']
    }
    
    if ( selectedTab === 'daywise' && selectedAttendanceStatus !== "all" ){
        temp['attendance_status'] = selectedAttendanceStatus
    }
    return temp
  };

  getStudentList = () => {
    this.setState({ tableLoading: true });
    let { standard_section , is_rfid_wise, is_subject_wise , columnsDayWisesubjectwise , selectedTab , timelist } = this.state;
    if (standard_section && is_rfid_wise) {
      if (selectedTab == 'monthwise') {
        const url = GET_URL.rfidattendancedetail.api + standard_section + "/";
      const params = this.getDataParams();
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          let studentList = response.data.data.student;
          let noOfDays = response.data.data.days;
          this.setState({
            studentList: studentList,
            noOfDays: noOfDays,
            tableLoading: false,
          });
        }
      });

      }
      else{
      const url = GET_URL.rfidattendance.api;
      const params = this.getDataParams();
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          let studentList = response.data;
          let noOfDays = 0;
          this.setState({
            studentList: studentList,
            noOfDays: noOfDays,
            tableLoading: false,
          });
        }
      });
    }}
    else if (standard_section && is_subject_wise) {
      if (selectedTab == 'monthwise') {
      const url = GET_URL.subjectattendancedetail.api + standard_section + "/";
      const params = this.getDataParams();
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          let studentList = response.data.data.student;
          let noOfDays = response.data.data.days;
          this.setState({
            studentList: studentList,
            noOfDays: noOfDays,
            tableLoading: false,
          });
        }
      });

      }
      else {
      const url = GET_URL.subjectattendance.api;
      const params = this.getDataParams();
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          const studentList = response.data.data;
          timelist = response.data.time_list;
          const noOfDays = 0;
          if (timelist) {
            columnsDayWisesubjectwise=columnsDayWisesubjectwise.slice(0,5);
            timelist.forEach((time) => {
                columnsDayWisesubjectwise.push({
                  name: time,
                  label: time,
                  options: {
                    filter: true,
                    sort: false,
                    display: true,
                  },
                });
              }
            );
          this.setState({
            studentList: studentList,
            noOfDays: noOfDays,
            timelist,
            tableLoading: false,
            columnsDayWisesubjectwise:columnsDayWisesubjectwise
          });}
        }
      });
    }}
    else if (standard_section) {
      const url = GET_URL.attendancedetail.api + standard_section + "/";
      const params = this.getDataParams();
      getRequest(url, params).then((response) => {
        if (response && response.status === 200) {
          let studentList = response.data.data.student;
          let noOfDays = response.data.data.days;
          this.setState({
            studentList: studentList,
            noOfDays: noOfDays,
            tableLoading: false,
          });
        }
      });
    }
  };

  handleChangeDateRange = (value) => {
    if(!this.state.is_subject_wise){
    this.setState(
      {
        dateRangeValue: value,
        startDate: "",
        endDate: "",
      },
    );}
    else{
    this.setState(
      {
        dateRangeValue: value,
        startDate: "",
        endDate: "",
      },
      () => {
        this.getStudentList();
      }
    );}
  };

  handleShowChart = (standard, selectedDate, selectedAttendanceStatus) => {
    const formattedDate = new Date(selectedDate).toLocaleDateString("en-CA"); // ISO format: YYYY-MM-DD
    let { date_range } = this.state
    this.setState(
      {
        showChart: "showgraph",
        standard: standard.id,
        date_range: {
          minDate: date_range['minDate'],
          maxDate: date_range['maxDate']
        },
        // loading: true,
        standard_section: "",
        studentList: [],
        selectedForDate: selectedDate,
        selectedTab: "daywise",
        selectedAttendanceStatus
      },
      () => {
        this.getSections();
      }
    );
  };

  getBlankPageMessage = () => {
    let { standard_section, standard, year,selectedTab } = this.state;
    if (!standard_section && selectedTab != 'subjectwisesinglereport') {
      if (!standard && selectedTab != 'subjectwisesinglereport') {
        if (!year) {
          return `Select the Academic year, ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
        }
        return `Select the ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
      }
      return `Select the ${alias_names["section"]} to view the student List`;
    }
  };

  changeToggle = (e, value) => {
    if (value && value !== this.state.selectedTab) {
      this.setState(
        {
          selectedTab: value,
        }
      );
      if(value === 'daywise' || value === 'subjectwisesinglereport'){
        this.onChangeDate(this.state.selectedForDate)
      }
    }
  }

  changeToggleChart = (e, value) => {
    if (value && value !== this.state.showChart) {
      this.setState(
        {
          showChart: value,
        }
      );
    }
  }

  onChangeDate = (value) => {
    if (this.state.is_subject_wise) {
      this.setState({ selectedForDate: value });
    } else {
      this.setState({ selectedForDate: value }, () => {
        this.getStudentList();
      });
    }
  
    if (this.state.selectedTab === 'subjectwisesinglereport') {
      this.setState({ selectedForDate: value,
        SubjectSectionReport:{}
       }, () => {
        this.getSubjectWiseStandardSection();
      });
    }
  };

  // src/utils/attendanceReport.js

handleDownloadDaywiseReport = (standard_section) => {
  clearInterval(this.setTime);

  let { selectedYear } = this.state;
  this.setState({ tableLoading: `attendance_${standard_section}` }); // ✅ only table loading

  let { from_date, to_date } = this.getDataParams();
  let transaction_id = Date.now();

  // Build URL with query params
  const url = `${GET_URL.download_daywise_attendance_report.api}?from_date=${from_date}&to_date=${to_date}&standard_section=${standard_section || ""}&subject=&is_report=1&download_excel=1&long_running_process=1&transaction_id=${transaction_id}`;

  let props = { ...this.props };
  props["url"] = url;
  props["responseType"] = "json";
  props["return_error_message"] = true;

  getRequest(url, {}, props).then((response) => {
    if (response && response.data && response.data.Result === true) {
      this.setState(
        {
          transaction_id: transaction_id,
          totalFeeLoading: true,
          count: 60,
        },
        () => {
          this.setIntervalTimeAttendance();
        }
      );
    } else {
      this.setState({
        tableLoading: false,  // ✅ reset only table loader
        totalFeeError: true,
      });
    }
  });
};

setIntervalTimeAttendance = () => {
  this.setTime = setInterval(() => {
    this.getAttendanceReportResult();
  }, 5000);

  this.setTimeLimit += 1;
  if (this.setTimeLimit === 40) {
    clearInterval(this.setTime);
  }
};

getAttendanceReportResult = () => {
  let { number_of_hites } = this.state;
  this.setState({ number_of_hites: number_of_hites - 1 });

  if (number_of_hites === 0) {
    Swal.fire({
      icon: "error",
      title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
      showConfirmButton: true,
    });
    clearInterval(this.setTime);
    return;
  }

  let params = {
    transaction_id: this.state.transaction_id,
    is_active: true,
  };

  let props = { ...this.props };
  props["return_error_message"] = true;

  getRequest(GET_URL.longprocessingapiresult.api, params, props).then(
    (response) => {
      if (response && response.status === 200) {
        if (response?.data?.data?.is_process_running === false) {
          if (response.data.data.result_data.error) {
            ErrorHandler({
              response: {
                status: 400,
                data: response.data.data.result_data.error,
              },
            });
          } else {
            const fileUrl = response.data.data.result_data.url;
            window.open(fileUrl, "_self"); // open/download file
          }
          const updateState = { tableLoading: false };
          if (this.state.isSatsDownload) {
            updateState.downloadingSatsAttendance = false;
            updateState.isSatsDownload = false;
          }
          this.setState(updateState); 
          clearInterval(this.setTime);
        }
      } else {
        clearInterval(this.setTime);
        const updateState = {
          totalFeeLoading: false,
          totalFeeError: true,
          tableLoading: false,
        };
        if (this.state.isSatsDownload) {
          updateState.downloadingSatsAttendance = false;
          updateState.isSatsDownload = false;
        }
        this.setState(updateState);
      }
    }
  );
};

handleDownloadSatsAttendance = () => {
  // Generate month list based on academic year
  const { year, yearList, date_range } = this.state;
  let monthList = [];
  
  if (year && yearList && date_range.minDate && date_range.maxDate) {
    const startDate = moment(date_range.minDate);
    const endDate = moment(date_range.maxDate);
    let currentDate = startDate.clone().startOf('month');
    
    while (currentDate.isSameOrBefore(endDate, 'month')) {
      monthList.push({
        id: currentDate.format('YYYY-MM'),
        name: currentDate.format('MMMM YYYY'),
        month: currentDate.month() + 1, // 1-12
        year: currentDate.year()
      });
      currentDate.add(1, 'month');
    }
  }
  
  // Open dialog for standard and month selection
  this.setState({ 
    showSatsDownloadDialog: true,
    selectedStandardsForSats: [],
    satsSelectedMonth: "",
    satsSelectedYear: "",
    satsMonthList: monthList
  });
};

handleSatsDownloadConfirm = () => {
  let { selectedStandardsForSats, satsSelectedMonth, satsSelectedYear, year, yearList } = this.state;
  
  if (!selectedStandardsForSats || selectedStandardsForSats.length === 0) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Please select at least one standard",
    });
    return;
  }

  if (!satsSelectedMonth || !satsSelectedYear) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Please select a month",
    });
    return;
  }

  this.setState({ 
    showSatsDownloadDialog: false,
    downloadingSatsAttendance: true 
  });

  let transaction_id = Date.now();
  // Convert month and year to date range: first day of selected month to last day of selected month
  // satsSelectedMonth is now in format "MM" (e.g., "01", "02")
  const selectedDate = moment(`${satsSelectedYear}-${satsSelectedMonth}-01`);
  let from_date = selectedDate.startOf('month').format("YYYY-MM-DD");
  let to_date = selectedDate.endOf('month').format("YYYY-MM-DD");

  // Get standard IDs
  let standardIds = selectedStandardsForSats.map(std => std.id).join(',');

  const url = `${GET_URL.download_sats_attendance.api}?from_date=${from_date}&to_date=${to_date}&standard_ids=${standardIds}&year=${year}&download_excel=1&long_running_process=1&transaction_id=${transaction_id}`;

  let props = { ...this.props };
  props["url"] = url;
  props["responseType"] = "json";
  props["return_error_message"] = true;

  getRequest(url, {}, props).then((response) => {
    if (response && response.data && response.data.Result === true) {
      this.setState(
        {
          transaction_id: transaction_id,
          totalFeeLoading: true,
          count: 60,
          isSatsDownload: true, // Flag to identify SATS download
        },
        () => {
          this.setIntervalTimeAttendance();
        }
      );
    } else {
      this.setState({
        downloadingSatsAttendance: false,
        totalFeeError: true,
      });
    }
  });
};

handleSatsDownloadCancel = () => {
  // Only allow cancel if not downloading
  if (this.state.downloadingSatsAttendance) {
    return;
  }
  this.setState({ 
    showSatsDownloadDialog: false,
    selectedStandardsForSats: [],
    satsSelectedMonth: "",
    satsSelectedYear: ""
  });
};

handleSatsStandardChange = (selectedStandards) => {
  this.setState({ selectedStandardsForSats: selectedStandards });
};



  render() {
    let {
      loading,
      showChart,
      endDate,
      is_rfid_wise,
      is_subject_wise,
      subject_list,
      subject,
      date_range,
      selectedAttendanceStatus,
      yearList,
      standardList,
      standard,
      studentList,
      year,
      section_list,
      standard_section,
      tableLoading,
      updating_date_range,
      selectedTab,
      selectedForDate,
      is_subject_graph,
      SubjectSectionReport,
      startDate
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      let options = {
        ...LEAVEOPTIONS,
        download: true,
        onDownload: (buildHead, buildBody, columns, data) => {
          // 🔹 Trigger custom API call instead of local CSV export
          this.handleDownloadDaywiseReport();
          return false; // ✅ Prevent default CSV generation
        },
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
        <Paper
          className={classNames("paper-background")}
          style={{ background: "transparent", boxShadow: "none" }}
        >
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                <FormattedMessage {...messages.attendanceReport} />
              </Box>
            </Grid>
            <Grid item md={6} xs={12} className="text-align-end" >
                <Box className="header-align">
                    <ToggleButtonGroup
                      size="small"
                      value={showChart}
                      exclusive
                      onChange={this.changeToggleChart}
                    >
                      <ToggleButton key={1} value="showgraph">
                        Graph View
                      </ToggleButton>
                      ,
                      <ToggleButton key={2} value="showtable">
                        Table View
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
              </Grid>
            </Grid>
            <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
              </Box>
            </Grid>
            {showChart=="showtable" ? (
              <Grid item md={6} xs={12} className="text-align-end">
                <Box className="header-align">
                    <ToggleButtonGroup
                      size="small"
                      value={selectedTab}
                      exclusive
                      onChange={this.changeToggle}
                    >
                      <ToggleButton key={1} value="monthwise">
                        <FormattedMessage {...commonMessages.monthWise} />
                      </ToggleButton>
                      ,
                      <ToggleButton key={2} value="daywise">
                        <FormattedMessage {...commonMessages.dayWise} />
                      </ToggleButton>
                      {is_subject_wise && (<ToggleButton key={2} value="subjectwisesinglereport">
                        Report
                      </ToggleButton>)}
                    </ToggleButtonGroup>
                  </Box>
              </Grid>
            ):<></>}
          </Grid>
          {showChart == "showgraph" ? (
            <>
            <Box className="heading">
                <FormattedMessage {...messages.attendanceReport} />
            </Box>
            <AttendanceChart
              handleShowChart={this.handleShowChart}
              year={year}
            />
            {is_subject_graph && (
              <>
              <Box className="heading">
                  Subject Wise Attendance Report
              </Box>
              <AttendanceChart
                handleShowChart={this.handleShowChart}
                year={year}
                is_subject_graph={is_subject_graph}
              />
              </>
            )}
            </>
          ) : (
            <>
              <Grid
                container
                spacing={2}
                className={classNames("header-align")}
                style={{ alignItems: 'flex-end' }}
              >
                <Grid item lg={3} md={4} xs={12}>
                  <Dropdown
                    data={yearList}
                    name="year"
                    value={year}
                    hideSelect={true}
                    onChange={(e) => this.onChange(e, "year")}
                    label={
                      <FormattedMessage {...commonMessages.academicYear} />
                    }
                    size={"small"}
                  />
                </Grid>
                {year && selectedTab != 'subjectwisesinglereport' &&(
                  <Grid item lg={3} md={4} xs={12}>
                    <Dropdown
                      data={standardList}
                      name="standard"
                      value={standard}
                      hideSelect={true}
                      onChange={(e) => this.onChange(e, "standard")}
                      label={<FormattedMessage {...commonMessages.standard} />}
                      size={"small"}
                    />
                  </Grid>
                )}
                {year && standard && (
                  <Grid item lg={3} md={4} xs={12}>
                    <Dropdown
                      data={section_list}
                      name="standard_section"
                      customId={"standard_section"}
                      value={standard_section}
                      hideSelect={true}
                      onChange={(e) => this.onChange(e, "standard_section")}
                      label={<FormattedMessage {...commonMessages.section} />}
                      size={"small"}
                    />
                  </Grid>
                )}
              </Grid>
              {!updating_date_range && selectedTab == 'monthwise' && year && (
                <Grid
                  container
                  spacing={2}
                  className={classNames("header-align")}
                  style={{ alignItems: 'flex-end', marginTop: '16px' }}
                >
                  <Grid item lg={3} md={4} xs={12}>
                    <DateRange
                      handleChange={this.handleChangeDateRange}
                      minDate={date_range.minDate}
                      maxDate={date_range.maxDate}
                      startDate={date_range.minDate}
                      endDate={date_range.maxDate}
                      hideClearIcon
                      size={"small"}
                    />
                  </Grid>
                </Grid>
              )}
              {!updating_date_range && selectedTab == 'daywise' && year && standard && standard_section && (
                <Grid
                  container
                  spacing={2}
                  className={classNames("header-align")}
                  style={{ alignItems: 'flex-end', marginTop: '16px' }}
                >
                  <Grid item lg={3} md={4} xs={12}>
                    <Dropdown
                      data={[
                        {
                          "id": "all",
                          "name": "All"
                        },
                        {
                          "id": "Un Marked",
                          "name": "Un Marked"
                        },
                        {
                          "id": "Present",
                          "name": "Present"
                        },
                        {
                          "id": "Absent",
                          "name": "Absent"
                        }
                      ]}
                      name="selectedAttendanceStatus"
                      value={selectedAttendanceStatus}
                      hideSelect={true}
                      onChange={(e) => this.onChange(e, "selectedAttendanceStatus")}
                      label="Attendance Status"
                      size={"small"}
                    />
                  </Grid>
                  <Grid item lg={3} md={4} xs={12}>
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardDatePicker
                        autoOk
                        size="small"
                        variant="inline"
                        inputVariant="outlined"
                        label={<FormattedMessage {...commonMessages.date} />}
                        fullWidth
                        name="selectedForDate"
                        minDate={minDate}
                        maxDate={new Date()}
                        format="dd-MM-yyyy"
                        value={selectedForDate}
                        onChange={(e) => this.onChangeDate(e)}
                        KeyboardButtonProps={{
                          "aria-label": "change date",
                        }}
                      />
                    </MuiPickersUtilsProvider>
                  </Grid>
                </Grid>
              )}
              {!updating_date_range && (selectedTab == 'subjectwisesinglereport' || (is_subject_wise && selectedTab != 'subjectwisesinglereport')) && (
                <Grid
                  container
                  spacing={2}
                  className={classNames("header-align")}
                  style={{ alignItems: 'flex-end', marginTop: '16px' }}
                >
                  {selectedTab == 'subjectwisesinglereport' && (
                    <Grid item lg={3} md={4} xs={12}>
                      <MuiPickersUtilsProvider utils={DateFnsUtils}>
                        <KeyboardDatePicker
                          autoOk
                          size="small"
                          variant="inline"
                          inputVariant="outlined"
                          label={<FormattedMessage {...commonMessages.date} />}
                          fullWidth
                          name="selectedForDate"
                          minDate={minDate}
                          maxDate={new Date()}
                          format="dd-MM-yyyy"
                          value={selectedForDate}
                          onChange={(e) => this.onChangeDate(e)}
                          KeyboardButtonProps={{
                            "aria-label": "change date",
                          }}
                        />
                      </MuiPickersUtilsProvider>
                    </Grid>
                  )}
                  {is_subject_wise && selectedTab != 'subjectwisesinglereport' && (
                    <Grid item lg={3} md={4} xs={12}>
                      <Dropdown
                        data={subject_list}
                        name="subject"
                        customName="subject_name"
                        customId={"subject_id"}
                        value={subject}
                        hideSelect={true}
                        onChange={(e) => this.onChange(e, "subject")}
                        label="Subject"
                        size={"small"}
                      />
                    </Grid>
                  )}
                </Grid>
              )}
              <Grid
                container
                className={classNames("flex-justify-center", "header-align")}
              >
                <Grid
                  item
                  md={12}
                  xs={12}
                  className={classNames("header-align")}
                >
                  {selectedTab === 'subjectwisesinglereport' ? (
                    Object.entries(SubjectSectionReport).map(([key, value], index) => (
                      value && value.subject_list && value.subject_list.length > 0 && (
                        <React.Fragment key={`${key}-${index}`}>
                          <Box className="heading">
                            {value.standard_name} - {value.section_name}
                          </Box>
                          <AllMUIDataTable
                            data={value.subject_list}
                            columns={this.state.columnsReportWise}
                            options={options}
                          />
                        </React.Fragment>
                      )
                    ))
                  ):<></>}
                  {!standard_section &&  (
                    
                    <BlankPagewithIcon data={this.getBlankPageMessage()} />
                  )}
                  {standard_section && (
                    <>
                      {year && selectedTab == 'monthwise' && (
                        <Grid container style={{ marginBottom: '16px' }}>
                          <Grid item xs={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => this.handleDownloadSatsAttendance()}
                              disabled={this.state.downloadingSatsAttendance}
                              startIcon={this.state.downloadingSatsAttendance ? <CircularProgress size={16} color="inherit" /> : null}
                            >
                              {this.state.downloadingSatsAttendance ? 'Downloading...' : 'Download SATS Attendance'}
                            </Button>
                          </Grid>
                        </Grid>
                      )}
                      <Paper>
                      {selectedTab == 'monthwise' ? (
                        <AllMUIDataTable
                          key={selectedTab}
                          data={studentList}
                          columns={this.state.columns}
                          options={options}
                        /> ) : <></>
                      }
                      {selectedTab == 'daywise' && is_rfid_wise ? (
                        <AllMUIDataTable
                          data={studentList}
                          columns={this.state.columnsDayWiseRFID}
                          options={options}
                        />) : <></>
                      }
                      {selectedTab == 'daywise' && is_subject_wise ? (
                        <AllMUIDataTable
                          key={`subject-${this.state.subject}-${this.state.timelist.join(',')}`}
                          data={studentList}
                          columns={this.state.columnsDayWisesubjectwise}
                          options={options}
                        />) : <></>
                      }
                      {selectedTab == 'daywise' && !is_subject_wise && !is_rfid_wise && (
                        <AllMUIDataTable
                          key={selectedTab}
                          data={studentList}
                          columns={this.state.columnsDayWise}
                          options={options}
                        />)
                      }
                    </Paper>
                    </>
                  )}
                </Grid>
              </Grid>
            </>
          )}
        </Paper>
        {/* SATS Download Dialog */}
        <Dialog
          open={this.state.showSatsDownloadDialog}
          onClose={this.handleSatsDownloadCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Download SATS Attendance</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} style={{ marginTop: '0.5rem' }}>
              <Grid item xs={12}>
                <MultipleSelectDropdown
                  data_list={this.state.standardList || []}
                  selected_list={this.state.selectedStandardsForSats || []}
                  onChange={this.handleSatsStandardChange}
                  optionValue="name"
                  customId="id"
                  label="Select Standards"
                  placeholder="Select standards to download attendance"
                  enableSelectAll
                />
              </Grid>
              <Grid item xs={12}>
                <Dropdown
                  data={this.state.satsMonthList.map(month => ({
                    id: month.id, // Format: "YYYY-MM"
                    name: month.name // Format: "MMMM YYYY" (e.g., "January 2024")
                  }))}
                  value={this.state.satsSelectedMonth && this.state.satsSelectedYear 
                    ? `${this.state.satsSelectedYear}-${this.state.satsSelectedMonth.padStart(2, '0')}`
                    : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [year, month] = value.split('-');
                      this.setState({
                        satsSelectedYear: year,
                        satsSelectedMonth: month
                      });
                    } else {
                      this.setState({
                        satsSelectedYear: "",
                        satsSelectedMonth: ""
                      });
                    }
                  }}
                  label="Select Month"
                  name="satsSelectedMonth"
                  md={12}
                  className="width-100"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions style={{ justifyContent: 'flex-end', padding: '16px 24px' }}>
            <Button onClick={this.handleSatsDownloadCancel} color="secondary" disabled={this.state.downloadingSatsAttendance}>
              Cancel
            </Button>
            <Button 
              onClick={this.handleSatsDownloadConfirm} 
              color="primary" 
              variant="contained"
              disabled={this.state.downloadingSatsAttendance}
              startIcon={this.state.downloadingSatsAttendance ? <CircularProgress size={16} color="inherit" /> : null}
              style={{ marginLeft: '8px' }}
            >
              {this.state.downloadingSatsAttendance ? 'Downloading...' : 'Download'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
      );
    }
  }
}

export default withRouter(StudentAttendanceReport);

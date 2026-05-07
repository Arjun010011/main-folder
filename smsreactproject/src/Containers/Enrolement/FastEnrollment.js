import React, { Component, forwardRef } from "react";
import {
  Grid,
  Paper,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  CircularProgress,
  Typography
} from "@material-ui/core";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import Snackbar from "@material-ui/core/Snackbar";
import ClearIcon from "@material-ui/icons/Clear";
import { FormattedMessage } from "react-intl";
import Swal from "sweetalert2";
import PeopleIcon from '@material-ui/icons/People';
import PersonOutlineIcon from '@material-ui/icons/PersonOutline';

import {
  checkLocalAcademicYear,
  Alert,
  SetAcademicYear,
  getSettingValue,
  dateFormat,
  getFormatMessage,
  getFullName,
} from "Includes/functions";
import { DATATABLEROWSPERPAGEOPT, SUCCESS_MSG_PROPS } from "Constants";
import { getRequest, postRequest } from "Includes/api/apicall";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { GET_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import MuiToolBar from "Components/MuiToolBar";
import loadingBar from "images/loading.gif";
import commonMessages from "Constants/messages";
import messages from "./messages";
import "./styles.scss";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

// eslint-disable-next-line react/display-name
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const isResidential = parseInt(getSettingValue("is_residential"));
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class FastEnrollment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      year: "",
      yearList: [],
      standardList: [],
      standard: "",
      sectionList: [],
      section: 0,
      studentList: {
        unenrolled: [],
        enrolled: [],
      },
      selectedStudentList: [],
      selectedTab: "unenrolled",
      tabDisabled: false,
      alertData: "",
      snackbar: false,
      showEnrollSubmitPopUp: false,
      blankData: "",
      totalSummaryLoading: true,
      enrollmentSummary : {},
      transaction_id: null,
      unEnrolledOptions: {
        responsive: "scroll",
        filter: !!isResidential,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
        selectableRows: "multiple",
        selectToolbarPlacement: "replace",
        rowsPerPage: DATATABLEROWSPERPAGEOPT[1],
        customToolbarSelect: (selectedRows) => {
          return (
            <MuiToolBar
              name={<FormattedMessage {...messages.enrollStudents} />}
              selectedRows={selectedRows}
              showEnableFeaturePopup={this.handlePopupStatus}
            />
          );
        },
      },
      options: {
        responsive: "scroll",
        selectableRows: "none",
        filter: !!isResidential,
        download: true,
        print: false,
        search: true,
        viewColumns: false,
        rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
        rowsPerPage: DATATABLEROWSPERPAGEOPT[1],
        selectToolbarPlacement: "none",
        onDownload: (buildHead, buildBody, columns, data) => {
          const bodyData = data.map((data_value, i) => {
            data_value.data.unshift(i + 1);
            return data_value;
          });
          columns.forEach((column_name) => {
            column_name.label = getFormatMessage(column_name.label);
          });
          columns.unshift({ label: "Sl", name: "Sl", download: true });
          return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
        },
        downloadOptions: {
          filename: "Enrollment_Students.csv",
          filterOptions: {
            useDisplayedColumnsOnly: true,
            useDisplayedRowsOnly: true,
          },
        },
      },
      tableUpdated: false,
      loadingData: false,
      openCopyEnrollment: false,
      fromAcademicYear: 0,
      fromAcademicYearstandardList: [],
      selectedStandardFromAcademicYear : 0
    };
    this.columns = [
      {
        name: "id",
        label: "id",
        options: {
          sort: false,
          filter: false,
          display: false,
          search: false,
        },
      },
      {
        name: "name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "current_reg_num",
        label: <FormattedMessage {...commonMessages.regNum} />,
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "mobile_num",
        label: <FormattedMessage {...commonMessages.phoneNo} />,
        options: {
          filter: false,
          sort: true,
          search: false,
        },
      },
      {
        name: "dob",
        label: <FormattedMessage {...commonMessages.dob} />,
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value) => {
            return dateFormat(value, "DD-MM-YYYY");
          },
        },
      },
      {
        name: "student_type",
        label: <FormattedMessage {...commonMessages.studentType} />,
        options: {
          filter: !!isResidential,
          sort: true,
          display: !!isResidential,
        },
      },
      {
        name: "student_first_name",
        label: "student_first_name",
        options: {
          filter: false,
          display: false,
        },
      },
      {
        name: "student_middle_name",
        label: "student_middle_name",
        options: {
          filter: false,
          display: false,
        },
      },
      {
        name: "student_last_name",
        label: "student_last_name",
        options: {
          filter: false,
          display: false,
        },
      },
    ];
    this.enrollment_columns = [
      {
        name: "id",
        label: "id",
        options: {
          sort: false,
          filter: false,
          display: false,
          search: false,
        },
      },
      {
        name: "name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "section_name",
        label: <FormattedMessage {...commonMessages.sectionName} />,
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "current_reg_num",
        label: <FormattedMessage {...commonMessages.regNum} />,
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "mobile_num",
        label: <FormattedMessage {...commonMessages.phoneNo} />,
        options: {
          filter: false,
          sort: true,
          search: false,
        },
      },
      {
        name: "dob",
        label: <FormattedMessage {...commonMessages.dob} />,
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value) => {
            return dateFormat(value, "DD-MM-YYYY");
          },
        },
      },
      {
        name: "student_type",
        label: <FormattedMessage {...commonMessages.studentType} />,
        options: {
          filter: !!isResidential,
          sort: true,
          display: !!isResidential,
          download: false,
        },
      },
      {
        name: "student_first_name",
        label: "student_first_name",
        options: {
          filter: false,
          display: false,
        },
      },
      {
        name: "student_middle_name",
        label: "student_middle_name",
        options: {
          filter: false,
          display: false,
        },
      },
      {
        name: "student_last_name",
        label: "student_last_name",
        options: {
          filter: false,
          display: false,
        },
      },
    ];
  }
  componentDidMount() {
    this.getAcademicYear();
  }

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = response.data.data;
          const year = checkLocalAcademicYear(yearList);
          let loading = year ? true : false;
          this.setState(
            {
              yearList,
              blankData: year
                ? `Select ${alias_names["standard"]}`
                : "Select Year",
              loading,
              tabDisabled: false,
              year: year ? year : "",
            },
            () => {
              if (year) {
                this.getStandard();
              }
            }
          );
        }
      }
    );
  };

  getStandard = () => {
    const params = { academic_year: this.state.year };
    this.getTotalSummary()
    this.setState({ loading: true });
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        this.setState({
          standardList,
          loading: false,
          standard: "",
          section: "",
          blankData: `Select ${alias_names["standard"]}`,
        });
      }
    });
  };

  removeEnrollingStudent = (index) => {
    let { selectedStudentList } = this.state;
    selectedStudentList.splice(index, 1);
    this.setState({ selectedStudentList });
  };

  onChange = async (e) => {
    let value = e.target.value;
    const { unEnrolledOptions, yearList } = this.state;
    unEnrolledOptions.rowsSelected = [];
    if (value !== 0) {
      SetAcademicYear(value);
      let selectedYearName = ''
      yearList.map((y)=> {
        if( y.id == value){
          selectedYearName = y.name
        }
      })
      this.setState(
        {
          year: value,
          studentList: {
            unenrolled: [],
            enrolled: [],
          },
          enrollmentSummary : {},
          standard: 0,
          unEnrolledOptions,
        },
        () => {
          this.getStandard();
        }
      );
    }
  };

  onChangeStandard = async (e) => {
    const { unEnrolledOptions } = this.state;
    let value = e.target.value;
    let name = e.target.name;
    unEnrolledOptions.rowsSelected = [];
    this.setState({ tabDisabled: true, unEnrolledOptions });
    if (value !== 0) {
      const studentList = { unenrolled: [], enrolled: [] };
      this.setState(
        { [name]: value, section: 0, studentList, tabDisabled: false },
        () => {
          this.getStudentList();
        }
      );
    }
  };

  setActiveTab = (selectedTabArg) => {
    let { selectedTab } = this.state;
    if (!selectedTabArg !== selectedTab && selectedTabArg) {
      this.setState({ selectedTab: selectedTabArg }, () => {
        this.getStudentList();
      });
    }
  };

  getStudentList = () => {
    const { selectedTab, standard, year, studentList, unEnrolledOptions } =
      this.state;
    let url = GET_URL.getenrollment.api;
    if (selectedTab === "enrolled") {
      url = GET_URL.getenrolledstudents.api;
    }
    const params = { academic_year: year, standard };
    this.setState({ tableUpdated: false, loadingData: true });
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const data = response.data.data;
        const sectionList = data.sections;
        if (selectedTab === "enrolled") {
          studentList[selectedTab] = data;
        } else {
          studentList[selectedTab] = data.students.map((stu) => {
            stu.student_first_name = stu.first_name;
            stu.student_middle_name = stu.middle_name;
            stu.student_last_name = stu.last_name;
            return stu;
          });
        }
        unEnrolledOptions.rowsSelected = [];
        this.setState({
          sectionList,
          studentList,
          tabDisabled: false,
          loading: false,
          unEnrolledOptions,
          tableUpdated: true,
          loadingData: false,
        });
      }
    });
  };

  onChangeSection = (e) => {
    let value = e.target.value;
    // eslint-disable-next-line no-unused-vars
    for (const sectionData of this.state.sectionList) {
      if (value !== 0 && sectionData.id === value) {
        this.setState({ section: value, sectionData });
        break;
      }
    }
  };

  onChangeFromAcademic = (e) => {
    this.setState({
      fromAcademicYear: e.target.value
    })
  }

  onChangeFromAcademicStandard = (e) => {
    this.setState({
      selectedStandardFromAcademicYear: e,
    });
  };

  submit = () => {
    const { selectedStudentList, sectionData, unEnrolledOptions } = this.state;
    let alertData = null;
    if (selectedStudentList.length === 0) {
      alertData = <FormattedMessage {...commonMessages.studentErr} />;
    }
    if (!sectionData.standard_section) {
      alertData = <FormattedMessage {...commonMessages.sectionErr} />;
    }
    if (alertData) {
      this.setState({
        alertData,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    this.setState({ isDisabled: true });
    const payload = {
      standard_section: sectionData.standard_section,
      student: selectedStudentList.map((data) => data.id),
    };
    let url = POST_URL.enrollment.api;
    postRequest(url, payload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          unEnrolledOptions.rowsSelected = [];
          Swal.fire({
            title: response.data.Reason,
            ...SUCCESS_MSG_PROPS,
          });
          this.getStudentList();
        }
        this.setState({
          showEnrollSubmitPopUp: false,
          unEnrolledOptions,
          isDisabled: false,
        });
      })
      .catch(() => {
        this.setState({ showEnrollSubmitPopUp: false, isDisabled: false });
      });
  };

  submitCopyEnrollmentData = () => {
    const { selectedStandardFromAcademicYear, fromAcademicYear, year } = this.state;
    let alertData = null;
    if (selectedStandardFromAcademicYear.length === 0) {
      alertData = 'Select From Standards'
    }
    if (!fromAcademicYear) {
      alertData = 'Select Acadmeic Year'
    }
    if (alertData) {
      this.setState({
        alertData,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    this.setState({ isDisabled: true });
    const payload = {
      'from_academic_year': fromAcademicYear,
      'standard_ids': selectedStandardFromAcademicYear.map((item) => item.id),
      'to_academic_year': year,
      'copy_enrollment_data': true
    };
    let url = POST_URL.enrollment.api;
    postRequest(url, payload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            title: response.data.Reason,
            ...SUCCESS_MSG_PROPS,
          });
        }
        this.setState({
          openCopyEnrollment: false
        });
      })
      .catch(() => {
        this.setState({ isDisabled: false });
      });
  }

  handleClose = () => this.setState({ snackbar: false });

  handleCopyEnrollment = (status=true) =>{
    this.setState({
      openCopyEnrollment : status,
      selectedStandardFromAcademicYear : 0,
      isDisabled: false
    })
  }

  handlePopupStatus = (selectedRows) => {
    let {
      studentList,
      showEnrollSubmitPopUp,
      selectedStudentList,
      selectedTab,
    } = this.state;
    if (selectedRows && selectedRows.data) {
      const selectedIndices = selectedRows.data.map((data) => data.dataIndex);
      selectedStudentList = studentList[selectedTab].filter((data, index) =>
        selectedIndices.includes(index)
      );
    }
    this.setState({
      showEnrollSubmitPopUp: !showEnrollSubmitPopUp,
      selectedStudentList,
      section: null,
      sectionData: {},
    });
  };
  
  getTotalSummary = () => {
    let {year} = this.state
    this.setTimeLimit = 0;
    let params = {
      long_running_process: 1,
      academic_year: year,
      is_active: true,
      transaction_id: Date.now(),
    };
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(GET_URL.enrollmentsummary.api, params, props).then(
      (response) => {
        clearInterval(this.setTime);
        this.setState(
          {
            transaction_id: params.transaction_id,
            totalSummaryLoading: true,
            count: 60,
          },
          () => {
            this.setIntervalTime();
          }
        );
      }
    );
  };

  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 3000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      clearInterval(this.setTime);
    }
  };

  getlongprocessingapiresult = () => {
    let params = {
      transaction_id: this.state.transaction_id,
      is_active: true,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;

    if (this.state.count === 0) {
      clearInterval(this.setTime);
      this.setState({
        totalFeeLoading: false,
        totalFeeError: true,
      });
    }
    getRequest(GET_URL.longprocessingapiresult.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          if (response?.data?.data?.is_process_running === false) {
            this.setState({
              totalFeeLoading: false,
              enrollmentSummary: response.data.data.result_data,
              totalFeeError: false,
            });
            clearInterval(this.setTime);
          }
        } else {
          clearInterval(this.setTime);
          this.setState({
            totalFeeLoading: false,
            totalFeeError: true,
          });
        }
      }
    );
  };


  render() {
    const {
      loading,
      yearList,
      year,
      standardList,
      standard,
      sectionList,
      selectedTab,
      section,
      alertData,
      snackbar,
      tabDisabled,
      unEnrolledOptions,
      selectedStudentList,
      showEnrollSubmitPopUp,
      studentList,
      options,
      tableUpdated,
      loadingData,
      blankData,
      isDisabled,
      openCopyEnrollment,
      fromAcademicYear,
      selectedStandardFromAcademicYear,
      enrollmentSummary,
    } = this.state;

    console.log(enrollmentSummary, 'enrollmentSummary')

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className={"loader"} alt="loading" />
        </Box>
      );
    } else {
      return (
        <>
          <Paper>
            <Box className="paper-background">
              <Grid container>
                <Grid item md={12} xs={12} sm={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Box className="header-align">
                      <Box className="heading">
                        <FormattedMessage {...messages.enrollment} />
                      </Box>
                      <div className="staff-list-assigned-shift p-b-20">{`Students can be enrolled into the desired ${alias_names["section"]}.`}</div>
                    </Box>
                    {standard && (
                      <Box className="header-align">
                        <ToggleButtonGroup
                          size="small"
                          className="header-align"
                          value={selectedTab}
                          exclusive
                          onChange={(e, val) => this.setActiveTab(val)}
                        >
                          <ToggleButton key={1} value="unenrolled">
                            <FormattedMessage {...messages.unenrolled} />
                          </ToggleButton>
                          ,
                          <ToggleButton key={2} value="enrolled">
                            <FormattedMessage {...messages.enrolled} />
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item md={8} xs={12} sm={12}>
                  <Box className="dropdown-outer-box">
                    <Box className="enroll-dropdown-item">
                      <Dropdown
                        data={yearList}
                        name="year"
                        value={year}
                        onChange={this.onChange}
                        label={
                          <FormattedMessage {...commonMessages.academicYear} />
                        }
                        // className="fit-content"
                        hideSelect={true}
                      />
                      {year &&
                        <Button onClick={this.handleCopyEnrollment} color="primary">
                          Copy Enrollment 
                        </Button>
                      }
                    </Box>
                    <Box className="enroll-dropdown-right-item  enroll-dropdown-standard-item">
                      <Dropdown
                        data={standardList}
                        name="standard"
                        value={standard}
                        onChange={this.onChangeStandard}
                        label={
                          <FormattedMessage {...commonMessages.standard} />
                        }
                        // className="fit-content"
                        hideSelect={true}
                      />
                    </Box>
                  </Box>
                </Grid>
                {year &&
                  <Grid item md={12} xs={12} sm={12}>
                    {enrollmentSummary && Object.keys(enrollmentSummary).length > 0 ? (
                      <Box style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: '10px', inlineSize: 'fit-content', boxShadow: '2px 2px 2px rgba(0, 0, 0, 0.25)' }}>
                        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                          Academic Year Summary
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item>
                            <PeopleIcon style={{ color: '#3f51b5' }} />
                          </Grid>
                          <Grid item>
                            <Typography variant="body1">
                              <strong>Enrolled:</strong> {enrollmentSummary.total_enrolled_students}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <PersonOutlineIcon style={{ color: '#f44336' }} />
                          </Grid>
                          <Grid item>
                            <Typography variant="body1">
                              <strong>Unenrolled:</strong> {enrollmentSummary.total_unenrolled_students}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: '#888',}}>Loading summary...</span>
                    )}
                  </Grid>
                }
                <Grid item md={12} xs={12} sm={12}>
                  {loadingData && (
                    <div className="loading">
                      <CircularProgress />
                    </div>
                  )}
                  {!tableUpdated && !loadingData && (
                    <BlankPagewithIcon data={blankData} />
                  )}
                  {tableUpdated && !loadingData && (
                    <Box className={"md-mt-10"}>
                      {selectedTab === "enrolled" ? (
                        <AllMUIDataTable
                          title={
                            tabDisabled ? (
                              <CircularProgress className="white-text" />
                            ) : (
                              ""
                            )
                          }
                          data={studentList[selectedTab]}
                          columns={this.enrollment_columns}
                          options={options}
                        />
                      ) : (
                        <AllMUIDataTable
                          title={
                            tabDisabled ? (
                              <CircularProgress className="white-text" />
                            ) : (
                              ""
                            )
                          }
                          data={studentList[selectedTab]}
                          columns={this.columns}
                          options={unEnrolledOptions}
                        />
                      )}
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
            <Dialog
              open={showEnrollSubmitPopUp}
              onClose={this.handlePopupStatus}
              keepMounted
              TransitionComponent={Transition}
              maxWidth="xs"
              fullWidth={true}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="form-dialog-title">
                <FormattedMessage {...messages.enrollingStudents} />
              </DialogTitle>
              <hr />
              <DialogContent>
                <Box>
                  <Box className="enroll-block-item">
                    <Dropdown
                      data={sectionList}
                      name="section"
                      value={section}
                      onChange={this.onChangeSection}
                      label={<FormattedMessage {...commonMessages.section} />}
                      hideSelect={true}
                    />
                  </Box>
                  <Box className="enroll-block-item">
                    {selectedStudentList &&
                      selectedStudentList.map((stu, ind) => {
                        return (
                          <Box className="enrolling-student-block" key={ind}>
                            <Box className="enrolling-student">{stu.name}</Box>
                            <Box
                              className="close-enrolling-student pointer"
                              onClick={() => this.removeEnrollingStudent(ind)}
                            >
                              <ClearIcon fontSize="7px" />
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>
                </Box>
                {/* <Box className='error-content flex-justify-center margin-top-10'>
                  {errorContent}
                </Box> */}
              </DialogContent>
              <DialogActions>
                <Button onClick={this.handlePopupStatus} color="secondary">
                  {<FormattedMessage {...commonMessages.close} />}
                </Button>
                <Button
                  disabled={isDisabled}
                  onClick={this.submit}
                  color="primary"
                >
                  {<FormattedMessage {...commonMessages.submit} />}
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={openCopyEnrollment}
              onClose={()=>this.handleCopyEnrollment(false)}
              keepMounted
              TransitionComponent={Transition}
              maxWidth="xs"
              fullWidth={true}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="form-dialog-title">
                <FormattedMessage {...messages.previousYearEnrollmentData} /> 
                {yearList.map((data)=>{
                  if( data['id'] == year){
                    return data["start_date"].substr(0,4) + ' - ' +  data["end_date"].substr(0,4)
                  }
                })}
              </DialogTitle>
              <hr />
              <DialogContent>
                <Box>
                  <Box>
                    <Dropdown
                      data={yearList.filter((item) => item.id !== year)}
                      name="from_academic_year"
                      value={fromAcademicYear}
                      onChange={this.onChangeFromAcademic}
                      label="Copy From Academic Year"
                      hideSelect={true}
                    />
                  </Box>
                  <Box mt={4}>
                     <MultipleSelectDropdown
                      data_list={standardList}
                      selected_list={selectedStandardFromAcademicYear}
                      label={`Select Standard in ${
                        (() => {
                          const matched = yearList.find(data => data.id == year);
                          return matched ? `${matched.start_date.substr(0,4)} - ${matched.end_date.substr(0,4)}` : '';
                        })()
                      }`}
                      onChange={(e) => this.onChangeFromAcademicStandard(e)}
                    />
                  </Box>
                  { fromAcademicYear ? 
                    <Box mt={2} style={{color:'orange'}}>
                      Enrollment data will be copied from the selected academic year &nbsp;
                      {yearList.map((data)=>{
                        if( data['id'] == fromAcademicYear){
                          return data["start_date"].substr(0,4) + ' - ' +  data["end_date"].substr(0,4)
                        }
                      })}
                      &nbsp; to the chosen standards in the academic year  {yearList.map((data)=>{
                        if( data['id'] == year){
                          return data["start_date"].substr(0,4) + ' - ' +  data["end_date"].substr(0,4)
                        }
                      })} <br/>
                      Note : Only Unenrolled student data will be affected
                    </Box>
                  : <></>}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={()=>this.handleCopyEnrollment(false)} color="secondary">
                  {<FormattedMessage {...commonMessages.close} />}
                </Button>
                <Button
                  disabled={isDisabled}
                  onClick={this.submitCopyEnrollmentData}
                  color="primary"
                >
                  {<FormattedMessage {...commonMessages.submit} />}
                </Button>
              </DialogActions>
            </Dialog>

            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={snackbar}
              autoHideDuration={10000}
              onClose={()=>this.handleCopyEnrollment(false)}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>
          </Paper>
        </>
      );
    }
  }
}

export default FastEnrollment;

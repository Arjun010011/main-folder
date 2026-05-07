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
} from "@material-ui/core";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
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

class AttendanceBatchStudent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      year: "",
      yearList: [],
      standardList: [],
      standard: "",
      batchList: [],
      batch: 0,
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
              name="Enroll"
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
      selectedStandardFromAcademicYear : 0,
      batchMode: "section",
      subjectList: [],
      subject: 0,
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
        name: "attendance_batch_name",
        label: "Attendance Batch Name",
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
    this.setState({ loading: true });
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        this.setState({
          standardList,
          loading: false,
          standard: "",
          batch: "",
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
        { [name]: value, batch: 0, studentList, tabDisabled: false },
        () => {
          this.getSubjects();
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
    let url = GET_URL.getstudentsforbatch.api;
    if (selectedTab === "enrolled") {
      url = GET_URL.getbatchstudents.api;
    }
    const params = { academic_year: year, standard };
    this.setState({ tableUpdated: false, loadingData: true });
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const data = response.data.data;
        const batchList = data.sections;
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
          batchList,
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

  onChangeBatch = (e) => {
    let value = e.target.value;
    // eslint-disable-next-line no-unused-vars
    for (const sectionData of this.state.batchList) {
      if (value !== 0 && sectionData.id === value) {
        this.setState({ batch: value, sectionData });
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
    if (!sectionData.id) {
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
      attendance_batch: sectionData.id,
      student_list: selectedStudentList.map((data) => data.id),
    };
    if (this.state.batchMode === "subject") {
      payload.subject = this.state.subject;
    }
    let url = POST_URL.attendancebatchstudentmapping.api;
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


  handleClose = () => this.setState({ snackbar: false });

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
      batch: null,
      sectionData: {},
    });
  };

  getSubjects = () => {
    const params = { academic_year: this.state.year, standard: this.state.standard };
    getRequest(GET_URL.getAssignSubject.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({ subjectList: response.data.data });
      }
    });
  };
  

  render() {
    const {
      loading,
      yearList,
      year,
      standardList,
      standard,
      batchList,
      selectedTab,
      batch,
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
    } = this.state;

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
                        Assign Student To Batch
                      </Box>
                    </Box>
                  </Box>
                  <Box className="enroll-dropdown-item w-100 text-align-right mt-10">
                    <ToggleButtonGroup
                      size="small"
                      value={this.state.batchMode}
                      exclusive
                      onChange={(e, val) => this.setState({ batchMode: val })}
                    >
                      <ToggleButton value="section">Section Wise</ToggleButton>
                      <ToggleButton value="subject">Subject Wise</ToggleButton>
                    </ToggleButtonGroup>
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
                    {this.state.batchMode === "subject" && (
                      <Box className="enroll-dropdown-item">
                        <Dropdown
                          data={this.state.subjectList}
                          name="subject"
                          value={this.state.subject}
                          onChange={this.onChangeSubject}
                          label="Subject"
                          hideSelect={true}
                        />
                      </Box>
                    )}
                  </Box>
                </Grid>
                <Grid item sm={12}>
                  <Box className="mb-10 w-100 text-align-right">
                    <ToggleButtonGroup
                      size="small"
                      value={selectedTab}
                      exclusive
                      onChange={(e, val) => this.setActiveTab(val)}
                    >
                      <ToggleButton
                        value="unenrolled"
                        sx={{
                          "&.Mui-selected": {
                            backgroundColor: "#f44336", // red when selected
                            color: "white",
                            "&:hover": { backgroundColor: "#d32f2f" },
                          },
                        }}
                      >
                        Unenrolled
                      </ToggleButton>

                      <ToggleButton
                        value="enrolled"
                        sx={{
                          "&.Mui-selected": {
                            backgroundColor: "#4caf50", // green when selected
                            color: "white",
                            "&:hover": { backgroundColor: "#388e3c" },
                          },
                        }}
                      >
                        Enrolled
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Grid>
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
                Enrolling Students
                {/* <FormattedMessage {...messages.enrollingStudents} /> */}
              </DialogTitle>
              <hr />
              <DialogContent>
                <Box>
                  <Box className="enroll-block-item">
                    <Dropdown
                      data={batchList}
                      name="batch"
                      value={batch}
                      onChange={this.onChangeBatch}
                      label="Batch"
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
          </Paper>
        </>
      );
    }
  }
}

export default AttendanceBatchStudent;

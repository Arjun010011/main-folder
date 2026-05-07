import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  CircularProgress,
  TableRow,
  TableBody,
  Tooltip,
  TextField,
} from "@material-ui/core";
import {
  DialogTitle,
  FormControl,
  TextareaAutosize,
  DialogActions,
  DialogContentText,
  DialogContent,
  Dialog,
  FormHelperText,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import ExpandMoreOutlinedIcon from "@material-ui/icons/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@material-ui/icons/ExpandLessOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import WarningIcon from "@material-ui/icons/Warning";
import Swal from "sweetalert2";
import Skeleton from "@material-ui/lab/Skeleton";

import loadingBar from "images/loading.gif";
import { APPROVAL_STATUS } from "Constants";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  timeFormat,
  Alert,
  getAcademicYear,
  SetAcademicYear,
  getKeyValueMap,
  getUrlParam,
} from "Includes/functions";
import { getRequest, deleteRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class ExamMarksView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      yearList: [],
      examList: [],
      standardDropdownList: [],
      subjectList: [],
      sectionList: [],
      selectedYear: "",
      selectedExam: "",
      selectedStandard: "",
      selectedSection: "",
      error: {},
      open: false,
      alertData: "",
      blank: true,
      loadingExam: false,
      loading: true,
      isExpand: false,
      isExpanded: false,
      standardList: [],
      blankData: "Select academic year,Term, Exam and expect the result",
      approvalStatus: {},
      reasonOpen: false,
      reason: "",
      examTermList: [],
      selectedTerm: "",
      loadingExamGet: false,
    };
  }

  async componentDidMount() {
    this.getYearList();
    let { selectedExam, selectedTerm, selectedYear } = getUrlParam();
    if (selectedExam && selectedTerm && selectedYear) {
      this.setState({
        selectedExam,
        selectedTerm,
        selectedYear,
      });
    } else {
      if (getAcademicYear()) {
        let year = getAcademicYear();
        if (year !== 0) {
          this.setState({
            selectedYear: year,
            blankData: "Select Term, Exam and expect the result",
          });
        }
      } else {
        this.setState({
          pageLoading: false,
        });
      }
    }
    this.scroll();
  }

  scroll = () => {
    window.scrollTo(0, 0);
  };

  getYearList = async () => {
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        this.setState({
          yearList: response.data.data,
        });
        this.getTermList();
      }
    });
  };

  getTermList = async () => {
    const url = GET_URL.examterms.api;
    const params = { is_active: true };
    await getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          examTermList: response.data.data,
        });
        let { selectedYear, selectedTerm, selectedExam } = getUrlParam();
        if (!(selectedYear && selectedTerm && selectedExam)) {
          this.setState({
            loading: false,
          });
        } else {
          this.getExamList(selectedYear, selectedTerm);
          this.getExamStandardList(selectedExam);
        }
      }
    });
    return true;
  };

  // onChange = (e) => {
  //   let { name, value } = e.target;
  //   let { error, blank, loadingExam, selectedYear } = this.state;
  //   if (value !== 0) {
  //     if (name === "selectedYear") {
  //       SetAcademicYear(value);
  //       blank = true;
  //       this.setState({
  //         loadingExam: false,
  //         blankData: "Select Term, Exam and expect the result",
  //         selectedExam: "",
  //         selectedTerm: "",
  //         blank: true,
  //         standardList: [],
  //         examList: [],
  //       });
  //     } else if (name === "selectedTerm") {
  //       this.setState(
  //         {
  //           loadingExam: false,
  //           blankData: "Select Exam and expect the result",
  //           selectedExam: "",
  //           blank: true,
  //           standardList: [],
  //           loadingExamGet: true,
  //         },
  //         () => {
  //           this.getExamList(selectedYear, value);
  //         }
  //       );
  //     } else if (name === "selectedExam") {
  //       blank = false;
  //       loadingExam = true;
  //       this.getExamList(value);
  //     } else if (name === "selectedStandard") {
  //       blank = false;
  //       loadingExam = true;
  //       this.getExamList(value);
  //     }
  //     delete error[name];
  //     this.setState({
  //       [name]: value,
  //       blank,
  //       error,
  //       loadingExam,
  //     });
  //   }
  // };
  onChange = (e) => {
    let { name, value } = e.target;
    console.log(name, "asdfghjk", value)
    let { error, blank, loadingExam, selectedYear } = this.state;

    if (value !== 0) {
      if (name === "selectedYear") {
        SetAcademicYear(value);
        blank = true;
        this.setState({
          loadingExam: false,
          blankData: "Select Term, Exam, Standard & Section",
          selectedTerm: "",
          selectedExam: "",
          selectedStandard: "",
          selectedSection: "",
          blank: true,
          termList: [],
          examList: [],
          standardList: [],
          sectionList: [],
        });
      }
      else if (name === "selectedTerm") {
        this.setState(
          {
            loadingExam: false,
            blankData: "Select Exam, Standard & Section",
            selectedExam: "",
            selectedStandard: "",
            selectedSection: "",
            examList: [],
            standardList: [],
            sectionList: [],
            loadingExamGet: true,
            selectedTerm: value,
          },
          () => {
            this.getExamList(selectedYear, value);
          }
        );
      }
      else if (name === "selectedExam") {
        this.setState(
          {
            blankData: "Select Standard & Section",
            selectedStandard: "",
            selectedSection: "",
            standardList: [],
            sectionList: [],
            selectedExam: value,
          },
          () => {
            this.getStandardDropdownList(selectedYear, this.state.selectedTerm, value);
          }
        );
      }
      else if (name === "selectedStandard") {
        this.setState(
          {
            blankData: "Select Section",
            selectedSection: "",
            sectionList: [],
            selectedStandard: value,
          },
          () => {
            this.getExamStandardList(selectedYear, this.state.selectedTerm, this.state.selectedExam, value);
          }
        );
      }
      delete error[name];
      this.setState({
        [name]: value,
        blank,
        error,
        loadingExam,
      });
    }
  };

  getExamList = (selectedYear, term) => {
    let { examList } = this.state;
    examList = [];
    const url = GET_URL.exam.api;
    const params = { academic_year: selectedYear, is_active: true, term: term };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data.name = data.exam_type_name;
        });
        examList = response.data.data;
        this.setState({
          examList,
          loadingExamGet: false,
        });
      }
    });
  };

  getStandardDropdownList = (selectedYear, term, exam) => {
    const url = GET_URL.standardsectiondataforexam.api;
    const params = {
      academic_year: selectedYear,
      is_active: true,
      term: term,
      exam_ids: exam
    };

    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standard = response.data.map((data) => ({
          id: data.standard,
          name: data.standard_name,
        }));

        this.setState({
          standardDropdownList: standard,
          loadingExamGet: false,
        });
      }
    });
  };


  getExamStandardList = (selectedYear, term, exam, standard) => {
    let { blankData, blank } = this.state;
    const url = GET_URL.studentmarkclasssummary.api;
    const params = {
      academic_year: selectedYear,
      is_active: true,
      term: term,
      exam: exam,
      standard_id: standard,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data) {
          blank = false;
        } else {
          blankData = "Exam is not scheduled";
          blank = true;
        }
        const payload = response?.data?.data ?? [];
        const subjectList = payload[0].subject_list ?? [];
        // const payload = response?.data?.data ?? [];
        // const subjectList = payload.flatMap(s => s.subject_list || []);
        console.log(subjectList, "subjectList")
        this.setState({
          standardList: response.data.data,
          subjectList: subjectList,
          loadingExam: false,
          loading: false,
          blank,
        });
      } else {
        this.setState({
          standardList: [],
          loadingExam: false,
          blankData: response,
          blank: true,
          loading: false,
        });
      }
    });
  };

  handleClickMore = (index) => {
    this.setState({
      isExpanded: index,
    });
  };

  handleClickLess = () => {
    this.setState({
      isExpanded: "",
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  ApproveLeave = () => {
    Swal.fire({
      title: `<strong>Are you sure want to Approve</strong>`,
      text: "You won't be able to update exam!",
      type: "info",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      confirmButtonColor: "green",
      cancelButtonColor: "orange",
    }).then((result) => {
      if (result.value) {
        this.requestForApprove();
      }
    });
  };

  requestForApprove = () => {
    const { selectedExam } = this.state;
    let post_data = {
      approval_status: APPROVAL_STATUS.approved,
    };
    let url = PUT_URL.examapprove.api + selectedExam + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.getExamStandardList(selectedExam);
      }
    });
  };

  rejectPopup = () => {
    this.setState({
      reasonOpen: true,
    });
  };

  handleCloseReason = () => {
    this.setState({
      reasonOpen: false,
    });
  };

  rejectScheduledExam = () => {
    const { selectedExam, reason, error } = this.state;
    if (!reason) {
      error["reason"] = "Enter Reason";
      this.setState({
        error,
      });
      return;
    }
    let post_data = {
      approval_status: APPROVAL_STATUS.rejected,
      reason: reason,
    };
    let url = PUT_URL.examapprove.api + selectedExam + "/";
    putRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
      }
      this.handleCloseReason();
      this.getExamStandardList(selectedExam);
    });
  };

  onChangeReason = (e) => {
    let { name, value } = e.target;
    let { error } = this.state;
    delete error["reason"];
    this.setState({
      [name]: value,
      error,
    });
  };

  handleClickEnter = (standard, section) => {
    const {
      selectedExam,
      selectedTerm,
      selectedYear,
      examList,
      examTermList,
      yearList,
      selectedStandard,
      subjectList,
    } = this.state;
    let year_key_value = getKeyValueMap(yearList, "id", "name");
    let term_key_value = getKeyValueMap(examTermList, "id", "name");
    let exam_key_value = getKeyValueMap(examList, "id", "name");
    let sectionInformation = {
      selectedExam: selectedExam,
      selectedTerm: selectedTerm,
      selectedYear: selectedYear,
      selectedStandard: selectedStandard,
      standard_section_id: section.id,
      standard_name: standard.standard__name,
      section_name: section.section__name,
      year_name: year_key_value[selectedYear],
      term_name: term_key_value[selectedTerm],
      exam_name: exam_key_value[selectedExam],
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.exam_engineer_marks_enter.create.url,
      search: searchParam,
      state: {
        subjectList,
      }
    });
  };

  getShowContentMarks = (entered, total) => {
    return (
      <Box>
        <Box>Total Students : {total}</Box>
        <Box>Entered Students : {entered}</Box>
      </Box>
    );
  };

  render() {
    let {
      yearList,
      selectedYear,
      open,
      alertData,
      error,
      blank,
      loadingExam,
      examList,
      selectedExam,
      standardList,
      isExpanded,
      blankData,
      loadingExamGet,
      reasonOpen,
      reason,
      examTermList,
      standardDropdownList,
      selectedTerm,
      selectedStandard,
      loading,
      subjectList,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">Exam Marks</Box>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item md={3} xs={12} className="margin-top-20">
              <Dropdown
                data={yearList}
                name="selectedYear"
                style="width-100"
                value={selectedYear}
                onChange={this.onChange}
                label="Academic Year"
                error={error.selectedYear}
                hideSelect={true}
              />
            </Grid>
            <Grid item md={3} xs={12} className="margin-top-20">
              <Dropdown
                data={examTermList}
                name="selectedTerm"
                style="width-100"
                value={selectedTerm}
                onChange={this.onChange}
                label="Term"
                error={error.selectedTerm}
                disabled={selectedYear ? false : true}
                helperText={!selectedYear ? "Select Term" : ""}
                hideSelect={true}
              />
            </Grid>
            <Grid item md={3} xs={12} className="margin-top-20">
              {loadingExamGet ? (
                <Skeleton
                  variant="rect"
                  className="drop-down-skeleton m-t-10px"
                ></Skeleton>
              ) : (
                <Dropdown
                  data={examList}
                  name="selectedExam"
                  style="width-100"
                  value={selectedExam}
                  onChange={this.onChange}
                  label="Exam"
                  error={error.selectedExam}
                  disabled={selectedYear ? false : selectedTerm ? false : true}
                  helperText={
                    !selectedYear
                      ? "Select Academic Year"
                      : !selectedTerm
                        ? "Select Term"
                        : ""
                  }
                  hideSelect={true}
                />
              )}
            </Grid>
            <Grid item md={3} xs={12} className="margin-top-20">
              <Dropdown
                data={standardDropdownList}
                name="selectedStandard"
                style="width-100"
                value={selectedStandard}
                onChange={this.onChange}
                label="Select Standard"
                error={error.selectedStandard}
                disabled={selectedYear ? false : selectedStandard ? false : true}
                helperText={
                  !selectedYear
                    ? "Select Academic Year"
                    : !selectedStandard
                      ? "Select Standard"
                      : ""
                }
                hideSelect={true}
              />
            </Grid>
          </Grid>

          {blank && !loadingExam && <BlankPagewithIcon data={blankData} />}
          {loadingExam && (
            <Box display="flex">
              <CircularProgress className="loading" />
            </Box>
          )}
          {!loadingExam && (
            <Grid container spacing={2}>
              {standardList.map((standard, stIndex) => {
                return (
                  <Grid item xl={8} md={12} xs={12}>
                    <Paper className="schedule-add-paper" elevation={2}>
                      <Box className="schedule-add-standard-outer-box">
                        <Box className="schedule-add-standard-name">
                          {standard.standard__name}
                        </Box>
                      </Box>
                      <TableContainer className="schedule-exam-overflow">
                        <Table
                          size="small"
                          aria-label="simple table"
                          className=""
                        >
                          <TableHead>
                            <TableRow className="">
                              <TableCell className="">{`${alias_names["section"]}`}</TableCell>
                              {standard.subject_list.map((data) => {
                                return (
                                  <TableCell className="">
                                    {data.subject_name}
                                  </TableCell>
                                );
                              })}
                              {/* {isUserHasPermission(
                                "exam_marks_enter",
                                "create"
                              ) && */
                               <TableCell className="">Action</TableCell> }
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {standard.section_list.map((section, subIndex) => {
                              return (
                                <TableRow
                                  key={subIndex}
                                  className={
                                    isExpanded !== stIndex && subIndex > 2
                                      ? "display-none"
                                      : "schedule-exam-subject-name-box"
                                  }
                                >
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    <Box
                                      className="mui-table-custom-value-left-align"
                                      display="flex"
                                    >
                                      <Tooltip
                                        title={
                                          section.approval_status == 1
                                            ? "Finalized"
                                            : "Not Finalized"
                                        }
                                        enterDelay={400}
                                        enterNextDelay={400}
                                        placement="top-start"
                                        classes={{
                                          tooltip: "tooltip-show-data",
                                        }}
                                      >
                                        <Box
                                          className={
                                            section.approval_status == 1
                                              ? "application-student-list-admitted"
                                              : "application-student-list-not-admitted"
                                          }
                                        ></Box>
                                      </Tooltip>
                                      <Box>{section.section__name}</Box>
                                    </Box>
                                  </TableCell>
                                  {standard.subject_list.map((subject) => {
                                    return (
                                      <TableCell
                                        className=""
                                        component="th"
                                        scope="row"
                                      >
                                        {Boolean(
                                          section.subject_data[subject.subject]
                                        ) && (
                                            <Tooltip
                                              title={this.getShowContentMarks(
                                                section.subject_data[
                                                  subject.subject
                                                ].entered,
                                                section.subject_data[
                                                  subject.subject
                                                ].total
                                              )}
                                              enterDelay={400}
                                              enterNextDelay={400}
                                              placement="top-start"
                                              classes={{
                                                tooltip: "tooltip-show-data",
                                              }}
                                            >
                                              <Box className="pointer">
                                                {`${section.subject_data[
                                                  subject.subject
                                                ].entered
                                                  }/${section.subject_data[
                                                    subject.subject
                                                  ].total
                                                  }`}
                                              </Box>
                                            </Tooltip>
                                          )}
                                        {!Boolean(
                                          section.subject_data[subject.subject]
                                        ) && <Box>{`N/A`}</Box>}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {/* {isUserHasPermission(
                                      "exam_marks_enter",
                                      "create"
                                    ) && ( */
                                        <Button
                                          onClick={() =>
                                            this.handleClickEnter(
                                              standard,
                                              section
                                            )
                                          }
                                        >
                                          {section.approval_status == 1 ? (
                                            <Box>View Marks</Box>
                                          ) : (
                                            <Box>Enter Marks</Box>
                                          )}
                                        </Button>
                                      }
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          {isExpanded !== stIndex &&
                            standard.section_list.length > 3 && (
                              <Tooltip
                                title="Expand More"
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <Box className="view-exam-expand-icon-box">
                                  <ExpandMoreOutlinedIcon
                                    className="view-exam-expand-icon"
                                    onClick={() =>
                                      this.handleClickMore(stIndex)
                                    }
                                  />
                                </Box>
                              </Tooltip>
                            )}
                          {isExpanded === stIndex &&
                            standard.section_list.length > 3 && (
                              <Tooltip
                                title="Expand Less"
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <Box className="view-exam-expand-icon-box">
                                  <ExpandLessOutlinedIcon
                                    className="view-exam-expand-icon"
                                    onClick={() => this.handleClickLess()}
                                  />
                                </Box>
                              </Tooltip>
                            )}
                        </Table>
                      </TableContainer>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
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
          <Dialog
            className="schedule-reject-popup"
            open={reasonOpen}
            onClose={this.handleCloseReason}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title"></DialogTitle>
            <DialogContent>
              <DialogContentText>Enter Reject Reason</DialogContentText>
              <FormControl
                fullWidth
                error={error.reason && (error.reason ? true : false)}
              >
                <Box className="leave-pending-staff-label">Reason</Box>
                <TextareaAutosize
                  aria-label="minimum height"
                  className="apply-leave-text-area-auto-size-reason"
                  value={reason}
                  name="reason"
                  onChange={this.onChangeReason}
                  required
                />
                {error.reason && (
                  <FormHelperText>{error.reason}</FormHelperText>
                )}
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Box className="leave-pending-approve-reject">
                <Button
                  className="apply-leave-reset-button"
                  onClick={(e) => this.rejectScheduledExam()}
                >
                  Reject
                </Button>
                <Button
                  className="apply-leave-button "
                  onClick={(e) => this.handleCloseReason()}
                >
                  Close
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
        </Paper>
      );
    }
  }
}
export default withRouter(ExamMarksView);

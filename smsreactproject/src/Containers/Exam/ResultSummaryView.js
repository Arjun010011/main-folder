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
  Icon,
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
import classNames from "classnames";
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

const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_result_config_wise =
  exam_config?.["resultannouncmentconfigurationwise"] ?? "2";
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class ResultSummaryView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yearList: [],
      examList: [],
      selectedYear: "",
      selectedExam: "",
      error: {},
      open: false,
      alertData: "",
      blank: true,
      loadingExam: false,
      loading: true,
      isExpand: false,
      isExpanded: false,
      standardList: [],
      standardNameList: [],
      blankData: "Select academic year,Term, Exam and expect the result",
      approvalStatus: {},
      reasonOpen: false,
      reason: "",
      examTermList: [],
      selectedTerm: "",
      is_term_wise: true,
      loadingExamGet: false,
      loadingStandardGet: false,
      currentTab: is_result_config_wise == 1 ? "examConfig" : "exam",
    };
  }

  async componentDidMount() {
    this.getYearList();
    let { selectedExam, selectedTerm, selectedYear, currentTab } =
      getUrlParam();
    if ((selectedExam && selectedTerm && selectedYear, currentTab)) {
      this.setState({
        selectedExam,
        selectedTerm,
        selectedYear,
        currentTab:
          currentTab === "examConfig"
            ? is_result_config_wise == 1
              ? "examConfig"
              : currentTab
            : currentTab,
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
        let { selectedYear, selectedTerm, selectedExam, currentTab } =
          getUrlParam();
        if (selectedYear && selectedTerm && currentTab) {
          if (currentTab == "term") {
            this.setState({ currentTab }, () => {
              this.getStandardListForTerm(selectedYear, selectedTerm);
            });
          } else {
            this.getExamList(selectedYear, selectedTerm);
            this.getStandardListForTerm(
              selectedYear,
              selectedTerm,
              selectedExam
            );
          }
        } else {
          this.setState({
            loading: false,
          });
        }
      }
    });
    return true;
  };

  onChange = (e) => {
    let { name, value } = e.target;
    let { error, blank, loadingExam, selectedYear, currentTab, selectedTerm } =
      this.state;
    if (value !== 0) {
      this.setState({ [name]: value }, () => {
        if (name === "selectedYear") {
          SetAcademicYear(value);
          this.setState({
            loadingExam: false,
            blankData: "Select Exam and expect the result",
            selectedExam: "",
            selectedTerm: "",
            blank: true,
            standardList: [],
          });
        } else if (name === "selectedTerm") {
          this.setState(
            {
              blankData:
                currentTab === "term"
                  ? "Select Standard and expect the result"
                  : "Select Exam and expect the result",
              selectedExam: "",
              blank: true,
              standardList: [],
              loadingExamGet: true,
            },
            () => {
              if (currentTab === "term") {
                this.getStandardListForTerm(selectedYear, value);
                //   this.getExamList(selectedYear, value);
              } else if (currentTab === "exam" || currentTab === "examConfig") {
                this.getExamList(selectedYear, value);
              }
            }
          );
        } else if (name === "selectedExam") {
          // blank = false;
          // loadingExam = true;
          this.getStandardListForTerm(selectedYear, selectedTerm, value);
          delete error[name];
          this.setState({
            blank,
            error,
            loadingExam,
          });
        } else if (name === "selectedStandard") {
          blank = false;
          loadingExam = true;
          this.getExamStandardList(value);
          delete error[name];
          this.setState({
            blank,
            error,
            loadingExam,
          });
        }
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

  getStandardListForTerm = (selectedYear, term, exam) => {
    this.setState({ loadingStandardGet: true });
    const url = GET_URL.standardsectiondataforexam.api;
    const params = {
      academic_year: selectedYear,
      is_active: true,
      term: term,
      exam_ids: exam,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          standardNameList: response.data,
          loadingStandardGet: false,
          loading: false,
        });
      }
    });
  };

  getExamConfigList = (selectedYear, term) => {
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

  getExamStandardList = (selectedStandard) => {
    let {
      blankData,
      blank,
      selectedTerm,
      currentTab,
      selectedYear,
      selectedExam,
    } = this.state;
    let url = GET_URL.announceresultconfig.api;
    let param = {
      is_active: true,
      academic_year: selectedYear,
      term: selectedTerm,
      standard: selectedStandard,
    };
    if (currentTab === "exam") {
      url = GET_URL.announceresult.api;
      param = {
        is_active: true,
        exam: selectedExam,
        standard: selectedStandard,
      };
    } else if (currentTab === "examConfig") {
      url = GET_URL.announceexamresultconfig.api;
      param = {
        is_active: true,
        exam: selectedExam,
        standard: selectedStandard,
      };
    }
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data && response.data.data.length > 0) {
          blank = false;
        } else {
          blankData = "Exam is not scheduled";
          blank = true;
        }
        this.setState({
          standardList: response.data.data,
          loadingExam: false,
          loading: false,
          blank,
          blankData,
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
      currentTab,
    } = this.state;
    let year_key_value = getKeyValueMap(yearList, "id", "name");
    let term_key_value = getKeyValueMap(examTermList, "id", "name");
    let exam_key_value = getKeyValueMap(examList, "id", "name");
    let sectionInformation = {
      configId: section?.exam_result_config_id,
      selectedExam: selectedExam,
      selectedTerm: selectedTerm,
      selectedYear: selectedYear,
      standard_section_id: section.standard_section,
      standard_name: standard.standard_name,
      section_name: section.section_name,
      year_name: year_key_value[selectedYear],
      term_name: term_key_value[selectedTerm],
      exam_name: exam_key_value[selectedExam],
      currentTab: currentTab,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.exam_result_individual.view.url,
      search: searchParam,
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

  changeTab = (value) => {
    let {
      standardList,
      selectedYear,
      selectedExam,
      selectedTerm,
      blank,
      standardNameList,
      selectedStandard,
    } = this.state;
    if (value === "exam" || value === "examConfig") {
      standardList = [];
      standardNameList = [];
      selectedExam = "";
      selectedStandard = "";
      blank = true;
      if (selectedTerm) {
        this.getExamList(selectedYear, selectedTerm);
      }
    }
    this.setState(
      {
        currentTab: value,
        standardList,
        selectedExam,
        standardNameList,
        selectedStandard,
        blank,
      },
      () => {
        if (selectedTerm && value === "term") {
          this.setState({ loadingStandardGet: true }, () => {
            this.getStandardListForTerm(selectedYear, selectedTerm);
          });
        }
      }
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
      standardNameList,
      isExpanded,
      blankData,
      loadingExamGet,
      loadingStandardGet,
      selectedStandard,
      reason,
      examTermList,
      selectedTerm,
      loading,
      is_term_wise,
      exam_wise,
      currentTab,
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
          <Box className="heading">Result Summary</Box>
          <Grid container>
            <Grid item md={8} xs={12} className="leave-manage-space-around">
              {is_result_config_wise != 1 && (
                <Box
                  className={
                    currentTab === "exam"
                      ? "leave-management-selected-heading"
                      : "leave-management-heading"
                  }
                  onClick={() => this.changeTab("exam")}
                >
                  Exam Result
                  {currentTab === "exam" && (
                    <Box className="leave-management-selected-heading-underline" />
                  )}
                </Box>
              )}
              {is_result_config_wise != 0 && (
                <Box
                  className={
                    currentTab === "examConfig"
                      ? "leave-management-selected-heading"
                      : "leave-management-heading"
                  }
                  onClick={() => this.changeTab("examConfig")}
                >
                  Exam Configuration Result
                  {currentTab === "examConfig" && (
                    <Box className="leave-management-selected-heading-underline" />
                  )}
                </Box>
              )}
              <Box
                className={
                  currentTab === "term"
                    ? "leave-management-selected-heading"
                    : "leave-management-heading"
                }
                onClick={() => this.changeTab("term")}
              >
                Term Result
                {currentTab === "term" && (
                  <Box className="leave-management-selected-heading-underline" />
                )}
              </Box>
            </Grid>
          </Grid>
          <hr style={{ marginTop: "-4px" }} />

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
            {(currentTab === "exam" || currentTab === "examConfig") && (
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
                    disabled={
                      selectedYear ? false : selectedTerm ? false : true
                    }
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
            )}
            <Grid item md={3} xs={12} className="margin-top-20">
              {loadingStandardGet ? (
                <Skeleton
                  variant="rect"
                  className="drop-down-skeleton m-t-10px"
                ></Skeleton>
              ) : (
                <Dropdown
                  data={standardNameList}
                  name="selectedStandard"
                  style="width-100"
                  value={selectedStandard}
                  onChange={this.onChange}
                  label="Standard"
                  error={error.selectedStandard}
                  disabled={selectedTerm ? false : true}
                  helperText={
                    !selectedYear
                      ? "Select Academic Year"
                      : !selectedTerm
                      ? "Select Term"
                      : !selectedStandard
                      ? "Select Standard"
                      : ""
                  }
                  hideSelect={true}
                  customId="standard"
                  customName="standard_name"
                />
              )}
            </Grid>
          </Grid>
          {blank && !loadingExam && <BlankPagewithIcon data={blankData} />}
          {loadingExam && (
            <Box display="flex">
              <CircularProgress className="loading" />
            </Box>
          )}
          {!loadingExam && !blank && (
            <Grid container spacing={2}>
              {standardList.map((standard, stIndex) => {
                return (
                  <Grid item xl={8} md={12} xs={12}>
                    <Paper className="schedule-add-paper" elevation={2}>
                      <Box className="schedule-add-standard-outer-box">
                        <Box className="schedule-add-standard-name">
                          {standard.standard_name}
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
                              <TableCell className="" align="center">
                                Total
                              </TableCell>
                              <TableCell className="" align="center">
                                Passed
                              </TableCell>
                              <TableCell className="" align="center">
                                Failed
                              </TableCell>
                              <TableCell className="" align="center">
                                Result Announced
                              </TableCell>
                              {isUserHasPermission(
                                "exam_result_individual",
                                "view"
                              ) && (
                                <TableCell className="" align="center">
                                  Action
                                </TableCell>
                              )}
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
                                    <Box>{section.section_name}</Box>
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    align="center"
                                    scope="row"
                                  >
                                    <Box>{section.result_data.total}</Box>
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    align="center"
                                    scope="row"
                                  >
                                    <Box>{section.result_data.pass}</Box>
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    align="center"
                                    scope="row"
                                  >
                                    <Box>{section.result_data.fail}</Box>
                                  </TableCell>
                                  {currentTab === "term" ? (
                                    <TableCell
                                      className=""
                                      component="th"
                                      align="center"
                                      scope="row"
                                    >
                                      {section.is_announced &&
                                        section.isapproved && (
                                          <Box>Announced</Box>
                                        )}
                                      {!section.is_announced && (
                                        <Box>Not Announced</Box>
                                      )}
                                    </TableCell>
                                  ) : (
                                    <TableCell
                                      className=""
                                      component="th"
                                      align="center"
                                      scope="row"
                                    >
                                      {((currentTab === "examConfig" &&
                                        section.is_announced) ||
                                        (currentTab !== "examConfig" &&
                                          section.result_data?.is_announced ==
                                            1)) && <Box>Announced</Box>}
                                      {((currentTab === "examConfig" &&
                                        !section.is_announced) ||
                                        (currentTab !== "examConfig" &&
                                          !section.result_data
                                            ?.is_announced)) && (
                                        <Box>Not Announced</Box>
                                      )}
                                    </TableCell>
                                  )}
                                  {isUserHasPermission(
                                    "exam_result_individual",
                                    "view"
                                  ) && currentTab === "term" ? (
                                    <TableCell
                                      className=""
                                      component="th"
                                      align="center"
                                      scope="row"
                                    >
                                      <Button>
                                        {section.isapproved ? (
                                          <Box
                                            onClick={() =>
                                              this.handleClickEnter(
                                                standard,
                                                section
                                              )
                                            }
                                          >
                                            View Result
                                          </Box>
                                        ) : (
                                          <Tooltip
                                            title={section.approval_error}
                                            enterDelay={400}
                                            enterNextDelay={400}
                                            placement="top-start"
                                            classes={{
                                              tooltip: "tooltip-show-data",
                                            }}
                                          >
                                            <Box>Marks Not Finalized</Box>
                                          </Tooltip>
                                        )}
                                      </Button>
                                    </TableCell>
                                  ) : (
                                    <TableCell
                                      className=""
                                      component="th"
                                      align="center"
                                      scope="row"
                                    >
                                      <Button>
                                        {((currentTab === "examConfig" &&
                                          section.approval_status == 0) ||
                                          section.status == false) && (
                                          <Tooltip
                                            title={section.reason}
                                            enterDelay={400}
                                            enterNextDelay={400}
                                            placement="top-start"
                                            classes={{
                                              tooltip: "tooltip-show-data",
                                            }}
                                          >
                                            <Box>Marks Not Finalized</Box>
                                          </Tooltip>
                                        )}
                                        {((currentTab === "examConfig" &&
                                          section.approval_status == 1) ||
                                          section.status == true) && (
                                          <Box
                                            onClick={() =>
                                              this.handleClickEnter(
                                                standard,
                                                section
                                              )
                                            }
                                          >
                                            View Result
                                          </Box>
                                        )}
                                      </Button>
                                    </TableCell>
                                  )}
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
        </Paper>
      );
    }
  }
}
export default withRouter(ResultSummaryView);

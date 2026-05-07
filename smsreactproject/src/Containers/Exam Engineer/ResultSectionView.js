import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Tooltip,
  TextField,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import { Prompt } from "react-router";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { isEmpty } from "lodash";

import loadingBar from "images/loading.gif";
import ResultExamWiseIndividual from "Containers/Exam/components/ResultExamWiseIndividual";
import ResultTermWiseIndividual from "Containers/Exam/components/ResultTermWiseIndividual";
import ResultExamConfigWise from "Containers/Exam/components/ResultExamConfigWise";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import { getFullName, Alert, getUrlParam } from "Includes/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import "./styles.scss";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class ResultSectionView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      alertData: "",
      blank: false,
      loading: true,
      loadingExam: false,
      isExpand: false,
      isExpanded: false,
      markDetails: { subject_list: [], student_list: [] },
      blankData: "",
      fieldError: {},
      searchStudent: "",
      student_list: [],
      subjectList: [],
      all_student_list: [],
      selectedSubjectDropdown: [],
      is_mark_result: false,
      submitDisable: false,
      is_announced: false,
      selectedFilter: "all",
      is_submit_enable: false,
      is_announce_result: true,
      isPrompt: false,
      download_details: { column: [], values: [] },
      alias_names: JSON.parse(localStorage.getItem("alias_name")),
      isAnnouncedUpdates: {}
    };
  }

  async componentDidMount() {
    let {
      selectedExam,
      selectedTerm,
      selectedYear,
      year_name,
      term_name,
      exam_name,
      standard_section_id,
      standard_name,
      section_name,
      currentTab,
      configId,
    } = getUrlParam();
    if (
      (currentTab &&
        selectedTerm &&
        selectedYear &&
        year_name &&
        term_name &&
        standard_section_id &&
        standard_name &&
        section_name) ||
      (selectedExam &&
        selectedTerm &&
        selectedYear &&
        year_name &&
        term_name &&
        exam_name &&
        standard_section_id &&
        standard_name &&
        section_name &&
        !currentTab)
    ) {
      this.setState(
        {
          selectedExam,
          selectedTerm,
          selectedYear,
          standard_section_id,
          standard_name,
          section_name,
          year_name,
          term_name,
          exam_name,
          currentTab,
          configId,
          loading: true,
        },
        () => {
          this.getExamMarkDetails();
        }
      );
    } else {
      this.props.history.push(Actions.exam_result_summary.view.url);
    }
  }

  scroll = () => {
    window.scrollTo(0, 0);
  };

  getExamMarkDetails = () => {
    const {
      selectedExam,
      standard_section_id,
      currentTab,
      selectedTerm,
      selectedYear,
      configId,
    } = this.state;
    let url = "";
    let param = {};
    if (currentTab === "term") {
      url = GET_URL.studentmarkresultconfig.api;
      param = {
        academic_year: selectedYear,
        term: selectedTerm,
        standard_section: standard_section_id,
      };
    } else if (currentTab === "exam") {
      url = GET_URL.studentmark.api;
      param = {
        is_active: true,
        exam: selectedExam,
        standard_section: standard_section_id,
      };
    } else if (currentTab === "examConfig") {
      url = GET_URL.announceexamresultconfig.api + configId + "/";
      param = {
        is_active: true,
        exam: selectedExam,
        standard_section: standard_section_id,
      };
    }
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.subject_list.map((data) => {
          data.name = data.subject_name;
          data.value = data.subject;
          data.id = data.subject;
          if (data.cumulative_data) {
            data.cumulative_data.map((cum_data) => {
              cum_data["names"] = this.getCumulativeNames(
                cum_data.cumulative_type_data
              );
            });
          }
        });
        let mark_details = []; 
        let mark_details_columns = [];
        let mark_details_temp = {};
        mark_details_columns.push("student");
        response.data.data.student_list.map((student_data) => {
          mark_details_temp = {};
          student_data["student_name"] = getFullName(
            student_data.first_name,
            student_data.middle_name,
            student_data.last_name
          );
          mark_details_temp["student"] = student_data["student_name"];
          response.data.data.subject_list.map((data) => {
            if (
              data.cumulative_data &&
              data.cumulative_data.length > 0 &&
              data.subject_part_type_id == 1
            ) {
              data.cumulative_data.map((cumData) => {
                mark_details_temp[`${data["name"]}-${cumData.names}`] = "";
                if (
                  !mark_details_columns.includes(
                    `${data["name"]}-${cumData.names}`
                  )
                ) {
                  mark_details_columns.push(`${data["name"]}-${cumData.names}`);
                }
              });
            }
            if (student_data.subject_list) {
              Object.keys(student_data.subject_list).map((subData) => {
                if (subData == data["subject"]) {
                  if (student_data.subject_list[subData].cumulative_data) {
                    student_data.subject_list[subData].cumulative_data.map(
                      (cum_data) => {
                        if (
                          !isEmpty(
                            student_data.subject_list[subData]
                              .cumulative_marks_data
                          )
                        ) {
                          student_data.subject_list[
                            subData
                          ].cumulative_marks_data.map((mark_data) => {
                            if (cum_data.id == mark_data.exam_cumulative_id) {
                              cum_data["marks"] =
                                mark_data?.obtained_marks ?? mark_data.marks;
                              cum_data["exam_cumulative_id"] = mark_data.id;
                              if (
                                student_data.subject_list[subData][
                                  "subject_part_type_id"
                                ] === 1
                              ) {
                                mark_details_temp[
                                  `${data["name"]}-${this.getCumulativeNamesStu(
                                    mark_data.cumulative_data_mapping
                                  )}`
                                ] =
                                  mark_data?.obtained_marks ?? mark_data.marks;
                              }
                            }
                          });
                        }
                      }
                    );
                  }
                  student_data.subject_list[subData]["total_marks"] =
                    this.updateSubjectTotalMarks(
                      student_data.subject_list[subData]
                    );
                  if (
                    student_data.subject_list[subData][
                      "subject_part_type_id"
                    ] === 1
                  ) {
                    if (
                      !mark_details_columns.includes(`${data["name"]}-Written`)
                    ) {
                      mark_details_columns.push(`${data["name"]}-Written`);
                    }
                    if (
                      !mark_details_columns.includes(`${data["name"]}-Total`)
                    ) {
                      mark_details_columns.push(`${data["name"]}-Total`);
                    }
                    if (
                      !mark_details_columns.includes(`${data["name"]}-Grade`)
                    ) {
                      mark_details_columns.push(`${data["name"]}-Grade`);
                    }
                    mark_details_temp[`${data["name"]}-Written`] =
                      student_data.subject_list[subData]?.marks ?? 0;
                    mark_details_temp[`${data["name"]}-Total`] =
                      this.updateSubjectTotalMarks(
                        student_data.subject_list[subData]
                      );
                    mark_details_temp[`${data["name"]}-Grade`] =
                      student_data.subject_list[subData]?.grade;
                  }
                }
              });
            }
          });
          mark_details_temp["total_marks"]=student_data?.part_type_data_code_wise?.part1?.total_marks
          mark_details_temp["percentage"]=student_data?.part_type_data_code_wise?.part1?.percentage
          mark_details_temp["grade"]=student_data?.part_type_data_code_wise?.part1?.grade
          mark_details_temp["obtained_marks"]=student_data?.part_type_data_code_wise?.part1?.total_obtained_marks
          mark_details_temp["percentage"] =
            Math.round(mark_details_temp["percentage"] * 10) / 10;
          mark_details.push(mark_details_temp);
        });
        mark_details_columns.push("total_marks");
        mark_details_columns.push("obtained_marks");
        mark_details_columns.push("percentage");
        mark_details_columns.push("grade");
        if (response.data.part_type_list) {
          response.data.data.part_type_list = response.data.part_type_list;
        }
        this.setState({
          markDetails: response.data.data,
          all_student_list: response.data.data.student_list,
          selectedSubjectDropdown: response.data.data.subject_list,
          blank: false,
          is_announced: response.data.data.is_announced,
          is_mark_result: false,
          isPrompt: false,
          loading: false,
          download_details: {
            columns: mark_details_columns,
            values: mark_details,
          },
        });
      } else {
        this.setState({
          markDetails: { subject_list: [], student_list: [] },
          blankData: response,
          blank: true,
          loading: false,
        });
      }
    });
  };

  getCumulativeNames = (data_list) => {
    let return_data = [];
    data_list.map((data) => {
      return_data.push(data["name"]);
    });
    return return_data.join(", ");
  };

  getCumulativeNamesStu = (data_list) => {
    let return_data = [];
    data_list.map((data) => {
      return_data.push(data?.["alias"] ?? data["cumulative_type_name"]);
    });
    return return_data.join(", ");
  };

  updateSubjectTotalMarks = (data, isMarksOnly) => {
    let return_marks = 0;
    if (
      !isMarksOnly &&
      data.attendance_status === "Absent" &&
      (!data.cumulative_data ||
        (data.cumulative_data && data.cumulative_data.length === 0))
    ) {
      return_marks = "Ab";
    } else {
      if (data.marks && data.attendance_status !== "Absent") {
        return_marks = parseFloat(data.marks);
      }
      if (data.cumulative_data) {
        data.cumulative_data.map((cum_data) => {
          if (cum_data.marks) {
            return_marks = parseFloat(cum_data.marks) + return_marks;
          }
        });
      }
    }
    return return_marks;
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  onchangeSubject = (e) => {
    this.setState({
      selectedSubjectDropdown: e,
    });
  };

  goToViewPage = () => {
    const { selectedExam, selectedTerm, selectedYear, currentTab } = this.state;
    let sectionInformation = {
      selectedExam: selectedExam,
      selectedTerm: selectedTerm,
      selectedYear: selectedYear,
      currentTab: currentTab,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.exam_result_summary.view.url,
      search: searchParam,
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { markDetails, all_student_list } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = all_student_list.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      markDetails.student_list = filterList;
    } else {
      markDetails.student_list = [...all_student_list];
      filterList = [];
    }
    this.setState({
      [name]: value,
      markDetails,
      filterList,
    });
  };

  handleMarkPassOrFail = () => {
    let { is_mark_result } = this.state;
    if (is_mark_result) {
      this.setState({ loading: true }, () => {
        this.getExamMarkDetails();
      });
    } else {
      this.setState({ is_mark_result: !is_mark_result });
    }
  };

  handleChange = (e, stIndex) => {
    let { name, value } = e.target;
    let { markDetails } = this.state;
    markDetails.student_list[stIndex][name] = value;
    this.setState({
      markDetails,
      is_submit_enable: true,
      isPrompt: true,
    });
  };

  onChangeFilter = (name) => {
    let filterList;
    let { markDetails, all_student_list } = this.state;
    if (name !== "all") {
      let lowerCasedFilter = name.toLowerCase().replace(/\s+/g, "");
      filterList = all_student_list.filter((item) => {
        return (
          item["total_result"] &&
          item["total_result"]
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(lowerCasedFilter)
        );
      });
      markDetails.student_list = filterList;
    } else {
      markDetails.student_list = [...all_student_list];
      filterList = [];
    }
    this.setState({
      selectedFilter: name,
      markDetails,
    });
  };

  submitAndFinalize = () => {
    return Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to change result!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Announce it!",
    }).then(async (result) => {
      if (result.value) {
        this.announceResult();
      }
    });
  };

  validationAnnounceResultPostData = () => {
    let { markDetails, currentTab, selectedExam, standard_section_id } =
      this.state;
    let return_data = { status_list: [] };
    return_data["standard_section"] = standard_section_id;
    if (currentTab === "term") {
      return_data["result_config"] = markDetails.configuration_details.id;
    } else if (currentTab === "exam") {
      return_data["exam"] = selectedExam;
    } else if (currentTab === "examConfig") {
      return_data["exam_result_configuration_ids"] = [
        markDetails.exam_result_config_id,
      ];
      return_data["announce_without_notification"] = true;
    }
    if (currentTab !== "examConfig") {
      let key = {};
      markDetails.student_list.map((student, sIndex) => {
        key = {};
        key["student"] = student.student;
        return_data.status_list.push(key);
      });
    }
    return return_data;
  };

  announceResult = () => {
    let { currentTab } = this.state;
    let post_data = this.validationAnnounceResultPostData();
    if (post_data) {
      this.setState({ submitDisable: true });
      let url = "";
      if (currentTab === "term") {
        url = POST_URL.announceresultconfig.api;
      } else if (currentTab === "exam") {
        url = POST_URL.announceresult.api;
      } else if (currentTab === "examConfig") {
        url = POST_URL.announceexamresultconfig.api;
      }
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState(
            {
              isPrompt: false,
            },
            () => {
              this.goToViewPage();
            }
          );
        }
        this.setState({ submitDisable: false });
      });
    } else {
      this.setState({
        open: true,
        alertData: "Please clear the errors",
      });
    }
  };

  validationAndPostData = () => {
    let { markDetails, currentTab, selectedExam } = this.state;
    let return_data = { status_list: [] };
    if (currentTab === "term") {
      return_data["result_config"] = markDetails.configuration_details.id;
    } else if (currentTab === "exam") {
      return_data["exam"] = selectedExam;
    }
    let key = {};
    markDetails.student_list.map((student, sIndex) => {
      key = {};
      key["status"] = student.total_result;
      key["student"] = student.student;
      return_data.status_list.push(key);
    });
    return return_data;
  };

  submitResult = () => {
    let post_data = this.validationAndPostData();
    if (post_data) {
      this.setState({ submitDisable: true });
      let url = POST_URL.examstatusupdate.api;
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState(
            {
              isPrompt: false,
            },
            () => {
              this.goToViewPage();
            }
          );
        }
        this.setState({ submitDisable: false });
      });
    } else {
      this.setState({
        open: true,
        alertData: "Please clear the errors",
      });
    }
  };

  handleIsAnnouncedChangePerStudent = (value, stIndex) => {
    const updatedValue = value === "Yes" ? 1 : 0;
    const { markDetails, isAnnouncedUpdates } = this.state;
  
    markDetails.student_list[stIndex].is_announced = updatedValue;
    let student_id = markDetails.student_list[stIndex]['student']
    this.setState({
      markDetails,
      isPrompt: true,
      is_submit_enable: true,
      isAnnouncedUpdates: {
        ...isAnnouncedUpdates,
        [student_id]: {
          student_id,
          is_announced: updatedValue,
        },
      },
    });
  };
  

  submitIsAnnouncedUpdates = (updates) => {
    const formattedData = Object.entries(updates).map(([_, { student_id, is_announced }]) => ({
      student_id,
      is_announced,
    }));
  
    const url = POST_URL.announceresult.api; // Replace with actual URL
      postRequest(url, { updates: formattedData, exam: parseInt(this.state.selectedExam), standard_section: parseInt(this.state.standard_section_id)}, this.props).then((response) => {
      if (response?.status === 200) {
        Swal.fire("Updated!", "Announcement statuses updated.", "success");
        // Optional: refresh data
        this.getExamMarkDetails();
        this.setState({ isAnnouncedUpdates: {} });
      } else {
        Swal.fire("Error", "Failed to update announcements", "error");
      }
    });
  };

  render() {
    let {
      open,
      alertData,
      is_mark_result,
      blank,
      blankData,
      is_announced,
      markDetails,
      searchStudent,
      reason,
      selectedSubjectDropdown,
      submitDisable,
      year_name,
      term_name,
      standard_name,
      exam_name,
      section_name,
      loading,
      selectedFilter,
      download_details,
      isPrompt,
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
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">
                {currentTab === "term" && <div>Term Result</div>}
                {currentTab === "exam" && <div>Exam Result</div>}
                {currentTab === "examConfig" && (
                  <div>Exam Configuration Result</div>
                )}
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                <Button
                  variant="contained"
                  onClick={this.goToViewPage}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.exam_result_summary.view.label}
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box className="md-down-justify-start md-up-justify-start mb-y-20">
            <Box className="year-std-box mr-40">
              <Box className="academic-std-head"> Academic Year</Box>
              <Box className=" exam-mark-add-heading-bg">{year_name}</Box>
              <Box className="exam-mark-heading-box"> Term</Box>
              <Box className=" exam-mark-add-heading-bg">{term_name}</Box>
              {(currentTab === "exam" || currentTab === "examConfig") && (
                <Box className="exam-mark-heading-box"> Exam</Box>
              )}
              {(currentTab === "exam" || currentTab === "examConfig") && (
                <Box className=" exam-mark-add-heading-bg">{exam_name}</Box>
              )}
              <Box className="exam-mark-heading-box">{`${alias_names["standard"]}`}</Box>
              <Box className=" exam-mark-add-heading-bg">{standard_name}</Box>
              <Box className=" exam-mark-add-heading-bg">{section_name}</Box>
            </Box>
          </Box>
          {blank && <BlankPagewithIcon data={blankData} />}
          {!blank && (
            <Box>
              {currentTab === "term" && (
                <ResultTermWiseIndividual
                  markDetails={markDetails}
                  is_mark_result={is_mark_result}
                  selectedSubjectDropdown={selectedSubjectDropdown}
                  handleChange={this.handleChange}
                  onchangeSubject={this.onchangeSubject}
                  onChangeFilter={this.onChangeFilter}
                  handleMarkPassOrFail={this.handleMarkPassOrFail}
                  submitAndFinalize={this.submitAndFinalize}
                  is_announced={is_announced}
                  handleFilter={this.handleFilter}
                />
              )}

              {currentTab === "exam" && (
                <ResultExamWiseIndividual
                  markDetails={markDetails}
                  is_mark_result={is_mark_result}
                  selectedSubjectDropdown={selectedSubjectDropdown}
                  handleChange={this.handleChange}
                  onchangeSubject={this.onchangeSubject}
                  onChangeFilter={this.onChangeFilter}
                  handleMarkPassOrFail={this.handleMarkPassOrFail}
                  submitAndFinalize={this.submitAndFinalize}
                  is_announced={is_announced}
                  handleFilter={this.handleFilter}
                  download_details={download_details}
                  selectedFilter={selectedFilter}
                  handleIsAnnouncedChangePerStudent={this.handleIsAnnouncedChangePerStudent}
                  submitIsAnnouncedUpdates={this.submitIsAnnouncedUpdates}
                  isAnnouncedUpdates={this.state.isAnnouncedUpdates}
                />
              )}

              {currentTab === "examConfig" && (
                <ResultExamConfigWise
                  markDetails={markDetails}
                  is_mark_result={is_mark_result}
                  selectedSubjectDropdown={selectedSubjectDropdown}
                  handleChange={this.handleChange}
                  onchangeSubject={this.onchangeSubject}
                  onChangeFilter={this.onChangeFilter}
                  handleMarkPassOrFail={this.handleMarkPassOrFail}
                  submitAndFinalize={this.submitAndFinalize}
                  is_announced={is_announced}
                  handleFilter={this.handleFilter}
                />
              )}

              {is_mark_result && (
                <Box className="submt-button-float-bottom" mt={3}>
                  <Button
                    className="submit"
                    variant="contained"
                    style={{ float: "right" }}
                    disabled={submitDisable}
                    onClick={(e) => this.submitResult()}
                  >
                    Submit
                  </Button>
                </Box>
              )}
              <Prompt
                when={isPrompt}
                message="Exam marks not submitted, Are you sure to exit ?"
              />
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
            </Box>
          )}
        </Paper>
      );
    }
  }
}

export default withRouter(ResultSectionView);

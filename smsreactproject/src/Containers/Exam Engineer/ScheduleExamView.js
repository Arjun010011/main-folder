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
import EventIcon from "@material-ui/icons/Event";
import Snackbar from "@material-ui/core/Snackbar";
import WarningIcon from "@material-ui/icons/Warning";
import Swal from "sweetalert2";
import Skeleton from "@material-ui/lab/Skeleton";
import InfoIcon from "@material-ui/icons/Info";

import loadingBar from "images/loading.gif";
import _ from "lodash";
import ModalOptionalSubjects from "Containers/Exam/components/ModalOptionalSubjects";
import { APPROVAL_STATUS, alphabet } from "Constants";
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
  getSettingValue,
} from "Includes/functions";
import { getRequest, deleteRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";

const number_of_language =
  parseInt(getSettingValue("number_of_language")) > 1 ? true : false;
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_grade_plan = exam_config["grade_plan"] == 1 ? true : false;
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;
const is_merge_subject =
  exam_config["merge_subject_for_hallticket"] == 1 ? true : false;

class ScheduleExamView extends Component {
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
      isExpand: false,
      isExpanded: false,
      standardList: {},
      blankData: "Select academic year, term, exam and expect the result",
      approvalStatus: {},
      reasonOpen: false,
      reason: "",
      examTermList: [],
      selectedTerm: "",
      alias_names: {},
      is_standard_section: false,
      standard_list: [],
      selectedStandard: "",
      loading: true,
      requestApprovalError: "",
      openModalOptionalSubjects: false,
      optionalSubjects: false,
      errorFound: true,
      standardList_standard_wise: [],
      loadingExamGet: false,
      part_type: {},
      fieldError: { reason: "" },
    };
  }

  async componentDidMount() {
    this.getYearList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.setState({
          selectedYear: year,
          blankData: "Select term, exam and expect the result",
        });
      }
    } else {
      this.setState({
        pageLoading: false,
      });
    }
    this.scroll();
  }

  getPartTypeList = () => {
    const url = GET_URL.subjectparttype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
      }
    });
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  getYearList = async () => {
    let { loading } = this.state;
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
        let { selectedExam, selectedTerm } = getUrlParam();
        if (selectedExam && selectedTerm) {
          loading = true;
        }
        this.setState({
          yearList: response.data.data,
          loading,
        });
        this.getTermList();
      }
    });
  };

  getTermList = async () => {
    const { selectedYear } = this.state;
    const url = GET_URL.examterms.api;
    const params = { is_active: true };
    await getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          examTermList: response.data.data,
        });
        let { selectedExam, selectedTerm, standard } = getUrlParam();
        if (selectedExam && selectedTerm && selectedYear) {
          this.setState(
            {
              selectedExam,
              selectedTerm,
              loadingExam: true,
              selectedStandard: standard,
              loadingExamGet: true,
            },
            () => {
              this.getExamList(selectedTerm, selectedExam, standard);
            }
          );
        } else {
          this.setState({
            loading: false,
          });
        }
      }
    });
    return true;
  };

  handleAddExamButton = () => {
    let {
      selectedYear,
      error,
      alertData,
      selectedExam,
      examList,
      yearList,
      examTermList,
      selectedTerm,
      standard_list,
      is_standard_section,
      selectedStandard,
    } = this.state;
    if (selectedYear && selectedExam) {
      let yearName = getKeyValueMap(yearList, "id", "name");
      yearName = yearName[selectedYear];

      let termName = getKeyValueMap(examTermList, "id", "name");
      termName = termName[selectedTerm];

      let examName, start_date, end_date;
      examList.map((temp) => {
        if (temp.id == selectedExam) {
          examName = temp.exam_type_name;
          start_date = temp.from_date;
          end_date = temp.to_date;
        }
      });
      let currentExamInformation = {
        selectedYear: selectedYear,
        yearName: yearName,
        start_date: start_date,
        end_date: end_date,
        examName: examName,
        selectedExam: selectedExam,
        selectedTerm: selectedTerm,
        termName: termName,
      };
      if (is_standard_section) {
        let standardName = getKeyValueMap(
          standard_list,
          "standard",
          "standard_name"
        );
        standardName = standardName[selectedStandard];
        currentExamInformation["standardName"] = standardName;
        currentExamInformation["selectedStandard"] = selectedStandard;
      }

      let searchParam =
        "?" + new URLSearchParams(currentExamInformation).toString();
      this.props.history.push({
        pathname: Actions.schedule_exam.create.url,
        search: searchParam,
      });
    } else {
      if (!selectedYear) {
        alertData = "Select Academic Year";
        error.selectedYear = alertData;
      } else {
        alertData = "Select Exam";
        error.selectedExam = alertData;
      }
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  onChange = (e) => {
    let { name, value } = e.target;
    let {
      error,
      blank,
      loadingExam,
      selectedTerm,
      examList,
      is_standard_section,
      standard_list,
      selectedExam,
      standardList_standard_wise,
      blankData,
      standardList,
      selectedStandard,
    } = this.state;
    if (value !== 0) {
      delete error[name];
      this.setState(
        {
          [name]: value,
          error,
        },
        () => {
          if (name === "selectedYear") {
            SetAcademicYear(value);
            this.setState({
              selectedStandard: "",
              selectedTerm: "",
              selectedExam: "",
              standard_list: [],
              standardList_standard_wise: [],
              examList: [],
              blank: true,
              blankData: "Select term, exam and expect a result",
            });
          } else if (name === "selectedTerm") {
            this.setState(
              {
                loadingExamGet: true,
              },
              () => {
                this.getExamList(value);
              }
            );
          } else if (name === "selectedExam") {
            examList.map((data) => {
              if (data.id == value) {
                standard_list = data.standard_names;
              }
            });
            this.setState(
              {
                loadingExam: true,
                blankData: `Select ${alias_names["standard"]} and expect a result`,
                standardList: {},
                standard_list,
                standardList_standard_wise: [],
                selectedStandard: "",
                blank: true,
              },
              () => {
                this.getExamStandardList(value);
              }
            );
          } else if (name === "selectedStandard") {
            this.setState({
              blank: false,
            });
          }
        }
      );
    }
  };

  getExamList = (term, exam, standard) => {
    let {
      selectedYear,
      standardList,
      selectedExam,
      blank,
      blankData,
      selectedStandard,
      is_standard_section,
      standard_list,
      standardList_standard_wise,
    } = this.state;
    const url = GET_URL.exam.api;
    const params = { academic_year: selectedYear, term: term, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data.name = data.exam_type_name;
        });
        if (exam === undefined) {
          standardList = {};
          standardList_standard_wise = [];
          selectedExam = "";
          blank = true;
          selectedStandard = "";
          is_standard_section = false;
          blankData = "Select exam and expect the result";
        } else {
          response.data.data.map((data) => {
            if (data.id == exam) {
              is_standard_section = data.is_standard_section;
              standard_list = data.standard_names;
            }
          });
          selectedExam = exam;
          blank = false;
          if (standard) {
            this.getExamStandardList(selectedExam, standard);
          } else {
            this.getExamStandardList(selectedExam);
          }
        }
        this.setState({
          examList: response.data.data,
          loadingExam: false,
          selectedExam,
          standardList,
          blank,
          selectedStandard,
          is_standard_section,
          blankData,
          standard_list,
          loadingExamGet: false,
        });
      }
    });
  };

  getExamStandardList = (selectedExam, selectedStandard) => {
    let {
      is_standard_section,
      standardList_standard_wise,
      blank,
      optionalSubjects,
    } = this.state;
    const url = GET_URL.schedule.api;
    let param = { is_active: true, exam: selectedExam };
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        let part_type = {};
        response.data.data.part_type_list.map((data) => {
          part_type[data["id"]] = {
            list: [],
            id: data["id"],
            name: data["name"],
          };
        });
        if (Array.isArray(response.data.data.schedule_list)) {
          response.data.data.schedule_list.map((standard) => {
            standard.subject_list.map((subject) => {
              if (
                !Boolean(
                  subject.fordate ||
                    subject.start_time ||
                    subject.end_time ||
                    subject.max_marks
                )
              ) {
                subject.isEnabled = false;
                standard.optionalSubjects = true;
                optionalSubjects = true;
              } else if (
                !Boolean(
                  subject.fordate &&
                    subject.start_time &&
                    subject.end_time &&
                    subject.max_marks
                )
              ) {
                subject.partialSubjects = true;
                standard.optionalSubjects = true;
                subject.isEnabled = false;
              }
            });
          });
          is_standard_section = false;
          blank = false;
          standardList_standard_wise = response.data.data.schedule_list;
        } else {
          let last_id = "";
          Object.keys(response.data.data.schedule_list).map((standard) => {
            last_id = "";
            response.data.data.schedule_list[standard].section_list.map(
              (section) => {
                section.selected_merge_ids = [];
                section.subject_list.map((subject, subIndex) => {
                  Object.keys(part_type).map((part_key) => {
                    if (
                      subject.subject_part_type_id == part_key &&
                      !part_type[part_key].list.includes(subject.subject)
                    ) {
                      part_type[part_key].list.push(subject.subject);
                    }
                  });
                  if (
                    !Boolean(
                      subject.fordate ||
                        subject.start_time ||
                        subject.end_time ||
                        subject.max_marks
                    )
                  ) {
                    subject.isEnabled = false;
                    response.data.data.schedule_list[
                      standard
                    ].optionalSubjects = true;
                    optionalSubjects = true;
                  } else if (
                    !Boolean(
                      subject.fordate &&
                        subject.start_time &&
                        subject.end_time &&
                        subject.max_marks
                    )
                  ) {
                    subject.partialSubjects = true;
                    subject.isEnabled = false;
                  }
                  if (subject.next_linking_id) {
                    if (
                      !section.selected_merge_ids.includes(
                        subject?.next_linking_id
                      )
                    ) {
                      section.selected_merge_ids.push(subject?.next_linking_id);
                    }
                    if (!section.selected_merge_ids.includes(subject?.id)) {
                      section.selected_merge_ids.push(subject?.id);
                    }
                  }
                });
              }
            );
          });
          is_standard_section = true;
          if (selectedStandard) {
            blank = false;
          }
        }
        Object.keys(part_type).map((part_key) => {
          if (part_type[part_key].list.length === 0) {
            delete part_type[part_key];
          }
        });
        this.setState(
          {
            standardList: response.data.data.schedule_list,
            approvalStatus: response.data.data.approval_status,
            loadingExam: false,
            loading: is_merge_subject ? true : false,
            selectedStandard: selectedStandard ? selectedStandard : "",
            blank,
            optionalSubjects,
            is_standard_section,
            standardList_standard_wise,
            errorFound: false,
            part_type,
          },
          () => {
            if (is_merge_subject) {
              this.updateSubjectsWithMerge();
            }
          }
        );
      } else {
        this.setState({
          standardList: [],
          loadingExam: false,
          blankData: response,
          selectedStandard: selectedStandard,
          blank: true,
          loading: false,
          errorFound: true,
        });
      }
    });
  };

  updateSubjectsWithMerge = () => {
    let { standardList } = this.state;
    let temp_list = { ...standardList };
    let selected_subject_list = {};
    Object.keys(temp_list).map((data) => {
      selected_subject_list = {};
      temp_list[data].section_list.map((section) => {
        section.subject_list.map((sub) => {
          sub.for_date = sub.fordate
            ? dateFormat(sub.fordate, "DD-MM-YYYY")
            : null;
          delete sub.next_subject_linking_id;
          delete sub.next_linking_id;
          if (section.selected_merge_ids.includes(sub.id)) {
            if (!selected_subject_list[sub.for_date]) {
              selected_subject_list[sub.for_date] = [];
            }
            sub.refId = this.getRefId(selected_subject_list, sub.for_date);
            sub.refBaseId = this.getRefId(
              selected_subject_list,
              sub.for_date,
              true
            );
            selected_subject_list[sub.for_date].push(sub);
          }
        });
        Object.keys(selected_subject_list).map((selected) => {
          selected_subject_list[selected].map((sub_data, sIndex) => {
            if (selected_subject_list[selected].length !== sIndex + 1) {
              sub_data["next_subject_linking_id"] =
                selected_subject_list[selected][sIndex + 1]["subject"];
            }
          });
        });
        section.selected_subject_list = { ...selected_subject_list };
      });
    });
    Object.keys(temp_list).map((std) => {
      temp_list[std].section_list.map((section) => {
        Object.keys(section["selected_subject_list"]).map((selected) => {
          section["selected_subject_list"][selected].map((selSub) => {
            section.subject_list.map((data) => {
              if (
                data.subject === selSub.subject &&
                selSub.next_subject_linking_id
              ) {
                data["next_linking_id"] = selSub.next_linking_id;
                data["next_subject_linking_id"] =
                  selSub.next_subject_linking_id;
              } else if (
                data.subject === selSub.subject &&
                !selSub.next_subject_linking_id
              ) {
                delete data.next_subject_linking_id;
                delete data.next_linking_id;
              }
            });
          });
        });
      });
    });
    this.setState({
      standardList: { ...temp_list },
      loading: false,
    });
  };

  getRefId = (selected_subject_list, for_date, isBase) => {
    let return_data = "";
    if (!for_date) {
      for_date = "null";
    }
    Object.keys(selected_subject_list).map((data, index) => {
      if (!data) {
        data = "null";
      }
      if (isBase) {
        return_data = index + 1;
      } else if (data === for_date) {
        return_data = `${index + 1}${
          alphabet[selected_subject_list[data].length]
        }`;
      }
    });
    return return_data;
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

  ApproveExam = () => {
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
        this.approveExam();
      }
    });
  };

  CancelRequestApprove = () => {
    Swal.fire({
      title: `<strong>Are you sure want to Cancel Request For Approve</strong>`,
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
        const { selectedExam, selectedStandard } = this.state;
        let post_data = {
          approval_status: APPROVAL_STATUS.un_approved,
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
            this.getExamStandardList(selectedExam, selectedStandard);
          }
        });
      }
    });
  };

  approveExam = () => {
    const { selectedExam, selectedStandard } = this.state;
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

        this.getExamStandardList(selectedExam, selectedStandard);
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
    const { selectedExam, reason, error, selectedStandard } = this.state;
    if (!reason) {
      error["reason"] = "Please Enter Reason";
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
      this.getExamStandardList(selectedExam, selectedStandard);
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

  getAliasLanguage = (sequence) => {
    let return_value;
    if (sequence == 1) {
      return_value = alias_names["first_language"];
    } else if (sequence == 2) {
      return_value = alias_names["second_language"];
    } else if (sequence == 3) {
      return_value = alias_names["third_language"];
    }
    return return_value;
  };

  requestForApproveExam = () => {
    const { selectedExam, selectedStandard, openModalOptionalSubjects } =
      this.state;
    let post_data = {
      approval_status: APPROVAL_STATUS.pending,
    };
    let props = { ...this.props };
    if (openModalOptionalSubjects) {
      props["return_error_message"] = true;
    }
    let url = PUT_URL.examapprove.api + selectedExam + "/";
    putRequest(url, post_data, props).then((response) => {
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
            openModalOptionalSubjects: false,
            optionalSubjects: false,
          },
          () => {
            this.getExamStandardList(selectedExam, selectedStandard);
          }
        );
      } else {
        this.setState({
          requestApprovalError: response,
        });
      }
    });
  };

  handleCloseModal = () => {
    this.setState({
      openModalOptionalSubjects: false,
    });
  };

  handleOpenSnackBar = () => {
    const { optionalSubjects, standardList, selectedStandard } = this.state;
    if (
      (is_grade_plan &&
        standardList[selectedStandard]["section_list"][0]?.["grade_plan_data"]
          ?.grade_plan &&
        standardList[selectedStandard]["section_list"][0]?.[
          "grade_plan_data_for_total"
        ]?.grade_plan_for_total) ||
      !is_grade_plan
    ) {
      if (optionalSubjects) {
        this.setState({
          requestApprovalError: "",
          openModalOptionalSubjects: true,
        });
      } else {
        this.requestForApproveExam();
      }
    } else {
      this.setState({
        alertData: "Select Grade Plan",
        open: true,
        fieldError: {
          reason: "Subject Grade Plan and Total Grade Plan is not selected",
        },
      });
    }
  };

  getCumulativeNames = (data_list) => {
    let return_data = [];
    data_list.map((data) => {
      return_data.push(data?.["alias"] ?? data["name"]);
    });
    return return_data.join(", ");
  };

  getShowContentMarks = (sub_details, marks, name) => {
    return (
      <Box>
        <Box>
          <Box>{`${alias_names["cumulative"]} Type-  ${name} Marks`}</Box>
        </Box>
        {sub_details[marks] && (
          <Box>
            <Box>{`${alias_names["written"]} - ${sub_details[marks]}`}</Box>
          </Box>
        )}
        {sub_details.cumulative_mapping &&
          sub_details.cumulative_mapping.map((cum_data) => {
            return (
              <Box>
                <Box>{`${this.getCumulativeNames(
                  cum_data.cumulative_type_data
                )} - ${cum_data[marks]}`}</Box>
              </Box>
            );
          })}
      </Box>
    );
  };

  getSubjectFormat = (standard, stIndex, part) => {
    const { isExpanded, part_type } = this.state;
    return (
      <>
        {Object.keys(part_type).length > 1 && (
          <TableRow>
            <TableCell
              className="schedule-exam-subject-name-box height-49px text-bold fs-18 "
              component="th"
              scope="row"
            >
              <div className="text-blue">{part_type[part]["name"]}</div>
            </TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
            <TableCell className="" component="th" scope="row"></TableCell>
          </TableRow>
        )}
        {standard.subject_list.map((subject, subIndex) => {
          return (
            <>
              {part_type[part].list.includes(subject.subject) && (
                <TableRow
                  key={subIndex}
                  className={
                    isExpanded !== stIndex && subIndex > 2
                      ? "display-none"
                      : "schedule-exam-subject-name-box height-49px"
                  }
                >
                  <TableCell className="" component="th" scope="row">
                    {subject.is_language && number_of_language
                      ? subject.refId
                        ? `${subject.subject_name} ${this.getAliasLanguage(
                            subject.sequence
                          )} - (${subject.refId})`
                        : `${subject.subject_name} ${this.getAliasLanguage(
                            subject.sequence
                          )}`
                      : subject.refId
                      ? `${subject.subject_name} - (${subject.refId})`
                      : subject.subject_name}
                  </TableCell>
                  <TableCell
                    className=""
                    component="th"
                    scope="row"
                    align="center"
                  >
                    {subject.is_marks === true ||
                    subject.is_marks === undefined ? (
                      is_cumulative &&
                      subject.total_max_marks &&
                      subject.cumulative_mapping &&
                      subject.cumulative_mapping.length > 0 ? (
                        <Tooltip
                          title={this.getShowContentMarks(
                            subject,
                            "max_marks",
                            "Max"
                          )}
                          enterDelay={400}
                          enterNextDelay={400}
                          placement="top-start"
                          classes={{ tooltip: "tooltip-show-data" }}
                        >
                          <Box className="pointer display-flex flex-justify-center-flex-prop">
                            <Box className="mr-5">
                              {subject.total_max_marks}
                            </Box>
                            <InfoIcon />
                          </Box>
                        </Tooltip>
                      ) : (
                        subject.max_marks
                      )
                    ) : (
                      `Grade Plan - ${subject.grade_plan_name}`
                    )}
                  </TableCell>
                  <TableCell
                    className=""
                    component="th"
                    scope="row"
                    align="center"
                  >
                    {is_cumulative &&
                    subject.total_min_marks &&
                    subject.cumulative_mapping &&
                    subject.cumulative_mapping.length > 0 ? (
                      <Tooltip
                        title={this.getShowContentMarks(
                          subject,
                          "min_marks",
                          "Min"
                        )}
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Box className="pointer display-flex flex-justify-center-flex-prop">
                          <Box className="mr-5">{subject.total_min_marks}</Box>
                          <InfoIcon />
                        </Box>
                      </Tooltip>
                    ) : (
                      subject.min_marks
                    )}
                  </TableCell>
                  <TableCell className="" component="th" scope="row">
                    {dateFormat(subject.fordate, "DD-MM-YYYY")}
                  </TableCell>
                  <TableCell className="" component="th" scope="row">
                    {timeFormat(subject.start_time)}
                  </TableCell>
                  <TableCell className="" component="th" scope="row">
                    {timeFormat(subject.end_time)}
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </>
    );
  };

  unapproveSchedule = () => {
    const { selectedExam, selectedStandard } = this.state;
    let post_data = {
      approval_status: APPROVAL_STATUS.un_approved,
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

        this.getExamStandardList(selectedExam, selectedStandard);
      }
    });
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
      loading,
      blankData,
      approvalStatus,
      reasonOpen,
      reason,
      examTermList,
      selectedTerm,
      is_standard_section,
      standard_list,
      loadingExamGet,
      requestApprovalError,
      selectedStandard,
      openModalOptionalSubjects,
      standardList_standard_wise,
      errorFound,
      part_type,
      fieldError,
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
              <Box className="heading">Scheduled Exam</Box>
            </Grid>
            <Grid item md={6} xs={12} className="header-align end-flex-prop">
              {!blank && !loadingExam && selectedStandard && (
                <Box className="end-flex-prop">
                  {approvalStatus.approval_status !== "3" &&
                    approvalStatus.approval_status !== "1" &&
                    selectedExam &&
                    ((is_standard_section && selectedStandard) ||
                      !is_standard_section) &&
                    isUserHasPermission("schedule_exam", "create") && (
                      <Button
                        variant="outlined"
                        color="primary"
                        className={"submit"}
                        // disabled={!canRequestForApprove}
                        onClick={this.handleOpenSnackBar}
                      >
                        Request for Approve &nbsp;{" "}
                      </Button>
                    )}
                  {approvalStatus.approval_status === "3" &&
                    isUserHasPermission("schedule_exam_approve", "create") && (
                      <Box className="leave-pending-approve-reject">
                        <Button
                          className="apply-leave-button"
                          onClick={(e) => this.ApproveExam()}
                        >
                          Approve
                        </Button>
                        <Button
                          className="apply-leave-reset-button "
                          onClick={(e) => this.rejectPopup()}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  {approvalStatus.approval_status === "1" && (
                    <Box style={{display: "block"}}>
                      <Box className="schedule-exam-approved-box">Approved</Box>
                      <Box>
                        <Button
                          style={{height:"30px", margin: "5px"}}
                          variant="contained"
                          color="secondary"
                          onClick={() => this.unapproveSchedule()}
                        >
                          Unapprove
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
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
                size="small"
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
                helperText={
                  !selectedYear ? "Select Academic Year" : error.selectedTerm
                }
                hideSelect={true}
                size="small"
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
                  size="small"
                />
              )}
            </Grid>

            <Grid
              item
              md={3}
              xs={12}
              className="header-align end-flex-prop m-t-20px"
            >
              {selectedStandard &&
                approvalStatus.approval_status !== "3" &&
                approvalStatus.approval_status !== "1" &&
                selectedExam &&
                ((is_standard_section && selectedStandard) ||
                  !is_standard_section) &&
                isUserHasPermission("schedule_exam", "create") && (
                  <Button
                    variant="contained"
                    onClick={this.handleAddExamButton}
                    className="editbutton-view"
                  >
                    <EventIcon className="visibility-icon" />
                    <Box>Schedule Exam</Box>
                  </Button>
                )}
              {selectedStandard &&
                approvalStatus.approval_status === "3" &&
                selectedExam &&
                ((is_standard_section && selectedStandard) ||
                  !is_standard_section) &&
                isUserHasPermission("schedule_exam", "create") && (
                  <Button
                    variant="outlined"
                    color="primary"
                    className="cancel-request"
                    onClick={this.CancelRequestApprove}
                  >
                    Cancel Request for Approve &nbsp;{" "}
                  </Button>
                )}
            </Grid>
          </Grid>
          {is_standard_section && !errorFound && (
            <Grid container spacing={2}>
              <Grid item md={3} xs={12}>
                <Dropdown
                  data={standard_list}
                  name="selectedStandard"
                  customName="standard_name"
                  customId="standard"
                  style="width-100"
                  value={selectedStandard}
                  onChange={this.onChange}
                  label={`${alias_names["standard"]}`}
                  error={error.selectedStandard}
                  hideSelect
                  size="small"
                />
              </Grid>
            </Grid>
          )}
          {blank && !loadingExam && (
            <div className="mt-20">
              <BlankPagewithIcon data={blankData} />
            </div>
          )}
          {loadingExam && (
            <Box display="flex">
              <CircularProgress className="loading" />
            </Box>
          )}
          {approvalStatus.approval_status == "3" && !blank && (
            <Box display="flex" className="schedule-warning-message mt-10">
              <WarningIcon
                style={{
                  color: "#f6c342",
                  marginRight: "10px",
                  fontSize: "27px",
                }}
              />
              Pending for approve
            </Box>
          )}
          {approvalStatus.approval_status == "2" && !blank && (
            <Box display="flex" className="schedule-reject-message mt-10">
              <WarningIcon
                style={{
                  color: "#cf4343",
                  marginRight: "10px",
                  fontSize: "27px",
                }}
              />
              Rejected with reason
              <Box className="schedule-reject-message-reason">{`: ${approvalStatus.reason}`}</Box>
            </Box>
          )}
          {fieldError["reason"] && (
            <Box display="flex" className="schedule-reject-message mt-10">
              <WarningIcon
                style={{
                  color: "#cf4343",
                  marginRight: "10px",
                  fontSize: "27px",
                }}
              />
              Request is not possible with below reason
              <Box className="schedule-reject-message-reason">{`: ${fieldError["reason"]}`}</Box>
            </Box>
          )}
          {selectedStandard && standardList && !blank && !loadingExam && (
            <Grid container spacing={2}>
              {standardList[selectedStandard]?.["section_list"].map(
                (standard, stIndex) => {
                  return (
                    <Grid item xl={8} md={12} xs={12}>
                      <Paper className="schedule-add-paper" elevation={2}>
                        <Box className="schedule-add-standard-outer-box ph-10">
                          <Box className="schedule-view-standard-name display-flex justify-content-space-between">
                            {standard.standard_name &&
                              !standard.section_name &&
                              standard.standard_name}
                            {standard.standard_name &&
                              standard.section_name && (
                                <Box className="text-capitalize">
                                  {" "}
                                  {`${standard.standard_name} - ${standard.section_name}`}{" "}
                                </Box>
                              )}
                          </Box>
                          {standard?.grade_plan_data?.grade_plan__name && (
                            <Box className="schedule-view-standard-name">
                              Subject Grade Plan -{" "}
                              {standard?.grade_plan_data?.grade_plan__name}
                            </Box>
                          )}
                          {standard?.grade_plan_data_for_total
                            ?.grade_plan_for_total__name && (
                            <Box className="schedule-view-standard-name">
                              Total Grade Plan -{" "}
                              {
                                standard?.grade_plan_data_for_total
                                  ?.grade_plan_for_total__name
                              }
                            </Box>
                          )}
                        </Box>
                        <TableContainer className="schedule-exam-overflow">
                          <Table
                            size="small"
                            aria-label="simple table"
                            className=""
                          >
                            <TableHead>
                              <TableRow className="">
                                <TableCell className="">Subject</TableCell>
                                <TableCell className="" align="center">
                                  Max Marks
                                </TableCell>
                                <TableCell className="" align="center">
                                  Min Marks
                                </TableCell>
                                <TableCell className="">Exam Date</TableCell>
                                <TableCell className=""> Start Time</TableCell>
                                <TableCell className=""> End Time</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {Object.keys(part_type).map((part_key) => {
                                return (
                                  part_type[part_key].list.length > 0 &&
                                  this.getSubjectFormat(
                                    standard,
                                    stIndex,
                                    part_key
                                  )
                                );
                              })}
                            </TableBody>
                            {isExpanded !== stIndex &&
                              standard.subject_list.length > 3 && (
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
                              standard.subject_list.length > 3 && (
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
                }
              )}
            </Grid>
          )}
          {!is_standard_section && !blank && !loadingExam && (
            <Grid container spacing={2}>
              {standardList_standard_wise.map((standard, stIndex) => {
                return (
                  <Grid item xl={8} md={12} xs={12}>
                    <Paper className="schedule-add-paper" elevation={2}>
                      <Box className="schedule-add-standard-outer-box">
                        <Box className="schedule-add-standard-name">
                          {standard.standard_name && standard.standard_name}
                          {standard.section_name && standard.section_name}
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
                              <TableCell className="">Subject</TableCell>
                              <TableCell className="">Exam Date</TableCell>
                              <TableCell className=""> Start Time</TableCell>
                              <TableCell className=""> End Time</TableCell>
                              <TableCell className="" align="center">
                                {" "}
                                Max Marks
                              </TableCell>
                              <TableCell className="" align="center">
                                {" "}
                                Min Marks
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {standard.subject_list.map((subject, subIndex) => {
                              return (
                                <TableRow
                                  key={subIndex}
                                  className={
                                    isExpanded !== stIndex && subIndex > 2
                                      ? "display-none"
                                      : "schedule-exam-subject-name-box height-49px"
                                  }
                                >
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {subject.is_language && number_of_language
                                      ? `${
                                          subject.subject_name
                                        } ${this.getAliasLanguage(
                                          subject.sequence
                                        )}`
                                      : subject.subject_name}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {dateFormat(subject.fordate, "DD-MM-YYYY")}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {timeFormat(subject.start_time)}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                  >
                                    {timeFormat(subject.end_time)}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                    align="center"
                                  >
                                    {subject.max_marks}
                                  </TableCell>
                                  <TableCell
                                    className=""
                                    component="th"
                                    scope="row"
                                    align="center"
                                  >
                                    {subject.min_marks}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          {isExpanded !== stIndex &&
                            standard.subject_list.length > 3 && (
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
                            standard.subject_list.length > 3 && (
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
          <ModalOptionalSubjects
            open={openModalOptionalSubjects}
            handleClose={this.handleCloseModal}
            standardList={
              is_standard_section ? standardList : standardList_standard_wise
            }
            requestForApprove={this.requestForApproveExam}
            requestApprovalError={requestApprovalError}
            getAliasLanguage={this.getAliasLanguage}
            is_standard_section={is_standard_section}
            selectedStandard={selectedStandard}
          />
        </Paper>
      );
    }
  }
}
export default withRouter(ScheduleExamView);

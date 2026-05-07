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
  Checkbox,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import Skeleton from "@material-ui/lab/Skeleton";
import loadingBar from "images/loading.gif";
import { APPROVAL_STATUS } from "Constants";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import {
  Alert,
  getKeyValueMap,
  getUrlParam,
  getFullName,
} from "Includes/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import {
  floatNumberWithTwoDecimalRegex,
  nameAndNumberWithSpecialCharacterRegex,
} from "Constants/regularExpression";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import _ from "lodash";
import "./styles.scss";

import ReactExport from "react-export-excel";
import * as XLSX from "xlsx";

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;

const fieldDetails = [
  {
    label: "Remark",
    regex: nameAndNumberWithSpecialCharacterRegex,
    autoFocus: false,
    name: "name",
    md: 12,
    className: "w-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 250,
    gridClassName: "margin-vertical-20",
  },
];

class ExamMarksAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      alertData: "",
      blank: true,
      loading: true,
      loadingExam: false,
      isExpand: false,
      isExpanded: false,
      markDetails: { subject_list: [], student_list: [] },
      blankData: "Please select academic year, Exam and expect the result",
      fieldError: {},
      searchStudent: "",
      student_list: [],
      subjectList: [],
      selectedSubjectDropdown: [],
      is_mark_attendance: false,
      submitDisable: true,
      is_approved: false,
      showCumulative: true,
      download_details: { column: [], values: [] },
      isLoadingDownload: false,
      reasonList: [],
      show_manual_attendance_in_schedule: isFormDefinitionEnabled(
        "exam_configurations",
        "show_manual_attendance_in_schedule",
        1
      ),
      show_remarks_in_marks_entry: isFormDefinitionEnabled(
        "exam_configurations",
        "show_remarks_in_marks_entry",
        1
      ),
    };
  }

  async componentDidMount() {
    const { show_remarks_in_marks_entry } = this.state;
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
    } = getUrlParam();
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
      },
      () => {
        if (show_remarks_in_marks_entry) {
          this.getReasonList();
        } else {
          this.getExamMarkDetails();
        }
      }
    );
  }

  scroll = () => {
    window.scrollTo(0, 0);
  };

  getCumulativeNames = (data_list, isOnlyName) => {
    let return_data = [];
    data_list.map((data) => {
      return_data.push(
        isOnlyName ? data["name"] : data?.["alias"] ?? data["name"]
      );
    });
    return return_data.join(", ");
  };

  updateSubjectTotalMarks = (data) => {
    let return_marks = 0;
    if (
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

  getCumulativeNamesStu = (data_list) => {
    let return_data = [];
    data_list.map((data) => {
      return_data.push(data?.["alias"] ?? data["cumulative_type_name"]);
    });
    return return_data.join(", ");
  };

  getExamMarkDetails = (name) => {
    const {
      selectedExam,
      standard_section_id,
      show_remarks_in_marks_entry,
      reasonList,
    } = this.state;
    const url = GET_URL.studentmark.api;
    const param = {
      is_active: true,
      exam: selectedExam,
      standard_section: standard_section_id,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        // normalize subject list (unchanged)
        response.data.data.subject_list.map((data) => {
          data.name = data.subject_name;
          data.value = data.subject;
          data.id = data.subject;
          if (!_.isEmpty(data.cumulative_data)) {
            data.cumulative_data.map((cum_data) => {
              cum_data["names"] = this.getCumulativeNames(
                cum_data.cumulative_type_data,
                true
              );
            });
          }
        });

        // build download columns / preview (unchanged)
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
          if (show_remarks_in_marks_entry && student_data.remark) {
            reasonList.forEach((data) => {
              if (data.id === student_data.remark) {
                student_data.remark = data;
              }
            });
          }
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
                  !mark_details_columns.includes(`${data["name"]}-${cumData.names}`)
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
                          !_.isEmpty(
                            student_data.subject_list[subData].cumulative_marks_data
                          )
                        ) {
                          student_data.subject_list[subData].cumulative_marks_data.map(
                            (mark_data) => {
                              if (cum_data.id == mark_data.exam_cumulative_id) {
                                cum_data["marks"] = mark_data.marks;
                                cum_data["exam_cumulative_id"] = mark_data.id;
                                cum_data["attendance_status"] =
                                  mark_data.attendance_status;
                              }
                              if (
                                student_data.subject_list[subData][
                                  "subject_part_type_id"
                                ] === 1
                              ) {
                                mark_details_temp[
                                  `${data["name"]}-${this.getCumulativeNamesStu(
                                    mark_data.cumulative_data_mapping
                                  )}`
                                ] = mark_data?.obtained_marks ?? mark_data.marks;
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                  student_data.subject_list[subData]["total_marks"] =
                    this.updateSubjectTotalMarks(student_data.subject_list[subData]);
                  if (
                    student_data.subject_list[subData]["subject_part_type_id"] === 1
                  ) {
                    if (!mark_details_columns.includes(`${data["name"]}-Written`)) {
                      mark_details_columns.push(`${data["name"]}-Written`);
                    }
                    if (!mark_details_columns.includes(`${data["name"]}-Total`)) {
                      mark_details_columns.push(`${data["name"]}-Total`);
                    }
                    if (!mark_details_columns.includes(`${data["name"]}-Grade`)) {
                      mark_details_columns.push(`${data["name"]}-Grade`);
                    }
                    mark_details_temp[`${data["name"]}-Written`] =
                      student_data.subject_list[subData]?.marks ?? 0;
                    mark_details_temp[`${data["name"]}-Total`] =
                      this.updateSubjectTotalMarks(student_data.subject_list[subData]);
                    mark_details_temp[`${data["name"]}-Grade`] =
                      student_data.subject_list[subData]?.grade;
                  }
                }
              });
            }
          });
          mark_details_temp["total_marks"] =
            student_data?.part_type_data_code_wise?.part1?.total_marks;
          mark_details_temp["percentage"] =
            student_data?.part_type_data_code_wise?.part1?.percentage;
          mark_details_temp["grade"] =
            student_data?.part_type_data_code_wise?.part1?.grade;
          mark_details_temp["obtained_marks"] =
            student_data?.part_type_data_code_wise?.part1?.total_obtained_marks;
          mark_details_temp["percentage"] =
            Math.round(mark_details_temp["percentage"] * 10) / 10;
          mark_details.push(mark_details_temp);
        });

        mark_details_columns.push("total_marks");
        mark_details_columns.push("obtained_marks");
        mark_details_columns.push("percentage");
        mark_details_columns.push("grade");

        // Save markDetails and student list; include from_date/to_date from response data
        const examsData = response.data.data;
        this.setState(
          {
            markDetails: examsData,
            all_student_list: examsData.student_list,
            selectedSubjectDropdown: examsData.subject_list,
            loadingExam: false,
            blank: false,
            loading: false,
            is_approved: examsData.approval_status == 1 ? true : false,
            download_details: {
              columns: mark_details_columns,
              values: mark_details,
            },
          },
          () => {
            if (name === "finalize") {
              this.finalizeMarks();
            }

            // if student list exists and we have from/to dates, fetch attendance
            if (
              examsData.student_list &&
              examsData.student_list.length > 0 &&
              examsData.from_date &&
              examsData.to_date
            ) {
              // pass student list and the dates to avoid extra studentmark API call inside getAttendanceDetails
              this.getAttendanceDetails(examsData.student_list, examsData.from_date, examsData.to_date);
            }

            if (examsData.student_list.length === 0) {
              this.setState({
                blank: true,
                blankData: `No students found for selection ${alias_names["standard"]} and ${alias_names["section"]}`,
              });
            }
          }
        );
      } else {
        this.setState({
          markDetails: {},
          loadingExam: false,
          blankData: response,
          blank: true,
          loading: false,
        });
      }
    });
  };

  getAttendanceDetails = async (student_list, from_date, to_date) => {
  try {
    const { standard_section_id } = this.state;

    // Validate input dates (they may be ISO datetime strings)
    if (!from_date || !to_date) {
      console.warn("No from/to dates provided for attendance fetch");
      return;
    }

    // Convert ISO datetime to YYYY-MM-DD if needed
    const clean = (d) => (typeof d === "string" && d.includes("T") ? d.split("T")[0] : d);
    const from = clean(from_date);
    const to = clean(to_date);

    // call attendance detail API
    const attUrl = `${GET_URL.attendancedetail.api}${standard_section_id}/`;
    const attParams = { from_date: from, to_date: to };
    const attResp = await getRequest(attUrl, attParams, this.props);

    if (attResp && attResp.status === 200 && attResp.data?.data) {
      const attendanceData = attResp.data.data.student || [];

      // Merge attendance into the given student_list (mutating copy)
      const updatedStudents = student_list.map((stu) => {
        // try matching by user_student or id (as earlier)
        const found = attendanceData.find(
          (a) => a.user_student === stu.student || a.id === stu.student
        );

        if (found) {
          // present and total days returned from attendance API
          stu.attendance_present = found.present ?? 0;
          stu.attendance_total = found.total ?? 0;

          // store for backend payload; this will be used in validationAndPostData
          stu.auto_attendance_days = found.present ?? 0;

          // Also reflect into marked_attendance_days only if manual not filled
          // This ensures UI shows the auto-count but manual field remains editable
          if (
            stu.marked_attendance_days === undefined ||
            stu.marked_attendance_days === null ||
            stu.marked_attendance_days === ""
          ) {
            // do not override manual value if user set it
            stu.marked_attendance_days = found.present ?? "";
          }
        } else {
          stu.attendance_present = "";
          stu.attendance_total = "";
          stu.auto_attendance_days = null;
        }
        return stu;
      });

      // Update only student_list inside markDetails to avoid re-fetch loops
      this.setState((prev) => ({
        markDetails: {
          ...prev.markDetails,
          student_list: updatedStudents,
        },
        show_manual_attendance_in_schedule: true,
        is_auto_attendance: true,
      }));
    } else {
      console.warn("Attendance API returned no data");
    }
  } catch (error) {
    console.error("Error fetching attendance details:", error);
  }
};

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleChange = (e, stIndex, subIndex, id) => {
    let { markDetails, fieldError } = this.state;
    let { name, value } = e.target;
    delete fieldError[`${name}${stIndex}${subIndex}`];
    markDetails.student_list[stIndex]["subject_list"][id][name] = value;
    markDetails.student_list[stIndex]["subject_list"][id]["total_marks"] =
      this.updateSubjectTotalMarks(
        markDetails.student_list[stIndex]["subject_list"][id]
      );
    this.setState({
      markDetails,
      fieldError,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
    });
  };

  handleChangeGrade = (e, stIndex, subIndex, id) => {
    let { markDetails, fieldError } = this.state;
    let { name, value } = e.target;
    delete fieldError[`${name}${stIndex}${subIndex}`];
    markDetails.student_list[stIndex]["subject_list"][id][name] = value;
    this.setState({
      markDetails,
      fieldError,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
    });
  };

  handleChangeBlur = (e, stIndex, subIndex, id, max_mark) => {
    let { markDetails, fieldError, open, alertData } = this.state;
    let { name } = e.target;
    let value = markDetails.student_list[stIndex]["subject_list"][id][name];
    if (
      !floatNumberWithTwoDecimalRegex.value.test(value) &&
      (Boolean(value) || value === 0)
    ) {
      fieldError[`${name}${stIndex}${subIndex}`] = "Invalid Marks";
    } else if (parseFloat(value) > max_mark) {
      fieldError[`${name}${stIndex}${subIndex}`] = `Max marks ${max_mark}`;
    }
    this.setState({
      markDetails,
      fieldError,
      open,
      alertData,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
    });
  };

  handleCumulativeChange = (e, stIndex, subIndex, id, cumIndex) => {
    let { markDetails, fieldError } = this.state;
    let { name, value } = e.target;
    delete fieldError[`${name}${stIndex}${subIndex}${cumIndex}`];
    markDetails.student_list[stIndex]["subject_list"][id]["cumulative_data"][
      cumIndex
    ][name] = value;
    markDetails.student_list[stIndex]["subject_list"][id]["total_marks"] =
      this.updateSubjectTotalMarks(
        markDetails.student_list[stIndex]["subject_list"][id]
      );
    this.setState({
      markDetails,
      fieldError,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
    });
  };

  handleCumulativeBlur = (e, stIndex, subIndex, id, cumIndex, max_mark) => {
    let { markDetails, fieldError, open, alertData } = this.state;
    let { name } = e.target;
    let value =
      markDetails.student_list[stIndex]["subject_list"][id]["cumulative_data"][
        cumIndex
      ][name];
    if (
      !floatNumberWithTwoDecimalRegex.value.test(value) &&
      (Boolean(value) || value === 0)
    ) {
      fieldError[`${name}${stIndex}${subIndex}${cumIndex}`] = "Invalid Marks";
    } else if (parseFloat(value) > max_mark) {
      fieldError[
        `${name}${stIndex}${subIndex}${cumIndex}`
      ] = `Max marks ${max_mark}`;
    }
    this.setState({
      markDetails,
      fieldError,
      open,
      alertData,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
    });
  };

  handleChangeAttendance = (e, stIndex, subIndex, id) => {
    let { markDetails, fieldError } = this.state;
    let { name, value } = e.target;
    delete fieldError[`${name}${stIndex}${subIndex}`];
    markDetails.student_list[stIndex]["subject_list"][id][name] =
      value == "false" ? "Present" : "Absent";
    delete markDetails.student_list[stIndex]["subject_list"][id]["marks"];
    markDetails.student_list[stIndex]["subject_list"][id]["total_marks"] =
      this.updateSubjectTotalMarks(
        markDetails.student_list[stIndex]["subject_list"][id]
      );
    this.setState({
      markDetails,
      fieldError,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
    });
  };

  handleChangeNoDaysAttendance = (e, stIndex) => {
    let { markDetails, fieldError } = this.state;
    let { name, value } = e.target;
    delete fieldError[`${name}${stIndex}`];
    markDetails.student_list[stIndex][name] = value;
    this.setState({
      markDetails,
      fieldError,
      submitDisable: false,
    });
  };

  handleRemarkChange = (newValue, stIndex) => {
    let { markDetails, fieldError } = this.state;
    delete fieldError[`remark${stIndex}`];
    markDetails.student_list[stIndex]["remark"] = newValue;
    this.setState({
      markDetails,
      fieldError,
      submitDisable: false,
    });
  };

  handleCumChangeAttendance = (e, stIndex, subIndex, id, cumIndex) => {
    let { markDetails, fieldError } = this.state;
    let { name, value } = e.target;
    delete fieldError[`${name}${stIndex}${subIndex}${cumIndex}`];
    markDetails.student_list[stIndex]["subject_list"][id]["cumulative_data"][
      cumIndex
    ][name] = value == "false" ? "Present" : "Absent";
    delete markDetails.student_list[stIndex]["subject_list"][id][
      "cumulative_data"
    ][cumIndex]["marks"];
    markDetails.student_list[stIndex]["subject_list"][id]["total_marks"] =
      this.updateSubjectTotalMarks(
        markDetails.student_list[stIndex]["subject_list"][id]
      );
    this.setState({
      markDetails,
      fieldError,
      submitDisable: Object.keys(fieldError).length > 0 ? true : false,
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

  onchangeSubject = (e) => {
    this.setState({
      selectedSubjectDropdown: e,
    });
  };

  handleMarkAbsent = () => {
    let { is_mark_attendance } = this.state;
    this.setState({ is_mark_attendance: !is_mark_attendance });
  };

  getUpdatedCumulative = (data) => {
    let return_data = {
      cumulative_marks: [],
      deletable_cumulative_mark_ids: [],
    };
    let delete_ids = [];
    let return_temp = {};
    if (data.cumulative_data) {
      data.cumulative_data.map((cum_data) => {
        if (cum_data?.marks || cum_data.marks == 0 || cum_data?.attendance_status === "Absent") {
          return_temp = {};
          return_temp["examschedulecumulativemapping"] = cum_data["id"];
          return_temp["marks"] = cum_data.marks
            ? parseFloat(cum_data.marks)
            : 0;
          return_temp["attendance_status"] =
            cum_data?.["attendance_status"] === "Absent" ? "Absent" : "Present";
          if (cum_data.exam_cumulative_id) {
            return_temp["id"] = cum_data.exam_cumulative_id;
          }
          return_data.cumulative_marks.push(return_temp);
        } else if (cum_data.exam_cumulative_id) {
          delete_ids.push(cum_data.exam_cumulative_id);
        }
      });
    }
    return_data["deletable_cumulative_mark_ids"] = delete_ids;
    return return_data;
  };

  validationAndPostData = () => {
    let {
      markDetails,
      fieldError,
      show_manual_attendance_in_schedule,
      show_remarks_in_marks_entry,
    } = this.state;
    let { standard_section_id } = getUrlParam();
    let validate = true;
    fieldError = {};
    let student_data = [];
    let student_temp = {};
    let subject_temp;
    let deletable_list = [];
    let cum_data = {};
    let subject_max_marks_key_value = getKeyValueMap(
      markDetails.subject_list,
      "subject",
      "max_marks"
    );
    let subject_schedule_key_value = getKeyValueMap(
      markDetails.subject_list,
      "subject",
      "schedule"
    );
    markDetails.student_list.map((student, stIndex) => {
      student_temp = { subject_list: [] };
      student_temp["student"] = student.student;
     if (show_manual_attendance_in_schedule) {
      if (
        student.marked_attendance_days !== undefined &&
        student.marked_attendance_days !== null &&
        student.marked_attendance_days !== ""
      ) {
        student_temp["marked_attendance_days"] = parseFloat(student.marked_attendance_days);
      } else if (
        student.auto_attendance_days !== undefined &&
        student.auto_attendance_days !== null &&
        student.auto_attendance_days !== ""
      ) {
        student_temp["marked_attendance_days"] = parseFloat(student.auto_attendance_days);
      } else {
        student_temp["marked_attendance_days"] = null;
      }
    }
      if (show_remarks_in_marks_entry && student?.remark?.id) {
        student_temp["remark"] = student.remark.id;
      }
      markDetails.subject_list.map((sub, subIndex) => {
        Object.keys(student.subject_list).map((subject) => {
          if (
            student.subject_list[sub.subject] &&
            student.subject_list[sub.subject].marks
          ) {
            if (
              parseFloat(student.subject_list[sub.subject].marks) >
              subject_max_marks_key_value[sub.subject]
            ) {
              fieldError[`marks${stIndex}${subIndex}`] = `Max marks ${
                subject_max_marks_key_value[sub.subject]
              }`;
              validate = false;
            }
          }
          subject_temp = {};
          if (student.subject_list[sub.subject]) {
            cum_data = {};
            subject_temp["schedule"] = subject_schedule_key_value[sub.subject];
            subject_temp["marks"] =
              student.subject_list[sub.subject].marks ||
              student.subject_list[sub.subject].marks == 0
                ? parseFloat(student.subject_list[sub.subject].marks)
                : null;
            subject_temp["attendance_status"] =
              student.subject_list[sub.subject]["attendance_status"] ===
              "Absent"
                ? "Absent"
                : "Present";
            cum_data = this.getUpdatedCumulative(
              student.subject_list[sub.subject]
            );
            subject_temp["cumulative_marks"] = cum_data.cumulative_marks;
            subject_temp["deletable_cumulative_mark_ids"] =
              cum_data.deletable_cumulative_mark_ids;
            if (
              student.subject_list[sub.subject] &&
              student.subject_list[sub.subject].id
            ) {
              subject_temp["id"] = student.subject_list[sub.subject].id;
            }
          }
        });
        if (
          student.subject_list[sub.subject] &&
          (subject_temp?.["cumulative_marks"].length > 0 ||
            student.subject_list[sub.subject].marks ||
            student.subject_list[sub.subject].marks === 0 ||
            student.subject_list[sub.subject]["attendance_status"] === "Absent")
        ) {
          student_temp["subject_list"].push(subject_temp);
        } else if (student.subject_list[sub.subject]?.grade) {
          subject_temp["grade"] = student.subject_list[sub.subject]?.grade;
          student_temp["subject_list"].push(subject_temp);
        } else if (
          student.subject_list[sub.subject] &&
          student.subject_list[sub.subject].id
        ) {
          deletable_list.push(student.subject_list[sub.subject].id);
        }
      });
      student_data.push(student_temp);
    });
    if (validate) {
      let post_data = {
        deletable_list,
        mark_details: student_data,
        standard_section: standard_section_id,
      };
      validate = post_data;
    }
    return validate;
  };

  submitMarks = (name) => {
    let post_data = this.validationAndPostData();
    if (post_data) {
      this.setState({ submitDisable: true });
      let url = POST_URL.studentmark.api;
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          if (name === "finalize") {
            this.getExamMarkDetails("finalize");
          } else {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: "Your Data has been saved",
              showConfirmButton: false,
              timer: 1500,
            });
            this.goToViewPage();
          }
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

  goToViewPage = () => {
    const { selectedExam, selectedTerm, selectedYear } = this.state;
    let sectionInformation = {
      selectedExam: selectedExam,
      selectedTerm: selectedTerm,
      selectedYear: selectedYear,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.exam_marks_enter.view.url,
      search: searchParam,
    });
  };

  validationFinalizePostData = () => {
    let { markDetails, fieldError, showCumulative } = this.state;
    let validate = true;
    fieldError = {};
    let subject_max_marks_key_value = getKeyValueMap(
      markDetails.subject_list,
      "subject",
      "max_marks"
    );
    markDetails.student_list.map((student, stIndex) => {
      markDetails.subject_list.map((sub, subIndex) => {
        Object.keys(student.subject_list).map((subject) => {
          if (
            student.subject_list[sub.subject] &&
            !Boolean(student.subject_list[sub.subject].marks) &&
            student.subject_list[sub.subject].marks != 0 &&
            student.subject_list[sub.subject].attendance_status !== "Absent" &&
            typeof sub.is_marks === "boolean" &&
            sub.is_marks === true
          ) {
            fieldError[`marks${stIndex}${subIndex}`] = `Enter Marks`;
            validate = false;
          }
          if (
            student.subject_list[sub.subject] &&
            !Boolean(student.subject_list[sub.subject].grade) &&
            student.subject_list[sub.subject].attendance_status !== "Absent" &&
            typeof sub.is_marks === "boolean" &&
            sub.is_marks === false
          ) {
            fieldError[`grade${stIndex}${subIndex}`] = `Select Grade`;
            validate = false;
          }
          if (
            student.subject_list[sub.subject] &&
            student.subject_list[sub.subject].marks
          ) {
            if (
              parseFloat(student.subject_list[sub.subject].marks) >
              subject_max_marks_key_value[sub.subject]
            ) {
              fieldError[`marks${stIndex}${subIndex}`] = `Max marks ${
                subject_max_marks_key_value[sub.subject]
              }`;
              validate = false;
            }
          }
          if (student.subject_list[sub.subject]?.cumulative_data.length > 0) {
            student.subject_list[sub.subject].cumulative_data.map(
              (cum, cumIndex) => {
                if (
                  cum.marks != 0 &&
                  !Boolean(cum.marks) &&
                  cum.attendance_status !== "Absent"
                ) {
                  fieldError[
                    `marks${stIndex}${subIndex}${cumIndex}`
                  ] = `Enter Marks`;
                  showCumulative = true;
                  validate = false;
                }
                if (
                  Boolean(cum.marks) &&
                  cum.marks > cum.max_marks &&
                  cum.attendance_status !== "Absent"
                ) {
                  fieldError[
                    `marks${stIndex}${subIndex}${cumIndex}`
                  ] = `Max marks ${cum.max_marks}`;
                  validate = false;
                  showCumulative = true;
                }
              }
            );
          }
        });
      });
    });
    this.setState({
      fieldError,
      showCumulative,
    });
    return validate;
  };

  finalizeMarks = () => {
    let validate = this.validationFinalizePostData();
    if (validate) {
      const { selectedExam, standard_section_id } = this.state;
      this.setState({ submitDisable: true });
      let url =
        POST_URL.approvestudentmark.api +
        `?exam=${selectedExam}&standard_section=${standard_section_id}`;
      postRequest(url, "", this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.goToViewPage();
        } else {
          this.setState({
            open: true,
            alertData: "Please clear the errors",
          });
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  submitAndFinalize = () => {
    const { submitDisable } = this.state;
    return Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to change marks!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Finalize it!",
    }).then(async (result) => {
      if (result.value) {
        if (submitDisable) {
          this.finalizeMarks();
        } else {
          this.submitMarks("finalize");
        }
      }
    });
  };

  handleChangeCumulative = () => {
    let { showCumulative } = this.state;
    this.setState({
      showCumulative: !showCumulative,
    });
  };

  getReasonList = () => {
    const url = GET_URL.reason.api;
    const params = { is_active: true, reason_type: "exam_student_remark" };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            reasonList: response.data.data,
          },
          () => {
            this.getExamMarkDetails();
          }
        );
      }
    });
  };

  handleDownloadMarks = () => {
    const {
      standard_name,
      section_name,
      selectedExam,
      selectedTerm,
      standard_section_id,
    } = this.state;
    this.setState({
      isLoadingDownload: true,
    });
    const url = GET_URL.studentmark.api;
    let param = {
      is_active: true,
      print_consolidated_marks: 1,
      exam: selectedExam,
      term: selectedTerm,
      standard_section: standard_section_id,
    };
    let prop = { ...this.props };
    prop.responseType = "blob";
    getRequest(url, param, prop).then((response) => {
      this.setState({ isLoadingDownload: false });
      if (response && response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `Cons - [${standard_name} - ${section_name}].xlsx`
        );
        document.body.appendChild(link);
        link.click();
      }
    });
  };

  updatePostFormat = (newData) => {
    newData.name = newData.name;
    newData.reason_type = "exam_student_remark";
    let payload = {
      reason: [newData],
    };
    return payload;
  };

  updateType = (field) => {
    let { reasonList } = this.state;
    this.setState({ reasonLoading: true }, () => {
      let temp_list = [...reasonList];
      temp_list.push(field);
      this.setState({
        reasonList: [...temp_list],
        reasonLoading: false,
      });
    });
    return true;
  };

  render() {
    let {
      open,
      alertData,
      is_mark_attendance,
      fieldError,
      markDetails,
      searchStudent,
      blank,
      selectedSubjectDropdown,
      submitDisable,
      year_name,
      term_name,
      standard_name,
      exam_name,
      section_name,
      loading,
      is_approved,
      blankData,
      showCumulative,
      isLoadingDownload,
      show_manual_attendance_in_schedule,
      show_remarks_in_marks_entry,
      reasonList,
      reasonLoading,
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
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                <Button
                  variant="contained"
                  onClick={this.goToViewPage}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.exam_marks_enter.view.label}
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
              <Box className="exam-mark-heading-box"> Exam</Box>
              <Box className=" exam-mark-add-heading-bg">{exam_name}</Box>
              <Box className="exam-mark-heading-box">{`${alias_names["standard"]}`}</Box>
              <Box className=" exam-mark-add-heading-bg">{standard_name}</Box>
              <Box className=" exam-mark-add-heading-bg">{section_name}</Box>
            </Box>
          </Box>
          {blank ? (
            <BlankPagewithIcon data={blankData} />
          ) : (
            <>
              <Grid container className="header-align">
                <Grid item md={3} xs={12} className="margin-top-10">
                  <MultipleSelectDropdown
                    data_list={markDetails.subject_list}
                    selected_list={selectedSubjectDropdown}
                    error={false}
                    label={"Select Subjects"}
                    onChange={(e) => this.onchangeSubject(e)}
                  />
                </Grid>
                {selectedSubjectDropdown.length > 0 &&
                  (is_approved ? (
                    <Grid
                      item
                      md={3}
                      xs={12}
                      className="flex-justify-center margin-top-10 pointer-event-none"
                    >
                      <Tooltip
                        title={"Marks Approved"}
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Button
                          className={"exam-enter-marks-button"}
                          style={{
                            height: "40px",
                            alignSelf: "center",
                          }}
                        >
                          <Box>Marks Approved</Box>
                        </Button>
                      </Tooltip>
                    </Grid>
                  ) : (
                    <Grid
                      item
                      md={3}
                      xs={12}
                      className="flex-justify-center margin-top-10"
                    >
                      <Tooltip
                        title={
                          is_approved ? "Cannot modify approved marks" : ""
                        }
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Button
                          className={
                            !is_mark_attendance
                              ? "exam-mark-absent-button"
                              : "exam-enter-marks-button"
                          }
                          onClick={this.handleMarkAbsent}
                          style={{
                            height: "40px",
                            alignSelf: "center",
                          }}
                        >
                          {!is_mark_attendance && <Box>Mark Absent</Box>}
                          {is_mark_attendance && <Box>Enter Marks</Box>}
                        </Button>
                      </Tooltip>
                    </Grid>
                  ))}
              </Grid>
              {is_cumulative && selectedSubjectDropdown.length > 0 && (
                <div className="display-flex">
                  <div>
                    <TextField
                      id="outlined-name"
                      value={searchStudent}
                      placeholder=""
                      label="Search Student"
                      name="searchStudent"
                      onChange={(e) => {
                        this.handleFilter(e);
                      }}
                    />
                  </div>
                  <div className="ml-30 align-self-center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showCumulative}
                          color="primary"
                          name={"showCumulative"}
                          onChange={this.handleChangeCumulative}
                        />
                      }
                      label={`Show ${alias_names["cumulative"]}`}
                    />
                  </div>
                  <div className="d-flex mt-10">
                    {isLoadingDownload && (
                      <CircularProgress className="height-width-25px" />
                    )}
                    <Button
                      className="custom-button height-fit-content ml-10"
                      onClick={
                        isLoadingDownload ? "" : this.handleDownloadMarks
                      }
                      disabled={isLoadingDownload}
                    >
                      Download Marks
                    </Button>
                  </div>
                </div>
              )}
              {selectedSubjectDropdown.length === 0 && (
                <BlankPagewithIcon data="Select subject to see the details" />
              )}
              {selectedSubjectDropdown.length > 0 && (
                <TableContainer className="mark-enter-bg header-align m-b-60px">
                  <Table
                    size="small"
                    aria-label="simple table"
                    className="exam-mark-row-table"
                  >
                    <TableHead>
                      <TableRow className="">
                        <TableCell className="selectable-table-head text-align-center">
                          Student
                        </TableCell>
                        {show_manual_attendance_in_schedule && (
                          <TableCell className="selectable-table-head text-align-center">
                            Attendance
                          </TableCell>
                        )}
                        {show_remarks_in_marks_entry && (
                          <TableCell className="selectable-table-head text-align-center">
                            Remark
                          </TableCell>
                        )}

                        {markDetails.subject_list.map((data) => {
                          return (
                            <>
                              {selectedSubjectDropdown.some(
                                (key) => key.value === data.subject
                              ) ? (
                                <>
                                  <TableCell className="selectable-table-head text-align-center">
                                    {data.subject_name}
                                  </TableCell>
                                  {showCumulative &&
                                    data.cumulative_data &&
                                    data.cumulative_data.map((cum_data) => {
                                      return (
                                        <TableCell className="selectable-table-head text-align-center"></TableCell>
                                      );
                                    })}
                                  {showCumulative &&
                                    data?.cumulative_data?.length > 0 &&
                                    is_cumulative && (
                                      <TableCell className="selectable-table-head text-align-center"></TableCell>
                                    )}
                                  {is_approved &&
                                    typeof data.is_marks === "boolean" &&
                                    data.is_marks !== false &&
                                    (is_cumulative ? (
                                      <TableCell className="selectable-table-head text-align-center"></TableCell>
                                    ) : (
                                      <TableCell className="selectable-table-head text-align-center">
                                        Grade
                                      </TableCell>
                                    ))}
                                </>
                              ) : (
                                ""
                              )}
                            </>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableHead>
                      {is_cumulative && (
                        <TableRow className="">
                          {show_manual_attendance_in_schedule && (
                            <TableCell className="cumulative-headtext-align-center"></TableCell>
                          )}
                          {show_remarks_in_marks_entry && (
                            <TableCell className="cumulative-headtext-align-center"></TableCell>
                          )}
                          <TableCell className="text-align-center padding-0"></TableCell>
                          {markDetails.subject_list.map((data) => {
                            return (
                              <>
                                {selectedSubjectDropdown.some(
                                  (key) => key.value === data.subject
                                ) ? (
                                  <>
                                    {data.cumulative_data?.length > 0 ? (
                                      ((is_approved && showCumulative) ||
                                        showCumulative) && (
                                        <TableCell className="cumulative-head text-align-center">
                                          {alias_names["written"]}
                                        </TableCell>
                                      )
                                    ) : (is_approved || showCumulative) &&
                                      typeof data.is_marks === "boolean" &&
                                      data.is_marks === false ? (
                                      <TableCell className="cumulative-head text-align-center">
                                        Grade Wise
                                      </TableCell>
                                    ) : (
                                      <TableCell className="cumulative-head text-align-center"></TableCell>
                                    )}
                                    {showCumulative &&
                                      data.cumulative_data &&
                                      data.cumulative_data.map((cum_data) => {
                                        return (
                                          <TableCell className="cumulative-head text-align-center">
                                            {cum_data.names}
                                          </TableCell>
                                        );
                                      })}
                                    {(is_approved || showCumulative) &&
                                      data.cumulative_data?.length > 0 && (
                                        <TableCell className="cumulative-head text-align-center">
                                          Total
                                        </TableCell>
                                      )}
                                    {is_approved &&
                                      data.cumulative_data?.length > 0 &&
                                      typeof data.is_marks === "boolean" &&
                                      data.is_marks !== false && (
                                        <TableCell className="cumulative-head text-align-center">
                                          Grade
                                        </TableCell>
                                      )}
                                  </>
                                ) : (
                                  ""
                                )}
                              </>
                            );
                          })}
                        </TableRow>
                      )}
                      <TableRow className="">
                        <TableCell className=""></TableCell>
                        {show_manual_attendance_in_schedule && (
                          <TableCell className="text-align-center">
                            {`Max-${markDetails.max_no_of_days_attendance} Days`}
                          </TableCell>
                        )}
                        {show_remarks_in_marks_entry && (
                          <TableCell className="text-align-center">
                            Reason
                          </TableCell>
                        )}
                        {markDetails.subject_list.map((data) => {
                          return (
                            <>
                              {selectedSubjectDropdown.some(
                                (key) => key.value === data.subject
                              ) ? (
                                <>
                                  {typeof data.is_marks === "boolean" &&
                                  data.is_marks === false ? (
                                    <TableCell className="text-align-center">
                                      {data.grade_plan_name}
                                    </TableCell>
                                  ) : (
                                    (!is_approved || showCumulative) && (
                                      <TableCell className="">{`Max-${data.max_marks} Min-${data.min_marks}`}</TableCell>
                                    )
                                  )}
                                  {showCumulative &&
                                    data.cumulative_data &&
                                    data.cumulative_data.map((cum_data) => {
                                      return (
                                        <TableCell className="">
                                          {`Max-${cum_data.max_marks} Min-${cum_data.min_marks}`}
                                        </TableCell>
                                      );
                                    })}
                                  {(is_approved || showCumulative) &&
                                    data?.cumulative_data?.length > 0 &&
                                    is_cumulative && (
                                      <TableCell className="">{`Max-${data.total_max_marks} Min-${data.total_min_marks}`}</TableCell>
                                    )}
                                  {is_approved &&
                                    typeof data.is_marks === "boolean" &&
                                    data.is_marks !== false && (
                                      <TableCell className=""></TableCell>
                                    )}
                                </>
                              ) : (
                                ""
                              )}
                            </>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody className="selectable-row-table-body">
                      {markDetails.student_list.map((student, stIndex) => {
                        return (
                          <TableRow className="selectable-row-table-row">
                            <TableCell
                              className="mark-add-table-cell"
                              component="th"
                              scope="row"
                            >
                              {student.student_name}
                            </TableCell>
                            {show_manual_attendance_in_schedule && (
                              <TableCell>
                                <TextField
                                  id="number"
                                  label=""
                                  type="text"
                                  autoComplete="off"
                                  name="marked_attendance_days"
                                  value={student.marked_attendance_days}
                                  className="schedule-exam-marks-text"
                                  onChange={(e) =>
                                    this.handleChangeNoDaysAttendance(
                                      e,
                                      stIndex
                                    )
                                  }
                                  defaultValue=""
                                  InputLabelProps={{
                                    shrink: true,
                                  }}
                                  inputProps={{
                                    max: 200,
                                    min: 0,
                                  }}
                                  helperText={
                                    fieldError[
                                      `marked_attendance_days${stIndex}`
                                    ]
                                  }
                                  error={
                                    fieldError[
                                      `marked_attendance_days${stIndex}`
                                    ]
                                  }
                                />
                              </TableCell>
                            )}
                            {show_remarks_in_marks_entry && (
                              <TableCell>
                                {reasonLoading ? (
                                  <div>
                                    <Skeleton
                                      variant="rect"
                                      className="drop-down-skeleton m-t-10px"
                                    ></Skeleton>
                                    <div>...Loading Reason List</div>
                                  </div>
                                ) : (
                                  <div className="">
                                    <DropDownWithSearchAndAddApi
                                      options={reasonList}
                                      value={student.remark}
                                      onChange={(e, newValue) =>
                                        this.handleRemarkChange(
                                          newValue,
                                          stIndex
                                        )
                                      }
                                      name="remark"
                                      label=""
                                      size="small"
                                      optionValue="name"
                                      className="width-200-px"
                                      helperText={
                                        fieldError[`remark${stIndex}`]
                                      }
                                      error={fieldError[`remark${stIndex}`]}
                                      fieldDetails={fieldDetails}
                                      postUrl={POST_URL.reason.api}
                                      variant="standard"
                                      updatePostFormat={this.updatePostFormat}
                                      updateType={this.updateType}
                                    />
                                  </div>
                                )}
                              </TableCell>
                            )}
                            {markDetails.subject_list.map(
                              (subject, subIndex) => {
                                return (
                                  <>
                                    {selectedSubjectDropdown.some(
                                      (key) => key.value === subject.subject
                                    ) ? (
                                      <>
                                        {((((showCumulative && is_approved) ||
                                          !is_approved) &&
                                          typeof subject.is_marks ===
                                            "boolean" &&
                                          subject.is_marks === true) ||
                                          !is_approved) && (
                                          <TableCell
                                            className="mark-add-table-cell"
                                            component="th"
                                            scope="row"
                                          >
                                            {Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) &&
                                              !is_mark_attendance &&
                                              typeof subject.is_marks ===
                                                "boolean" &&
                                              subject.is_marks === false &&
                                              !is_approved && (
                                                <Box className="marks-view-entered">
                                                  {student.subject_list[
                                                    subject.subject
                                                  ].attendance_status ===
                                                  "Absent" ? (
                                                    <div className="text-red">
                                                      Ab
                                                    </div>
                                                  ) : (
                                                    <Dropdown
                                                      data={
                                                        markDetails?.[
                                                          "grade_type_data"
                                                        ]?.[
                                                          subject.grade_plan
                                                        ]?.["grade_list"]
                                                      }
                                                      onChange={(e) =>
                                                        this.handleChangeGrade(
                                                          e,
                                                          stIndex,
                                                          subIndex,
                                                          subject.subject
                                                        )
                                                      }
                                                      value={
                                                        student.subject_list[
                                                          subject.subject
                                                        ].grade
                                                      }
                                                      customId="name"
                                                      name="grade"
                                                      size="small"
                                                      variant="standard"
                                                      selectClassName="m-t-0px"
                                                      style="width-100-px"
                                                      error={
                                                        fieldError[
                                                          `grade${stIndex}${subIndex}`
                                                        ] &&
                                                        fieldError[
                                                          `grade${stIndex}${subIndex}`
                                                        ]
                                                      }
                                                    />
                                                  )}
                                                </Box>
                                              )}
                                            {Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) &&
                                              !is_mark_attendance &&
                                              ((typeof subject.is_marks ===
                                                "boolean" &&
                                                subject.is_marks === true) ||
                                                typeof subject.is_marks !==
                                                  "boolean") &&
                                              !is_approved && (
                                                <TextField
                                                  id="number"
                                                  label=""
                                                  type="text"
                                                  autoComplete="off"
                                                  name="marks"
                                                  disabled={
                                                    student.subject_list[
                                                      subject.subject
                                                    ].attendance_status ==
                                                    "Absent"
                                                      ? true
                                                      : false
                                                  }
                                                  value={
                                                    student.subject_list[
                                                      subject.subject
                                                    ].attendance_status ==
                                                    "Absent"
                                                      ? "Ab"
                                                      : student.subject_list[
                                                          subject.subject
                                                        ].marks
                                                  }
                                                  className="schedule-exam-marks-text"
                                                  onChange={(e) =>
                                                    this.handleChange(
                                                      e,
                                                      stIndex,
                                                      subIndex,
                                                      subject.subject,
                                                      subject.max_marks
                                                    )
                                                  }
                                                  onBlur={(e) =>
                                                    this.handleChangeBlur(
                                                      e,
                                                      stIndex,
                                                      subIndex,
                                                      subject.subject,
                                                      subject.max_marks
                                                    )
                                                  }
                                                  defaultValue=""
                                                  InputLabelProps={{
                                                    shrink: true,
                                                  }}
                                                  inputProps={{
                                                    max: 200,
                                                    min: 0,
                                                  }}
                                                  helperText={
                                                    !fieldError[
                                                      `marks${stIndex}${subIndex}`
                                                    ]
                                                      ? ""
                                                      : fieldError[
                                                          `marks${stIndex}${subIndex}`
                                                        ]
                                                  }
                                                  error={
                                                    fieldError[
                                                      `marks${stIndex}${subIndex}`
                                                    ] &&
                                                    (fieldError[
                                                      `marks${stIndex}${subIndex}`
                                                    ]
                                                      ? true
                                                      : false)
                                                  }
                                                />
                                              )}
                                            {Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) &&
                                              !is_mark_attendance &&
                                              is_approved && (
                                                <Box className="marks-view-entered">
                                                  {student.subject_list[
                                                    subject.subject
                                                  ].attendance_status ==
                                                  "Absent" ? (
                                                    <Box className="text-red">
                                                      Ab
                                                    </Box>
                                                  ) : (
                                                    student.subject_list[
                                                      subject.subject
                                                    ].marks
                                                  )}
                                                </Box>
                                              )}
                                            {Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) &&
                                              is_mark_attendance && (
                                                <Box class="exam-mark-checkbox">
                                                  <input
                                                    type="checkbox"
                                                    id={`${stIndex}${subIndex}written`}
                                                    name="attendance_status"
                                                    defaultChecked={
                                                      student.subject_list[
                                                        subject.subject
                                                      ].attendance_status ==
                                                      "Absent"
                                                        ? true
                                                        : false
                                                    }
                                                    value={
                                                      student.subject_list[
                                                        subject.subject
                                                      ].attendance_status ==
                                                      "Absent"
                                                        ? false
                                                        : true
                                                    }
                                                    onChange={(e) =>
                                                      this.handleChangeAttendance(
                                                        e,
                                                        stIndex,
                                                        subIndex,
                                                        subject.subject
                                                      )
                                                    }
                                                  />
                                                  <label
                                                    for={`${stIndex}${subIndex}written`}
                                                  >
                                                    <span></span>
                                                  </label>
                                                </Box>
                                              )}
                                            {!Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) && (
                                              <Box className="text-bold marks-view-entered">
                                                {`N/A`}
                                              </Box>
                                            )}
                                          </TableCell>
                                        )}
                                        {showCumulative &&
                                          subject.cumulative_data &&
                                          subject.cumulative_data.map(
                                            (cum_data, cumIndex) => {
                                              return (
                                                <TableCell
                                                  className="mark-add-table-cell"
                                                  component="th"
                                                  scope="row"
                                                >
                                                  {Boolean(
                                                    student.subject_list[
                                                      subject.subject
                                                    ]
                                                  ) &&
                                                    !is_mark_attendance &&
                                                    !is_approved && (
                                                      <TextField
                                                        id="number"
                                                        label=""
                                                        type="text"
                                                        autoComplete="off"
                                                        name="marks"
                                                        disabled={
                                                          student.subject_list[
                                                            subject.subject
                                                          ].cumulative_data[
                                                            cumIndex
                                                          ].attendance_status ==
                                                          "Absent"
                                                            ? true
                                                            : false
                                                        }
                                                        value={
                                                          student.subject_list[
                                                            subject.subject
                                                          ].cumulative_data[
                                                            cumIndex
                                                          ].attendance_status ==
                                                          "Absent"
                                                            ? "Ab"
                                                            : student
                                                                .subject_list[
                                                                subject.subject
                                                              ].cumulative_data[
                                                                cumIndex
                                                              ].marks
                                                        }
                                                        className="schedule-exam-marks-text"
                                                        onChange={(e) =>
                                                          this.handleCumulativeChange(
                                                            e,
                                                            stIndex,
                                                            subIndex,
                                                            subject.subject,
                                                            cumIndex
                                                          )
                                                        }
                                                        onBlur={(e) =>
                                                          this.handleCumulativeBlur(
                                                            e,
                                                            stIndex,
                                                            subIndex,
                                                            subject.subject,
                                                            cumIndex,
                                                            cum_data.max_marks
                                                          )
                                                        }
                                                        defaultValue=""
                                                        InputLabelProps={{
                                                          shrink: true,
                                                        }}
                                                        inputProps={{
                                                          max: 200,
                                                          min: 0,
                                                        }}
                                                        helperText={
                                                          !fieldError[
                                                            `marks${stIndex}${subIndex}${cumIndex}`
                                                          ]
                                                            ? ""
                                                            : fieldError[
                                                                `marks${stIndex}${subIndex}${cumIndex}`
                                                              ]
                                                        }
                                                        error={
                                                          fieldError[
                                                            `marks${stIndex}${subIndex}${cumIndex}`
                                                          ] &&
                                                          (fieldError[
                                                            `marks${stIndex}${subIndex}${cumIndex}`
                                                          ]
                                                            ? true
                                                            : false)
                                                        }
                                                      />
                                                    )}
                                                  {Boolean(
                                                    student.subject_list[
                                                      subject.subject
                                                    ]
                                                  ) &&
                                                    !is_mark_attendance &&
                                                    is_approved && (
                                                      <Box className="marks-view-entered">
                                                        {student.subject_list[
                                                          subject.subject
                                                        ]?.cumulative_data[
                                                          cumIndex
                                                        ]?.attendance_status ==
                                                        "Absent" ? (
                                                          <Box className="text-red">
                                                            Ab
                                                          </Box>
                                                        ) : (
                                                          student.subject_list[
                                                            subject.subject
                                                          ]?.cumulative_data[
                                                            cumIndex
                                                          ].marks
                                                        )}
                                                      </Box>
                                                    )}
                                                  {Boolean(
                                                    student.subject_list[
                                                      subject.subject
                                                    ]
                                                  ) &&
                                                    is_mark_attendance && (
                                                      <Box class="exam-mark-checkbox">
                                                        <input
                                                          type="checkbox"
                                                          id={`${stIndex}${subIndex}${cumIndex}`}
                                                          name="attendance_status"
                                                          defaultChecked={
                                                            student
                                                              .subject_list[
                                                              subject.subject
                                                            ].cumulative_data[
                                                              cumIndex
                                                            ]
                                                              ?.attendance_status ==
                                                            "Absent"
                                                              ? true
                                                              : false
                                                          }
                                                          value={
                                                            student
                                                              .subject_list[
                                                              subject.subject
                                                            ].cumulative_data[
                                                              cumIndex
                                                            ]
                                                              ?.attendance_status ==
                                                            "Absent"
                                                              ? false
                                                              : true
                                                          }
                                                          onChange={(e) =>
                                                            this.handleCumChangeAttendance(
                                                              e,
                                                              stIndex,
                                                              subIndex,
                                                              subject.subject,
                                                              cumIndex
                                                            )
                                                          }
                                                        />
                                                        <label
                                                          for={`${stIndex}${subIndex}${cumIndex}`}
                                                        >
                                                          <span></span>
                                                        </label>
                                                      </Box>
                                                    )}
                                                  {!Boolean(
                                                    student.subject_list[
                                                      subject.subject
                                                    ]
                                                  ) && (
                                                    <Box className="text-bold marks-view-entered">
                                                      {`N/A`}
                                                    </Box>
                                                  )}
                                                </TableCell>
                                              );
                                            }
                                          )}
                                        {(is_approved || showCumulative) &&
                                          is_cumulative && (
                                            <TableCell
                                              className="mark-add-table-cell"
                                              component="th"
                                              scope="row"
                                            >
                                              <Box className="text-bold marks-view-entered">
                                                {student.subject_list?.[
                                                  subject.subject
                                                ]?.total_marks === 0 ||
                                                student.subject_list?.[
                                                  subject.subject
                                                ]?.total_marks
                                                  ? student.subject_list[
                                                      subject.subject
                                                    ].total_marks
                                                  : "N/A"}
                                              </Box>
                                            </TableCell>
                                          )}
                                        {is_approved && (
                                          <TableCell
                                            className="mark-add-table-cell"
                                            component="th"
                                            scope="row"
                                          >
                                            {Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) && (
                                              <Box className="text-bold marks-view-entered">
                                                {typeof subject.is_marks ===
                                                  "boolean" &&
                                                subject.is_marks === false &&
                                                student.subject_list[
                                                  subject.subject
                                                ].attendance_status ===
                                                  "Absent" ? (
                                                  <div className="text-red">
                                                    Ab
                                                  </div>
                                                ) : (
                                                  student.subject_list[
                                                    subject.subject
                                                  ].grade
                                                )}
                                              </Box>
                                            )}
                                            {!Boolean(
                                              student.subject_list[
                                                subject.subject
                                              ]
                                            ) && (
                                              <Box className="text-bold marks-view-entered">
                                                {`N/A`}
                                              </Box>
                                            )}
                                          </TableCell>
                                        )}
                                      </>
                                    ) : (
                                      ""
                                    )}
                                  </>
                                );
                              }
                            )}
                          </TableRow>
                        );
                      })}
                      {markDetails.student_list.length === 0 && (
                        <tr className="text-center font-weight-bold">
                          No Data Found
                        </tr>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {!is_approved && selectedSubjectDropdown.length > 0 && (
                <Box className="submt-button-float-bottom" mt={3}>
                  <Button
                    className={"submit margin-left-right-20"}
                    variant="contained"
                    style={{ float: "right" }}
                    disabled={Object.keys(fieldError).length > 0 ? true : false}
                    onClick={(e) => this.submitAndFinalize()}
                  >
                    Finalize
                  </Button>
                  <Button
                    className={submitDisable ? "opacity-0-5 submit" : "submit"}
                    variant="contained"
                    style={{ float: "right" }}
                    disabled={submitDisable}
                    onClick={(e) => this.submitMarks()}
                  >
                    Submit
                  </Button>
                </Box>
              )}
            </>
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
export default withRouter(ExamMarksAdd);

import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  TableContainer,
  Table,
  TableHead,
  FormControlLabel,
  Switch,
  TableCell,
  TableRow,
  TableBody,
  Tooltip,
  MenuItem,
  Checkbox,
  TextField,
  ListItemText,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { withRouter } from "react-router-dom";
import ExpandMoreOutlinedIcon from "@material-ui/icons/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@material-ui/icons/ExpandLessOutlined";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Swal from "sweetalert2";
import Snackbar from "@material-ui/core/Snackbar";
import loadingBar from "images/loading.gif";
import { cloneDeep } from "lodash";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

import ModalOptionalSubjects from "Containers/Exam/components/ModalOptionalSubjects";
import { Alert } from "Includes/functions";
import { APPROVAL_STATUS, alphabet } from "Constants";
import { Actions } from "Constants/permissions";
import {
  validateBetweenTimeAndDateRangeInArrays,
  validateBetweenTimeAndDateRangeInArraysWithSubSchedule,
} from "Containers/Exam/components/functions";
import ScheduleInputComponent from "Containers/Exam/components/ScheduleInputComponent";
import SubScheduleInputComponent from "Containers/Exam/components/SubScheduleInputComponent";
import {
  getUrlParam,
  validateDate,
  dateFormat,
  getSettingValue,
} from "Includes/functions";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { floatNumberWithTwoDecimalRegex } from "Constants/regularExpression";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import ScheduleMarksConfigModal from "./components/ScheduleMarksConfigModal";
import "./styles.scss";
import ScheduleMultipleTiming from "./components/ScheduleMultipleTiming";
import ScheduleMergeSubjects from "./components/ScheduleMergeSubjects";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import MultipleSecionsSchedule from "./components/MultipleSectionsSchedule";

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

class ScheduleExamAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      yearName: "",
      selectedYear: "",
      fieldError: {},
      helperText: {},
      standardList: [],
      isExpanded: {},
      openError: false,
      alertData: "",
      submitDisable: false,
      loading: true,
      canRequestForApprove: true,
      approvalStatus: {},
      openModalOptionalSubjects: false,
      requestApprovalError: "",
      alias_names: JSON.parse(localStorage.getItem("alias_name")),
      is_multiple_schedule: false,
      is_section_wise: false,
      gradePlanList: [],
      selectedGradePlan: "",
      selectedTotalGradePlan: "",
      showMultipleSchedule: false,
      selectedCheckBox: {},
      marksDetailDialog: false,
      multipleTimingDialog: false,
      part_type: {},
      max_no_of_days_attendance: "",
      section_list: [],
      isMultipleSectionDialog: false,
      multiSubjectList:[],
      show_manual_attendance_in_schedule: isFormDefinitionEnabled(
        "exam_configurations",
        "show_manual_attendance_in_schedule",
        1
      ),
    };
    this.schedule = React.createRef();
    this.subSchedule = React.createRef();
  }

  async componentDidMount() {
    let {
      yearName,
      selectedYear,
      examName,
      selectedExam,
      start_date,
      end_date,
      selectedTerm,
      selectedStandard,
      standardName,
      termName,
    } = getUrlParam();
    this.setState(
      {
        yearName,
        selectedYear,
        examName,
        selectedExam,
        start_date,
        end_date,
        selectedTerm,
        selectedStandard,
        standardName,
        termName,
      },
      async () => {
        try {
          let { selectedExam, selectedStandard } = this.state;
          let param = { is_active: true, exam: selectedExam };
          if (selectedStandard) {
            let temp = {};
            temp["standard"] = selectedStandard;
            param = { ...param, ...temp };
          }
          const res = await Promise.all([
            getRequest(GET_URL.schedule.api, param, this.props),
            is_grade_plan
              ? getRequest(
                  GET_URL.studentgrade.api,
                  { is_active: true },
                  this.props
                )
              : "",
          ]);
          if (is_grade_plan) {
            this.getGradePlanList(res[1]);
            this.setState({
              selectedGradePlan:
                res[0].data.data.schedule_list[0]?.grade_plan_data?.grade_plan,
              max_no_of_days_attendance:
                res[0].data.data.schedule_list[0]?.grade_plan_data
                  ?.max_no_of_days_attendance,
              selectedTotalGradePlan:
                res[0].data.data.schedule_list[0]?.grade_plan_data_for_total
                  ?.grade_plan_for_total,
            });
          }
          this.getExamStandardList(res[0]);
        } catch {
          throw Error("Promise failed");
        }
      }
    );
  }

  getExamStandardList = (response) => {
    if (response && response.status === 200) {
      if (
        response.data.data.approval_status.approval_status === "3" ||
        response.data.data.approval_status.approval_status === "1"
      ) {
        this.goToViewSchedule();
      } else {
        this.setDefaultStandardList(response.data.data);
      }
    }
  };

  getGradePlanList = (response) => {
    if (response && response.status === 200) {
      let grade_plan_map = {};
      response.data.data.map((data) => {
        grade_plan_map[data["id"]] = data;
      });
      this.setState({
        gradePlanList: response.data.data,
        grade_plan_map,
      });
    }
  };

  setDefaultStandardList = (response) => {
    let {
      is_multiple_schedule,
      selectedStandard,
      grade_plan_map,
      max_no_of_days_attendance,
    } = this.state;
    let getList = response.schedule_list;
    let part_type = {};
    response.part_type_list.map((data) => {
      part_type[data["id"]] = { list: [], id: data["id"], name: data["name"] };
    });
    let last_id = "";
    let selected_sub_ids = [];
    let selected_ids = [];
    let updated_standard_list = [];
    let standard_temp = {};
    let subject_list = {};
    let sel_standard_list = [];
    max_no_of_days_attendance = getList.map((standard) => {
      standard["selected_subject_list"] = {};
      standard["selected_subjects"] = [];
      standard_temp = {};
      subject_list = [];
      standard.expanded = true;
      standard.subject_list.map((subject) => {
        subject.isEnabled = true;
        if (is_grade_plan) {
          if (subject.marks_details) {
            subject.marks_details.selectedGrade =
              grade_plan_map[subject.grade_plan];
          } else {
            subject.marks_details = {
              selectedGrade: grade_plan_map[subject.grade_plan],
            };
          }
        }
        subject.fordate = subject?.fordate ?? null;
        if (subject.sub_schedule_list && subject.sub_schedule_list.length > 0) {
          is_multiple_schedule = true;
        }
        if (
          subject.next_subject_linking_id ||
          subject?.next_linking_id ||
          last_id == subject.id
        ) {
          last_id =
            subject?.next_subject_linking_id ?? subject?.next_linking_id ?? "";
          subject["checkedMergeSubject"] = true;
          if (subject?.next_subject_linking_id) {
            selected_sub_ids.push(subject?.next_subject_linking_id);
          }
        }
        if (subject?.next_linking_id && !selected_ids.includes(subject.id)) {
          sel_standard_list.push(subject?.id);
          selected_ids.push(subject?.next_linking_id);
          subject_list.push(subject);
        }
      });
      standard_temp["id"] = standard.id;
      standard_temp["section_name"] = standard.section_name;
      standard_temp["standard"] = standard.standard;
      standard_temp["standard_name"] = standard.standard_name;
      standard_temp["grade_plan_data"] = standard.grade_plan_data;
      standard_temp["subject_list"] = cloneDeep(subject_list);
      standard_temp["selected_subject_list"] = [];
      standard_temp["selected_subjects"] = [];
      updated_standard_list.push(standard_temp);
    });
    let section_list = [];
    updated_standard_list.map((stdData) => {
      getList.map((data) => {
        if (stdData.id === data.id) {
          section_list.push({ id: data.id, name: data.section_name });
          stdData.expanded = true;
          data.subject_list.map((sub_data) => {
            Object.keys(part_type).map((part_key) => {
              if (
                sub_data.subject_part_type_id == part_key &&
                !part_type[part_key].list.includes(sub_data.subject)
              ) {
                part_type[part_key].list.push(sub_data.subject);
              }
            });
            sub_data.isEnabled = true;
            if (selected_ids.includes(sub_data?.id)) {
              sub_data["checkedMergeSubject"] = true;
              stdData.subject_list.push(sub_data);
            } else if (selected_sub_ids.includes(sub_data.subject)) {
              sub_data["checkedMergeSubject"] = true;
              stdData.subject_list.push(sub_data);
            } else if (!sel_standard_list.includes(sub_data?.id) && sub_data) {
              stdData.subject_list.push(sub_data);
            }
          });
        }
      });
    });
    Object.keys(part_type).map((part_key) => {
      if (part_type[part_key].list.length === 0) {
        delete part_type[part_key];
      }
    });
    this.setState(
      {
        standardList: cloneDeep(updated_standard_list),
        loading: is_merge_subject ? true : false,
        is_multiple_schedule,
        is_section_wise: selectedStandard ? true : false,
        part_type,
        section_list,
      },
      () => {
        if (is_merge_subject) {
          this.updateSubjectsWithMerge();
        }
      }
    );
  };

  updateSubjectsWithMerge = (is_post) => {
    let { standardList } = this.state;
    let temp_list = cloneDeep(standardList);
    let selected_subject_list = {};
    temp_list.map((data) => {
      selected_subject_list = {};
      data.subject_list.map((sub) => {
        sub.for_date = sub.fordate
          ? dateFormat(sub.fordate, "DD-MM-YYYY")
          : null;
        delete sub.next_linking_id;
        delete sub.next_subject_linking_id;
        if (sub.refBaseId || sub.checkedMergeSubject) {
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
      data.selected_subject_list = { ...selected_subject_list };
    });
    temp_list.map((std) => {
      Object.keys(std["selected_subject_list"]).map((selected) => {
        std["selected_subject_list"][selected].map((selSub) => {
          std.subject_list.map((data) => {
            if (
              data.subject === selSub.subject &&
              selSub.next_subject_linking_id
            ) {
              data["next_linking_id"] = selSub.next_linking_id;
              data["next_subject_linking_id"] = selSub.next_subject_linking_id;
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
    this.setState(
      {
        standardList: cloneDeep(temp_list),
        loading: false,
      },
      () => {
        if (is_post) {
          this.submit();
        }
      }
    );
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
      if (isBase && data === for_date) {
        return_data = index + 1;
      } else if (data === for_date) {
        return_data = `${index + 1}${
          alphabet[selected_subject_list[data].length]
        }`;
      }
    });
    return return_data;
  };

  onChange = (e) => {
    let { name, value } = e.target;
    let { fieldError } = this.state;
    delete fieldError[name];
    this.setState({
      [name]: value,
      fieldError,
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleClickMore = (index) => {
    let { standardList } = this.state;
    standardList[index]["expanded"] = true;
    this.setState({
      standardList,
    });
  };

  handleClickLess = (index) => {
    let { standardList } = this.state;
    standardList[index]["expanded"] = false;
    this.setState({
      standardList,
    });
  };

  handleEnable = (stIndex, subIndex) => {
    let { standardList } = this.state;
    standardList[stIndex]["subject_list"][subIndex]["isEnabled"] = true;
    this.setState({
      standardList,
    });
  };

  handleChange = (e, stIndex, subIndex, max_number) => {
    let { standardList, fieldError, helperText } = this.state;
    let { name, value } = e.target;
    if (name === "start_time" || name === "end_time") {
      if (value) {
        value = value + ":" + "00";
      }
    }
    if (name === "max_marks") {
      standardList[stIndex]["subject_list"][subIndex]["min_marks"] = "";
    }
    if (
      (!floatNumberWithTwoDecimalRegex.value.test(value) ||
        parseInt(value) < 0 ||
        parseInt(value) > parseInt(max_number)) &&
      (name === "min_marks" || name === "max_marks")
    ) {
      if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
        fieldError[`${name}${stIndex}${subIndex}`] = "Invalid Marks";
      }
      this.setState({
        fieldError,
        standardList,
      });
      return;
    }
    fieldError[`${name}${stIndex}${subIndex}`] = "";
    helperText[`${name}${stIndex}${subIndex}`] = "";
    standardList[stIndex]["subject_list"][subIndex][name] = value;
    this.setState({
      standardList,
      fieldError,
      helperText,
      canRequestForApprove: false,
    });
  };

  handleSubScheduleChange = (e, stIndex, subIndex, schIndex, max_number) => {
    let { standardList, fieldError, helperText } = this.state;
    let { name, value } = e.target;
    if (name === "start_time" || name === "end_time") {
      if (value) {
        value = value + ":" + "00";
      }
    }
    if (name === "max_marks") {
      standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"][
        schIndex
      ]["min_marks"] = "";
    }
    if (
      (!floatNumberWithTwoDecimalRegex.value.test(value) ||
        parseInt(value) < 0 ||
        parseInt(value) > parseInt(max_number)) &&
      (name === "min_marks" || name === "max_marks")
    ) {
      if (!floatNumberWithTwoDecimalRegex.value.test(value)) {
        fieldError[`${name}${stIndex}${subIndex}`] = "Invalid Marks";
      }
      this.setState({
        fieldError,
        standardList,
      });
      return;
    }
    fieldError[`${name}${stIndex}${subIndex}`] = "";
    helperText[`${name}${stIndex}${subIndex}`] = "";
    standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"][
      schIndex
    ][name] = value;
    this.setState({
      standardList,
      fieldError,
      helperText,
      canRequestForApprove: false,
    });
  };

  handleDateChange = (e, stIndex, subIndex, name) => {
    let { standardList, fieldError, start_date, end_date } = this.state;
    let value = e;
    fieldError[`${name}${stIndex}${subIndex}`] = "";
    let error;
    if (value !== null) error = validateDate(value, start_date, end_date);
    if (error !== "") {
      fieldError[`${name}${stIndex}${subIndex}`] = error;
    }
    standardList[stIndex]["subject_list"][subIndex][name] = value;
    this.setState({
      standardList,
      fieldError,
    });
  };

  handleSubScheduleDateChange = (e, stIndex, subIndex, schIndex, name) => {
    let { standardList, fieldError, start_date, end_date } = this.state;
    let value = e;
    fieldError[`${name}${stIndex}${subIndex}`] = "";
    let error;
    if (value !== null) error = validateDate(value, start_date, end_date);
    if (error !== "") {
      fieldError[`${name}${stIndex}${subIndex}`] = error;
    }
    standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"][
      schIndex
    ][name] = value;
    this.setState({
      standardList,
      fieldError,
    });
  };

  handleBlurDateChange = (e, stIndex, subIndex, name) => {
    let { standardList, fieldError, start_date, end_date } = this.state;
    let value = standardList[stIndex]["subject_list"][subIndex][name];
    let error;
    if (value !== null) error = validateDate(value, start_date, end_date);
    if (error !== "") {
      fieldError[`${name}${stIndex}${subIndex}`] = error;
    }
    this.setState({
      standardList,
      fieldError,
    });
  };

  handleBlurSubScheduleDateChange = (e, stIndex, subIndex, schIndex, name) => {
    let { standardList, fieldError, start_date, end_date } = this.state;
    let value =
      standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"][
        schIndex
      ][name];
    let error;
    if (value !== null) error = validateDate(value, start_date, end_date);
    if (error !== "") {
      fieldError[`${name}${stIndex}${subIndex}`] = error;
    }
    this.setState({
      standardList,
      fieldError,
    });
  };

  validateAndGetStandardListFormat = () => {
    let {
      standardList,
      fieldError,
      helperText,
      alertData,
      alias_names,
      start_date,
      end_date,
      selectedGradePlan,
      selectedTotalGradePlan,
      max_no_of_days_attendance,
      show_manual_attendance_in_schedule,
    } = this.state;
    let errorFound = false;
    let name = "";
    let forDate_error;
    alertData = "Clear errors";
    if (show_manual_attendance_in_schedule && !max_no_of_days_attendance) {
      fieldError["max_no_of_days_attendance"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      errorFound = true;
    }
    standardList.map((standard, stIndex) => {
      let updatedStandardList;
      updatedStandardList = validateBetweenTimeAndDateRangeInArrays(
        standard.subject_list,
        "start_time",
        "end_time",
        "fordate",
        "subject_name",
        alias_names
      );
      updatedStandardList.map((subject, subIndex) => {
        if (subject.fordate) {
          forDate_error = validateDate(subject.fordate, start_date, end_date);
          if (forDate_error !== "") {
            fieldError[`fordate${stIndex}${subIndex}`] = forDate_error;
            errorFound = true;
          } else {
            subject.fordate = dateFormat(subject.fordate, "YYYY-MM-DD");
          }
        } else if (subject.refBaseId && !subject.fordate) {
          fieldError[`fordate${stIndex}${subIndex}`] = `For date is mandatory`;
          errorFound = true;
        } else {
          subject["fordate"] = null;
        }
        if (subject.min_marks || subject.max_marks) {
          if (
            !floatNumberWithTwoDecimalRegex.value.test(subject.min_marks) ||
            parseInt(subject.min_marks) < 0 ||
            parseInt(subject.min_marks) > parseInt(subject.max_marks)
          ) {
            if (!floatNumberWithTwoDecimalRegex.value.test(subject.min_marks)) {
              fieldError[`min_marks${stIndex}${subIndex}`] = "Invalid Marks";
              errorFound = true;
            } else {
              fieldError[
                `min_marks${stIndex}${subIndex}`
              ] = `Max ${subject.max_marks} Mark`;
              errorFound = true;
            }
          }
          if (
            !floatNumberWithTwoDecimalRegex.value.test(subject.max_marks) ||
            parseInt(subject.max_marks) < 0 ||
            parseInt(subject.max_marks) < parseInt("1")
          ) {
            if (!floatNumberWithTwoDecimalRegex.value.test(subject.max_marks)) {
              fieldError[`max_marks${stIndex}${subIndex}`] = "Invalid Marks";
              errorFound = true;
            } else {
              fieldError[`max_marks${stIndex}${subIndex}`] = `Min 1 Mark`;
              errorFound = true;
            }
          }
        }
        if (subject?.marks_details?.selectedGrade) {
          subject.is_marks = false;
          subject.grade_plan = subject?.marks_details?.selectedGrade?.id;
        } else {
          subject.is_marks = true;
          subject.grade_plan = null;
        }
        if (subject.start_time || subject.end_time) {
          name = standard.standard_name
            ? standard.standard_name
            : standard.section_name;
          if (!subject.fordate) {
            fieldError[`fordate${stIndex}${subIndex}`] =
              "For date is mandatory";
            alertData = `For Date is Mandatory for ${name} ${subject.subject_name}`;
            errorFound = true;
          }
          if (!subject.start_time) {
            helperText[`start_time${stIndex}${subIndex}`] = "Mandatory";
            fieldError[`start_time${stIndex}${subIndex}`] = "Mandatory";
            alertData = `Start Time is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
          if (!subject.end_time) {
            helperText[`end_time${stIndex}${subIndex}`] = "Mandatory";
            fieldError[`end_time${stIndex}${subIndex}`] = "Mandatory";
            alertData = `End Time is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
        }
        if (subject.min_marks || subject.max_marks) {
          if (!subject.min_marks && subject.min_marks !== 0) {
            fieldError[`min_marks${stIndex}${subIndex}`] = "Mandatory";
            alertData = `Min Marks is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
          if (!subject.max_marks) {
            fieldError[`max_marks${stIndex}${subIndex}`] = "Mandatory";
            alertData = `Max Marks is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
        }
        if (!subject.start_time) {
          delete subject["start_time"];
        }
        if (!subject.end_time) {
          delete subject["end_time"];
        }
        if (!subject.min_marks && subject.min_marks !== 0) {
          delete subject["min_marks"];
        }
        if (!subject.max_marks) {
          delete subject["max_marks"];
        }
        if (subject.start_time && subject.fordate_error) {
          fieldError[
            `fordate${stIndex}${subIndex}`
          ] = `${subject.fordate_error}`;
          fieldError[
            `start_time${stIndex}${subIndex}`
          ] = `${subject.fordate_error}`;
          fieldError[
            `end_time${stIndex}${subIndex}`
          ] = `${subject.fordate_error}`;
          alertData = ` ${name} - ${subject.fordate_error}`;
          errorFound = true;
        }
        if (subject.sub_schedule_list) {
          subject.sub_schedule_list.map((sub_schedule, schIndex) => {
            if (sub_schedule.fordate) {
              sub_schedule.fordate = dateFormat(
                sub_schedule.fordate,
                "YYYY-MM-DD"
              );
            }
          });
        }
        if (subject.sub_schedule_list) {
          subject.is_sub_schedule = true;
        } else {
          subject.is_sub_schedule = false;
        }
        if (
          is_grade_plan &&
          !selectedGradePlan &&
          standard.grade_plan_data?.id
        ) {
          standard.delete_gradeexamschedule_id = standard.grade_plan_data?.id;
        } else if (is_grade_plan && selectedGradePlan) {
          standard.grade_plan = selectedGradePlan;
          if (standard.grade_plan_data?.id) {
            standard.grade_plan_mapping_id = standard.grade_plan_data?.id;
          }
        }
        if (show_manual_attendance_in_schedule) {
          standard.max_no_of_days_attendance = parseFloat(
            max_no_of_days_attendance
          );
        }
        if (
          is_grade_plan &&
          !selectedTotalGradePlan &&
          standard.grade_plan_for_total?.id
        ) {
          standard.delete_gradeexamschedule_id =
            standard.grade_plan_for_total?.id;
        } else if (is_grade_plan && selectedTotalGradePlan) {
          standard.grade_plan_for_total = selectedTotalGradePlan;
          if (standard.grade_plan_for_total?.id) {
            standard.grade_plan_mapping_id = standard.grade_plan_for_total?.id;
          }
        }
        if (
          standardList.length === stIndex + 1 &&
          updatedStandardList.length === subIndex + 1
        ) {
          delete standard.grade_plan_data;
        }
        delete subject.checkedMergeSubject;
        delete subject.checked;
        delete subject.fordate_error;
        delete subject.for_date;
        delete subject.for_date;
        if (updatedStandardList.length === subIndex + 1) {
          delete standard.selected_subject_list;
        }
      });
    });
    if (errorFound) {
      this.setState({
        fieldError,
        helperText,
        openError: true,
        alertData,
      });
      return false;
    } else {
      return standardList;
    }
  };

  handleSubmit = () => {
    if (is_merge_subject) {
      this.updateSubjectsWithMerge(true);
    } else {
      this.submit();
    }
  };

  submit = (name) => {
    let { selectedExam, fieldError, standardName } = this.state;
    let standard_list = this.validateAndGetStandardListFormat();
    if (!standard_list || Object.keys(fieldError).length > 0) return;
    let post_data = {};
    let standard_section_list = standard_list;
    if (standardName) {
      post_data = {
        exam: selectedExam,
        standard_section_list,
      };
    } else {
      post_data = {
        exam: selectedExam,
        standard_list,
      };
    }
    let url = POST_URL.schedule.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        if (name === "approve") {
          this.handleValidateNotScheduled();
        } else {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.goToViewSchedule();
        }
      }
      this.setState({ submitDisable: false });
    });
  };

  goToViewSchedule = () => {
    let { selectedExam, selectedTerm, selectedStandard } = this.state;
    let currentExamInformation = {
      selectedExam: selectedExam,
      selectedTerm: selectedTerm,
    };
    if (selectedStandard) {
      currentExamInformation["standard"] = selectedStandard;
    }
    let searchParam =
      "?" + new URLSearchParams(currentExamInformation).toString();
    this.props.history.push({
      pathname: Actions.schedule_exam.view.url,
      search: searchParam,
    });
  };

  handleClose = () => {
    this.setState({
      openError: false,
    });
  };

  requestForApprove = () => {
    const { selectedExam } = this.state;
    let post_data = {
      approval_status: APPROVAL_STATUS.pending,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;
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
        this.goToViewSchedule();
      } else {
        this.setState({
          requestApprovalError: response,
        });
      }
    });
  };

  handleValidateNotScheduled = () => {
    let {
      standardList,
      fieldError,
      optionalSubjects,
      helperText,
      alertData,
      openError,
      openModalOptionalSubjects,
      selectedTotalGradePlan,
      selectedGradePlan,
    } = this.state;
    fieldError = {};
    let errorFound = false;
    optionalSubjects = false;
    let standardNotScheduled = "";
    let name = "";
    standardList.map((standard, stIndex) => {
      standard.isSubjectScheduled = false;
      standard.subject_list.map((subject, subIndex) => {
        name = standard.standard_name
          ? standard.standard_name
          : standard.section_name;
        subject.isEnabled = false;
        if (
          subject.fordate ||
          subject.start_time ||
          subject.end_time ||
          subject.max_marks
        ) {
          subject.isEnabled = true;
          standard.isSubjectScheduled = true;
        } else {
          standard.optionalSubjects = true;
          optionalSubjects = true;
        }
        if (subject.isEnabled) {
          if (!subject.fordate) {
            fieldError[`fordate${stIndex}${subIndex}`] = "Mandatory";
            alertData = `For Date is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
          if (!subject.start_time) {
            helperText[`start_time${stIndex}${subIndex}`] = "Mandatory";
            fieldError[`start_time${stIndex}${subIndex}`] = "Mandatory";
            alertData = `Start Time is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
          if (!subject.end_time) {
            helperText[`end_time${stIndex}${subIndex}`] = "Mandatory";
            fieldError[`end_time${stIndex}${subIndex}`] = "Mandatory";
            alertData = `End Time is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
          if (!subject.min_marks) {
            fieldError[`min_marks${stIndex}${subIndex}`] = "Mandatory";
            alertData = `Min Marks is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
          if (!subject.max_marks) {
            fieldError[`max_marks${stIndex}${subIndex}`] = "Mandatory";
            alertData = `Max Marks is Mandatory for ${name} ${subject.subject_name}`;
            if (errorFound) alertData = "Clear errors";
            errorFound = true;
          }
        }
      });
      if (errorFound) {
        standard.expanded = true;
      }
      if (!standard.isSubjectScheduled && !errorFound) {
        standardNotScheduled = standardNotScheduled + " " + name;
        errorFound = true;
        alertData = ` At least one subject should be scheduled in ${name}`;
      }
    });
    if (errorFound) {
      openError = true;
    }
    if (optionalSubjects && !errorFound) {
      openModalOptionalSubjects = true;
    }
    if (!optionalSubjects && !errorFound) {
      this.requestForApprove();
    }
    this.setState({
      fieldError,
      helperText,
      alertData,
      openError,
      standardList,
      optionalSubjects,
      openModalOptionalSubjects,
    });
    return errorFound;
  };

  handleCloseModal = () => {
    this.setState({
      openModalOptionalSubjects: false,
    });
  };

  getAliasLanguage = (sequence) => {
    let return_value;
    let { alias_names } = this.state;
    if (sequence == 1) {
      return_value = alias_names["first_language"];
    } else if (sequence == 2) {
      return_value = alias_names["second_language"];
    } else if (sequence == 3) {
      return_value = alias_names["third_language"];
    }
    return return_value;
  };

  handleChangeMultipleSchedule = () => {
    let { is_multiple_schedule } = this.state;
    this.setState({
      is_multiple_schedule: !is_multiple_schedule,
    });
  };

  handleAddAnotherSchedule = (stIndex, subIndex) => {
    let { standardList } = this.state;
    let schedule_temp = { fordate: null, start_time: "", end_time: "" };
    if (
      standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"] ===
      undefined
    ) {
      standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"] = [];
    }
    standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"].push(
      schedule_temp
    );
    this.setState(
      {
        standardList,
      },
      () => {
        this.subSchedule.current.setDefaultValues();
      }
    );
  };

  handleDeleteSchedule = (stIndex, subIndex, schIndex) => {
    let { standardList } = this.state;
    standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"].splice(
      schIndex,
      1
    );
    this.setState({
      standardList,
    });
  };

  updateParent = (
    standardListTemp,
    stIndex,
    subIndex,
    fieldError,
    helperText
  ) => {
    let { standardList } = this.state;
    standardList[stIndex]["subject_list"][subIndex] = {
      ...standardList[stIndex]["subject_list"][subIndex],
      ...standardListTemp[stIndex]["subject_list"][subIndex],
    };
    // standardList[stIndex]['subject_list'][subIndex]['fordate'] = standardListTemp[stIndex]['subject_list'][subIndex]['fordate']
    // standardList[stIndex]['subject_list'][subIndex]['start_time'] = standardListTemp[stIndex]['subject_list'][subIndex]['start_time']
    // standardList[stIndex]['subject_list'][subIndex]['end_time'] = standardListTemp[stIndex]['subject_list'][subIndex]['end_time']
    // standardList[stIndex]['subject_list'][subIndex]['max_marks'] = standardListTemp[stIndex]['subject_list'][subIndex]['max_marks']
    // standardList[stIndex]['subject_list'][subIndex]['min_marks'] = standardListTemp[stIndex]['subject_list'][subIndex]['min_marks']
    // standardList[stIndex]['subject_list'][subIndex]['checked'] = standardListTemp[stIndex]['subject_list'][subIndex]['checked']
    this.setState(
      {
        standardList,
        fieldError: fieldError,
        helperText: helperText,
        canRequestForApprove: false,
      },
      () => {
        this.validate(stIndex);
        this.validateAndHandleCheckBox();
      }
    );
  };

  validateTiming = () => {
    let { standardList, fieldError } = this.state;
    this.setState(
      {
        fieldError: {},
        helperText: {},
      },
      () => {
        standardList.map((std, index) => {
          this.validate(index);
        });
      }
    );
  };

  validateAndHandleCheckBox = (configDetails = {}) => {
    let { standardList, selectedCheckBox } = this.state;
    selectedCheckBox = {};
    let is_all_checked = true;
    standardList.map((stdData, stIndex) => {
      is_all_checked = true;
      stdData.subject_list.map((subData, subIndex) => {
        if (configDetails.index === stIndex) {
          if (configDetails.makeChecked) {
            subData.checked = true;
          } else if (configDetails.makeUnchecked) {
            subData.checked = false;
          }
        }
        if (subData.checked) {
          if (!selectedCheckBox[stIndex]) {
            selectedCheckBox[stIndex] = [];
          }
          selectedCheckBox[stIndex].push(subIndex);
        } else {
          is_all_checked = false;
        }
        stdData.isAllSubjectSelected = is_all_checked;
      });
      if (configDetails.makeChecked) {
        stdData.expanded = true;
      } else if (configDetails.makeUnchecked) {
        stdData.expanded = false;
      }
    });
    this.setState({
      selectedCheckBox: cloneDeep(selectedCheckBox),
      standardList,
    });
  };

  updateSubScheduleParent = (
    standardListTemp,
    stIndex,
    subIndex,
    schIndex,
    fieldError,
    helperText
  ) => {
    let { standardList } = this.state;
    standardList[stIndex]["subject_list"][subIndex]["sub_schedule_list"][
      schIndex
    ] =
      standardListTemp[stIndex]["subject_list"][subIndex]["sub_schedule_list"][
        schIndex
      ];
    this.setState(
      {
        standardList,
        fieldError: fieldError,
        helperText: helperText,
        canRequestForApprove: false,
      },
      () => {
        this.validateSubSchedule(stIndex);
      }
    );
  };

  validate = (stIndex) => {
    let { standardList, fieldError, alias_names } = this.state;
    let standard = standardList[stIndex];
    let updatedStandardList = validateBetweenTimeAndDateRangeInArrays(
      standard.subject_list,
      "start_time",
      "end_time",
      "fordate",
      "subject_name",
      alias_names
    );
    updatedStandardList.map((subject, subIndex) => {
      delete fieldError[`fordate${stIndex}${subIndex}`];
      delete fieldError[`start_time${stIndex}${subIndex}`];
      delete fieldError[`end_time${stIndex}${subIndex}`];
      if (subject.refBaseId && !subject.fordate) {
        fieldError[`fordate${stIndex}${subIndex}`] = `This field is mandatory`;
      }
      if (subject.fordate_error) {
        fieldError[
          `fordate${stIndex}${subIndex}`
        ] = ` ${subject.fordate_error}`;
        if (subject.start_time)
          fieldError[
            `start_time${stIndex}${subIndex}`
          ] = ` ${subject.fordate_error}`;
        if (subject.end_time)
          fieldError[
            `end_time${stIndex}${subIndex}`
          ] = ` ${subject.fordate_error}`;
        if (subIndex > 2) {
          standardList[stIndex]["expanded"] = true;
        }
      }
    });
    this.setState({
      fieldError,
      standardList,
    });
  };

  validateSubSchedule = (stIndex) => {
    let { standardList, fieldError, alias_names } = this.state;
    let standard = standardList[stIndex];
    let updatedStandardList =
      validateBetweenTimeAndDateRangeInArraysWithSubSchedule(
        standard.subject_list,
        "start_time",
        "end_time",
        "fordate",
        "subject_name",
        alias_names
      );
    updatedStandardList.map((subject, subIndex) => {
      fieldError[`fordate${stIndex}${subIndex}`] = "";
      fieldError[`start_time${stIndex}${subIndex}`] = "";
      fieldError[`end_time${stIndex}${subIndex}`] = "";
      if (subject.fordate_error) {
        fieldError[`fordate${stIndex}${subIndex}`] = `${subject.fordate_error}`;
        if (subject.start_time)
          fieldError[
            `start_time${stIndex}${subIndex}`
          ] = `${subject.fordate_error}`;
        if (subject.end_time)
          fieldError[
            `end_time${stIndex}${subIndex}`
          ] = `${subject.fordate_error}`;
        if (subIndex > 2) {
          standardList[stIndex]["expanded"] = true;
        }
      }
      if (subject.sub_schedule_list) {
        subject.sub_schedule_list.map((sub_schedule, schIndex) => {
          fieldError[`fordate${stIndex}${subIndex}${schIndex}`] = "";
          fieldError[`start_time${stIndex}${subIndex}${schIndex}`] = "";
          fieldError[`end_time${stIndex}${subIndex}${schIndex}`] = "";
          if (sub_schedule.fordate_error) {
            fieldError[
              `fordate${stIndex}${subIndex}${schIndex}`
            ] = `${sub_schedule.fordate_error}`;
            if (sub_schedule.start_time)
              fieldError[
                `start_time${stIndex}${subIndex}${schIndex}`
              ] = `${sub_schedule.fordate_error}`;
            if (sub_schedule.end_time)
              fieldError[
                `end_time${stIndex}${subIndex}${schIndex}`
              ] = `${sub_schedule.fordate_error}`;
          }
        });
      }
    });
    this.setState(
      {
        fieldError,
        standardList,
      },
      () => {
        this.subSchedule.current.setDefaultValues();
      }
    );
  };

  handleOpenMarksConfigModal = () => {
    this.setState({
      marksDetailDialog: !this.state.marksDetailDialog,
    });
  };

  handleOpenTiming = () => {
    this.setState({
      multipleTimingDialog: !this.state.multipleTimingDialog,
    });
  };

  getDeletableIds = (cumulative_details) => {
    let return_data = null;
    if (cumulative_details && cumulative_details.length > 0) {
      return_data = [];
      cumulative_details.map((cumData) => {
        if (cumData["id"]) {
          return_data.push(cumData["id"]);
        }
      });
    }
    return return_data;
  };

  updateMarksCumulative = (marks_details, cumulative_details) => {
    let { standardList, selectedCheckBox } = this.state;
    Object.keys(selectedCheckBox).map((selStdIndex) => {
      selectedCheckBox[selStdIndex].map((subIndex) => {
        if (
          this.getDeletableIds(
            standardList[selStdIndex]["subject_list"][subIndex][
              "cumulative_mapping"
            ]
          )
        ) {
          standardList[selStdIndex]["subject_list"][subIndex][
            "deletable_cumulative_mapping"
          ] = this.getDeletableIds(
            standardList[selStdIndex]["subject_list"][subIndex][
              "cumulative_mapping"
            ]
          );
        }
        standardList[selStdIndex]["subject_list"][subIndex]["marks_details"] =
          marks_details;
        standardList[selStdIndex]["subject_list"][subIndex][
          "cumulative_mapping"
        ] = cumulative_details ? cumulative_details : [];
        standardList[selStdIndex]["subject_list"][subIndex]["total_max_marks"] =
          marks_details.total_max_marks;
        standardList[selStdIndex]["subject_list"][subIndex]["total_min_marks"] =
          marks_details.total_min_marks;
        standardList[selStdIndex]["subject_list"][subIndex]["max_marks"] =
          marks_details.written_max_marks;
        standardList[selStdIndex]["subject_list"][subIndex]["min_marks"] =
          marks_details.written_min_marks;
      });
    });
    this.setState(
      {
        standardList,
        marksDetailDialog: false,
      },
      () => {
        this.validateTiming();
      }
    );
  };

  handleSelectAllSubject = (stIndex) => {
    let { standardList } = this.state;
    standardList[stIndex]["isAllSubjectSelected"] =
      !standardList[stIndex]["isAllSubjectSelected"];
    this.setState(
      {
        standardList,
      },
      () => {
        if (standardList[stIndex]["isAllSubjectSelected"]) {
          this.validateAndHandleCheckBox({ makeChecked: true, index: stIndex });
        } else {
          this.validateAndHandleCheckBox({
            makeUnchecked: true,
            index: stIndex,
          });
        }
      }
    );
  };

  updateTimingDetails = (timingDetails) => {
    let { standardList, selectedCheckBox } = this.state;
    Object.keys(selectedCheckBox).map((selStdIndex) => {
      selectedCheckBox[selStdIndex].map((subIndex) => {
        standardList[selStdIndex]["subject_list"][subIndex]["start_time"] =
          timingDetails.start_time;
        standardList[selStdIndex]["subject_list"][subIndex]["end_time"] =
          timingDetails.end_time;
      });
    });
    this.setState(
      {
        standardList,
        multipleTimingDialog: false,
      },
      () => {
        this.validateTiming();
      }
    );
  };

  updateMergeSubjects = (updateMergeRequest) => {
    this.setState(
      {
        standardList: cloneDeep(updateMergeRequest),
        mergeSubjectsOpen: false,
      },
      () => {
        this.validateTiming();
        this.validateAndHandleCheckBox();
      }
    );
  };

  handleClearData = () => {
    Swal.fire({
      title: `<strong>Are you sure want to clear the data</strong>`,
      text: "You won't be able to revert!",
      type: "info",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "Clear",
      cancelButtonText: "Cancel",
      confirmButtonColor: "green",
      cancelButtonColor: "orange",
    }).then((result) => {
      if (result.value) {
        let { standardList, selectedCheckBox } = this.state;
        let tempStandardList = [...standardList];
        Object.keys(selectedCheckBox).map((selStdIndex) => {
          selectedCheckBox[selStdIndex].map((subIndex) => {
            if (
              this.getDeletableIds(
                tempStandardList[selStdIndex]["subject_list"][subIndex][
                  "cumulative_mapping"
                ]
              )
            ) {
              tempStandardList[selStdIndex]["subject_list"][subIndex][
                "deletable_cumulative_mapping"
              ] = this.getDeletableIds(
                tempStandardList[selStdIndex]["subject_list"][subIndex][
                  "cumulative_mapping"
                ]
              );
            }
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "cumulative_mapping"
            ] = [];
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "total_max_marks"
            ] = "";
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "total_min_marks"
            ] = "";
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "max_marks"
            ] = "";
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "min_marks"
            ] = "";
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "start_time"
            ] = "";
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "end_time"
            ] = "";
            tempStandardList[selStdIndex]["subject_list"][subIndex]["fordate"] =
              null;
            tempStandardList[selStdIndex]["subject_list"][subIndex][
              "deleted"
            ] = true;
            delete tempStandardList[selStdIndex]["subject_list"][subIndex]
              .checkedMergeSubject;
            delete tempStandardList[selStdIndex]["subject_list"][subIndex]
              .checked;
            delete tempStandardList[selStdIndex]["subject_list"][subIndex][
              "refId"
            ];
            delete tempStandardList[selStdIndex]["subject_list"][subIndex][
              "refBaseId"
            ];
            delete tempStandardList[selStdIndex]["subject_list"][subIndex][
              "next_subject_linking_id"
            ];
          });
          tempStandardList[selStdIndex]["isAllSubjectSelected"] = false;
        });
        this.setState({
          standardList: cloneDeep(tempStandardList),
          marksDetailDialog: false,
          fieldError: {},
        });
      }
    });
  };

  handleMergeSubjectsDialog = () => {
    this.setState({
      mergeSubjectsOpen: !this.state.mergeSubjectsOpen,
    });
  };

  getSubjectFormat = (standard, stIndex, part) => {
    let {
      standardList,
      fieldError,
      start_date,
      end_date,
      helperText,
      is_multiple_schedule,
      part_type,
      gradePlanList,
    } = this.state;
    return (
      <TableBody>
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
            <TableCell className="" component="th" scope="row"></TableCell>
          </TableRow>
        )}
        {standard.subject_list.map((subject, subIndex) => {
          return (
            <>
              {part_type[part]["list"].includes(subject.subject) && (
                <>
                  <TableRow
                    key={subIndex}
                    className={
                      !standard.expanded && subIndex > 2
                        ? "display-none"
                        : "schedule-exam-subject-name-box"
                    }
                  >
                    <ScheduleInputComponent
                      subject={subject}
                      start_date={start_date}
                      end_date={end_date}
                      stIndex={stIndex}
                      subIndex={subIndex}
                      fieldError={fieldError}
                      helperText={helperText}
                      standardList={standardList}
                      is_multiple_schedule={is_multiple_schedule}
                      getAliasLanguage={this.getAliasLanguage}
                      updateParent={this.updateParent}
                      handleEnable={this.handleEnable}
                      handleAddAnotherSchedule={this.handleAddAnotherSchedule}
                      ref={this.schedule}
                      gradePlanList={gradePlanList}
                    />
                  </TableRow>
                  {is_multiple_schedule &&
                    subject.sub_schedule_list &&
                    subject.sub_schedule_list.map((schedule, schIndex) => {
                      return (
                        <TableRow>
                          <SubScheduleInputComponent
                            start_date={start_date}
                            end_date={end_date}
                            stIndex={stIndex}
                            schIndex={schIndex}
                            subIndex={subIndex}
                            fieldError={fieldError}
                            helperText={helperText}
                            standardList={standardList}
                            updateSubScheduleParent={
                              this.updateSubScheduleParent
                            }
                            handleEnable={this.handleEnable}
                            ref={this.subSchedule}
                            handleDeleteSchedule={this.handleDeleteSchedule}
                          />
                        </TableRow>
                      );
                    })}
                </>
              )}
            </>
          );
        })}
      </TableBody>
    );
  };

  handleChangeSubject = (e) => {};

  handleOpenMultipleSections = () => {
    let { standardList, multiSubjectList } = this.state;
    let sectionList = {};
    standardList.map((standard) => {
      standard.subject_list.map((subject) => {
        if (!sectionList[subject.subject]) {
          sectionList[subject.subject] = {
            name: "",
            subject_name: subject.subject_name,
            subject_id: subject.subject,
            sectionIds: [],
            sectionNames: [],
            subject: subject,
          };
        }
        if (sectionList[subject.subject]) {
          if (sectionList[subject.subject].sectionIds.includes(standard.id)) {
            subject.hide = true;
          } else {
            sectionList[subject.subject].sectionIds.push(standard.id);
            sectionList[subject.subject].sectionNames.push(standard.section_name);
            sectionList[subject.subject].name =
              sectionList[subject.subject].sectionNames.join(", ");
          }
        }
      });
    });
    Object.keys(sectionList).map((data)=>{
      multiSubjectList.push(sectionList[data])
    })
    this.setState({
      isMultipleSectionDialog: !this.state.isMultipleSectionDialog,
      multiSubjectList
    });
  };

  render() {
    let {
      examName,
      openModalOptionalSubjects,
      standardList,
      fieldError,
      start_date,
      end_date,
      submitDisable,
      selectedTotalGradePlan,
      openError,
      alertData,
      loading,
      requestApprovalError,
      selectedGradePlan,
      standardName,
      yearName,
      termName,
      is_multiple_schedule,
      gradePlanList,
      showMultipleSchedule,
      selectedCheckBox,
      marksDetailDialog,
      multipleTimingDialog,
      mergeSubjectsOpen,
      part_type,
      max_no_of_days_attendance,
      show_manual_attendance_in_schedule,
      isMultipleSectionDialog,
      multiSubjectList,
      helperText
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <div>
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={8} xs={12} className="header-align">
                <Box className="heading">Schedule Exam</Box>
              </Grid>
              <Grid item md={4} xs={12}>
                <Box className="header-align end-flex-prop">
                  <Button
                    variant="contained"
                    onClick={this.goToViewSchedule}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.schedule_exam.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Box className="md-down-justify-start md-up-justify-start mb-y-20 margin-top-10">
              <Box className="year-std-box mr-40">
                <Box className=" exam-mark-add-heading-bg">{yearName}</Box>
                <Box className="academic-std-head">From</Box>
                <Box className=" exam-mark-add-heading-bg">
                  {dateFormat(start_date, "DD-MM-YYYY")}
                </Box>
                <Box className="academic-std-head">To</Box>
                <Box className=" exam-mark-add-heading-bg">
                  {dateFormat(end_date, "DD-MM-YYYY")}
                </Box>
                <Box className="exam-mark-heading-box"> Exam</Box>
                <Box className=" exam-mark-add-heading-bg">{termName}</Box>
                <Box className=" exam-mark-add-heading-bg">{examName}</Box>
                {standardName && (
                  <Box className="exam-mark-heading-box">
                    {`${alias_names["standard"]}`}
                  </Box>
                )}
                {standardName && (
                  <Box className=" exam-mark-add-heading-bg">
                    {standardName}
                  </Box>
                )}
              </Box>
            </Box>
            <Box className="margin-top-20 display-flex justify-content-space-between">
              <div>
                {is_merge_subject && (
                  <div>
                    <Tooltip
                      title={
                        "Merge subjects for same date to show case in hall ticket"
                      }
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className={"custom-button"}
                        onClick={() => this.handleMergeSubjectsDialog()}
                      >
                        Merge Subjects
                      </Button>
                    </Tooltip>
                  </div>
                )}
                <div className="display-flex align-self-end mt-10">
                  <div>
                    <Tooltip
                      title={"Select multiple subjects to enter marks config"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className={
                          Object.keys(selectedCheckBox).length > 0
                            ? "custom-button"
                            : "custom-button disabled-button"
                        }
                        onClick={
                          Object.keys(selectedCheckBox).length > 0
                            ? () => this.handleOpenMarksConfigModal()
                            : ""
                        }
                      >
                        Enter Marks Details
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="ml-10">
                    <Tooltip
                      title={"Select multiple subjects to enter timing"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className={
                          Object.keys(selectedCheckBox).length > 0
                            ? "custom-button"
                            : "custom-button disabled-button"
                        }
                        onClick={
                          Object.keys(selectedCheckBox).length > 0
                            ? () => this.handleOpenTiming()
                            : ""
                        }
                      >
                        Enter Timing
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="">
                    <Tooltip
                      title={"Select multiple subjects to clear data"}
                      enterDelay={400}
                      enterNextDelay={400}
                      placement="top-start"
                      classes={{ tooltip: "tooltip-show-data" }}
                    >
                      <Button
                        className={
                          Object.keys(selectedCheckBox).length > 0
                            ? "apply-leave-reset-button "
                            : "apply-leave-reset-button disabled-button"
                        }
                        onClick={
                          Object.keys(selectedCheckBox).length > 0
                            ? () => this.handleClearData()
                            : ""
                        }
                      >
                        Clear Data
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div>
                {showMultipleSchedule && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={is_multiple_schedule}
                        name="is_multiple_schedule"
                        value={is_multiple_schedule}
                        color="primary"
                        onChange={() => this.handleChangeMultipleSchedule()}
                      />
                    }
                    label="Is Multiple Schedule"
                  />
                )}
              </div>
              <div className="mt-10 d-flex">
                {is_grade_plan && (
                  <Paper className="mr-10 height-fit-content">
                    <Dropdown
                      data={gradePlanList}
                      name="selectedTotalGradePlan"
                      className={"width-300px"}
                      value={selectedTotalGradePlan}
                      onChange={this.onChange}
                      label="Total Grade Plan"
                      error={
                        fieldError.selectedTotalGradePlan &&
                        fieldError.selectedTotalGradePlan
                      }
                      helperText={
                        fieldError.selectedTotalGradePlan &&
                        fieldError.selectedTotalGradePlan
                      }
                      size="small"
                    />
                  </Paper>
                )}
                {is_grade_plan && (
                  <Paper className="ml-10 height-fit-content">
                    <Dropdown
                      data={gradePlanList}
                      name="selectedGradePlan"
                      className={"width-300px"}
                      value={selectedGradePlan}
                      onChange={this.onChange}
                      label="Subject Grade Plan"
                      error={
                        fieldError.selectedGradePlan &&
                        fieldError.selectedGradePlan
                      }
                      helperText={
                        fieldError.selectedGradePlan &&
                        fieldError.selectedGradePlan
                      }
                      size="small"
                    />
                  </Paper>
                )}
              </div>
            </Box>
            <div className="d-flex">
              {show_manual_attendance_in_schedule && (
                <div>
                  <TextField
                    variant="outlined"
                    id="max_no_of_days_attendance"
                    name="max_no_of_days_attendance"
                    label="Max No of days attendance"
                    className="width-300px"
                    margin="normal"
                    autoComplete="off"
                    value={max_no_of_days_attendance}
                    onChange={(e) => {
                      this.onChange(e);
                    }}
                    size="small"
                    error={
                      fieldError.max_no_of_days_attendance &&
                      fieldError.max_no_of_days_attendance
                    }
                    helperText={
                      fieldError.max_no_of_days_attendance &&
                      fieldError.max_no_of_days_attendance
                    }
                  />
                </div>
              )}
            </div>
            {/* <div>
              <Tooltip
                title={
                  "Can Schedule Same Subject Marks And Time In Multiple Sections At Same Time"
                }
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <Button
                  className={"custom-button"}
                  onClick={this.handleOpenMultipleSections}
                >
                  Check Similar Subjects In Sections
                </Button>
              </Tooltip>
            </div> */}
            {isMultipleSectionDialog && (
              <MultipleSecionsSchedule
                multiSubjectList={multiSubjectList}
                handleCloseMultipleSections={this.handleOpenMultipleSections}
                start_date={start_date}
                end_date={end_date}
                helperText={helperText}
                is_multiple_schedule={is_multiple_schedule}
                part_type={part_type}
                gradePlanList={gradePlanList}
                standardList={standardList}
              />
            )}
            <Grid container spacing={1}>
              {standardList.map((standard, stIndex) => {
                return (
                  <Grid item xl={8} md={12} xs={12}>
                    <Paper className="schedule-add-paper" elevation={2}>
                      <Box className="flex-justify-space-between">
                        <Box className="schedule-add-standard-outer-box">
                          <Box className="schedule-add-standard-name">
                            {standard.standard_name &&
                              !standard.section_name &&
                              standard.standard_name}
                            {standard.standard_name &&
                              standard.section_name && (
                                <Box className="text-capitalize">
                                  {`${standard.standard_name} - ${standard.section_name}`}
                                </Box>
                              )}
                          </Box>
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
                              <TableCell className="">
                                <Tooltip
                                  title="Select All"
                                  enterDelay={400}
                                  enterNextDelay={400}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <div
                                    className="align-self-end display-flex pointer"
                                    onClick={() =>
                                      this.handleSelectAllSubject(stIndex)
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      className="pointer"
                                      name={"isAllSubjectSelected"}
                                      value={standard.isAllSubjectSelected}
                                      checked={standard.isAllSubjectSelected}
                                    ></input>
                                    <div>Subject</div>
                                  </div>
                                </Tooltip>
                              </TableCell>
                              <TableCell className=""> Max Marks</TableCell>
                              <TableCell className=""> Min Marks</TableCell>
                              <TableCell className=""> </TableCell>
                              <TableCell className="">Exam Date</TableCell>
                              <TableCell className=""> Start Time</TableCell>
                              <TableCell className=""> End Time</TableCell>
                              <TableCell className="">Sequence</TableCell>
                            </TableRow>
                          </TableHead>
                          {Object.keys(part_type).map((part_key) => {
                            return (
                              part_type[part_key].list.length > 0 &&
                              this.getSubjectFormat(standard, stIndex, part_key)
                            );
                          })}
                          {!standard.expanded &&
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
                          {standard.expanded &&
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
                                    onClick={() =>
                                      this.handleClickLess(stIndex)
                                    }
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
            <Box className="display-flex">
              <Box display="flex" marginLeft="auto" justifyContent="flex-end">
                <Button
                  variant="contained"
                  color="primary"
                  className={
                    submitDisable
                      ? "submit schedule-exam-approve-button-disabled"
                      : "submit"
                  }
                  disabled={submitDisable}
                  onClick={this.handleSubmit}
                >
                  Submit &nbsp;{" "}
                </Button>
              </Box>
            </Box>
          </Paper>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openError}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
          <ModalOptionalSubjects
            open={openModalOptionalSubjects}
            handleClose={this.handleCloseModal}
            standardList={standardList}
            requestForApprove={this.requestForApprove}
            requestApprovalError={requestApprovalError}
            getAliasLanguage={this.getAliasLanguage}
          />
          {marksDetailDialog && (
            <ScheduleMarksConfigModal
              handleCloseDialog={this.handleOpenMarksConfigModal}
              updateMarksCumulative={this.updateMarksCumulative}
              isMultiple={true}
              is_cumulative={is_cumulative}
              gradePlanList={gradePlanList}
            />
          )}
          {multipleTimingDialog && (
            <ScheduleMultipleTiming
              handleCloseDialog={this.handleOpenTiming}
              updateTimingDetails={this.updateTimingDetails}
            />
          )}
          {mergeSubjectsOpen && (
            <ScheduleMergeSubjects
              handleCloseDialog={this.handleMergeSubjectsDialog}
              standard_list={standardList}
              updateMergeSubjects={this.updateMergeSubjects}
            />
          )}
        </div>
      );
    }
  }
}

export default withRouter(ScheduleExamAdd);

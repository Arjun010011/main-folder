import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter } from "react-router-dom";
import { Link } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import ControlPointOutlinedIcon from "@material-ui/icons/ControlPointOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import Snackbar from "@material-ui/core/Snackbar";
import moment from "moment";
import _ from "lodash";

import loadingBar from "images/loading.gif";
import {
  Paper,
  Box,
  TextField,
  Grid,
  Button,
  Tooltip,
} from "@material-ui/core";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import {
  dateFormat,
  isUserHasPermission,
  Alert,
  getUrlParam,
} from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { numberRegex } from "Constants/regularExpression";
import "./styles.scss";
import SchoolTimingSelectStandard from "./Components/SchoolTimingSelectStandard";
import SchoolTimingNameAndDate from "./Components/SchoolTimingNameAndDate";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class SchoolTimingAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      fieldError: {
        end_time: {},
        start_time: {},
        half_day_time: {},
        late_buffer_time: {},
        entire_paper_error: {},
      },
      isDeduction: false,
      deductionList: [
        { id: "1", name: "Half Day" },
        { id: "2", name: "Full Day" },
      ],
      workingDays: [],
      shift_details: {
        is_section: true,
        name: "",
        late_attempt_per_month: "",
        isDeduction: false,
        deduction_days: "1",
      },
      shift_schedules: [
        {
          working_days: [],
          start_time: "",
          end_time: "",
          half_day_time: "",
          late_buffer_time: "",
          buffer_time: "",
          isHalfDay: false,
        },
      ],
      openSnackbar: false,
      alertData: "",
      isHalfDay: false,
      deletableIds: [],
      loading: true,
      isEdit: false,
      date_range: {},
      isBlankPage: false,
      postStandardList: [],
      standardList: null,
    };
    this.shift_details = React.createRef();
  }

  componentDidMount = () => {
    if (this.props.location.pathname === Actions.school_timing.update.url) {
      if (this.props.location.state && this.props.location.state.detail) {
        let id = this.props.location.state.detail;
        this.setState(
          {
            timingId: id,
            isEdit: true,
          },
          () => {
            this.getApiCalls();
          }
        );
      } else {
        this.props.history.push(Actions.school_timing.view.url);
      }
    } else {
      let { shift_details } = this.state;
      let { year, yearName } = getUrlParam();
      if (year && yearName) {
        shift_details["year"] = year;
        shift_details["yearName"] = yearName;
        this.setState(
          {
            shift_details,
          },
          () => {
            this.getApiCalls();
          }
        );
      } else {
        this.props.history.push(Actions.school_timing.view.url);
      }
    }
  };

  getApiCalls = () => {
    const { isEdit, timingId } = this.state;
    if (isEdit) {
      this.getShiftDetails(timingId);
    } else {
      this.getStandardList();
    }
  };

  getStandardList = () => {
    const { shift_details, shiftUpdatedValues, isEdit } = this.state;
    let standard_sections = [];
    if (isEdit) {
      standard_sections = shiftUpdatedValues.standard_section_ids.split(",");
    }
    const st_param = { is_active: true, academic_year: shift_details["year"] };
    getRequest(GET_URL.getstandardandsection.api, st_param, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          if (response.data.data.length === 0) {
            this.showBlankPage();
          } else {
            let is_selected_all = true;
            response.data.data.map((data) => {
              data.checked = false;
              data.checked = false;
              data.sections.map((section) => {
                section.checked = false;
                if (
                  standard_sections.includes(
                    section.standard_section.toString()
                  )
                ) {
                  data.checked = true;
                  section.checked = true;
                } else {
                  is_selected_all = false;
                }
              });
            });
            let temp = {
              id: 0,
              name: "All",
              checked: is_selected_all,
              expanded: false,
              sections: [],
            };
            response.data.data.unshift(temp);
            this.setState(
              {
                standardList: response.data.data,
                postStandardList: response.data.data,
              },
              () => {
                this.getWorkingDays();
              }
            );
          }
        }
      }
    );
  };

  getWorkingDays = () => {
    const { isEdit, shift_schedules } = this.state;
    getRequest(GET_URL.days.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = [];
        response.data.data.map((field) => {
          let tempObject = {};
          tempObject["id"] = field.id;
          if (field.is_student_working_day && !isEdit) {
            tempObject["enable"] = true;
            field.is_enable = 0;
          } else {
            tempObject["enable"] = false;
          }
          tempList.push(tempObject);
        });
        shift_schedules[0]["working_days"] = tempList;
        this.setState(
          {
            workingDays: response.data.data,
            shiftWorkingDays: tempList,
            shift_schedules,
          },
          () => {
            if (isEdit) {
              this.updateShiftDetails();
            } else {
              this.setState({ loading: false });
            }
          }
        );
      }
    });
  };

  getShiftDetails = (id) => {
    let { shift_details } = this.state;
    const url = GET_URL.schooltimings.api + id + "/";
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        shift_details["year"] = response.data.data.academic_year;
        this.setState(
          {
            shiftUpdatedValues: response.data.data,
            isEdit: true,
            shift_details,
          },
          () => {
            this.getStandardList();
          }
        );
      }
    });
  };

  updateShiftDetails = () => {
    let { shiftUpdatedValues, shift_details, shiftWorkingDays, workingDays } =
      this.state;
    shift_details["name"] = shiftUpdatedValues["name"];
    shift_details["year"] = shiftUpdatedValues["academic_year"];
    shift_details["yearName"] = shiftUpdatedValues["academic_year_name"];
    shift_details["id"] = shiftUpdatedValues["id"];
    let w_index = "";
    let formatShiftDetails = {};
    shiftUpdatedValues.school_timing_school_timing_parent.map((field) => {
      let shiftWorkingDaysTemp = _.cloneDeep(shiftWorkingDays);
      let tempObject = {};
      tempObject["id"] = field["id"];
      tempObject["start_time"] = field["start_time"];
      tempObject["half_day_time"] = field["half_day_time"];
      tempObject["end_time"] = field["end_time"];
      tempObject["late_buffer_time"] =
        field["allowable_late_minutes"] === 0
          ? ""
          : field["allowable_late_minutes"];
      tempObject["working_days"] = shiftWorkingDaysTemp;
      formatShiftDetails[
        `${tempObject.start_time}_${tempObject.end_time}_${tempObject.half_day_time}_${tempObject.late_buffer_time}`
      ] = tempObject;
      Object.keys(formatShiftDetails).map((data, form_index) => {
        if (
          formatShiftDetails[
            `${tempObject.start_time}_${tempObject.end_time}_${tempObject.half_day_time}_${tempObject.late_buffer_time}`
          ]
        ) {
          w_index = formatShiftDetails[data]["working_days"].findIndex(
            (data) => data["id"] === field.day
          );
          workingDays[w_index]["is_enable"] = form_index;
          workingDays[w_index]["day_id"] = field["id"];
        }
      });
    });
    let updated_format = [];
    Object.keys(formatShiftDetails).map((shift, sIndex) => {
      workingDays.map((wDay, wIndex) => {
        if (wDay["is_enable"] === sIndex) {
          formatShiftDetails[shift]["working_days"][wIndex]["day_id"] =
            wDay["day_id"];
          formatShiftDetails[shift]["working_days"][wIndex]["enable"] = true;
        } else {
          formatShiftDetails[shift]["working_days"][wIndex]["day_id"] =
            wDay["day_id"];
          formatShiftDetails[shift]["working_days"][wIndex]["enable"] = false;
        }
      });
      updated_format.push(formatShiftDetails[shift]);
    });
    this.setState({
      shift_schedules: [...updated_format],
      loading: false,
      workingDays,
      shiftWorkingDays: [...workingDays],
    });
  };

  handleChangeShiftSchedules = (e, index, label) => {
    let { name, value } = e.target;
    if (label) {
      name = label;
    }
    let { shift_schedules, fieldError } = this.state;
    if (index === undefined) {
      delete fieldError[name];
      this.setState({
        [name]: value,
      });
      return;
    }
    if (
      name === "start_time" ||
      name === "end_time" ||
      name === "half_day_time"
    ) {
      value = `${value}:00`;
    }
    delete fieldError[name][index];
    shift_schedules[index][name] = value;
    if (
      name === "late_buffer_time" &&
      !numberRegex.value.test(value) &&
      value
    ) {
      fieldError[name][index] = numberRegex.errorText;
    }
    this.setState({
      shift_schedules,
      fieldError,
    });
  };

  handleChangeShiftDetails = (e) => {
    let { name, value } = e.target;
    let { shift_details, fieldError } = this.state;
    delete fieldError[name];
    shift_details[name] = value;
    this.setState({
      shift_details,
      fieldError,
    });
  };

  handleChangeDays = (e) => {
    let { name, value } = e.target;
    if (value !== 0) {
      this.setState({
        [name]: value,
      });
    }
  };

  handleWorkingDays = (workingIndex, index) => {
    let { workingDays } = this.state;
    let returnValue = false;
    if (workingDays[workingIndex]["is_enable"] === index) {
      returnValue = true;
    } else if (workingDays[workingIndex].hasOwnProperty("is_enable")) {
      returnValue = null;
    }
    return returnValue;
  };

  handleWorkingDaysToolTip = (index, workingIndex) => {
    let { workingDays } = this.state;
    let returnValue = "Non working day";
    if (workingDays[workingIndex]["is_student_working_day"]) {
      returnValue = "Available day";
    }
    if (workingDays[workingIndex]["is_enable"] === index) {
      returnValue = "Assigned day";
    } else if (workingDays[workingIndex].hasOwnProperty("is_enable")) {
      returnValue = "Already assigned day in some other timing";
    }
    return returnValue;
  };

  handleWeekDaysClick = (index, workingIndex) => {
    let { workingDays, fieldError, shift_schedules } = this.state;
    fieldError["entire_paper_error"] = {};
    if (workingDays[workingIndex]["is_enable"] === index) {
      delete workingDays[workingIndex]["is_enable"];
    } else {
      workingDays[workingIndex]["is_enable"] = index;
    }
    shift_schedules[index]["working_days"][workingIndex]["enable"] =
      !shift_schedules[index]["working_days"][workingIndex]["enable"];
    this.setState({
      workingDays,
      fieldError,
      shift_schedules,
    });
  };

  validationWorkingDayFields = () => {
    let returnValue = true;
    let { shift_schedules, workingDays, openSnackbar, alertData, fieldError } =
      this.state;

    let shift_details = this.shift_details.current.validate();
    if (!shift_details) {
      return;
    } else {
      this.updateName(shift_details);
    }
    shift_schedules.map((shiftTemp, shiftIndex) => {
      let isDaySelected = false;
      workingDays.map((workTemp) => {
        if (
          workTemp.hasOwnProperty("is_enable") &&
          workTemp["is_enable"] === shiftIndex &&
          workTemp["is_student_working_day"]
        ) {
          isDaySelected = true;
        }
      });
      let indexTemp = `${shiftIndex + 1}th`;
      if (shiftIndex + 1 === 1) {
        indexTemp = `${shiftIndex + 1}st`;
      } else if (shiftIndex + 1 === 2) {
        indexTemp = `${shiftIndex + 1}nd`;
      } else if (shiftIndex + 1 === 3) {
        indexTemp = `${shiftIndex + 1}rd`;
      }

      if (!isDaySelected) {
        openSnackbar = true;
        alertData = `At least one day should be selected in ${indexTemp} Timing set`;
        fieldError["entire_paper_error"][shiftIndex] = alertData;
      }
      if (!shiftTemp.start_time) {
        openSnackbar = true;
        alertData = `Enter start time in ${indexTemp} Timing set`;
        fieldError["start_time"][shiftIndex] = "Start time mandatory";
      }
      if (!shiftTemp.end_time) {
        openSnackbar = true;
        alertData = `Enter End time in ${indexTemp} Timing set`;
        fieldError["end_time"][shiftIndex] = "End time mandatory";
      }
      if (!shiftTemp.half_day_time) {
        openSnackbar = true;
        alertData = `Enter Half Day time in ${indexTemp} Timing set`;
        fieldError["half_day_time"][shiftIndex] = "Half Day time mandatory";
      }
    });
    if (openSnackbar) {
      this.setState({
        openSnackbar,
        alertData,
        fieldError,
      });
      returnValue = false;
    }
    if (
      Object.keys(fieldError.start_time).length > 0 ||
      Object.keys(fieldError.end_time).length > 0 ||
      Object.keys(fieldError.half_day_time).length > 0 ||
      Object.keys(fieldError.late_buffer_time).length > 0
    ) {
      returnValue = false;
    }

    return returnValue;
  };

  addNew = () => {
    let { shift_schedules, shiftWorkingDays, workingDays } = this.state;
    let shiftWorkingDaysTemp = _.cloneDeep(shiftWorkingDays);
    let validation = this.validationWorkingDayFields();
    if (!validation) return;
    let isAvailableDay = false;
    workingDays.map((data) => {
      if (!data.hasOwnProperty("is_enable") && data["is_student_working_day"]) {
        isAvailableDay = true;
      }
    });
    if (!isAvailableDay) {
      this.setState({
        openSnackbar: true,
        alertData: "There is no available days to add another timing",
      });
      return;
    }

    shiftWorkingDaysTemp.map((data) => {
      data["enable"] = false;
    });

    let temp = {
      working_days: shiftWorkingDaysTemp,
      start_time: "",
      end_time: "",
      half_day_time: "",
      late_buffer_time: "",
      buffer_time: "",
    };

    shift_schedules.push(temp);
    this.setState({
      shift_schedules,
    });
  };

  deleteField = (index) => {
    let { shift_schedules, workingDays, fieldError } = this.state;
    fieldError["entire_paper_error"] = {};
    workingDays.map((data, workingIndex) => {
      if (data["is_enable"] === index) {
        delete workingDays[workingIndex]["is_enable"];
      } else if (
        data.hasOwnProperty("is_enable") &&
        data["is_enable"] > index
      ) {
        workingDays[workingIndex]["is_enable"] =
          workingDays[workingIndex]["is_enable"] - 1;
      }
    });
    shift_schedules.splice(index, 1);
    this.setState({
      shift_schedules,
      workingDays,
      fieldError,
    });
  };

  handleCloseSnackBar = () => {
    this.setState({
      openSnackbar: false,
    });
  };

  onBlurValidation = (e, index) => {
    let { shift_schedules, fieldError } = this.state;
    let { name } = e.target;

    let start_time = shift_schedules[index]["start_time"];
    let end_time = shift_schedules[index]["end_time"];
    let half_day_time = shift_schedules[index]["half_day_time"];
    let late_buffer_time = shift_schedules[index]["late_buffer_time"];

    if (name === "half_day_time" && half_day_time) {
      let DutyDayStartTime = moment(start_time, "HH:mm");
      let DutyDayEndTime = moment(half_day_time, "HH:mm");
      let diffTime = DutyDayEndTime.diff(DutyDayStartTime, "minutes");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp >= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }
      if (!isAfter) {
        fieldError["half_day_time"][index] =
          "Half day time should be greater than start time";
      }
    }
    if (name === "end_time" && end_time) {
      let DutyDayStartTime = moment(half_day_time, "HH:mm");
      let DutyDayEndTime = moment(end_time, "HH:mm");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp >= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }
      if (!isAfter) {
        fieldError["end_time"][index] =
          "End time should be greater than half day time";
      }
    }

    if (start_time && end_time && half_day_time) {
      let session1StartTime = moment(start_time, "HH:mm");
      let session1EndTime = moment(end_time, "HH:mm");
      let diffTimeSession1 = session1EndTime.diff(session1StartTime, "minutes");

      let startTemp = parseInt(dateFormat(session1StartTime, "HH"));
      let endTemp = parseInt(dateFormat(session1EndTime, "HH"));
      if (startTemp >= endTemp && startTemp - endTemp > 12) {
        diffTimeSession1 = parseInt(diffTimeSession1) + 12 * 60;
      }

      let finalDiffMin = diffTimeSession1;

      finalDiffMin = Math.abs(finalDiffMin);
      if (finalDiffMin < late_buffer_time) {
        fieldError["late_buffer_time"][
          index
        ] = `Minutes should be below ${`start time and end time i.e ${finalDiffMin} Min`}`;
      }
    }
    this.setState({
      fieldError,
    });
  };

  ValidationTiming = () => {
    let {
      shift_schedules,
      shift_details,
      fieldError,
      workingDays,
      openSnackbar,
      alertData,
      postStandardList,
    } = this.state;
    let validation = true;

    validation = this.validateStandard();
    if (!validation) {
      this.setState({
        openSnackbar: true,
        alertData: "Select atleast one section",
      });
      return false;
    }
    shift_schedules.map((shiftValue, index) => {
      let start_time = shiftValue["start_time"];
      let end_time = shiftValue["end_time"];
      let half_day_time = shiftValue["half_day_time"];
      let late_buffer_time = shiftValue["late_buffer_time"];
      let isHalfDay = shiftValue["isHalfDay"];

      if (shift_details["isDeduction"]) {
        if (!shift_details["late_attempt_per_month"]) {
          fieldError["late_attempt_per_month"] = "No of late days is Mandatory";
          validation = false;
        }

        if (!shift_details["isDeduction"]) {
          fieldError["deduction_days"] = " is Mandatory";
          validation = false;
        }
      }

      let DutyDayStartTime = moment(start_time, "HH:mm");
      let DutyDayEndTime = moment(end_time, "HH:mm");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp >= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }
      if (!isAfter) {
        fieldError["end_time"][index] =
          "End time should be greater than session1 start time";
        validation = false;
      }
      if (!isHalfDay) {
        let DutyDayStartTime = moment(start_time, "HH:mm");
        let DutyDayEndTime = moment(half_day_time, "HH:mm");
        let isAfter = DutyDayEndTime.isAfter(DutyDayStartTime);
        if (!isAfter) {
          fieldError["half_day_time"][index] =
            "Half Day time should be greater than start time";
          validation = false;
        }
      }
      let session1StartTime = moment(start_time, "HH:mm");
      let session1EndTime = moment(end_time, "HH:mm");
      let diffTimeSession1 = session1EndTime.diff(session1StartTime, "minutes");

      let session1_startTemp = parseInt(dateFormat(session1StartTime, "HH"));
      let session1_endTemp = parseInt(dateFormat(session1EndTime, "HH"));
      if (
        session1_startTemp >= session1_endTemp &&
        session1_startTemp - session1_endTemp > 12
      ) {
        diffTimeSession1 = parseInt(diffTimeSession1) + 12 * 60;
      }

      let finalDiffMin = diffTimeSession1;
      finalDiffMin = Math.abs(finalDiffMin);
      if (finalDiffMin < late_buffer_time) {
        fieldError["late_buffer_time"][
          index
        ] = `Minutes should be below ${`start time and end time i.e ${finalDiffMin} Min`}`;
        validation = false;
      }
    });
    let isAvailableDay = false;
    let names = [];
    workingDays.map((data) => {
      if (!data.hasOwnProperty("is_enable") && data["is_student_working_day"]) {
        isAvailableDay = true;
        names.push(data.name);
      }
    });
    names = names.join(", ");
    if (isAvailableDay) {
      validation = false;
      openSnackbar = true;
      alertData = `Select timing for ${names} days`;
    }
    this.setState({
      fieldError,
      openSnackbar,
      alertData,
    });
    return validation;
  };

  validateStandard = () => {
    let { postStandardList, shift_details, openSnackbar, alertData } =
      this.state;
    let validation = true;
    let post_standards = [];
    let sectionIsPresent = false;
    let standardIsPresent = false;
    if (shift_details["is_section"]) {
      postStandardList.map((data, index) => {
        if (data.checked && index !== 0) {
          data.sections.map((section) => {
            if (section.checked) {
              sectionIsPresent = true;
              post_standards.push(section.standard_section);
            }
          });
        }
      });
      standardIsPresent = true;
    } else {
      postStandardList.map((data, index) => {
        if (data.checked && index !== 0) {
          standardIsPresent = true;
          data.sections.map((section) => {
            post_standards.push(section.standard_section);
          });
        }
      });
      sectionIsPresent = true;
    }

    if (!standardIsPresent) {
      validation = false;
      openSnackbar = true;
      alertData = "Select at least one standard";
    }
    if (!sectionIsPresent) {
      validation = false;
      openSnackbar = true;
      alertData = "Select at least one section";
      this.setState({ openSnackbar, alertData });
    }
    if (validation) {
      validation = post_standards;
    }
    return validation;
  };

  formatScheduleList = () => {
    let { shift_schedules, isEdit, shift_details } = this.state;
    let tempList = [...shift_schedules];
    let school_timing = [];
    let shift_details_temp = {};
    shift_details_temp["name"] = shift_details["name"];
    shift_details_temp["from_date"] = dateFormat(
      shift_details["from_date"],
      "DD-MM-YYYY"
    );
    shift_details_temp["to_date"] = dateFormat(
      shift_details["to_date"],
      "DD-MM-YYYY"
    );
    shift_details_temp["academic_year"] = shift_details["year"];
    shift_details_temp["standard_section_ids"] = this.validateStandard();
    if (shift_details["id"]) {
      shift_details_temp["id"] = shift_details["id"];
    }
    tempList.map((field) => {
      let tempObject = {};
      field["working_days"].map((data) => {
        tempObject = {};
        if (data.enable) {
          if (isEdit) {
            tempObject["id"] = data["day_id"];
          }
          tempObject["day"] = data.id;
          tempObject["start_time"] = field["start_time"];
          tempObject["end_time"] = field["end_time"];
          tempObject["half_day_time"] = field["half_day_time"];
          tempObject["allowable_late_minutes"] = field["late_buffer_time"]
            ? parseInt(field["late_buffer_time"])
            : 0;
          school_timing.push(tempObject);
        }
      });
    });

    let returnValue = {
      school_parent: shift_details_temp,
      school_timing: school_timing,
    };
    return returnValue;
  };

  postMethod = () => {
    let validationWorkingDays = this.validationWorkingDayFields();
    if (!validationWorkingDays) return;
    let ValidationTiming = this.ValidationTiming();
    if (!ValidationTiming) return;
    this.setState({ submitDisable: true });
    let post_data = this.formatScheduleList();
    let url = POST_URL.schooltimings.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.school_timing.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };

  showBlankPage = () => {
    this.setState({ isBlankPage: true, loading: false });
  };

  updateStandardList = (standardList, is_section) => {
    let { shift_details } = this.state;
    shift_details["is_section"] = is_section;
    this.setState({ postStandardList: [...standardList], shift_details });
  };

  updateName = (details) => {
    let { shift_details } = this.state;
    shift_details["name"] = details["name"];
    shift_details["from_date"] = details["from_date"];
    shift_details["to_date"] = details["to_date"];
    this.setState({ shift_details });
  };

  render() {
    const {
      loading,
      fieldError,
      workingDays,
      shift_schedules,
      isBlankPage,
      standardList,
      openSnackbar,
      alertData,
      shift_details,
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
                {`${alias_names["school"]} Timing for ${shift_details["yearName"]}`}
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                {isUserHasPermission("school_timing", "create") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.school_timing.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.school_timing.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          {isBlankPage ? (
            <BlankPagewithIcon
              data={`There are no standards for selected year`}
            />
          ) : (
            <>
              <Paper className="shift-type-paper-background header-align">
                <Grid container spacing={3}>
                  <Grid item lg={7} md={12} xs={12}>
                    <SchoolTimingNameAndDate
                      ref={this.shift_details}
                      details={shift_details}
                      updateName={this.updateName}
                    />
                    {shift_schedules.map((field, index) => {
                      return (
                        <Paper
                          className={
                            fieldError["entire_paper_error"][index]
                              ? "padding-20 entire-paper-error position-relative mt-20"
                              : "mt-20 padding-20 position-relative"
                          }
                        >
                          {(index !== 0 || shift_schedules.length > 1) && (
                            <Box
                              className={
                                fieldError["entire_paper_error"][index]
                                  ? ""
                                  : "red-text"
                              }
                            >
                              <HighlightOffIcon
                                className="close-icon-shift"
                                onClick={() => this.deleteField(index)}
                              />
                            </Box>
                          )}
                          <Box className="flex-justify-space-between ">
                            <Box className="shift-weekdays-outer-box">
                              {workingDays.map((working, workingIndex) => {
                                return (
                                  <Tooltip
                                    title={this.handleWorkingDaysToolTip(
                                      index,
                                      workingIndex
                                    )}
                                    enterDelay={400}
                                    enterNextDelay={800}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <Box>
                                      {working.is_student_working_day &&
                                        this.handleWorkingDays(
                                          workingIndex,
                                          index
                                        ) !== null && (
                                          <Box
                                            className={
                                              this.handleWorkingDays(
                                                workingIndex,
                                                index
                                              )
                                                ? "shift-weekdays-box weekdays-enabled user-select-none"
                                                : "shift-weekdays-box user-select-none"
                                            }
                                            onClick={() =>
                                              this.handleWeekDaysClick(
                                                index,
                                                workingIndex
                                              )
                                            }
                                          >
                                            {working.name.substring(0, 3)}
                                          </Box>
                                        )}
                                      {working.is_student_working_day &&
                                        this.handleWorkingDays(
                                          workingIndex,
                                          index
                                        ) === null && (
                                          <Box className="shift-weekdays-box weekdays-assigned-other user-select-none">
                                            {working.name.substring(0, 3)}
                                          </Box>
                                        )}
                                      {!working.is_student_working_day && (
                                        <Box className="shift-weekdays-box weekdays-offline user-select-none">
                                          {working.name.substring(0, 3)}
                                        </Box>
                                      )}
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          </Box>

                          <Grid container spacing={3} className="header-align">
                            <Grid item md={6} xs={12}>
                              <TextField
                                id="time"
                                label="Start Time"
                                type="time"
                                variant="outlined"
                                name="start_time"
                                fullWidth
                                required
                                defaultValue={field.start_time}
                                onChange={(e) =>
                                  this.handleChangeShiftSchedules(e, index)
                                }
                                onBlur={(e) => this.onBlurValidation(e, index)}
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                inputProps={{
                                  step: 300, // 5 min
                                }}
                                helperText={
                                  !fieldError["start_time"][index]
                                    ? ""
                                    : fieldError["start_time"][index]
                                }
                                error={fieldError["start_time"][index]}
                              />
                            </Grid>
                            <Grid item md={6} xs={12}>
                              <TextField
                                id="time"
                                label="Half Day Time"
                                type="time"
                                variant="outlined"
                                name="half_day_time"
                                required
                                fullWidth
                                defaultValue={field.half_day_time}
                                onChange={(e) =>
                                  this.handleChangeShiftSchedules(e, index)
                                }
                                onBlur={(e) => this.onBlurValidation(e, index)}
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                inputProps={{
                                  step: 300, // 5 min
                                }}
                                helperText={
                                  !fieldError["half_day_time"][index]
                                    ? ""
                                    : fieldError["half_day_time"][index]
                                }
                                error={fieldError["half_day_time"][index]}
                              />
                            </Grid>
                            <Grid item md={6} xs={12}>
                              <TextField
                                id="time"
                                label="End Time"
                                type="time"
                                variant="outlined"
                                name="end_time"
                                required
                                fullWidth
                                defaultValue={field.end_time}
                                onChange={(e) =>
                                  this.handleChangeShiftSchedules(e, index)
                                }
                                onBlur={(e) => this.onBlurValidation(e, index)}
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                inputProps={{
                                  step: 300, // 5 min
                                }}
                                helperText={
                                  !fieldError["end_time"][index]
                                    ? ""
                                    : fieldError["end_time"][index]
                                }
                                error={fieldError["end_time"][index]}
                              />
                            </Grid>

                            <Grid item md={6} xs={12}>
                              <TextField
                                id="minutes"
                                autoComplete="off"
                                label={"Minutes to consider as Late"}
                                type="text"
                                variant="outlined"
                                name="late_buffer_time"
                                fullWidth
                                value={field.late_buffer_time}
                                defaultValue=""
                                onChange={(e) =>
                                  this.handleChangeShiftSchedules(e, index)
                                }
                                onBlur={(e) => this.onBlurValidation(e, index)}
                                inputProps={{
                                  step: 300, // 5 min
                                }}
                                helperText={
                                  !fieldError["late_buffer_time"][index]
                                    ? ""
                                    : fieldError["late_buffer_time"][index]
                                }
                                error={fieldError["late_buffer_time"][index]}
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}

                    <Box className="end-flex-prop margin-top-20">
                      <Tooltip
                        title={
                          "Add Another Timing for Remaining Days in a Week"
                        }
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Button
                          variant="contained"
                          onClick={this.addNew}
                          className="add-another-button"
                        >
                          <ControlPointOutlinedIcon className="visibility-icon" />{" "}
                          Add Another Timing{" "}
                        </Button>
                      </Tooltip>
                    </Box>
                  </Grid>
                  {standardList && (
                    <Grid item lg={5} md={12} xs={12}>
                      <SchoolTimingSelectStandard
                        shift_details={shift_details}
                        standardList={standardList}
                        updateStandardList={this.updateStandardList}
                      />
                    </Grid>
                  )}
                </Grid>
                <Box className="submt-button-float-bottom" mt={3}>
                  <Button
                    variant="contained"
                    className="submit"
                    onClick={this.postMethod}
                    disabled={this.state.submitDisable}
                  >
                    Submit
                  </Button>
                </Box>
              </Paper>
            </>
          )}
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openSnackbar}
            autoHideDuration={3000}
            onClose={(e) => this.handleCloseSnackBar(e)}
          >
            <Alert
              onClose={(e) => this.handleCloseSnackBar(e)}
              severity="error"
            >
              {alertData}
            </Alert>
          </Snackbar>
        </Paper>
      );
    }
  }
}

export default withRouter(SchoolTimingAdd);

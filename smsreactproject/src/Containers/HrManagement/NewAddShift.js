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
  FormControlLabel,
  Switch,
  Tooltip,
} from "@material-ui/core";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import { dateFormat, isUserHasPermission, Alert } from "Includes/functions";
import { GET_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import { numberRegex } from "Constants/regularExpression";
import "./styles.scss";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class NewAddShift extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      fieldError: {
        session1_end_time: {},
        session1_start_time: {},
        session2_end_time: {},
        session2_start_time: {},
        late_buffer_time: {},
        buffer_time: {},
        entire_paper_error: {},
        isHalfDay: {},
      },
      isDeduction: false,
      deductionList: [
        { id: "1", name: "Half Day" },
        { id: "2", name: "Full Day" },
      ],
      workingDays: [],
      shift_details: {
        name: "",
        late_attempt_per_month: "",
        isDeduction: false,
        deduction_days: "1",
      },
      shift_schedules: [
        {
          working_days: [],
          session1_start_time: "",
          session1_end_time: "",
          session2_start_time: "",
          session2_end_time: "",
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
    };
  }

  componentDidMount = () => {
    if (
      this.props.location.pathname === Actions.manage_shift_types.update.url
    ) {
      if (this.props.location.state && this.props.location.state.detail) {
        let id = this.props.location.state.detail;
        this.getShiftDetails(id);
      } else {
        this.props.history.push(Actions.expenses_create.view.url);
      }
    } else {
      this.getWorkingDays();
    }
  };

  getShiftDetails = (id) => {
    const url = GET_URL.shift.api + id + "/";
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            shiftUpdatedValues: response.data.data,
            isEdit: true,
          },
          () => {
            this.getWorkingDays("update");
          }
        );
      }
    });
  };

  updateShiftDetails = () => {
    let { shiftUpdatedValues, shift_details, shiftWorkingDays, workingDays } =
      this.state;
    let tempList = [];
    shift_details["name"] = shiftUpdatedValues["name"];
    if (shiftUpdatedValues["late_attempt_per_month"]) {
      shift_details["late_attempt_per_month"] =
        shiftUpdatedValues["late_attempt_per_month"];
      shift_details["deduction_days"] =
        shiftUpdatedValues["deduction_days"] == 1 ? 2 : 1;
      shift_details["isDeduction"] = true;
    }
    shift_details["id"] = shiftUpdatedValues["id"];

    shiftUpdatedValues.shift_schedules.map((field, index) => {
      let shiftWorkingDaysTemp = _.cloneDeep(shiftWorkingDays);
      let tempObject = {};
      tempObject["id"] = field["id"];

      if (!field.first_session_end_time) {
        tempObject["session1_end_time"] = field["end_time"];
        tempObject["session2_end_time"] = null;
        tempObject["session2_start_time"] = null;
        tempObject["isHalfDay"] = true;
      } else {
        tempObject["session1_end_time"] = field["first_session_end_time"];
        tempObject["session2_end_time"] = field["end_time"];
        tempObject["session2_start_time"] = field["second_session_start_time"];
      }

      tempObject["session1_start_time"] = field["start_time"];
      tempObject["session2_start_time"] = field["second_session_start_time"];
      tempObject["late_buffer_time"] =
        field["late_buffer_time"] === 0 ? "" : field["late_buffer_time"];
      tempObject["buffer_time"] =
        field["buffer_time"] === 0 ? "" : field["buffer_time"];
      tempObject["working_days"] = shiftWorkingDaysTemp;
      tempObject["working_days"].map((parentData, workingIndex) => {
        field["working_days"].map((childData) => {
          if (parentData.id === childData.day) {
            parentData["day_id"] = childData["id"];
            parentData["day"] = childData.day;
            parentData["enable"] = true;
            workingDays[workingIndex]["is_enable"] = index;
          }
        });
      });
      tempList.push(tempObject);
    });
    this.setState({
      shift_schedules: tempList,
      loading: false,
      workingDays,
    });
  };

  getWorkingDays = (name) => {
    let { shift_schedules, isEdit } = this.state;
    const url = GET_URL.days.api;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempList = [];
        response.data.data.map((field) => {
          let tempObject = {};
          tempObject["id"] = field.id;
          if (field.is_teacher_working_day && name !== "update") {
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
              this.setState({
                loading: false,
              });
            }
          }
        );
      }
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
    if (name === "isHalfDay") {
      value = value !== "true";
      shift_schedules[index]["session2_start_time"] = "";
      shift_schedules[index]["session2_end_time"] = "";
    }
    if (
      name === "session1_start_time" ||
      name === "session1_end_time" ||
      name === "session2_start_time" ||
      name === "session2_end_time"
    ) {
      value = `${value}:00`;
    }
    delete fieldError[name][index];
    shift_schedules[index][name] = value;
    if (
      (name === "late_buffer_time" || name === "buffer_time") &&
      !numberRegex.value.test(value) &&
      value
    ) {
      fieldError[name][index] = numberRegex.errorText;
    } else if (
      name === "late_buffer_time" &&
      (parseInt(value) == 0 ||
        (shift_schedules[index]["buffer_time"] - 1 < parseInt(value) &&
          parseInt(shift_schedules[index]["buffer_time"])))
    ) {
      fieldError[name][index] = parseInt(shift_schedules[index]["buffer_time"])
        ? `Minimum 1 min and Maximum ${
            shift_schedules[index]["buffer_time"] - 1
          } min`
        : "Minimum 1 min";
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

  handleChangeIsDeduction = () => {
    let { shift_details, fieldError } = this.state;
    delete fieldError["isDeduction"];
    shift_details["isDeduction"] = !shift_details["isDeduction"];
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
    if (workingDays[workingIndex]["is_teacher_working_day"]) {
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
    let {
      shift_schedules,
      workingDays,
      openSnackbar,
      alertData,
      fieldError,
      shift_details,
    } = this.state;

    shift_schedules.map((shiftTemp, shiftIndex) => {
      let isDaySelected = false;
      workingDays.map((workTemp) => {
        if (
          workTemp.hasOwnProperty("is_enable") &&
          workTemp["is_enable"] === shiftIndex &&
          workTemp["is_teacher_working_day"]
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
      if (!shiftTemp.session1_start_time) {
        openSnackbar = true;
        alertData = `Enter session1 start time in ${indexTemp} Timing set`;
        fieldError["session1_start_time"][shiftIndex] =
          "Session1 start time mandatory";
      }
      if (!shiftTemp.session1_end_time) {
        openSnackbar = true;
        alertData = `Enter session1 End time in ${indexTemp} Timing set`;
        fieldError["session1_end_time"][shiftIndex] =
          "Session1 end time mandatory";
      }

      if (!shiftTemp.session2_start_time && !shiftTemp.isHalfDay) {
        openSnackbar = true;
        alertData = `Enter session1 start time in ${indexTemp} Timing set`;
        fieldError["session2_start_time"][shiftIndex] =
          "Session2 start time mandatory";
      }
      if (!shiftTemp.session2_end_time && !shiftTemp.isHalfDay) {
        openSnackbar = true;
        alertData = `Enter session1 end time in ${indexTemp} Timing set`;
        fieldError["session2_end_time"][shiftIndex] =
          "Session2 end time mandatory";
      }

      if (shift_details.isDeduction) {
        if (!shiftTemp.late_buffer_time) {
          openSnackbar = true;
          alertData = `Enter minutes to consider as late in ${indexTemp} Timing set`;
          fieldError["late_buffer_time"][shiftIndex] =
            "Minutes to consider late mandatory";
        }
        if (!shiftTemp.buffer_time) {
          openSnackbar = true;
          alertData = `Enter minutes to consider as half day in ${indexTemp} Timing set`;
          fieldError["buffer_time"][shiftIndex] =
            "Minutes to consider half day mandatory";
        }
        if (
          parseInt(shiftTemp.late_buffer_time) >=
            parseInt(shiftTemp.buffer_time) &&
          shiftTemp.late_buffer_time
        ) {
          openSnackbar = true;
          alertData = `Clear error in ${indexTemp} Timing set`;
          fieldError["late_buffer_time"][
            shiftIndex
          ] = `Minutes should below than ${shiftTemp.buffer_time - 1}`;
        }
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
    return returnValue;
  };

  addNew = () => {
    let { shift_schedules, shiftWorkingDays, workingDays } = this.state;
    let shiftWorkingDaysTemp = _.cloneDeep(shiftWorkingDays);
    let validation = this.validationWorkingDayFields();
    if (!validation) return;
    let isAvailableDay = false;
    workingDays.map((data) => {
      if (!data.hasOwnProperty("is_enable") && data["is_teacher_working_day"]) {
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
      session1_start_time: "",
      session1_end_time: "",
      session2_start_time: "",
      session2_end_time: "",
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

    let session1_start_time =shift_schedules[index]["session1_start_time"];
    let session1_end_time = shift_schedules[index]["session1_end_time"];
    let session2_start_time = shift_schedules[index]["session2_start_time"];
    let session2_end_time = shift_schedules[index]["session2_end_time"];
    let late_buffer_time = shift_schedules[index]["late_buffer_time"];
    let buffer_time = shift_schedules[index]["buffer_time"];
    let isHalfDay = shift_schedules[index]["isHalfDay"];

    if (name === "session1_end_time" && session1_end_time) {
      let DutyDayStartTime = moment(session1_start_time, "HH:mm");
      let DutyDayEndTime = moment(session1_end_time, "HH:mm");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp >= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }
      if (!isAfter) {
        fieldError["session1_end_time"][index] =
          "End time should be greater than session1 start time";
      }
    }
    if (name === "session2_start_time" && session2_start_time && !isHalfDay) {
      let DutyDayStartTime = moment(session1_end_time, "HH:mm");
      let DutyDayEndTime = moment(session2_start_time, "HH:mm");
      let diffTime = DutyDayEndTime.diff(DutyDayStartTime, "minutes");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp <= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }

      if (!isAfter) {
        fieldError["session2_start_time"][index] =
          "Start time should be greater than session1 end time";
      } else if (diffTime > 120 || (diffTime < 0 && diffTime > -120)) {
        fieldError["session2_start_time"][index] =
          "Diff between session1 end time and session2 start time should not exceed 2 hours";
      }
    }
    if (name === "session2_end_time" && session2_end_time && !isHalfDay) {
      let DutyDayStartTime = moment(session2_start_time, "HH:mm");
      let DutyDayEndTime = moment(session2_end_time, "HH:mm");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp <= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }

      let DutyDayStartTimeDiff = moment(session1_start_time, "HH:mm");
      let diffTime = DutyDayEndTime.diff(DutyDayStartTimeDiff, "minutes");

      if (!isAfter) {
        fieldError["session2_end_time"][index] =
          "End time should be greater than session2 start time";
      } else if (diffTime > 720 || (diffTime < 0 && diffTime > -720)) {
        fieldError["session2_end_time"][index] =
          "Diff between session1 start time and session2 end time should not exceed 12 hours";
      }
    }
    if (
      session1_start_time &&
      session1_end_time &&
      session2_start_time &&
      session2_end_time
    ) {
      let session1StartTime = moment(session1_start_time, "HH:mm");
      let session1EndTime = moment(session1_end_time, "HH:mm");
      let diffTimeSession1 = session1EndTime.diff(session1StartTime, "minutes");

      let startTemp = parseInt(dateFormat(session1StartTime, "HH"));
      let endTemp = parseInt(dateFormat(session1EndTime, "HH"));
      if (startTemp >= endTemp && startTemp - endTemp > 12) {
        diffTimeSession1 = parseInt(diffTimeSession1) + 12 * 60;
      }

      let isSession2Less = false;
      let finalDiffMin = diffTimeSession1;
      if (isHalfDay) {
        finalDiffMin = diffTimeSession1;
      } else {
        let session2StartTime = moment(session2_start_time, "HH:mm");
        let session2EndTime = moment(session2_end_time, "HH:mm");
        let diffTimeSession2 = session2EndTime.diff(
          session2StartTime,
          "minutes"
        );

        let startTemp = parseInt(dateFormat(session2StartTime, "HH"));
        let endTemp = parseInt(dateFormat(session2EndTime, "HH"));
        if (startTemp >= endTemp && startTemp - endTemp > 12) {
          diffTimeSession2 = parseInt(diffTimeSession2) + 12 * 60;
        }

        if (diffTimeSession1 > diffTimeSession2) {
          isSession2Less = true;
          finalDiffMin = diffTimeSession2;
        }
      }

      finalDiffMin = Math.abs(finalDiffMin);
      if (finalDiffMin < late_buffer_time) {
        fieldError["late_buffer_time"][index] = `Minutes should be below ${
          isSession2Less
            ? `session 2 start time and end time i.e ${finalDiffMin} Min`
            : `session 1 start time and end time i.e ${finalDiffMin} Min`
        }`;
      }
      if (finalDiffMin < buffer_time) {
        fieldError["buffer_time"][index] = `Minutes should be below ${
          isSession2Less
            ? `session 2 start time and end time i.e ${finalDiffMin} Min`
            : `session 1 start time and end time i.e ${finalDiffMin} Min`
        }`;
      }
      if (parseInt(late_buffer_time) > parseInt(buffer_time)) {
        fieldError["buffer_time"][
          index
        ] = `Minutes should be greater than late minute ${late_buffer_time}`;
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
    } = this.state;
    let validation = true;

    if (!shift_details["name"]) {
      fieldError["name"] = "Shift Name is Mandatory";
      validation = false;
    }

    if (shift_details["isDeduction"]) {
      if (!shift_details["late_attempt_per_month"]) {
        fieldError["late_attempt_per_month"] = "No of late days is Mandatory";
        validation = false;
      } else if (
        !numberRegex.value.test(shift_details["late_attempt_per_month"])
      ) {
        fieldError["late_attempt_per_month"] = "Invalid Number";
        validation = false;
      }

      if (!shift_details["isDeduction"]) {
        fieldError["deduction_days"] = " is Mandatory";
        validation = false;
      }
    }

    shift_schedules.map((shiftValue, index) => {
      let session1_start_time = shiftValue["session1_start_time"];
      let session1_end_time = shiftValue["session1_end_time"];
      let session2_start_time = shiftValue["session2_start_time"];
      let session2_end_time = shiftValue["session2_end_time"];
      let late_buffer_time = parseInt(shiftValue["late_buffer_time"]);
      let buffer_time = parseInt(shiftValue["buffer_time"]);
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

      let DutyDayStartTime = moment(session1_start_time, "HH:mm");
      let DutyDayEndTime = moment(session1_end_time, "HH:mm");

      let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
      let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
      let isAfter = true;
      if (startTemp >= endTemp && startTemp - endTemp < 12) {
        isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
      }
      if (!isAfter) {
        fieldError["session1_end_time"][index] =
          "End time should be greater than session1 start time";
        validation = false;
      }
      if (!isHalfDay) {
        let DutyDayStartTime = moment(session1_end_time, "HH:mm");
        let DutyDayEndTime = moment(session2_start_time, "HH:mm");
        let isAfter = DutyDayEndTime.isAfter(DutyDayStartTime);
        let diffTime = DutyDayEndTime.diff(DutyDayStartTime, "minutes");
        if (!isAfter) {
          fieldError["session2_start_time"][index] =
            "Start time should be greater than session1 end time";
          validation = false;
        } else if (diffTime > 120) {
          fieldError["session2_start_time"][index] =
            "Diff between session1 end time and session2 start time should not exceed 2 hours";
          validation = false;
        }
      }
      if (!isHalfDay) {
        let DutyDayStartTime = moment(session2_start_time, "HH:mm");
        let DutyDayEndTime = moment(session2_end_time, "HH:mm");

        let startTemp = parseInt(dateFormat(DutyDayStartTime, "HH"));
        let endTemp = parseInt(dateFormat(DutyDayEndTime, "HH"));
        let isAfter = true;
        if (startTemp <= endTemp && startTemp - endTemp < 12) {
          isAfter = DutyDayEndTime.isAfter(DutyDayStartTime); // 0
        }

        let DutyDayStartTimeDiff = moment(session1_start_time, "HH:mm");
        let diffTime = DutyDayEndTime.diff(DutyDayStartTimeDiff, "minutes");

        if (!isAfter) {
          fieldError["session2_end_time"][index] =
            "End time should be greater than session2 start time";
          validation = false;
        } else if (diffTime > 720) {
          fieldError["session2_end_time"][index] =
            "Diff between session1 start time and session2 end time should not exceed 12 hours";
          validation = false;
        }
      }
      let session1StartTime = moment(session1_start_time, "HH:mm");
      let session1EndTime = moment(session1_end_time, "HH:mm");
      let diffTimeSession1 = session1EndTime.diff(session1StartTime, "minutes");

      let session1_startTemp = parseInt(dateFormat(session1StartTime, "HH"));
      let session1_endTemp = parseInt(dateFormat(session1EndTime, "HH"));
      if (
        session1_startTemp >= session1_endTemp &&
        session1_startTemp - session1_endTemp > 12
      ) {
        diffTimeSession1 = parseInt(diffTimeSession1) + 12 * 60;
      }

      let isSession2Less = false;
      let finalDiffMin = diffTimeSession1;
      if (isHalfDay) {
        finalDiffMin = diffTimeSession1;
      } else {
        let session2StartTime = moment(session2_start_time, "HH:mm");
        let session2EndTime = moment(session2_end_time, "HH:mm");
        let diffTimeSession2 = session2EndTime.diff(
          session2StartTime,
          "minutes"
        );

        let startTemp = parseInt(dateFormat(session2StartTime, "HH"));
        let endTemp = parseInt(dateFormat(session2EndTime, "HH"));
        if (startTemp >= endTemp && startTemp - endTemp > 12) {
          diffTimeSession2 = parseInt(diffTimeSession2) + 12 * 60;
        }

        if (diffTimeSession1 > diffTimeSession2) {
          isSession2Less = true;
          finalDiffMin = diffTimeSession2;
        }
      }
      finalDiffMin = Math.abs(finalDiffMin);
      if (finalDiffMin < late_buffer_time) {
        fieldError["late_buffer_time"][index] = `Minutes should be below ${
          isSession2Less
            ? `session 2 start time and end time i.e ${finalDiffMin} Min`
            : `session 1 start time and end time i.e ${finalDiffMin} Min`
        }`;
        validation = false;
      }
      if (late_buffer_time > buffer_time) {
        fieldError["buffer_time"][
          index
        ] = `Minutes should be greater than late minute ${late_buffer_time}`;
        validation = false;
      }
    });
    let isAvailableDay = false;
    let names = [];
    workingDays.map((data) => {
      if (!data.hasOwnProperty("is_enable") && data["is_teacher_working_day"]) {
        isAvailableDay = true;
        names.push(data.name);
      }
    });
    names = names.join(", ");
    if (isAvailableDay) {
      validation = false;
      openSnackbar = true;
      alertData = `Please select timing for ${names} days`;
    }

    this.setState({
      fieldError,
      openSnackbar,
      alertData,
    });
    return validation;
  };

  formatScheduleList = () => {
    let { shift_schedules, isEdit, shift_details } = this.state;
    let tempList = [...shift_schedules];
    let deletable_ids = [];
    let shift_schedules_temp = [];
    let shift_details_temp = {};

    shift_details_temp["name"] = shift_details["name"];
    shift_details_temp["late_attempt_per_month"] = !shift_details["isDeduction"]
      ? null
      : shift_details["late_attempt_per_month"];
    shift_details_temp["deduction_days"] = !shift_details["isDeduction"]
      ? null
      : shift_details["deduction_days"] === 1
      ? 0.5
      : 1;
    if (shift_details["id"]) {
      shift_details_temp["id"] = shift_details["id"];
    }
    tempList.map((field) => {
      let tempObject = {};
      tempObject["start_time"] = field["session1_start_time"];
      if (field["id"]) {
        tempObject["id"] = field["id"];
      }
      if (field.isHalfDay) {
        tempObject["end_time"] = field["session1_end_time"];
        tempObject["first_session_end_time"] = null;
        tempObject["second_session_start_time"] = null;
      } else {
        tempObject["first_session_end_time"] = field["session1_end_time"];
        tempObject["end_time"] = field["session2_end_time"];
        tempObject["second_session_start_time"] = field["session2_start_time"];
      }
      tempObject["late_buffer_time"] = field["late_buffer_time"]
        ? parseInt(field["late_buffer_time"])
        : 0.0;
      tempObject["buffer_time"] = field["buffer_time"]
        ? parseInt(field["buffer_time"])
        : 0.0;
      tempObject["working_days"] = [];
      field["working_days"].map((data) => {
        let workingTemp = {};
        if (data.enable) {
          if (isEdit) {
            workingTemp["id"] = data["day_id"];
          }
          workingTemp["day"] = data.id;
          tempObject["working_days"].push(workingTemp);
        } else if (data["day_id"]) {
          deletable_ids.push(data["day_id"]);
        }
      });
      shift_schedules_temp.push(tempObject);
    });

    let returnValue = {
      shift_details: shift_details_temp,
      shift_schedules: shift_schedules_temp,
      deletable_ids,
    };
    return returnValue;
  };

  postMethod = () => {
    let validationWorkingDays = this.validationWorkingDayFields();

    if (!validationWorkingDays) return;
    let ValidationTiming = this.ValidationTiming();

    if (!ValidationTiming) return;

    let { shift_details, deletableIds } = this.state;
    this.setState({ submitDisable: true });
    let post_data = this.formatScheduleList();

    let url = POST_URL.shift.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.manage_shift_types.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };

  render() {
    const {
      loading,
      submitDisable,
      fieldError,
      isDeduction,
      deductionList,
      workingDays,
      shift_schedules,
      late_attempt_per_month,
      name,
      deduction_days,
      openSnackbar,
      alertData,
      isHalfDay,
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
              <Box className="heading">Shift type list</Box>
              <Box className="sub-heading">
                {`The Shift schedule of the ${alias_names["school"]} is defined here over a period time.`}
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                {isUserHasPermission("manage_shift_types", "create") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.manage_shift_types.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.manage_shift_types.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>

          <Paper className="shift-type-paper-background header-align">
            <Grid container spacing={4}>
              <Grid item md={4} xs={12}>
                <TextField
                  id="time"
                  label="Shift Name"
                  type="text"
                  variant="outlined"
                  name="name"
                  value={shift_details["name"]}
                  defaultValue=""
                  className="width-100"
                  onChange={(e) => this.handleChangeShiftDetails(e)}
                  inputProps={{
                    step: 300, // 5 min
                  }}
                  helperText={!fieldError["name"] ? "" : fieldError["name"]}
                  error={fieldError["name"]}
                />
              </Grid>
            </Grid>
            <Grid container spacing={1} className="header-align">
              <Grid item md={5} xs={12}>
                <FormControlLabel
                  className="margin-left-0"
                  control={
                    <Switch
                      checked={shift_details["isDeduction"]}
                      name={shift_details["isDeduction"]}
                      value={shift_details["isDeduction"]}
                      color="primary"
                      onChange={this.handleChangeIsDeduction}
                    />
                  }
                  label="Is Deduction in salary for late coming"
                />
              </Grid>
              <Grid item md={4} xs={12}>
                {shift_details["isDeduction"] && (
                  <TextField
                    id="time"
                    label="No of late days to deduct"
                    type="text"
                    variant="outlined"
                    name="late_attempt_per_month"
                    value={shift_details["late_attempt_per_month"]}
                    defaultValue=""
                    fullWidth
                    onChange={(e) => this.handleChangeShiftDetails(e)}
                    inputProps={{
                      step: 300, // 5 min
                    }}
                    helperText={
                      !fieldError["late_attempt_per_month"]
                        ? ""
                        : fieldError["late_attempt_per_month"]
                    }
                    error={fieldError["late_attempt_per_month"]}
                  />
                )}
              </Grid>

              <Grid item md={3} xs={12}>
                {shift_details["isDeduction"] && (
                  <Dropdown
                    data={deductionList}
                    name="deduction_days"
                    value={shift_details["deduction_days"]}
                    onChange={this.handleChangeShiftDetails}
                    label="Deduction Days"
                    error={fieldError["deduction_days"]}
                    hideSelect={true}
                  />
                )}
              </Grid>
            </Grid>
          </Paper>

          {shift_schedules.map((field, index) => {
            return (
              <Paper
                className={
                  fieldError["entire_paper_error"][index]
                    ? "shift-type-paper-background entire-paper-error position-relative"
                    : "shift-type-paper-background position-relative"
                }
              >
                {(index !== 0 || shift_schedules.length > 1) && (
                  <Box
                    className={
                      fieldError["entire_paper_error"][index] ? "" : "red-text"
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
                            {working.is_teacher_working_day &&
                              this.handleWorkingDays(workingIndex, index) !==
                                null && (
                                <Box
                                  className={
                                    this.handleWorkingDays(workingIndex, index)
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
                            {working.is_teacher_working_day &&
                              this.handleWorkingDays(workingIndex, index) ===
                                null && (
                                <Box className="shift-weekdays-box weekdays-assigned-other user-select-none">
                                  {working.name.substring(0, 3)}
                                </Box>
                              )}
                            {!working.is_teacher_working_day && (
                              <Box className="shift-weekdays-box weekdays-offline user-select-none">
                                {working.name.substring(0, 3)}
                              </Box>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                  <Box>
                    <FormControlLabel
                      className="margin-left-0"
                      control={
                        <Switch
                          checked={field["isHalfDay"]}
                          name={isHalfDay}
                          value={field["isHalfDay"]}
                          color="primary"
                          onChange={(e) =>
                            this.handleChangeShiftSchedules(
                              e,
                              index,
                              "isHalfDay"
                            )
                          }
                        />
                      }
                      label="Is Session 1"
                    />
                  </Box>
                </Box>

                <Grid container spacing={3} className="header-align">
                  <Grid item md={4} xs={12}>
                    <TextField
                      id="time"
                      label="Session 1 Start Time"
                      type="time"
                      variant="outlined"
                      name="session1_start_time"
                      fullWidth
                      defaultValue={field.session1_start_time}
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
                        !fieldError["session1_start_time"][index]
                          ? ""
                          : fieldError["session1_start_time"][index]
                      }
                      error={fieldError["session1_start_time"][index]}
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <TextField
                      id="time"
                      label="Session 1 End Time"
                      type="time"
                      variant="outlined"
                      name="session1_end_time"
                      fullWidth
                      defaultValue={field.session1_end_time}
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
                        !fieldError["session1_end_time"][index]
                          ? ""
                          : fieldError["session1_end_time"][index]
                      }
                      error={fieldError["session1_end_time"][index]}
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <TextField
                      id="time"
                      label="Minutes to consider as Late"
                      type="text"
                      variant="outlined"
                      name="late_buffer_time"
                      value={field.late_buffer_time}
                      defaultValue=""
                      fullWidth
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

                <Grid container spacing={3} className="header-align">
                  <Grid item md={4} xs={12}>
                    {!field.isHalfDay && (
                      <TextField
                        id="time"
                        label="Session 2 Start Time"
                        type="time"
                        variant="outlined"
                        name="session2_start_time"
                        fullWidth
                        defaultValue={field.session2_start_time}
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
                          !fieldError["session2_start_time"][index]
                            ? ""
                            : fieldError["session2_start_time"][index]
                        }
                        error={fieldError["session2_start_time"][index]}
                      />
                    )}
                  </Grid>
                  <Grid item md={4} xs={12}>
                    {!field.isHalfDay && (
                      <TextField
                        id="time"
                        label="Session 2 End Time"
                        type="time"
                        variant="outlined"
                        name="session2_end_time"
                        fullWidth
                        defaultValue={field.session2_end_time}
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
                          !fieldError["session2_end_time"][index]
                            ? ""
                            : fieldError["session2_end_time"][index]
                        }
                        error={fieldError["session2_end_time"][index]}
                      />
                    )}
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <TextField
                      id="time"
                      label={
                        field.isHalfDay
                          ? "Minutes to consider as Absent"
                          : "Minutes to consider as Half Day"
                      }
                      type="text"
                      variant="outlined"
                      name="buffer_time"
                      fullWidth
                      value={field.buffer_time}
                      defaultValue=""
                      onChange={(e) =>
                        this.handleChangeShiftSchedules(e, index)
                      }
                      onBlur={(e) => this.onBlurValidation(e, index)}
                      inputProps={{
                        step: 300, // 5 min
                      }}
                      helperText={
                        !fieldError["buffer_time"][index]
                          ? ""
                          : fieldError["buffer_time"][index]
                      }
                      error={fieldError["buffer_time"][index]}
                    />
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
          <Box className="end-flex-prop margin-top-20">
            <Button
              variant="contained"
              onClick={this.addNew}
              className="add-another-button"
            >
              <ControlPointOutlinedIcon className="visibility-icon" /> Add
              Another Timing for Remaining Days in a Week
            </Button>
          </Box>

          <Box className="assign-shift-submit-position">
            <Button
              variant="contained"
              className="submit"
              onClick={this.postMethod}
              disabled={this.state.submitDisable}
            >
              Submit
            </Button>
          </Box>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openSnackbar}
            autoHideDuration={2000}
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

export default withRouter(NewAddShift);

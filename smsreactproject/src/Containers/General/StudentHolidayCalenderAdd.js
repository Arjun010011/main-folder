import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from "@material-ui/core";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import _ from "lodash";
import moment from "moment";
import { image_formats } from "Containers/Expenses/Constants";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { supported_documet_submitted, maxFileSize } from "Constants";

import MultipleAddTextFields from "Components/MultipleAddTextFields";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  getUrlParam,
} from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import { minDate, maxDate, reasonType } from "Constants";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

/** Match DB `Day.name` to JS getDay() / moment().day() (Sun=0 … Sat=6) */
const DAY_NAME_TO_DOW = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const holidayCalender_global = [
  {
    label: "Calender Name",
    regex: nameWithQuoteRegex,
    autoFocus: true,
    name: "reason",
    md: 12,
    className: "width-form-95",
    allowDuplicates: true,
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "From Date",
    regex: "",
    name: "from_date",
    md: 6,
    minDate: new Date(),
    maxDate: maxDate,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
  },
  {
    label: "To Date",
    regex: "",
    name: "to_date",
    md: 6,
    maxDate: maxDate,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
    parentMinDate: "from_date",
  },
];
class StudentHolidayCalenderAdd extends Component {
  constructor() {
    super();
    this.state = {
      holidayList: [],
      loading: true,
      open: false,
      alertData: "",
      selectedCountry: "",
      error: {},
      fieldDetail: null,
      calender_plan: "",
      calender_typeList: [],
      calender_type: "",
      imagesPreview: false,
      image_name_list: [],
      document_list: { imagesPreview: [] },
      largeImagePreview: false,
      calenderDetails: {},
      isEdit: false,
      update_details: {},
      toDate: "",
      multipleFieldsKey: 0,
      bulkDialogOpen: false,
      bulkHolidayReason: "",
      bulkSelectedDates: {},
      bulkExistingByDay: {},
      bulkExistingLoading: false,
      planList: [],
      studentWorkingDows: ALL_WEEKDAYS,
      studentWorkingDaysReady: false,
    };
  }

  updateHolidayPlan = (id) => {
    let { holidayList, document_list } = this.state;
    let { toDate, selectedCountry, fromDate } = getUrlParam();
    const toDateFmt = toDate ? dateFormat(toDate, "YYYY-MM-DD") : "";
    const url = GET_URL.holidaycalenderforstudent.api + id + "/";
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let fieldDetail = _.cloneDeep(holidayCalender_global);
        let update_details = response.data.data;
        fieldDetail.map((field) => {
          if (field.name === "from_date") {
            // field["minDate"] = moment().add(1, "days");
            field["minDate"] = fromDate;
            field["maxDate"] = toDate;
            field["default"] = update_details.from_date;
          } else if (field.name === "to_date") {
            field["maxDate"] = toDate;
            field["default"] = update_details.to_date;
          } else if (field.name === "reason") {
            field["default"] = update_details.reason;
          }
        });
        let image_temp = {};
        update_details.document_list.map((data) => {
          image_temp = {};
          image_temp["file"] = data.document_details["file_name"];
          image_temp["file_extension"] = `${data.document_details[
            "file_name"
          ].slice(
            (Math.max(0, data.document_details["file_name"].lastIndexOf(".")) ||
              Infinity) + 1
          )}`.toLowerCase();
          image_temp["url"] = data.document_details["file"];
          image_temp["uploadedId"] = data.document_details["id"];
          image_temp["id"] = data["id"];
          document_list["imagesPreview"].push(image_temp);
        });

        holidayList.push({
          reason: update_details.reason,
          from_date: update_details.from_date,
          to_date: update_details.to_date,
        });
        this.getcalender_typeList(
          selectedCountry,
          update_details.calender_type
        );
        this.setState({
          loading: false,
          fieldDetail,
          calender_plan: update_details.calender_plan,
          isEdit: true,
          update_details,
          holidayList: [...holidayList],
          toDate: toDateFmt,
        });
      }
    });
  };

  componentDidMount = () => {
    if (
      this.props.location.pathname ===
      Actions.student_holiday_calender.update.url
    ) {
      if (this.props.location?.state?.detail) {
        let { selectedCountry, yearName, fromDate, toDate } = getUrlParam();
        let id = this.props.location.state.detail;
        this.updateHolidayPlan(id);
        this.getHolidayPlanList(selectedCountry);
        this.setState({
          selectedCountry: selectedCountry,
          yearName: yearName,
          fromDate: dateFormat(fromDate, "YYYY-MM-DD"),
          toDate: dateFormat(toDate, "YYYY-MM-DD"),
        });
      } else {
        this.handleViewButton();
      }
    } else {
      let { selectedCountry, yearName, fromDate, toDate } = getUrlParam();
      if (selectedCountry && yearName && fromDate && toDate) {
        let fieldDetail = _.cloneDeep(holidayCalender_global);
        fieldDetail.map((field) => {
          if (field.name === "from_date") {
            field["minDate"] = fromDate
            field["maxDate"] = toDate;
          }
          if (field.name === "to_date") {
            field["maxDate"] = toDate;
          }
        });
        this.setState({
          selectedCountry: selectedCountry,
          yearName: yearName,
          fromDate: dateFormat(fromDate, "YYYY-MM-DD"),
          toDate: dateFormat(toDate, "YYYY-MM-DD"),
          loading: false,
          fieldDetail: fieldDetail,
        });
        this.getHolidayPlanList(selectedCountry);
        this.getcalender_typeList(selectedCountry);
      } else {
        this.handleViewButton();
      }
    }
  };

  getcalender_typeList = (year, type) => {
    const url = GET_URL.calendertype.api;
    const params = { is_active: true, academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let calender_type;
        if (type) {
          response.data.data.calender_type_list.map((data) => {
            if (data.name === type) {
              calender_type = data;
            }
          });
        }
        this.setState({
          calender_typeList: response.data.data.calender_type_list,
          calender_type,
        });
      }
    });
  };

  getHolidayPlanList = (id) => {
    const url = GET_URL.holidayplan.api;
    const params = { is_active: true, academic_year: id };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const raw = response.data?.data;
        const planList = Array.isArray(raw) ? raw : [];
        this.setState({
          planList,
          calender_plan:
            planList.length === 1 ? planList[0].id : "",
        });
      }
    });
  };

  expandHolidayRowsToDayMap = (rows) => {
    const map = {};
    (rows || []).forEach((row) => {
      const reason = ((row.reason || "").trim() || "Holiday").trim();
      const start = moment(row.from_date);
      const end = moment(row.to_date);
      if (!start.isValid() || !end.isValid()) return;
      const c = start.clone();
      while (c.isSameOrBefore(end, "day")) {
        const ymd = c.format("YYYY-MM-DD");
        const prev = map[ymd];
        map[ymd] = prev ? `${prev}; ${reason}` : reason;
        c.add(1, "day");
      }
    });
    return map;
  };

  fetchBulkExistingHolidays = () => {
    const { selectedCountry, calender_plan } = this.state;
    this.setState({ bulkExistingLoading: true });
    const url = GET_URL.holidaycalenderforstudent.api;
    const params = {
      academic_year: selectedCountry,
      is_active: true,
    };
    if (calender_plan) {
      params.calender_plan = calender_plan;
    }
    getRequest(url, params, this.props)
      .then((response) => {
        let rows = [];
        if (
          response &&
          response.status === 200 &&
          Array.isArray(response.data?.data)
        ) {
          rows = response.data.data;
        }
        this.setState({
          bulkExistingByDay: this.expandHolidayRowsToDayMap(rows),
          bulkExistingLoading: false,
        });
      })
      .catch(() => {
        this.setState({ bulkExistingByDay: {}, bulkExistingLoading: false });
      });
  };

  fetchStudentWorkingWeekdays = () => {
    getRequest(GET_URL.days.api, { is_active: true }, this.props)
      .then((response) => {
        const allowed = [];
        if (
          response &&
          response.status === 200 &&
          Array.isArray(response.data?.data)
        ) {
          response.data.data.forEach((d) => {
            if (!d.is_student_working_day) return;
            const key = (d.name || "").trim().toLowerCase();
            const dow = DAY_NAME_TO_DOW[key];
            if (dow !== undefined && allowed.indexOf(dow) === -1) {
              allowed.push(dow);
            }
          });
        }
        const studentWorkingDows =
          allowed.length > 0 ? allowed.sort((a, b) => a - b) : ALL_WEEKDAYS;
        this.setState((prev) => {
          const bulkSelectedDates = { ...prev.bulkSelectedDates };
          Object.keys(bulkSelectedDates).forEach((ymd) => {
            const dow = moment(ymd, "YYYY-MM-DD").day();
            if (studentWorkingDows.indexOf(dow) === -1) {
              delete bulkSelectedDates[ymd];
            }
          });
          return {
            studentWorkingDows,
            studentWorkingDaysReady: true,
            bulkSelectedDates,
          };
        });
      })
      .catch(() => {
        this.setState({
          studentWorkingDows: ALL_WEEKDAYS,
          studentWorkingDaysReady: true,
        });
      });
  };

  updateholidayListValue = (stateValue) => {
    let { holidayList } = this.state;
    holidayList = stateValue;
    this.setState({
      holidayList,
    });
  };

  handleCloseLargeImage = () => {
    this.setState({ largeImagePreview: false });
  };
  openBulkHolidayDialog = () => {
    this.setState(
      {
        bulkDialogOpen: true,
        bulkHolidayReason: "",
        bulkSelectedDates: {},
        studentWorkingDows: ALL_WEEKDAYS,
        studentWorkingDaysReady: false,
      },
      () => {
        this.fetchBulkExistingHolidays();
        this.fetchStudentWorkingWeekdays();
      }
    );
  };

  closeBulkHolidayDialog = () => {
    this.setState({ bulkDialogOpen: false });
  };

  onBulkCalendarDayClick = (value) => {
    const { fromDate, toDate, studentWorkingDows, studentWorkingDaysReady } =
      this.state;
    if (!fromDate || !toDate) return;
    const ymd = moment(value).format("YYYY-MM-DD");
    if (
      !moment(ymd).isBetween(
        moment(fromDate, "YYYY-MM-DD"),
        moment(toDate, "YYYY-MM-DD"),
        "day",
        "[]"
      )
    ) {
      return;
    }
    if (
      studentWorkingDaysReady &&
      studentWorkingDows &&
      studentWorkingDows.indexOf(moment(ymd, "YYYY-MM-DD").day()) === -1
    ) {
      return;
    }
    const bulkSelectedDates = { ...this.state.bulkSelectedDates };
    if (bulkSelectedDates[ymd]) {
      delete bulkSelectedDates[ymd];
    } else {
      bulkSelectedDates[ymd] = true;
    }
    this.setState({ bulkSelectedDates });
  };

  bulkCalendarTileClassName = ({ date, view }) => {
    if (view !== "month") return null;
    const { bulkSelectedDates, bulkExistingByDay, fromDate, toDate } =
      this.state;
    if (!fromDate || !toDate) return null;
    const ymd = moment(date).format("YYYY-MM-DD");
    const inYear = moment(ymd).isBetween(
      moment(fromDate, "YYYY-MM-DD"),
      moment(toDate, "YYYY-MM-DD"),
      "day",
      "[]"
    );
    if (!inYear) return "bulk-cal-tile--outside";
    const classes = [];
    if (bulkExistingByDay[ymd]) classes.push("bulk-cal-tile--existing");
    if (bulkSelectedDates[ymd]) classes.push("bulk-cal-tile--picked");
    return classes.length ? classes.join(" ") : null;
  };

  bulkCalendarTileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const ymd = moment(date).format("YYYY-MM-DD");
    const text = this.state.bulkExistingByDay[ymd];
    if (!text) return null;
    const short = text.length > 14 ? `${text.slice(0, 13)}…` : text;
    return (
      <span className="bulk-cal-tile-reason" title={text}>
        {short}
      </span>
    );
  };

  bulkCalendarTileDisabled = ({ date, view }) => {
    if (view !== "month") return false;
    const { fromDate, toDate, studentWorkingDows, studentWorkingDaysReady } =
      this.state;
    if (!fromDate || !toDate) return true;
    const ymd = moment(date).format("YYYY-MM-DD");
    if (
      !moment(ymd).isBetween(
        moment(fromDate, "YYYY-MM-DD"),
        moment(toDate, "YYYY-MM-DD"),
        "day",
        "[]"
      )
    ) {
      return true;
    }
    if (!studentWorkingDaysReady) return false;
    const dow = moment(date).day();
    return studentWorkingDows.indexOf(dow) === -1;
  };

  collectCompleteHolidayRowsFromForm = () => {
    const refH = this.refs.holiday;
    const { holidayList } = this.state;
    const rows = [];
    if (refH && refH.state && Array.isArray(refH.state.fieldValue)) {
      refH.state.fieldValue.forEach((item) => {
        const r = (item.reason || "").toString().trim();
        const f = item.from_date;
        const t = item.to_date;
        if (r && f && t) {
          rows.push({
            reason: r,
            from_date: dateFormat(f, "YYYY-MM-DD"),
            to_date: dateFormat(t, "YYYY-MM-DD"),
          });
        }
      });
    }
    if (rows.length > 0) return rows;
    return (holidayList || []).filter(
      (h) => h.reason && h.from_date && h.to_date
    );
  };

  applyBulkHolidays = () => {
    const { bulkHolidayReason, bulkSelectedDates } = this.state;
    const reason = (bulkHolidayReason || "").trim();
    if (!reason) {
      this.setState({
        open: true,
        alertData: "Enter a holiday name for bulk add.",
      });
      return;
    }
    if (!nameWithQuoteRegex.value.test(reason)) {
      this.setState({
        open: true,
        alertData: nameWithQuoteRegex.errorText,
      });
      return;
    }
    const ymKeys = Object.keys(bulkSelectedDates).filter((k) => bulkSelectedDates[k]);
    ymKeys.sort();
    if (ymKeys.length === 0) {
      this.setState({
        open: true,
        alertData: "Click days on the calendar to select holidays.",
      });
      return;
    }
    const maxRows = 400;
    if (ymKeys.length > maxRows) {
      this.setState({
        open: true,
        alertData: `Too many days selected (${ymKeys.length}). Limit is ${maxRows}.`,
      });
      return;
    }
    const generated = ymKeys.map((ymd) => ({
      reason,
      from_date: ymd,
      to_date: ymd,
    }));
    const existing = this.collectCompleteHolidayRowsFromForm();
    const seen = new Set(
      existing.map((e) => `${e.from_date}|${e.to_date}`)
    );
    const merged = [...existing];
    generated.forEach((g) => {
      const k = `${g.from_date}|${g.to_date}`;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(g);
      }
    });
    this.setState({
      holidayList: merged,
      multipleFieldsKey: this.state.multipleFieldsKey + 1,
      bulkDialogOpen: false,
    });
  };

  getDocumentListFormat = (isDelete) => {
    const { isEdit, document_list, update_details } = this.state;
    let return_data = [];
    let return_temp = {};
    let edit_ids = [];
    let deletable_ids = [];

    if (document_list?.imagesPreview?.length > 0) {
      document_list.imagesPreview.map((imgData) => {
        if (imgData.uploadedId) {
          return_temp = {};
          return_temp["document"] = imgData.uploadedId;
          return_temp["document_type"] = imgData.doc_id;
          if (isEdit && imgData?.id) {
            return_temp["id"] = imgData?.id;
            edit_ids.push(imgData?.id);
          }
          return_data.push(return_temp);
        }
      });
    } else {
      // return_temp = {};
      // return_temp["document"] = null;
      // return_temp["document_type"] = data.doc_id;
      // if (isEdit && data.edit_id) {
      //   return_temp["id"] = data.edit_id;
      //   edit_ids.push(data?.edit_id);
      // }
      // return_data.push(return_temp);
    }

    if (isEdit) {
      update_details.document_list.map((data) => {
        if (!edit_ids.includes(data.id)) {
          deletable_ids.push(data.id); 
        }
      });
    }
    if (isDelete) {
      return_data = deletable_ids;
    }
    return return_data;
  };

  validate = () => {
    let {
      holidayList,
      selectedCountry,
      calender_plan,
      error,
      calender_type,
      update_details,
      isEdit,
    } = this.state;
    let nextError = { ...error };
    let holidayValidate = true;
    if (!calender_plan) {
      nextError.calender_plan = "Select Holiday Plan";
      this.setState({
        open: true,
        alertData: "Select Holiday Plan",
        error: nextError,
      });
      holidayValidate = false;
    }
    if (!calender_type) {
      nextError = { ...nextError, calender_type: "Select Calender Type" };
      this.setState({
        open: true,
        alertData: "Select Calender Type",
        error: nextError,
      });
      holidayValidate = false;
    }
    const fieldsValid = this.refs.holiday.validateFields();
    if (!holidayValidate || !fieldsValid || !calender_type) {
      return;
    }
    const calenderTypeName = calender_type.name;
    if (!calenderTypeName) {
      this.setState({
        open: true,
        alertData: "Select Calender Type",
        error: { ...nextError, calender_type: "Select Calender Type" },
      });
      return;
    }
    holidayList.map((data) => {
      data.from_date = dateFormat(data.from_date, "YYYY-MM-DD");
      data.to_date = dateFormat(data.to_date, "YYYY-MM-DD");
      data.document_list = this.getDocumentListFormat();
      data.deletable_document_list = this.getDocumentListFormat(true);
    });
    let post_data = {
      academic_year: selectedCountry,
      calender_list: holidayList,
      calender_plan: calender_plan,
      calender_type: calenderTypeName,
    };
    this.setState({ submitDisable: true });
    if (isEdit) {
      let post_data = {
        academic_year: selectedCountry,
        from_date: holidayList[0]["from_date"],
        to_date: holidayList[0]["to_date"],
        reason: holidayList[0]["reason"],
        calender_plan: calender_plan,
        calender_type: calenderTypeName,
        document_list: this.getDocumentListFormat(),
        deletable_document_list: this.getDocumentListFormat(true),
      };
      let url =
        PUT_URL.holidaycalenderforstudent.api + update_details.id + "/";
      putRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push({
            pathname: Actions.student_holiday_calender.view.url,
            state: { selectedCountry: selectedCountry },
          });
        }
        this.setState({ submitDisable: false });
      });
    } else {
      let url = POST_URL.holidaycalenderforstudent.api;
      postRequest(url, post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push({
            pathname: Actions.student_holiday_calender.view.url,
            state: { selectedCountry: selectedCountry },
          });
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleViewButton = () => {
    let { selectedCountry } = this.state;
    this.props.history.push({
      pathname: Actions.student_holiday_calender.view.url,
      state: { selectedCountry: selectedCountry },
    });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  handleDropDownWithSearchChange = (e, value) => {
    let { error } = this.state;
    delete error["calender_type"];
    this.setState({
      calender_type: value,
      error,
    });
  };

  handleImageChange = (event, acceptFileType) => {
    let { document_list, image_name_list } = this.state;
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_image_type = true;
    is_supported_image_type = supported_documet_submitted.type.includes(
      file_extension.toLowerCase()
    );
    if (image_name_list.includes(fileName)) {
      this.setState({
        openSnackbar: true,
        alertData: "Image is already exist",
      });
      return;
    }
    if (event.target.files[0] && is_supported_image_type) {
      if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        let request = postRequest;
        let url = POST_URL.uploads.api;
        document_list["imageUploading"] = true;
        this.setState({ document_list });
        request(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            let uploadedId = response.data.data.id;
            let imagePreview = response.data.data.file;
            let imageName = fileName;
            image_name_list.push(imageName);
            let temp = {
              file_extension: file_extension,
              uploadedId: uploadedId,
              url: imagePreview,
              imageName: imageName,
            };
            document_list.imagesPreview.push(temp);
            this.setState({
              document_list,
            });
          }
          document_list["imageUploading"] = false;
          this.setState({
            document_list,
          });
        });
      } else {
        this.setState({
          openSnackbar: true,
          alertData: maxFileSize.errorText,
        });
      }
    } else if (!is_supported_image_type) {
      this.setState({
        alertData: supported_documet_submitted.error,
        openSnackbar: true,
      });
    }
  };

  deleteUploadedImage = (index) => {
    let { document_list } = this.state;
    document_list.imagesPreview.splice(index, 1);
    this.setState({
      document_list,
    });
  };

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  render() {
    const {
      loading,
      alertData,
      open,
      yearName,
      fieldDetail,
      planList,
      calender_plan,
      error,
      calender_typeList,
      calender_type,
      document_list,
      largeImagePreview,
      holidayList,
      isEdit,
      multipleFieldsKey,
      bulkDialogOpen,
      bulkHolidayReason,
      bulkSelectedDates,
      bulkExistingByDay,
      bulkExistingLoading,
      fromDate,
      toDate,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Calendar for {yearName}</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("student_holiday_calender", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.handleViewButton}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.student_holiday_calender.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            {largeImagePreview && (
              <Box className="set-question-large-image-preview-box">
                <img
                  src={largeImagePreview}
                  alt="Image Preview"
                  className="set-question-large-image-preview"
                />
                <Tooltip title="Close Image" placement="top-start">
                  <Box
                    className="set-question-large-image-remove-icon-box"
                    onClick={this.handleCloseLargeImage}
                  >
                    <HighlightOffIcon className="set-question-large-image-remove-icon" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            <Paper className="p-20  mt-20">
              <div className="d-flex">
                <div className="mt-20 ">
                  <Dropdown
                    data={planList}
                    name="calender_plan"
                    value={calender_plan}
                    onChange={this.onChange}
                    label="Plan Name"
                    error={error.calender_plan}
                    hideSelect={true}
                    size={"small"}
                    className={"width-300px"}
                  />
                </div>
                <div className="mt-20 ml-20">
                  <DropDownWithSearch
                    id="combo-box-demo"
                    options={calender_typeList}
                    value={calender_type}
                    error={error.calender_type}
                    onChange={(e, newValue) =>
                      this.handleDropDownWithSearchChange(e, newValue)
                    }
                    optionValue="label"
                    required={true}
                    label={"Calender Type"}
                    autoCompleteClassName="width-300px"
                    className="width-inherit bg-white"
                    size="small"
                  />
                </div>
              </div>
              <Box className="mt-20 set-question-uploaded-images-outer-box">
                <label
                  htmlFor={`upload-pic`}
                  className={
                    document_list["imageUploading"]
                      ? "upload-icon-uploading"
                      : ""
                  }
                >
                  <Button
                    variant="raised"
                    component="span"
                    disabled={document_list["imageUploading"]}
                    className="set-question-upload-images-button"
                  >
                    Upload Images
                    <Box className="upload-icon">
                      <i className="fa fa-upload" aria-hidden="true"></i>
                    </Box>
                  </Button>
                  <Box
                    className={
                      document_list["imageUploading"]
                        ? "image-uploading-circular-icon"
                        : "display-none"
                    }
                  >
                    <CircularProgress className="set-question-upload-image-loading" />{" "}
                  </Box>
                </label>
                <input
                  disabled={document_list["imageUploading"]}
                  type="file"
                  id={`upload-pic`}
                  className="display-none"
                  onChange={(e) => this.handleImageChange(e, "img")}
                  onClick={(e) => (e.target.value = null)}
                />
                <Box className="set-question-image-list-box">
                  {document_list.imagesPreview &&
                    document_list.imagesPreview.map((temp, index) => {
                      return (
                        <Box className="set-question-image-preview-outer-box">
                          <Tooltip title="Preview Image" placement="top-start">
                            <>
                              {image_formats.includes(temp.file_extension) && (
                                <img
                                  src={temp.url}
                                  alt="image"
                                  className="document_list-uploaded-image"
                                />
                              )}
                              {temp.file_extension === "pdf" && (
                                <Box className="view-details-file-pdf-icon">
                                  <i class="fa fa-file-pdf-o" />
                                </Box>
                              )}
                            </>
                          </Tooltip>
                          <Box
                            onClick={() =>
                              this.handleLargePreview(
                                temp.file_extension,
                                temp.url
                              )
                            }
                            className="set-question-image-preview-icon"
                          >
                            <VisibilityOutlinedIcon />{" "}
                          </Box>
                          <Box
                            className="set-question-delete-image-input"
                            onClick={() => this.deleteUploadedImage(index)}
                          >
                            <HighlightOffIcon />
                          </Box>
                        </Box>
                      );
                    })}
                </Box>
              </Box>
            </Paper>

            <Grid container className={classNames("header-align")}>
              <Grid item md={8} xs={12}>
                {fieldDetail && !isEdit && (
                  <Box className="mb-20">
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={this.openBulkHolidayDialog}
                      className="mr-10"
                    >
                      Bulk add holidays
                    </Button>
                  </Box>
                )}
                {fieldDetail && (
                  <MultipleAddTextFields
                    key={multipleFieldsKey}
                    fieldDefaultValue={holidayList}
                    fieldDetails={fieldDetail}
                    hideAddMore={true}
                    updateParent={this.updateholidayListValue}
                    isEmptyNotAllowed={true}
                    handleDateRange={{
                      status: true,
                      fromDate: "from_date",
                      toDate: "to_date",
                      conflictWith: "reason",
                    }}
                    ref={"holiday"}
                    idFormat={"holiday_add_2022_08_11_2_pm_"}
                  />
                )}
                <Box className="end-flex-prop  margin-top-30">
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={this.state.submitDisable}
                      onClick={() => this.validate()}
                    >
                      Submit
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
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
              open={bulkDialogOpen}
              onClose={this.closeBulkHolidayDialog}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Bulk add holidays</DialogTitle>
              <DialogContent>
                <style>
                  {`
                    .bulk-holiday-calendar-wrapper { width: 100%; display: flex; justify-content: center; }
                    .bulk-holiday-calendar { border: none; width: 100%; max-width: 380px; font-size: 13px; }
                    .bulk-holiday-calendar .react-calendar__tile { position: relative; min-height: 56px; padding: 6px 4px 18px; }
                    .bulk-cal-tile--existing:not(.bulk-cal-tile--picked) { background: #e3f2fd !important; }
                    .bulk-cal-tile--picked { background: #1976d2 !important; color: #fff !important; }
                    .bulk-cal-tile--picked.bulk-cal-tile--existing { background: #0d47a1 !important; color: #fff !important; }
                    .bulk-cal-tile--outside { opacity: 0.35; }
                    .bulk-cal-tile-reason {
                      display: block; font-size: 9px; line-height: 1.1; margin-top: 2px;
                      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                      color: #1565c0; max-width: 100%;
                    }
                    .bulk-cal-tile--picked .bulk-cal-tile-reason { color: #e3f2fd; }
                    /* Stop react-calendar "active" focus from replacing our picked / existing colours */
                    .bulk-holiday-calendar .react-calendar__tile--active:not(.bulk-cal-tile--picked) {
                      background: #ffffff !important;
                      color: #000000 !important;
                    }
                    .bulk-holiday-calendar .react-calendar__tile--active.bulk-cal-tile--existing:not(.bulk-cal-tile--picked) {
                      background: #e3f2fd !important;
                      color: inherit !important;
                    }
                    .bulk-holiday-calendar .react-calendar__tile--active.bulk-cal-tile--picked {
                      background: #1976d2 !important;
                      color: #fff !important;
                    }
                    .bulk-holiday-calendar .react-calendar__tile--active.bulk-cal-tile--picked.bulk-cal-tile--existing {
                      background: #0d47a1 !important;
                      color: #fff !important;
                    }
                    .bulk-holiday-calendar .react-calendar__tile:enabled:focus { outline: none; }
                  `}
                </style>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Enter one holiday name, then click student working days on the
                  calendar (days that are not student working days in setup are
                  blocked). Click again to deselect. Existing leaves in this plan
                  are shown on each date. Use Submit on the main screen to save.
                </Typography>
                {!calender_plan ? (
                  <Typography color="secondary" paragraph>
                    Choose a holiday plan above to load existing holidays on the
                    calendar. You can still pick new dates.
                  </Typography>
                ) : null}
                <TextField
                  label="Holiday name (all selected days)"
                  value={bulkHolidayReason}
                  onChange={(e) =>
                    this.setState({ bulkHolidayReason: e.target.value })
                  }
                  variant="outlined"
                  fullWidth
                  className="mb-15"
                  inputProps={{ maxLength: 100 }}
                  required
                />
                <Box
                  display="flex"
                  flexWrap="wrap"
                  className="mb-10"
                  style={{ gap: 12 }}
                >
                  <Box display="flex" alignItems="center">
                    <Box
                      width={16}
                      height={16}
                      bgcolor="#e3f2fd"
                      mr={1}
                      border="1px solid #90caf9"
                    />
                    <Typography variant="caption">Existing holiday</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Box
                      width={16}
                      height={16}
                      bgcolor="#1976d2"
                      mr={1}
                      border="1px solid #0d47a1"
                    />
                    <Typography variant="caption">Newly selected</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Box
                      width={16}
                      height={16}
                      bgcolor="#eeeeee"
                      mr={1}
                      border="1px dashed #9e9e9e"
                    />
                    <Typography variant="caption">
                      Non working day (not selectable)
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" display="block" className="mb-10">
                  Selected:{" "}
                  <strong>{Object.keys(bulkSelectedDates).filter((k) => bulkSelectedDates[k]).length}</strong>{" "}
                  day(s)
                </Typography>
                {bulkExistingLoading ? (
                  <Box display="flex" justifyContent="center" py={3}>
                    <CircularProgress size={32} />
                  </Box>
                ) : fromDate && toDate ? (
                  <Box className="bulk-holiday-calendar-wrapper">
                    {/* <Calendar
                      className="bulk-holiday-calendar"
                      minDate={moment(fromDate, "YYYY-MM-DD").toDate()}
                      maxDate={moment(toDate, "YYYY-MM-DD").toDate()}
                      defaultActiveStartDate={moment(
                        fromDate,
                        "YYYY-MM-DD"
                      ).toDate()}
                      minDetail="month"
                      maxDetail="month"
                      view="month"
                      onClickDay={this.onBulkCalendarDayClick}
                      tileClassName={this.bulkCalendarTileClassName}
                      tileContent={this.bulkCalendarTileContent}
                      tileDisabled={this.bulkCalendarTileDisabled}
                    /> */}
                  </Box>
                ) : null}
              </DialogContent>
              <DialogActions>
                <Button onClick={this.closeBulkHolidayDialog}>Cancel</Button>
                <Button color="default" onClick={() => this.setState({ bulkSelectedDates: {} })}>
                  Clear selection
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  onClick={this.applyBulkHolidays}
                >
                  Add to list
                </Button>
              </DialogActions>
            </Dialog>
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(StudentHolidayCalenderAdd);

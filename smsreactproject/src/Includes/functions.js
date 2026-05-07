import React, { Component } from "react";
import { useEffect, useState, useRef } from "react";
import {
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  formatPhoneNumberIntl,
} from "react-phone-number-input";
import MuiAlert from "@material-ui/lab/Alert";
import Swal from "sweetalert2";
import moment from "moment";
import { ToWords } from "to-words";
import NumberFormat from "react-number-format";
import { getLatLng } from "react-autocomplete-places";
import { Tooltip } from "@material-ui/core";
import { hexCodeRegex } from "Constants/regularExpression";

import {
  maxDate,
  TEACHER_ID,
  address_types,
  minDate,
  COLOR_MAP,
  DEFAULTROWSPERPAGEOPT,
} from "Constants";
import GATrackingIds from "Constants/GoogleAnalyticsMapping";
import { INVOICE_MAPPING } from "Constants/invoiceMappingList";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import { GET_URL, POST_URL } from "Includes/urls";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import enTranslationMessages from "./../translations/en.json";
import kaTranslationMessages from "./../translations/ka.json";

// import { ka } from 'translations\ka.json';

export const checkAuthentication = (redirectUrl) => {
  const currentPath = window.location.pathname;
  // Check for exact /login path (not /apply/login)
  const isMainLoginPage = currentPath === "/login";
  const isPublicLoginPage = currentPath === "/apply/login";
  
  if (
    localStorage.getItem("token") &&
    isMainLoginPage
  ) {
    if (redirectUrl) {
      window.location = redirectUrl;
    } else {
      window.location.pathname = "/dashboard";
    }
  } else if (
    !localStorage.getItem("token") &&
    !isMainLoginPage &&
    !isPublicLoginPage &&
    !currentPath.includes("/public-enquiry") &&
    !currentPath.includes("/enquiry-thank-you") &&
    !currentPath.includes("/public-job-application") &&
    !currentPath.includes("/apply/application") &&
    !currentPath.includes("/apply/dashboard") &&
    !currentPath.includes("/payment")
  ) {
    window.location.pathname = "/login";
  }
};

export const logout = () => {
  postRequest(POST_URL.logout.api, {}, {}).then((response) => {
    localStorage.removeItem("user");
    localStorage.removeItem("menu");
    localStorage.removeItem("token");
    localStorage.removeItem("previewVideo");
    localStorage.removeItem("boards");
    localStorage.removeItem("board");
    localStorage.removeItem("branch");
    localStorage.removeItem("branches");
    localStorage.removeItem("signupconfig");
    window.location = "/login";
  });
};
export const validateMobileNumber = (field, value) => {
  let returnValue = { error: "", value: "", test: true };
  value = value ? (value.includes("+") ? `${value}` : `+${value}`) : "";
  let international = formatPhoneNumber(`${value}`);
  let RemovedValue = removeMobileExtension(international)
    .replace(/\s/g, "")
    .trim();
  if (RemovedValue === "" && field.required) {
    returnValue.error = (
      <FormattedMessage {...commonMessages.fieldMandatoryError} />
    );
    returnValue.test = false;
  } else if (!validatePhoneNumber(`${value}`) && RemovedValue !== "") {
    returnValue.error = <FormattedMessage {...commonMessages.invalidValue} />;
    returnValue.test = false;
  } else if (!validatePhoneNumber(`${value}`) && RemovedValue === "") {
    value = "";
  } else {
    returnValue.value = value;
  }
  return returnValue;
};

export const dateFormat = (dateValue, format, oldFormat) => {
  if (oldFormat) {
    return moment(moment(dateValue, oldFormat)).format(format);
  } else if (dateValue) {
    return moment(dateValue).format(format);
  } else {
    return true;
  }
};

export const timeFormat = (value, currentFormat, newFormat) => {
  let currentFormatTemp = "hh:mm:ss";
  let newFormatTemp = "hh:mm A";
  currentFormatTemp = currentFormat ? currentFormat : currentFormatTemp;
  newFormatTemp = newFormat ? newFormat : newFormatTemp;
  let returnValue = "";
  if (
    moment(value, currentFormatTemp).format(newFormatTemp) !== "Invalid date"
  ) {
    returnValue = moment(value, currentFormatTemp).format(newFormatTemp);
  }
  return returnValue;
};

export const validateLastDate = (Start_Date, End_Date) => {
  let error = "";
  if (End_Date < Start_Date) {
    error = "Last Date should be greater than Start Date";
  }
  return error;
};

export const validateDate = (
  date,
  minDateValue,
  maxDateValue,
  validate_wise
) => {
  let error = "";
  let dateValue = new Date(date);
  let first_date = moment(maxDateValue);
  let second_date = minDateValue ? moment(minDateValue) : moment(minDate);
  let date_format = "DD-MM-YYYY";
  if (first_date.diff(second_date, "days") < 0) {
    maxDateValue = "";
  }
  let label = "Minimum Date";
  if (!minDateValue && maxDateValue) {
    label = "Maximum Date";
  }
  if (validate_wise === "time") {
    validate_wise = null;
    date_format = "DD-MM-YYYY hh:mm A";
    label = "Minimum date and time";
  } else {
    validate_wise = "days";
  }
  if (dateFormat(dateValue, "DD-MM-YYYY") === "Invalid date") {
    error = "Invalid Date";
  } else if (
    minDateValue &&
    maxDateValue &&
    !moment(dateValue).isBetween(
      minDateValue,
      maxDateValue,
      validate_wise,
      "[]"
    )
  ) {
    error = `Date Range ${dateFormat(
      minDateValue,
      date_format
    )} TO ${dateFormat(maxDateValue, date_format)}`;
  } else if (
    minDateValue &&
    !maxDateValue &&
    !moment(dateValue).isBetween(minDateValue, maxDate, validate_wise, "[]")
  ) {
    error = `${label} ${dateFormat(minDateValue, date_format)}`;
  } else if (
    !minDateValue &&
    maxDateValue &&
    !moment(dateValue).isBetween(minDate, maxDateValue, validate_wise, "[]")
  ) {
    error = `${label} ${dateFormat(maxDateValue, date_format)}`;
  }
  return error;
};

export const SetAcademicYear = (id) => {
  localStorage.setItem("academic-year", id);
};

/** Persisted exam term id for schedule / exam flows (shared across schedule screens). */
const LS_EXAM_SCHEDULE_TERM = "exam_schedule_selected_term";

export const getStoredExamScheduleTerm = () => {
  const raw = localStorage.getItem(LS_EXAM_SCHEDULE_TERM);
  if (raw == null || raw === "" || raw === "undefined") return "";
  return String(raw);
};

export const setStoredExamScheduleTerm = (termId) => {
  if (termId != null && termId !== "" && termId !== 0) {
    localStorage.setItem(LS_EXAM_SCHEDULE_TERM, String(termId));
  }
};

export const setProfileTab = (id) => {
  localStorage.setItem("profiletab", id);
};

export const SetFinancialYear = (id) => {
  localStorage.setItem("financial-year", id);
};

export const SetStandard = (id) => {
  localStorage.setItem("standard", id);
};

export const SetBreadcrumbs = (id) => {
  localStorage.setItem("breadcrumbs", id);
};

export const setIsGridOrListView = (status) => {
  localStorage.setItem("isGridListView", status);
};

export const setPreviewVideo = (status) => {
  localStorage.setItem("previewVideo", JSON.stringify(status));
};

export const getPreviewVideo = () => {
  const previewVideo = JSON.parse(localStorage.getItem("previewVideo"));
  return previewVideo;
};

export const setManualReceiptEnabled = (status) => {
  localStorage.setItem("manual_receipt_enabled", JSON.stringify(status));
};

export const getManualReceiptEnabled = () => {
  return localStorage.getItem("manual_receipt_enabled");
};

export const getProfileTab = () => {
  return localStorage.getItem("profiletab");
};

export const GetBreadcrumbs = () => {
  const breadcrumbs = localStorage.getItem("breadcrumbs");
  return breadcrumbs;
};

export const getAcademicYear = () => {
  const academic_year = localStorage.getItem("academic-year");
  return academic_year;
};

export const getFinancialYear = () => {
  const financial_year = localStorage.getItem("financial-year");
  return financial_year;
};

export const getIsGridOrListView = () => {
  const isGrid = localStorage.getItem("isGridListView");
  return isGrid;
};

export const setLibCategory = (status) => {
  localStorage.setItem("libCategory", JSON.stringify(status));
};

export const getLibCategory = () => {
  return JSON.parse(localStorage.getItem("libCategory"));
};

export const setIssueBookSearchType = (status) => {
  localStorage.setItem("issueBookSearchType", JSON.stringify(status));
};

export const getIssueBookSearchType = () => {
  return JSON.parse(localStorage.getItem("issueBookSearchType"));
};

export const checkLocalAcademicYear = (yearsList) => {
  let academic_year = parseInt(localStorage.getItem("academic-year"));
  let academic_year_found = false;
  if (academic_year) {
    for (let year of yearsList) {
      if (year.id === academic_year) {
        academic_year_found = true;
        break;
      }
    }
  }
  if (!academic_year_found) {
    academic_year = 0;
    localStorage.removeItem("academic-year");
  }
  return academic_year;
};

export const checkLocalFinancialYear = (yearsList) => {
  let academic_year = parseInt(localStorage.getItem("financial-year"));
  let academic_year_found = false;
  if (academic_year) {
    for (let year of yearsList) {
      if (year.id === academic_year) {
        academic_year_found = true;
        break;
      }
    }
  }
  if (!academic_year_found) {
    academic_year = "";
    localStorage.removeItem("financial-year");
  }
  return academic_year;
};

export const getStandard = () => {
  const standard = localStorage.getItem("standard");
  return standard;
};

export const setStandardSection = (status) => {
  localStorage.setItem("standard_section", JSON.stringify(status));
};

export const getStandardSection = () => {
  return JSON.parse(localStorage.getItem("standard_section"));
};


export const checkLocalStandard = (standardlist) => {
  let standard = parseInt(localStorage.getItem("standard"));
  let standard_found = false;
  if (standard) {
    for (let std of standardlist) {
      if (std.id === standard) {
        standard_found = true;
        break;
      }
    }
  }
  if (!standard_found) {
    standard = 0;
    localStorage.removeItem("standard");
  }
  return standard;
};

export const validatePhoneNumber = (phoneNumber) => {
  return isValidPhoneNumber(phoneNumber);
};

export const removeMobileExtension = (phoneNumber) => {
  var res = phoneNumber.replace(/^\S*/i, "");
  return res;
};

export const formatPhoneNumber = (phoneNumber) => {
  return formatPhoneNumberIntl(phoneNumber);
};

export const convertInternationalNumberToStandard = (phoneNumber) => {
  let extension = "";
  if (phoneNumber.match(/^\S*/g)) {
    extension = phoneNumber.match(/^\S*/g)[0];
  }
  phoneNumber = phoneNumber.replace(/^\S*/g, "");
  phoneNumber = phoneNumber.replace(/\s+/g, "");
  return extension + " " + phoneNumber;
};

export const printPDF = (props) => {
  const { title, url } = props;
  Swal.fire({
    title: `<strong>${title} </strong>`,
    type: "info",
    showCloseButton: true,
    showCancelButton: true,
    focusConfirm: false,
    confirmButtonText: "Print  Receipt",
    cancelButtonText: "Close",
    confirmButtonColor: "green",
    cancelButtonColor: "orange",
  }).then((result) => {
    if (result.value) {
      printPDFService(props);
    }
  });
};

export const printPDFService = (props) => {
  let prop = { ...props };
  prop.responseType = "blob";
  getRequest(prop.url, {}, prop).then((response) => {
    if (response && response.status === 200) {
      let Data = new Blob([response.data], { type: "application/pdf" });
      let fileURL = URL.createObjectURL(Data);
      // let win=window.open(fileURL);
      // win.print()
      const height = (window.screen.height * 75) / 100;
      const width = (window.screen.width * 75) / 100;
      const mywindow = window.open(
        fileURL,
        "PRINT",
        "height=" + height + ",width=" + width + ""
      );
      mywindow.print();
    }
  });
};

export const getKeyValueInArray = (array, id, val, key, search) => {
  let data = "";
  for (const element of array) {
    if (element[id] === val) {
      data = element[key];
      break;
    }
  }
  return data;
};

export const getLocalStorageDetails = (key, type) => {
  let data = null;
  if (localStorage.getItem(key)) {
    if (type === "object") {
      data =
        localStorage.getItem(key) != "undefined"
          ? JSON.parse(localStorage.getItem(key))
          : "";
    } else {
      data = localStorage.getItem(key);
    }
  }
  return data;
};
export const Alert = (props) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};
export const isUserHasPermission = (action, type) => {
  return true;
  let hasPermission = true;
  if (Actions.hasOwnProperty(action)) {
    if (Actions[action].hasOwnProperty(type)) {
      const user = getLocalStorageDetails("user", "object");
      if (user && user.hasOwnProperty("user_permissions")) {
        hasPermission = true;
        let userPermissions = user["user_permissions"];
        userPermissions = userPermissions.concat(user["groups"]);
        const requiredScreenPermission = Actions[action][type].action_code;
        if (!userPermissions.includes(requiredScreenPermission)) {
          hasPermission = false;
          return false;
        }
      }
    }
  }
  return hasPermission;
};

export const updatePermissions = (name, actions) => {
  let enabledActions = [];
  for (let action of actions) {
    if (isUserHasPermission(name, action)) {
      enabledActions.push(action);
    }
  }
  return enabledActions;
};

export const getKeyValueMap = (array, key_data, val_data, search) => {
  let keyValMap = {};
  for (const element of array) {
    if (search === undefined) {
      keyValMap[element[key_data]] = element[val_data];
    } else {
      search.map((searchTemp) => {
        if (searchTemp === element[key_data]) {
          keyValMap[element[key_data]] = element[val_data];
        }
      });
    }
  }
  return keyValMap;
};

export const getPercentValue = (percent, amount) => {
  let value = 0;
  if (!isNaN(percent) && !isNaN(amount)) {
    value = Number(percent) * Number(amount) * 0.01;
  }
  return value;
};

export const getPercent = (total, amount) => {
  let value = 0;
  if (!isNaN(total) && !isNaN(amount)) {
    value = (Number(amount) * 100) / Number(total);
  }
  return value;
};
export const toDataURL = (url, callback) => {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    var reader = new FileReader();
    reader.onloadend = function () {
      callback(reader.result);
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open("GET", url);
  xhr.responseType = "blob";
  xhr.send();
};

export const isObjectValuesEmpty = (obj) => {
  for (var key in obj) {
    if (obj[key] !== null && obj[key] != "") return false;
  }
  return true;
};

const getDataBindedKeyValueMap = (array) => {
  const colNameMap = {};
  for (const index in array) {
    const element = array[index];
    colNameMap[element.name] = { name: element.name, index: parseInt(index) };
    if (element.column_data_bind) {
      colNameMap[element.name] = {
        name: array[element.column_data_bind].name,
        index: element.column_data_bind,
      };
    }
  }
  return colNameMap;
};

const getPaginatedDataBindedColumnArray = (
  array,
  filteredList,
  colBindMap,
  columnKey,
  index
) => {
  let dataList = [];
  let bindIndex = colBindMap[columnKey].index;
  for (let element of array) {
    if (filteredList.includes(element.data[index])) {
      let temp = element.data[bindIndex];
      dataList.push(temp);
    }
  }
  dataList = Array.from(new Set(dataList));
  return dataList;
};

export const getPaginationProps = (
  paginationProps,
  searchStringArray,
  compColumns,
  paginatedData
) => {
  let pagination = {};
  if (paginationProps) {
    if (
      paginationProps.hasOwnProperty("rowsPerPage") &&
      paginationProps["rowsPerPage"]
    ) {
      pagination["limit"] = paginationProps["rowsPerPage"];
    }
    if (paginationProps.hasOwnProperty("page")) {
      pagination["pageno"] = paginationProps["page"] + 1;
    }
    if (
      paginationProps.hasOwnProperty("sortOrder") &&
      paginationProps["sortOrder"]
    ) {
      pagination["ordering"] = paginationProps.sortOrder["name"];
      if (paginationProps.sortOrder["direction"] === "desc") {
        pagination["ordering"] = `-${pagination.ordering}`;
      }
    }
    if (
      paginationProps.hasOwnProperty("searchText") &&
      paginationProps["searchText"]
    ) {
      pagination["search"] = paginationProps["searchText"];
    }
    if (
      paginationProps.hasOwnProperty("filterList") &&
      paginationProps["filterList"]
    ) {
      let filterData = {};
      if (compColumns) {
        const compColumnsMap = getDataBindedKeyValueMap(compColumns);
        paginationProps["filterList"].map((temp, index) => {
          const colName = paginationProps["columns"][index]["name"];
          if (temp.length > 0) {
            if (colName != compColumnsMap[colName].name) {
              filterData[compColumnsMap[colName].name] =
                getPaginatedDataBindedColumnArray(
                  paginatedData,
                  temp,
                  compColumnsMap,
                  colName,
                  index
                ).toString();
            }
          }
        });
      } else {
        const compColumnsMap = getDataBindedKeyValueMap(
          paginationProps["columns"]
        );
        paginationProps["filterList"].map((temp, index) => {
          const colName = paginationProps["columns"][index]["name"];
          if (temp.length > 0) {
            filterData[compColumnsMap[colName].name] = temp.join(",");
          }
        });
      }
      pagination = { ...pagination, ...filterData };
    }
    if (
      searchStringArray &&
      Array.isArray(searchStringArray) &&
      searchStringArray.length > 0
    ) {
      pagination["search"] = searchStringArray[searchStringArray.length - 1];
    }
    if (
      paginationProps.hasOwnProperty("custom") &&
      typeof paginationProps["custom"] === "object"
    ) {
      pagination = { ...pagination, ...paginationProps["custom"] };
    }
  }
  return pagination;
};

export const getFilterColumns = (columns, data) => {
  const filterMap = {};
  for (const [key, value] of data.filters) {
    filterMap[key] = value.map((col) => col.name);
  }
  for (let col of columns) {
    if (col.options.filter) {
      // const bindName = columns[column_data_bind].name;
      // col.options['customFilterListOptions'] = {
      //   render: filterMap[bindName]
      // }
    }
  }
  return columns;
};

export const getServerSideProps = (pagination) => {
  let paginationOptions = {};
  let paginationPropKeys = {
    rowsPerPage: 5,
    serverSide: true,
    sortOrder: {
      name: "",
      direction: "asc",
    },
    searchText: "",
    count: 0,
    page: 0,
  };
  for (let [key, value] of Object.entries(paginationPropKeys)) {
    paginationOptions[key] = value;
    if (pagination && pagination.hasOwnProperty(key)) {
      paginationOptions[key] = pagination[key];
    }
  }
  return paginationOptions;
};

export const getUrlParam = (search = window.location.search) => {
  let path = search;
  const urlParams = new URLSearchParams(path);
  let pathState = {};
  for (const entry of urlParams.entries()) {
    pathState[entry[0]] = entry[1];
  }
  return pathState;
};

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export const validateBetweenDateRangeInArrays = (
  fields,
  from,
  to,
  conflictName
) => {
  fields.map((parentField) => {
    fields.map((field) => {
      if (moment(parentField[from]).isBetween(field[from], field[to])) {
        parentField[
          from + "_error"
        ] = `Date Range is conflict with ${field[conflictName]}`;
      }
    });
  });
  return fields;
};

export const handleTimeFormat = (seconds) => {
  if (seconds) {
    return new Date(seconds * 1000).toISOString().substr(11, 8);
  } else {
    return;
  }
};

export const getElementOfIdInArray = (array, id) => {
  let keyValMap = {};
  for (const element of array) {
    if (element["id"] === id) {
      keyValMap = element;
    }
  }
  return keyValMap;
};

export const validateBetweenTimeAndDateRangeInArrays = (
  fields,
  from,
  to,
  forDate,
  conflictName,
  format
) => {
  let errorFound = false;
  let formatValue = "HH:mm:ss";
  if (format) {
    formatValue = format;
  }
  let parentFromValue, parentToValue, fromValue, toValue, parentDate, dateValue;
  fields.map((parentField, parentIndex) => {
    parentFromValue = moment(parentField[from], formatValue);
    parentToValue = moment(parentField[to], formatValue);
    parentDate = dateFormat(parentField[forDate], "YYYY-MM-DD");
    fields.map((field, index) => {
      fromValue = moment(field[from], formatValue);
      toValue = moment(field[to], formatValue);
      dateValue = dateFormat(field[forDate], "YYYY-MM-DD");
      if (
        moment(parentFromValue).isBetween(fromValue, toValue, null, "[]") &&
        parentDate === dateValue &&
        parentIndex !== index
      ) {
        parentField[
          forDate + "_error"
        ] = `Date and Time conflict with ${field[conflictName]}`;
        errorFound = true;
      }
      if (
        moment(parentToValue).isBetween(fromValue, toValue, null, "[]") &&
        parentDate === dateValue &&
        parentIndex !== index
      ) {
        parentField[
          forDate + "_error"
        ] = `Date and Time conflict with ${field[conflictName]}`;
        errorFound = true;
      }
      if (!errorFound) {
        delete parentField[forDate + "_error"];
      }
    });
  });
  return fields;
};

export var getDecimalRoundOff = () => {
  const settings =
    localStorage.getItem("settings") != "undefined"
      ? JSON.parse(localStorage.getItem("settings"))
      : "";
  let returnValue = "";
  if (settings) {
    const roundOff = settings["decimal_round_off"]["value"];
    // const roundOff = 0
    if (roundOff != 0) {
      returnValue = `1,${roundOff}`;
    }
  }
  return returnValue;
};

export const numberWithCommas = (x, roundOff) => {
  if (!x) {
    x = 0;
  }
  const settings = JSON.parse(localStorage.getItem("settings"));
  if (!roundOff) {
    roundOff = settings["decimal_round_off"]["value"]
      ? settings["decimal_round_off"]["value"]
      : 2;
  }
  return `₹ ${parseFloat(x).toLocaleString("en-IN")}`;
};

export const numberWithCommasWithoutSymbol = (x, roundOff) => {
  if (!x) {
    x = 0;
  }
  const settings = JSON.parse(localStorage.getItem("settings"));
  if (!roundOff) {
    roundOff = settings["decimal_round_off"]["value"]
      ? settings["decimal_round_off"]["value"]
      : 2;
  }
  return `${parseFloat(x).toLocaleString("en-IN")}`;
};

export const getSettingValue = (name) => {
  const settings =
    localStorage.getItem("settings") != "undefined"
      ? JSON.parse(localStorage.getItem("settings"))
      : "";
  if (Boolean(settings) && name in settings) {
    return settings[name]["value"];
  }
  return 0;
};

export const getAmountInWords = (num) => {
  const toWords = new ToWords({
    localeCode: "en-IN",
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
    },
  });
  return toWords.convert(num);
};

export function NumberFormatCustom(props) {
  const { inputRef, onChange, ...other } = props;
  return (
    <NumberFormat
      {...other}
      thousandsGroupStyle="lakh"
      thousandSeparator={true}
      getInputRef={inputRef}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString
      prefix="₹ "
    />
  );
}

export function isObjectEmpty(obj) {
  if (obj && Object.keys(obj).length === 0 && obj.constructor === Object) {
    return true;
  } else if (!obj) {
    return true;
  }
  return false;
}

export function getTemplateComponent(module) {
  let props = { module: module };
  let tempExistingConfig = "";
  let returnComponent = "";
  let data = getRequest(
    GET_URL.templatemapping.api,
    { is_active: true, module: module },
    props
  ).then((response) => {
    if (response && response.status === 200) {
      if (response.data.data.length > 0) {
        tempExistingConfig = response.data.data[0]["name"];
      }
      if (tempExistingConfig === "") {
        for (const index in INVOICE_MAPPING) {
          const data = INVOICE_MAPPING[index];
          if (data["module"] === module && data["isdefault"] === true) {
            returnComponent = data["component"];
            break;
          }
        }
      } else {
        for (const index in INVOICE_MAPPING) {
          const data = INVOICE_MAPPING[index];
          if (data["name"] === tempExistingConfig) {
            returnComponent = data["component"];
            break;
          }
        }
      }
      if (returnComponent !== "") {
        return returnComponent;
      }
    }
    return false;
  });
  return data;
}

export function getFullName(firstName, middleName, lastName) {
  let name = firstName;
  if (middleName) {
    name += " " + middleName;
  }
  if (lastName) {
    name += " " + lastName;
  }
  return name;
}

export function getFormatMessage(format_id, language = null) {
  if (!language) {
    language = localStorage.getItem("lang");
    if (!language) {
      language = "en";
    }
  }
  const langDict = {
    en: enTranslationMessages,
  };
  let returnValue = format_id;
  if (typeof format_id === "object" && language) {
    returnValue =
      language && langDict[language] && langDict[language][format_id.props.id]
        ? langDict[language][format_id.props.id]
        : format_id.props.defaultMessage;
  }
  return returnValue;
}

export function getTimeFormatFromSeconds(secs, timeFormat) {
  let format = "HH:mm:ss";
  if (timeFormat) {
    format = timeFormat;
  }
  const formatted = moment.utc(secs * 1000).format(format);
  return formatted;
}

export const isMobile = () => window.innerWidth < 980;

export const isTeacher = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user.group_id.includes(TEACHER_ID);
};

export function hhmmss(seconds) {
  seconds = Number(seconds);
  var d = Math.floor(seconds / (3600 * 24));
  var h = Math.floor((seconds % (3600 * 24)) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = Math.floor(seconds % 60);

  var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  var sDisplay = s >= 0 ? s + (s == 1 || s == 0 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

export async function getFormattedAddress(result) {
  let latitude_longitude = await getLatLng(result);
  let address_details = { address_one_map: "", address_two_map: "" };
  result.address_components.map((result_data) => {
    address_types["address_one_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["address_one_map"] = address_details["address_one_map"]
          ? `${address_details["address_one_map"]}, ${result_data["long_name"]}`
          : result_data["long_name"];
      }
    });
    address_types["address_two_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["address_two_map"] = address_details["address_two_map"]
          ? `${address_details["address_two_map"]}, ${result_data["long_name"]}`
          : result_data["long_name"];
      }
    });
    address_types["city_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["city_map"] = result_data["long_name"];
      }
    });
    address_types["district_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["district_map"] = result_data["long_name"];
      }
    });
    address_types["state_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["state_map"] = result_data["long_name"];
      }
    });
    address_types["country_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["country_map"] = result_data["long_name"];
      }
    });
    address_types["pincode_type"].map((data) => {
      if (result_data["types"].includes(data)) {
        address_details["pincode_map"] = result_data["long_name"];
      }
    });
  });
  address_details["latitude_and_langitude_map"] = latitude_longitude;
  return address_details;
}

export function getCurrentAndPreviousAcademicYears(yearList) {
  let return_result = [];
  let startBefore = false;
  yearList.map((data) => {
    startBefore = moment(data["start_date"]).isSameOrBefore(
      dateFormat(new Date(), "YYYY-MM-DD")
    );
    if (startBefore) {
      return_result.push(data);
    }
  });
  return return_result;
}

export function getPreviousAcademicYears(yearList, customDate = new Date()) {
  let return_result = [];
  let startBefore = false;
  yearList.map((data) => {
    startBefore = moment(data["start_date"]).isBefore(
      dateFormat(new Date(customDate), "YYYY-MM-DD")
    );
    if (startBefore) {
      return_result.push(data);
    }
  });
  return return_result;
}

export function getCommaSeperatedArrayOfObjects(list, key) {
  let return_result = [];
  list.map((data) => {
    return_result.push(data[key]);
  });
  return_result = return_result.join(` ,`);
  return return_result;
}

export function getYearLabel(startDate, endDate) {
  let return_result = "";
  return_result = `${startDate.split("-")[0]} - ${endDate.split("-")[0]}`;
  return return_result;
}

export function getRowsPerPageOptions(number) {
  let list = [...DEFAULTROWSPERPAGEOPT];
  if (!number) {
    return [];
  }
  let lIndex = "";
  for (let i = 0; i < list.length; i++) {
    if (parseInt(number) > parseInt(list[i])) {
      lIndex = i + 2;
    }
  }
  return list.slice(0, lIndex);
}

export function getReverseList(number = 0, minNumber = 1) {
  let returnValue = [];
  if(minNumber == 0){
    minNumber = 1
  }
  for (let i = number; i >= minNumber; i--) {
    returnValue.push({ id: i, name: i });
  }
  return returnValue;
}

export function getPropertyValues(property_values) {
  return (
    <Tooltip
      title={property_values.map((propdata) => {
        return <div>{`${propdata.properties_name} - ${propdata.name}`}</div>;
      })}
      enterDelay={400}
      enterNextDelay={400}
      placement="top-start"
      classes={{ tooltip: "tooltip-show-data" }}
    >
      <div className="stock-property-value">
        {property_values &&
          property_values.map((propdata, index) => {
            return (
              <div>
                {(property_values.length < 3 ||
                  (property_values.length > 2 && index !== 1)) &&
                  `${propdata.properties_name} - ${propdata.name}`}
                {property_values.length > 2 &&
                  index === 1 &&
                  `${propdata.properties_name} - ${propdata.name} ....`}
              </div>
            );
          })}
      </div>
    </Tooltip>
  );
}

export function getValuesInArrayUsingKey(array = [], key = "") {
  let return_data = [];
  array.map((data) => {
    return_data.push(data[key]);
  });
  return return_data;
}

export function CaptilizeString(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

export function DivideNumberIntoN(num, n) {
  const f = Math.floor(num / n);
  return [...Array(n)].map((_, i) => (i - n + 1 ? f : num - i * f));
}

export function getMonthFromDateRange(startDate, endDate) {
  let selected_month = "";
  let today_date = new Date();
  let firstDay = new Date(today_date.getFullYear(), today_date.getMonth(), 1);
  let lastDay = new Date(
    today_date.getFullYear(),
    today_date.getMonth() + 1,
    0
  );
  if (!startDate || !endDate) {
    startDate = firstDay;
    endDate = lastDay;
  } else {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    if (lastDay < endDate) {
      endDate = lastDay;
    }
  }
  let betweenMonths = [];
  let temp = {};
  if (startDate < endDate) {
    let date = startDate;
    while (date < endDate) {
      temp = {
        start_date: dateFormat(
          new Date(date.getFullYear(), date.getMonth(), 1),
          "YYYY-MM-DD"
        ),
        end_date: dateFormat(
          new Date(date.getFullYear(), date.getMonth() + 1, 0),
          "YYYY-MM-DD"
        ),
        name: dateFormat(date, "MMM"),
      };
      betweenMonths.push(temp);
      if (date.getMonth() == today_date.getMonth()) {
        selected_month = temp;
      }
      date = new Date(date.getFullYear(), date.getMonth(), 1);
      date.setMonth(date.getMonth() + 1);
    }
  }
  if (!selected_month) {
    selected_month = betweenMonths[betweenMonths.length - 1];
  }
  return { list: betweenMonths, selected_month: selected_month };
}

export function checkToday(date) {
  date = moment(date);
  const today = moment().endOf("day");
  const tomorrow = moment().add(1, "day").endOf("day");
  if (date < today) return "Today";
  if (date < tomorrow) return "Tomorrow";
  return dateFormat(date, "DD-MM-YYYY");
}

const getHashOfString = (str) => {
  if (!str || str === null || str === undefined) {
    // Return a default hash for null/undefined values
    return 0;
  }
  let hash = 0;
  const stringValue = String(str);
  for (let i = 0; i < stringValue.length; i++) {
    // tslint:disable-next-line: no-bitwise
    hash = stringValue.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  return hash;
};

const normalizeHash = (hash, min, max) => {
  return Math.floor((hash % (max - min)) + min);
};

const generateHSL = (name, saturationRange, lightnessRange) => {
  const hash = getHashOfString(name);
  const h = normalizeHash(hash, 0, 360);
  const s = normalizeHash(hash, saturationRange[0], saturationRange[1]);
  const l = normalizeHash(hash, lightnessRange[0], lightnessRange[1]);
  return [h, s, l];
};

const HSLtoString = (hsl) => {
  return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
};

const getRange = (value, range) => {
  return [Math.max(0, value - range), Math.min(value + range, 100)];
};

export const generateColorHsl = (
  id,
  saturationRange = getRange(50, 10),
  lightnessRange = getRange(50, 10)
) => {
  // Handle null/undefined values by providing a default string
  const safeId = id || 'default';
  return HSLtoString(generateHSL(safeId, saturationRange, lightnessRange));
};

export function dayCheck(date) {
  var thisYear = moment().year();
  var mom = moment(date).year(thisYear);
  return mom.calendar(null, {
    sameDay: "[Today]",
    nextDay: "[Tomorrow]",
    nextWeek: "dddd",
    lastDay: "[Yesterday]",
    lastWeek: "[Last] dddd",
    sameElse: "DD/MM/YYYY",
  });
}

export function getNameOfMultiplePayment(list = []) {
  console.log(list, 'listf')
  return (
    <Tooltip
      title={list.map((data) => {
        return (
          <div>
            {`₹ ${data.amount} - ${data.mode_of_payment} ${
              data.payment_ref_num ? "(" : ""
            }${data?.payment_ref_num} ${data.payment_ref_num ? ")" : ""}`}
          </div>
        );
      })}
      enterDelay={400}
      enterNextDelay={400}
      placement="top-start"
      classes={{ tooltip: "tooltip-show-data" }}
    >
      <div className="height-multiple-payment">
        {list.map((data, index) => {
          return (
            <div>
              {index < 2 &&
                (list.length < 3 || (list.length > 2 && index !== 1)) &&
                `₹ ${data.amount} - ${data.mode_of_payment} ${
                  data.payment_ref_num ? "(" : ""
                }${data?.payment_ref_num} ${data.payment_ref_num ? ")" : ""}`}
              {list.length > 2 &&
                index === 1 &&
                index < 2 &&
                `₹ ${data.amount} - ${data.mode_of_payment} ${
                  data.payment_ref_num ? "(" : ""
                }${data?.payment_ref_num} ${
                  data.payment_ref_num ? ")" : ""
                } ....`}
            </div>
          );
        })}
      </div>
    </Tooltip>
  );
}

export function getAdmissionHistory(admission_num, history) {
  return (
    <div>
      {!history || Object.keys(history).length === 0 ? (
        <div>{admission_num}</div>
      ) : (
        <Tooltip
          // title={Object.keys(history).map((propdata) => {
          //   return <div>{history[propdata].admission_num}</div>;
          // })}
          title={history.admission_num}
          enterDelay={400}
          enterNextDelay={400}
          placement="top-start"
          classes={{ tooltip: "tooltip-show-data" }}
        >
          <div className="stock-property-value">{admission_num}</div>
        </Tooltip>
      )}
    </div>
  );
}

export function getTransparentColor(colorName, opacity = "0.5") {
  if (colorName) {
    let hex = "";
    if (hexCodeRegex.value.test(colorName)) {
      hex = colorName;
    } else {
      hex = COLOR_MAP[colorName.toLowerCase()];
    }
    if (hex) {
      let r = 0,
        g = 0,
        b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
      }
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }
  return "rgba(0, 0, 255, 0.5)";
}

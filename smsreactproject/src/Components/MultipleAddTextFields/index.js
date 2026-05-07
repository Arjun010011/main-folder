import React, { Component } from "react";
import classNames from "classnames";
import { Grid, Paper, Box, Button, TextField } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import ControlPointOutlinedIcon from "@material-ui/icons/ControlPointOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { Dropdown } from "Components/DropDown";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import Checkbox from "@material-ui/core/Checkbox";
import _ from "lodash";

import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import { POST_URL } from "Includes/urls";
import { nameRegex} from "Constants/regularExpression";
import { getRequest } from "Includes/api/apicall";
import "./styles.scss";
import PhoneNumber from "Components/PhoneNumber";
import {
  validateDate,
  dateFormat,
  validateMobileNumber,
  validateBetweenDateRangeInArrays,
} from "Includes/functions";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";

const fieldDetail = [
  {
    label: "Author Name",
    regex: nameRegex,
    autoFocus: false,
    name: "name",
    md: 12,
    className: "w-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
    gridClassName: "margin-vertical-20",
  },
];

class MultipleAddTextFields extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newField: [],
      fieldValue: [],
      valueExisting: false,
      foundDropDownList: false,
      dropDownList: [],
      deleted_ids: [],
    };
  }

  componentDidMount() {
    this.setDefaultValues();
  }

  setDefaultValues = () => {
    const { fieldDetails, fieldDefaultValue } = this.props;
    let { fieldValue, foundDropDownList, dropDownList } = this.state;
    let data = {};
    if (fieldDefaultValue.length > 0) {
      fieldDefaultValue.map((defaultValue) => {
        let temp = {};
        fieldDetails.map((fields) => {
          if ((fields.type === "dropDownWithSearch" || fields.type === "dropDownWithSearchAndAddApi" ) && !foundDropDownList) {
            foundDropDownList = true;
            dropDownList = fields.list;
          }
          temp[fields.name] = defaultValue[fields.name]
            ? defaultValue[fields.name]
            : fields.default;
          temp[fields.name + "_error"] = defaultValue[fields.name + "_error"]
            ? defaultValue[fields.name + "_error"]
            : "";
          temp[fields.name + "_required"] = fields.required;
          temp[fields.name + "_helper_text"] =
            "helper_text" in fields ? fields.helper_text : "";
          temp[fields.name + "_allow_duplicates"] =
            "allowDuplicates" in fields ? fields.allowDuplicates : false;
        });
        temp["exist"] = true;
        if (defaultValue["id"]) temp["id"] = defaultValue["id"];
        fieldValue.push(temp);
      });
    } else {
      fieldDetails.map((fields) => {
        if ((fields.type === "dropDownWithSearch" || fields.type === "dropDownWithSearchAndAddApi" ) && !foundDropDownList){
          foundDropDownList = true;
          dropDownList = fields.list;
        }
        data[fields.name] = fields.default;
        data[fields.name + "_required"] = fields.required;
        data[fields.name + "_error"] = "";
        data[fields.name + "_helper_text"] =
          "helper_text" in fields ? fields.helper_text : "";
        data[fields.name + "_allow_duplicates"] =
          "allowDuplicates" in fields ? fields.allowDuplicates : false;
      });
      data["exist"] = false;
      fieldValue.push(data);
    }
    this.setState({ ...fieldValue, foundDropDownList, dropDownList }, () =>
      this.updateParent(fieldValue)
    );
  };

  handleSearchChange = (e, field, index) => {
    let value = e;
    let name = field.name;
    let { fieldValue } = this.state;
    if (field.type === "text" || field.type === "drop_down") {
      value = e.target.value;
    }
    if (field.type === "drop_down" && value === 0) {
      if (field.required) {
        return;
      } else {
        value = "";
      }
    }
    if (field.type === "date") {
      if (e === null) {
        value = "";
      }
    }
    if (field.type === "checkbox") {
      value = !fieldValue[index][name];
    }
    fieldValue[index][name] = value;
    fieldValue[index][field.isDependent] = "";
    fieldValue[index]["exist"] = false;
    fieldValue[index][name + "_error"] = "";
    fieldValue[index][field.isDependent + "_error"] = "";
    this.setState({ fieldValue }, () => {
      if (
        field.type === "drop_down" ||
        field.type === "date" ||
        field.type === "checkbox"
      ) {
        this.changeInParent(e, field, index);
      }
      if (field.update_status_from_parent) {
        this.props.updateFromParent(fieldValue, field, index, name);
      }
    });
    const { handleDateRange } = this.props;
    if (handleDateRange && handleDateRange.status) {
      this.validateDateRange();
    }
  };

  uptateFieldValues = (fieldValue) => {
    this.setState({ fieldValue });
  };
  changeInParent = (e, field, index) => {
    let value = e;
    let name = field.name;
    let { fieldValue } = this.state;
    this.validateDuplicateField();
    if (field.type === "text") {
      value = e.target.value;
    }
    if (field.required && value === "") {
      fieldValue[index][name + "_error"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else if (field.regex && !field.regex.value.test(value) && value !== "") {
      fieldValue[index][name + "_error"] = field.regex.errorText;
    }
    if (
      field.regex &&
      field.regex.name == "numberRegex" &&
      ((field.minValue && parseInt(value) < parseInt(field.minValue)) ||
        (field.maxValue && parseInt(value) > parseInt(field.maxValue)))
    ) {
      if (parseInt(value) < parseInt(field.minValue)) {
        fieldValue[index][name + "_error"] = `Min Value ${field.minValue}`;
      }
      if (parseInt(value) > parseInt(field.maxValue)) {
        fieldValue[index][name + "_error"] = `Max Value ${field.maxValue}`;
      }
    }
    this.setState(
      {
        fieldValue,
      },
      () => {
        this.updateParent(fieldValue);
      }
    );
    const { handleDateRange } = this.props;
    if (handleDateRange && handleDateRange.status) {
      this.validateDateRange();
    }
  };

  onBlurDateValidation = (field, index) => {
    let { fieldValue } = this.state;
    const name = field.name;
    const minDate = field.parentMinDate
      ? fieldValue[index][field.parentMinDate]
      : field.minDate;
    const maxDate = field.maxDate;
    let error;
    let value = fieldValue[index][name];
    error = validateDate(value, minDate, maxDate);
    if (error !== "") {
      fieldValue[index][name + "_error"] = error;
      if (value === "" && !field.required) {
        fieldValue[index][name + "_error"] = "";
      }
    } else {
      fieldValue[index][name] = dateFormat(value, "YYYY-MM-DD");
      this.updateParent(fieldValue);
    }
    if (
      (field.required && value === "") ||
      (field.parentMinDate &&
        fieldValue[index][field.parentMinDate] !== "" &&
        value === "")
    ) {
      fieldValue[index][name + "_error"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else if (value === "" && !field.required) {
      fieldValue[index][name + "_error"] = "";
    }
    const { handleDateRange } = this.props;
    if (handleDateRange && handleDateRange.status) {
      this.validateDateRange();
    }

    this.setState({
      fieldValue,
    });
  };

  addNew = () => {
    const { fieldValue } = this.state;
    const { handleDateRange } = this.props;
    if (handleDateRange && handleDateRange.status) {
      this.validateDateRange();
    }
    let emptyTest = true;
    let duplicateTest = true;
    let regexTest = true;
    regexTest = this.validateRegexFields("addButton");
    if (!regexTest) return;
    emptyTest = this.validateEmptyField(fieldValue);
    if (!emptyTest) return;
    duplicateTest = this.validateDuplicateField();
    if (!duplicateTest) return;
    if (emptyTest && duplicateTest && regexTest) {
      let newData = {};
      fieldValue.map((data) =>
        Object.keys(data).map((key) => {
          if (key.includes("required")) {
            newData[key] = data[key];
          } else if (key.includes("duplicates")) {
            newData[key] = data[key];
          } else if (key === "checkbox") {
            newData[key] = true;
          } else if (key !== "id") {
            newData[key] = "";
          }
        })
      );
      this.setState({ fieldValue: fieldValue.concat(newData) });
    } else {
      this.setState({
        ...fieldValue,
      });
    }
  };

  validateEmptyField = (fieldValue) => {
    let test = true;
    fieldValue.forEach((item, index) => {
      Object.keys(item).forEach((data) => {
        if (
          !data.includes("id") &&
          !data.includes("error") &&
          !data.includes("required") &&
          !data.includes("duplicates")
        ) {
          if (item[data].toString().trim() === "" && item[`${data}_required`]) {
            item[`${data}_error`] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            test = false;
          }
        }
      });
    });
    return test;
  };

  validateDuplicateField = () => {
    const { fieldValue } = this.state;
    const { fieldDetails } = this.props;
    let test = true;
    let tempFieldMap = {};
    fieldDetails.map((field) => {
      fieldValue.forEach((item, index) => {
        Object.keys(item).forEach((data) => {
          if (data === field.name) {
            if (!data.includes("error")) {
              let value = item[data];
              if (field.type === "dropDownWithSearch")  {
                value = item[data] ? item[data]["id"] : "";
              }
              value = value.toString().trim().toLowerCase().replace(/\s/g, "");
              if (!tempFieldMap.hasOwnProperty(data)) {
                tempFieldMap[data] = [];
              }
              if (
                tempFieldMap[data].includes(value) &&
                value !== "" &&
                !field.allowDuplicates
              ) {
                item[`${data}_error`] = (
                  <FormattedMessage {...commonMessages.duplicateFoundLabel} />
                );
                test = false;
              } else if (value !== "") {
                item[`${data}_error`] = "";
                tempFieldMap[data].push(value);
              }
              if (item[data] !== "") {
                item["exist"] = true;
              }
            }
          }
        });
      });
    });
    this.setState({
      fieldValue,
    });
    if (test) {
      this.updateParent(fieldValue);
    }
    return test;
  };

  validateFields = () => {
    let test = true;
    const { fieldValue } = this.state;
    const { isEmptyNotAllowed, handleDateRange } = this.props;
    let field = [];
    let temp = {};
    let duplicateTest = true;
    let validateTest = null;
    validateTest = this.validateRegexFields("submit");
    if (!validateTest) return false;
    duplicateTest = this.validateDuplicateField();
    if (!duplicateTest) return false;
    if (handleDateRange && handleDateRange.status) {
      this.validateDateRange();
    }
    fieldValue.map((data, index) => {
      Object.keys(data).map((tempData) => {
        if (tempData.includes("error")) {
          if (data[tempData] !== "") {
            test = false;
          }
        } else if (
          !tempData.includes("id") &&
          !tempData.includes("error") &&
          !tempData.includes("allow_duplicates") &&
          !tempData.includes("required") &&
          !tempData.includes("exist")
        ) {
          if (
            data[tempData].toString().trim() === "" &&
            data[`${tempData}_required`]
          ) {
            if (data["exist"] === true || isEmptyNotAllowed) {
              data[tempData + "_error"] = (
                <FormattedMessage {...commonMessages.fieldMandatoryError} />
              );
              test = false;
            }
          } else {
            if (data[tempData].toString().trim() !== "") {
              temp[tempData] = data[tempData].toString().trim();
            }
          }
        } else if (tempData.includes("id")) {
          temp[tempData] = data[tempData].toString().trim();
        }
      });
      if (Object.keys(temp).length !== 0) {
        field.push(temp);
      }
      temp = {};
    });
    this.setState(
      {
        fieldValue,
      },
      () => {
        if (!duplicateTest || !validateTest) {
          test = false;
        } else {
          this.updateParent(fieldValue);
        }
      }
    );
    return test;
  };

  validateRegexFields = (name) => {
    let { fieldValue } = this.state;
    let { fieldDetails, isEmptyNotAllowed } = this.props;
    if (name === "addButton") isEmptyNotAllowed = true;
    let test = true;
    fieldDetails.map((field) => {
      fieldValue.map((data, index) => {
        Object.keys(data).map((tempData) => {
          let value = "";
          let dataExist = true;
          if ((name = "submit")) {
            dataExist = false;
          }
          if (tempData === field.name) {
            value = data[tempData];
            if (field.type === "phone_number") {
              if (data["exist"] !== true) {
                field.required = false;
              } else {
                field.required = true;
              }
              let returnValue = validateMobileNumber(field, value);
              if (
                !returnValue.test &&
                returnValue.error === "Mobile Number is Mandatory" &&
                isEmptyNotAllowed
              ) {
                fieldValue[index][tempData + "_error"] = returnValue.error;
                data[tempData] = returnValue.value;
                test = false;
              }
            } else if (
              (field.required && data[tempData] === "" && name !== "submit") ||
              (name === "submit" && dataExist)
            ) {
              fieldValue[index][tempData + "_error"] = (
                <FormattedMessage {...commonMessages.fieldMandatoryError} />
              );
              test = false;
            } else if (
              field.regex &&
              !field.regex.value.test(value) &&
              value !== ""
            ) {
              fieldValue[index][tempData + "_error"] = field.regex.errorText;
              test = false;
            } else if (
              field.parentMinDate &&
              data[field.parentMinDate] !== "" &&
              data[tempData] === ""
            ) {
              fieldValue[index][tempData + "_error"] = (
                <FormattedMessage {...commonMessages.fieldMandatoryError} />
              );
              test = false;
            }
            if (
              field.regex &&
              field.regex.name == "numberRegex" &&
              ((field.minValue &&
                parseInt(data[tempData]) < parseInt(field.minValue)) ||
                (field.maxValue &&
                  parseInt(data[tempData]) > parseInt(field.maxValue)))
            ) {
              if (parseInt(data[tempData]) < parseInt(field.minValue)) {
                fieldValue[index][
                  tempData + "_error"
                ] = `Min Value ${field.minValue}`;
              }
              if (parseInt(data[tempData]) > parseInt(field.maxValue)) {
                fieldValue[index][
                  tempData + "_error"
                ] = `Max Value ${field.maxValue}`;
              }
              test = false;
            } else {
              dataExist = true;
            }
          }
        });
      });
    });
    this.setState({
      fieldValue,
    });

    return test;
  };

  validateDateRange = () => {
    let { fieldValue } = this.state;
    let { handleDateRange } = this.props;
    fieldValue = validateBetweenDateRangeInArrays(
      fieldValue,
      handleDateRange.fromDate,
      handleDateRange.toDate,
      handleDateRange.conflictWith
    );
    this.setState({
      fieldValue,
    });
  };

  deleteField = (i) => {
    let { fieldValue, deleted_ids } = this.state;
    if (fieldValue[i] && Boolean(fieldValue[i]["id"])) {
      deleted_ids.push(fieldValue[i]["id"]);
      this.setState(
        {
          deleted_ids,
        },
        () => {
          this.handleDeletedId();
        }
      );
    }
    fieldValue.splice(i, 1);
    this.setState(
      {
        fieldValue,
      },
      () => {
        this.validateDuplicateField();
        this.updateParent(fieldValue);
      }
    );
  };

  handleDeletedId = () => {
    let { deleted_ids } = this.state;
    if (this.props.updateParentDeletedId) {
      this.props.updateParentDeletedId(deleted_ids);
    }
  };

  updateParent = (fieldValue) => {
    let temp = [];
    let { deleted_ids } = this.state;
    fieldValue.forEach((item) => {
      let key = {};
      Object.keys(item).forEach((data) => {
        if (
          data !== "undefined" &&
          !data.includes("helper_text") &&
          !data.includes("error") &&
          !data.includes("required") &&
          !data.includes("exist") &&
          !data.includes("duplicates")
        ) {
          key[data] = item[data];
          if (item[data] !== "" && data !== "id") {
            if (!deleted_ids.includes(item["id"])) deleted_ids.push(item["id"]);
          }
        }
      });
      if (item["exist"] === true) {
        temp.push(key);
      }
    });
    this.setState(
      {
        deleted_ids: [...deleted_ids],
      },
      () => {
        this.handleDeletedId();
      }
    );
    this.props.updateParent(temp);
  };

  updatePostFormat = (newData) => {
    const { author } = this.state;
    newData.name = newData.name
    newData.author_name = author
    let payload = {
        author: [newData]
    }
    return payload
  }

  updateType = (field) => {
    this.setState({ loadingOptions: true })
    let { dropDownList } = this.state;
    dropDownList.push(field)
    this.setState({ dropDownList }, () => {
        this.setState({ loadingOptions: false })
    })
    return true
}

  handleDropDownSearchChange = (e, newValue, field, index) => {
    let { fieldValue } = this.state;
    let value = newValue;
    let name = field.name;
    if (value) {
      fieldValue[index][name] = value;
      fieldValue[index][name + "_error"] = "";
    }
    this.setState({ fieldValue }, () => {
      this.validateDuplicateField();
    });
  };

  renderFields = (data, index, fieldDetails) => {
    let { dropDownList } = this.state;
    const { loading, idFormat } = this.props;
    return fieldDetails.map((field, keyIndex) => {
      let gridClassName = "m-bt-15px";
      if (field.gridClassName) {
        gridClassName = field.gridClassName;
      } else if (field.type === "phone_number") {
        gridClassName = "m-t-0px";
      }
      const un_show_field = data[`${field.name}_unshow`]
        ? data[`${field.name}_unshow`]
        : false;
      if (un_show_field) return "";
      return (
        <Grid
          item
          md={field.md == 6 ? 5 : field.md}
          key={keyIndex}
          lg={field.lg ? field.lg : field.md}
          xs={12}
          sm={12}
          className={gridClassName}
        >
          {(field.type === "text" || field.type === "multiline-text") && (
            <TextField
              id={`${idFormat}${field.name}`}
              label={field.label}
              autoComplete="off"
              name={field.name}
              value={data[field.name]}
              required={field.required}
              className={field.className}
              autoFocus={field.autoFocus}
              onBlur={(e) => this.changeInParent(e, field, index)}
              rows={field.rows}
              variant="outlined"
              inputProps={{ maxLength: field.maxLength }}
              helperText={
                data[field.name + "_error"] === ""
                  ? ""
                  : data[field.name + "_error"]
              }
              error={data[field.name + "_error"] === "" ? false : true}
              onChange={(e) => this.handleSearchChange(e, field, index)}
              size={field.size}
            />
          )}
          {field.type === "date" && (
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                id={`${idFormat}${field.name}`}
                className={classNames(field.className)}
                autoOk
                variant="inline"
                inputVariant="outlined"
                label={field.label}
                minDate={
                  field.parentMinDate
                    ? data[field.parentMinDate]
                    : field.minDate
                }
                maxDate={field.maxDate}
                name={field.name}
                InputLabelProps={{
                  shrink: data[field.name] ? true : false,
                }}
                format="dd-MM-yyyy"
                value={data[field.name] ? data[field.name] : null}
                disabled={
                  field.parentMinDate
                    ? data[field.parentMinDate]
                      ? false
                      : true
                    : field.disabled
                }
                required={field.required}
                onChange={(e) => this.handleSearchChange(e, field, index)}
                onBlur={() => this.onBlurDateValidation(field, index)}
                onClose={() => this.onBlurDateValidation(field, index)}
                KeyboardButtonProps={{
                  "aria-label": "change date",
                }}
                helperText={
                  data[field.name + "_error"] === ""
                    ? "Format DD-MM-YYYY"
                    : data[field.name + "_error"]
                }
                error={data[field.name + "_error"] === "" ? false : true}
              />
            </MuiPickersUtilsProvider>
          )}
          {field.type === "dropDownWithSearch" && (
            <DropDownWithSearch
              id={`${idFormat}${field.name}`}
              options={dropDownList}
              value={data[field.name]}
              optionValue={field.optionValue}
              onChange={(e, newValue) =>
                this.handleDropDownSearchChange(e, newValue, field, index)
              }
              name={field.name}
              label={field.label}
              required={field.required}
              className={field.className}
              error={data[field.name + "_error"]}
              disabled={
                field.parent
                  ? data[field.parent]
                    ? false
                    : true
                  : field.disabled
              }
              helperText={
                data[field.name + "_error"]
                  ? data[field.name + "_error"]
                  : field.helperText
              }
              hideClearIcon={true}
              size={field.size}
            />
          )}
          {field.type === "time" && (
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardTimePicker
                id={`${idFormat}${field.name}`}
                className={field.className}
                autoOk
                variant="inline"
                inputVariant="outlined"
                label={field.label}
                name={field.name}
                margin="normal"
                value={data[field.name]}
                onChange={(e) => this.handleSearchChange(e, field, index)}
                InputLabelProps={{
                  shrink: data[field.name] ? true : false,
                }}
                inputProps={{ readOnly: true }}
                KeyboardButtonProps={{
                  "aria-label": "change time",
                }}
                helperText={
                  data[field.name + "_error"] === ""
                    ? ""
                    : data[field.name + "_error"]
                }
                error={data[field.name + "_error"] === "" ? false : true}
              />
            </MuiPickersUtilsProvider>
          )}
          {field.type === "phone_number" && (
            <PhoneNumber
              id={`${idFormat}${field.name}`}
              label={field.label}
              className={field.className}
              value={data[field.name]}
              name={field.name}
              error={data[field.name + "_error"]}
              onChange={(e) => this.handleSearchChange(e, field, index)}
              helperText={
                data[field.name + "_error"] === ""
                  ? field.helperText
                  : data[field.name + "_error"]
              }
              required={field.required}
              onBlur={(e) => this.changeInParent(e, field)}
            />
          )}
          {field.type === "drop_down" &&
            data[field.name] !== undefined &&
            !loading && (
              <Dropdown
                id={`${idFormat}${field.name}`}
                data={field.list}
                name={field.name}
                value={data[field.name]}
                onChange={(e) => this.handleSearchChange(e, field, index)}
                error={data[field.name + "_error"]}
                label={field.label}
                style={field.className}
                required={field.required}
                labelBackGroundClassName={field.labelBackGroundClassName}
                hideSelect={field.hideSelect}
                size={field.size}
              />
            )}
          {field.type === "checkbox" && data[field.name] !== undefined && (
            <div>
              <Checkbox
                id={`${idFormat}${field.name}`}
                onChange={(e) => this.handleSearchChange(e, field, index)}
                color="primary"
                name={field.name}
                checked={data[field.name]}
                inputProps={{
                  "aria-label": "primary checkbox",
                }}
              />
              <span>{field.label}</span>
            </div>
          )}
          {field.type === "dropDownWithSearchAndAddApi" &&
            <DropDownWithSearchAndAddApi
              options={dropDownList}
              name={field.name}
              value={data[field.name]}
              optionValue={field.optionValue}
              onChange={(e,newValue) => this.handleDropDownSearchChange(e, newValue, field, index)}
              error={data[field.name + "_error"]}
              label={field.label}
              className={field.className}
              required={data[field.required]}
              fieldDetails={fieldDetail}
              postUrl={POST_URL.libraryauthor.api}
              updatePostFormat={this.updatePostFormat}
              updateType={this.updateType}
              hideClearIcon
            />
          }
          {data[field.name + "_helper_text"] && (
            <span className="text-info">
              {data[field.name + "_helper_text"]}
            </span>
          )}
        </Grid>
      );
    });
  };
  render() {
    const { fieldDetails, hideAddMore, hideAddAnother, NotAlignCenter } = this.props;
    const { fieldValue } = this.state;
    return (
      <Box>
        <Paper className="paper-plain-background header-padding-top p-b-20px">
          {fieldValue.map((data, index) => (
            <Grid
              container
              key={index}
              className="position-relative text-field-block"
            >
              <Grid container spacing={2}>
                <Grid item md={10} xs={10}>
                  <Grid container spacing={2}>
                    {this.renderFields(data, index, fieldDetails)}
                  </Grid>
                </Grid>
                <Grid
                  item
                  md={2}
                  xs={2}
                  className={NotAlignCenter ? "" : "align-self-center"}
                >
                  {fieldValue.length > 1 && (
                    <Grid item md={1} xs={1}>
                      <Button
                        color="secondary"
                        className="min-max-w-0"
                        onClick={() => this.deleteField(index)}
                      >
                        <DeleteOutlineIcon className="add-icon-stock-item" />
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <br />
              {!hideAddMore && index === fieldValue.length - 1 && !hideAddAnother && (
                <Grid item md={12} xs={12} sm={12}>
                  <Box
                    className={classNames(
                      "end-flex-prop",
                      "header-padding-top"
                    )}
                  >
                    <Button
                      variant="contained"
                      onClick={this.addNew}
                      className="add-another-button"
                    >
                      <ControlPointOutlinedIcon className="visibility-icon" />{" "}
                      Add More
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          ))}
        </Paper>
      </Box>
    );
  }
}

export default MultipleAddTextFields;

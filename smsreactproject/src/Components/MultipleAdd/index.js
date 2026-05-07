import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import {
  Grid,
  Paper,
  Box,
  Button,
  TextField,
  TextareaAutosize,
  FormControl,
  FormHelperText,
  Tooltip,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import ReactPhoneInput from "react-phone-input-2";
import ControlPointOutlinedIcon from "@material-ui/icons/ControlPointOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import Checkbox from "@material-ui/core/Checkbox";

import { DropDownWithSearch } from "Components/DropDownWithSearch";
import "./styles.scss";
import {
  validateDate,
  dateFormat,
  NumberFormatCustom,
  validateMobileNumber
} from "Includes/functions";
import { validateAmount } from "Includes/validations";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";

class MultipleAdd extends Component {
  constructor(props) {
    super(props);
    this.state = {
      newField: [],
      fieldValue: [],
      foundDropDownList: false,
    };
  }

  componentDidMount() {
    this.setDefaultValues();
  }

  setDefaultValues = () => {
    const { fieldDetails } = this.props;
    let { fieldValue, foundDropDownList, dropDownList } = this.state;
    let data = {};
    fieldDetails.map((fields) => {
      data[fields.name] = fields.default;
      data[fields.name + "_error"] = "";
      data[fields.name + "_required"] = fields.required;
      if (fields.type === "dropDownWithSearch" && !foundDropDownList) {
        foundDropDownList = true;
        dropDownList = fields.list;
      }
    });
    fieldValue.push(data);
    this.setState({ ...fieldValue, foundDropDownList, dropDownList });
  };

  handleSearchChange = (e, field, i) => {
    let value = e;
    let name = field.name;
    let { fieldValue } = this.state;
    if (field.type === "text" || field.type === "text_area") {
      value = e.target.value;
      name = e.target.name;
    } else if (field.type === "amount") {
      value = e.target.value;
      value = value.replace("₹", "").split(",").join("").trim();
    } else if (field.type === "date" || field.type === "time") {
      fieldValue[i][name] = value;
      fieldValue[i][name + "_error"] = "";
      fieldValue[i][field.dependentField + "_error"] = "";
    } else if (field.type === "checkbox") {
      value = !fieldValue[i][name];
    } else if (field.type === "phone_number") {
      let returnValue = validateMobileNumber(field, value);
      if (!returnValue.test) {
        fieldValue[i][name + "_error"] = returnValue.error;
      } else {
        value = returnValue.value;
      }
    }
    if (field.convertUpperCase && value) {
      value = value.toUpperCase();
    }
    fieldValue[i][name] = value;
    fieldValue[i][name + "_error"] = "";
    this.setState({ fieldValue });
  };

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

  onBlurTextValidation = (e, field, i) => {
    let { fieldValue } = this.state;
    let name = field.name;
    let emptyTest = this.validateEmptyField(name);
    if (!emptyTest) return;
    this.validateDuplicateField(field);
    let value = fieldValue[i][name];
    if (value === "" && field.required) {
      fieldValue[i][name + "_error"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else if (
      field.regex &&
      value !== "" &&
      field.regex.value &&
      !field.regex.value.test(value)
    ) {
      fieldValue[i][name + "_error"] = field.regex.errorText;
    } else if (field.type === "amount") {
      const amountError = validateAmount(value);
      if (amountError["errorFound"]) {
        fieldValue[i][name + "_error"] = amountError["errorText"];
      }
    }
    this.setState({ fieldValue });
  };

  onBlurDateValidation = (e, field, i) => {
    let { fieldValue } = this.state;
    const name = field.name;
    const minDate = field.minDate;
    const maxDate = field.maxDate;
    let value;
    if (e === "close") {
      value = fieldValue[i][name];
    } else {
      value = e.target.value;
    }
    fieldValue[i][name + "_error"] = validateDate(value, minDate, maxDate);
    this.setState({ fieldValue });
  };

  addNew = () => {
    const { fieldValue } = this.state;
    let emptyTest = true;
    let duplicateTest = true;
    let timeTest = true;
    timeTest = this.validateTimeFields("submit");
    if (!timeTest) return;
    emptyTest = this.validateEmptyField();
    if (!emptyTest) return;
    duplicateTest = this.validateDuplicateField();
    if (!duplicateTest) return;
    if (emptyTest && duplicateTest) {
      let newData = {};
      fieldValue.map((data) =>
        Object.keys(data).map((key) => {
          if (key.includes("required")) {
            newData[key] = data[key];
          } else {
            newData[key] = "";
          }
        })
      );
      // Apply default overrides from onPrepareNewRow if provided
      if (this.props.onPrepareNewRow) {
        const overrides = this.props.onPrepareNewRow(fieldValue);
        if (overrides && typeof overrides === 'object') {
          Object.keys(overrides).forEach(key => {
            newData[key] = overrides[key];
          });
        }
      }
      this.setState({ fieldValue: fieldValue.concat(newData) });
    }
  };

  validateEmptyField = (name) => {
    let test = true;
    const { fieldValue } = this.state;
    fieldValue.forEach((item, index) => {
      Object.keys(item).forEach((data) => {
        if (!data.includes("error")) {
          if (
            item[`${data}_required`] &&
            data === name &&
            (item[data].toString().trim() === "" || item[data] === "")
          ) {
            item[`${data}_error`] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            test = false;
          }
        }
      });
    });
    this.setState({
      fieldValue,
    });
    return test;
  };

  validateDuplicateField = (paramField) => {
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
              if (field.type === "dropDownWithSearch") {
                value = item[data] ? item[data]["id"] : "";
              }
              value = value.toString().trim().toLowerCase().replace(/\s/g, "");
              if (!tempFieldMap.hasOwnProperty(data)) {
                tempFieldMap[data] = [];
              }
              if (
                tempFieldMap[data].includes(value) &&
                value !== "" &&
                !field.isDuplicateAllow
              ) {
                item[`${data}_error`] = (
                  <FormattedMessage {...commonMessages.duplicateFoundLabel} />
                );
                test = false;
              } else if (
                (value !== "" && !paramField) ||
                (paramField && field.name === paramField.name)
              ) {
                item[`${data}_error`] = "";
                tempFieldMap[data].push(value);
              }
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

  saveData = async () => {
    let { requiredAllObject } = this.props;
    let test = true;
    const fieldValue = [...this.state.fieldValue];
    const length = fieldValue.length - 1;
    let field = [];
    let temp = {};
    let duplicateTest = true;
    let timeTest = true;
    duplicateTest = this.validateDuplicateField();
    if (!duplicateTest) return;
    timeTest = this.validateTimeFields("submit");
    if (!timeTest) return;
    fieldValue.map((data, index) => {
      Object.keys(data).map((tempData) => {
        if (tempData.includes("error")) {
          if (data[tempData] !== "") {
            test = false;
          }
        } else {
          if (
            data[tempData].toString().trim() === "" &&
            (index !== fieldValue.length - 1 || index === 0) &&
            data[`${tempData}_required`]
          ) {
            if (index !== length) {
              data[tempData + "_error"] = (
                <FormattedMessage {...commonMessages.fieldMandatoryError} />
              );
            }
            test = false;
            data[tempData + "_error"] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
          } else {
            if (
              !data[`${tempData}_required`] &&
              !tempData.includes("required")
            ) {
              temp[tempData] =
                typeof data[tempData] === "object"
                  ? requiredAllObject
                    ? data[tempData]
                    : data[tempData]["id"]
                  : data[tempData]
                    ? data[tempData].toString().trim()
                    : null;
            } else if (
              data[tempData].toString().trim() !== "" &&
              !tempData.includes("required")
            ) {
              let value = "";
              if (data[tempData] instanceof Date) {
                value = data[tempData];
              } else {
                value =
                  typeof data[tempData] === "object"
                    ? requiredAllObject
                      ? data[tempData]
                      : data[tempData]["id"].toString().trim()
                    : data[tempData].toString().trim();
              }
              temp[tempData] = value;
            }
          }
        }
      });
      if (Object.keys(temp).length !== 0) {
        field.push(temp);
      }
      temp = {};
    });

    this.setState({
      fieldValue,
    });
    if (test && duplicateTest) {
      this.props.postMethod(field);
    }
  };

  deleteField = (i) => {
    let { fieldValue } = this.state;
    fieldValue.splice(i, 1);
    this.setState({ fieldValue }, () => {
      this.validateDuplicateField();
    });
  };

  validateTimeFields = (name) => {
    let { fieldValue } = this.state;
    let { fieldDetails } = this.props;
    let test = true;
    let tempFieldMap = {};
    fieldDetails.map((field) => {
      fieldValue.forEach((item, index) => {
        Object.keys(item).forEach((data) => {
          let dataExist = true;
          if ((name = "submit")) {
            dataExist = false;
          }
          if (data === field.name) {
            if (field.type === "time") {
              let value = "";
              value = dateFormat(item[data], "hh:mm A");
              if (!data.includes("error")) {
                value = value.toString().trim().toLowerCase();
                if (!tempFieldMap.hasOwnProperty(data)) {
                  tempFieldMap[data] = [];
                }
                if (tempFieldMap[data].includes(value)) {
                  test = true;
                  item[`${data}_error`] = "found";
                  if (
                    item[`${field.dependentField}_error`] === "found" &&
                    item[`${data}_error`] === "found"
                  ) {
                    item[
                      `${data}_error`
                    ] = `Both ${field.dependentFieldLabel} and ${field.label} cannot be same`;
                    item[
                      `${field.dependentField}_error`
                    ] = `Both ${field.dependentFieldLabel} and ${field.label} cannot be same`;
                    test = false;
                  }
                } else {
                  item[`${data}_error`] = "";
                  tempFieldMap[data].push(value);
                }
              }
            } else if (
              (field.type === "dropDownWithSearch" &&
                item[data]["id"] === "") ||
              (field.required && item[data] === "")
            ) {
              fieldValue[index][`${data}_error`] = (
                <FormattedMessage {...commonMessages.fieldMandatoryError} />
              );
              test = false;
            } else if (
              field.regex &&
              !field.regex.value.test(item[data]) &&
              item[data] !== ""
            ) {
              fieldValue[index][`${data}_error`] = field.regex.errorText;
              test = false;
            } else if (item[data] !== "") {
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

  renderFields = (data, index, fieldDetails) => {
    let { dropDownList } = this.state;
    let { idFormat = "" } = this.props;
    return fieldDetails.map((field, key) => (
      <Grid
        item
        md={field.md}
        xs={8}
        sm={8}
        key={key}
        className={field?.gridClassName}
      >
        {(field.type === "text" || field.type === "multiline-text") && (
          <TextField
            id={`${idFormat}${field.name}`}
            multiline={field?.rows ?? false}
            autoComplete="off"
            label={field.label}
            name={field.name}
            value={data[field.name]}
            className={field.className}
            autoFocus={field.autoFocus}
            onBlur={(e) => this.onBlurTextValidation(e, field, index)}
            rows={field.rows}
            variant="outlined"
            required={field.required}
            inputProps={{ maxLength: field.maxLength }}
            helperText={
              data[field.name + "_error"] === ""
                ? ""
                : data[field.name + "_error"]
            }
            error={data[field.name + "_error"] === "" ? false : true}
            onChange={(e) => this.handleSearchChange(e, field, index)}
          />
        )}
        {field.type === "date" && (
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDatePicker
              id={`${idFormat}${field.name}`}
              className={field.className}
              autoOk
              variant="inline"
              inputVariant="outlined"
              label={field.label}
              name={field.name}
              minDate={field.minDate}
              maxDate={field.maxDate}
              onClose={() => this.onBlurDateValidation("close", field, index)}
              onBlur={(e) => this.onBlurDateValidation(e, field, index)}
              format="yyyy-MM-dd"
              value={data[field.name]}
              onChange={(e) => this.handleSearchChange(e, field, index)}
              InputLabelProps={{ shrink: data[field.name] ? true : false }}
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
        {field.type === "amount" && (
          <TextField
            id={`${idFormat}${field.name}`}
            label={field.label}
            fullWidth
            autoComplete="off"
            name={field.name}
            value={data[field.name]}
            required={field.required}
            InputProps={{
              inputComponent: NumberFormatCustom,
            }}
            className={field.className}
            autoFocus={field.autoFocus}
            onBlur={(e) => this.onBlurTextValidation(e, field, index)}
            rows={field.rows}
            variant="outlined"
            inputProps={{
              maxLength: field.maxLength,
              style: { textAlign: "right" },
            }}
            helperText={
              data[field.name + "_error"] === ""
                ? ""
                : data[field.name + "_error"]
            }
            error={data[field.name + "_error"] === "" ? false : true}
            onChange={(e) => this.handleSearchChange(e, field, index)}
          />
        )}
        {field.type === "time" && (
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardTimePicker
              className={field.className}
              autoOk
              variant="inline"
              inputVariant="outlined"
              label={field.label}
              name={field.name}
              margin="normal"
              id={`${idFormat}${field.name}`}
              value={data[field.name]}
              onChange={(e) => this.handleSearchChange(e, field, index)}
              InputLabelProps={{ shrink: data[field.name] ? true : false }}
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
          <Box>
            <ReactPhoneInput
              id={`${idFormat}${field.name}`}
              value={data[field.name]}
              className={field.className}
              placeholder={field.label}
              name={field.name}
              country="in"
              onChange={(e) => this.handleSearchChange(e, field, index)}
              inputProps={{
                label: field.label,
                required: field.required,
              }}
              inputExtraProps={{
                margin: "normal",
                autoComplete: "phone",
                name: "custom-username",
              }}
            />
            {data[field.name + "_error"] !== "" && (
              <FormHelperText>{data[field.name + "_error"]}</FormHelperText>
            )}
          </Box>
        )}
        {field.type === "dropDownWithSearch" && (
          <DropDownWithSearch
            id={`${idFormat}${field.name}`}
            options={field.list || dropDownList}
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
          />
        )}
        {field.type === "text_area" && (
          <FormControl
            fullWidth
            error={data[field.name + "_error"] === "" ? false : true}
          >
            <Box className="apply-leave-label-names margin-top-20">
              {field.label}
            </Box>
            <TextareaAutosize
              aria-label="minimum height"
              className="apply-leave-text-area-auto-size-reason"
              id={`${idFormat}${field.name}`}
              maxLength={field.maxLength}
              name={field.name}
              value={data[field.name]}
              onChange={(e) => this.handleSearchChange(e, field, index)}
              onBlur={(e) => this.onBlurTextValidation(e, field, index)}
            />
            {data[field.name + "_error"] && (
              <FormHelperText>
                {data[field.name + "_error"] === ""
                  ? ""
                  : data[field.name + "_error"]}
              </FormHelperText>
            )}
          </FormControl>
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
      </Grid>
    ));
  };

  goToViewUrl = () => {
    const { viewUrl, viewParams } = this.props;
    let searchParam = "?" + new URLSearchParams(viewParams).toString();
    this.props.history.push({
      pathname: viewUrl,
      search: searchParam,
    });
  };

  render() {
    const {
      fieldDetails,
      header,
      subheader,
      name,
      submitDisable,
      note,
      headerGrid = {},
      buttonGrid = {},
      bodyGrid = {},
      additionalDetails,
    } = this.props;
    const { fieldValue } = this.state;
    return (
      <>
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid
              item
              xl={headerGrid.xl ? headerGrid.xl : 8}
              md={headerGrid.md ? headerGrid.md : 8}
              xs={headerGrid.xs ? headerGrid.xs : 12}
              className={classNames("header-align")}
            >
              <Box className="heading">{header}</Box>
              <Box className="sub-heading">{subheader}</Box>
              {additionalDetails &&
                additionalDetails.map((data) => {
                  return (
                    <Box px={2}>
                      <Box className="md-up-justify-start md-down-justify-space-evenly mb-y-20">
                        <Box className="year-std-box">
                          <Box className="academic-std-head"> {data.name}</Box>
                          <Box className=" aca-std-white-background">
                            {data.value}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
            </Grid>
            <Grid
              item
              xl={buttonGrid.xl ? buttonGrid.xl : 4}
              md={buttonGrid.md ? buttonGrid.md : 4}
              xs={buttonGrid.xs ? buttonGrid.xs : 12}
            >
              <Box className={classNames("header-align", "end-flex-prop")}>
                <Button
                  variant="contained"
                  onClick={() => this.goToViewUrl()}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" /> {name}
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Grid container className="header-padding-top">
            <Grid
              item
              xl={bodyGrid.xl ? bodyGrid.xl : 8}
              md={bodyGrid.md ? bodyGrid.md : 6}
              xs={bodyGrid.xs ? bodyGrid.xs : 8}
            >
              {note && <Box className="staff-list-assigned-shift">{note}</Box>}
              {fieldDetails.length < 2 ? (
                <Paper className="paper-plain-background header-align">
                  {fieldValue.map((data, index) => (
                    <Grid container key={index}>
                      {this.renderFields(data, index, fieldDetails)}
                      {index !== fieldValue.length - 1 ? (
                        <Grid item md={2} xs={2} sm={2}>
                          <Button
                            variant="contained"
                            color="primary"
                            className="deleteFee"
                            onClick={() => this.deleteField(index)}
                          >
                            <i
                              className="fa fa-times close-input-field"
                              aria-hidden="true"
                            ></i>
                          </Button>
                        </Grid>
                      ) : index === 0 ? (
                        <Grid item xs={2} sm={2}>
                          <Tooltip
                            title="Add More"
                            enterDelay={500}
                            enterNextDelay={400}
                            placement="top-start"
                            classes={{ tooltip: "tooltip-show-data" }}
                          >
                            <Button
                              className="multiple-add-button"
                              onClick={this.addNew}
                            >
                              <AddCircleOutlineOutlinedIcon className="multiple-add-button-icon" />
                            </Button>
                          </Tooltip>
                          {/* <Button variant='contained' color='primary' className='addmore' onClick={this.addNew}>Add</Button> */}
                        </Grid>
                      ) : (
                        <>
                          <Grid item xs={1} sm={1}>
                            <Tooltip
                              title="Remove"
                              enterDelay={500}
                              enterNextDelay={400}
                              placement="top-start"
                              classes={{ tooltip: "tooltip-show-data" }}
                            >
                              <Button
                                variant="contained"
                                color="primary"
                                className="deleteFee"
                                onClick={() => this.deleteField(index)}
                              >
                                <i
                                  className="fa fa-times close-input-field"
                                  aria-hidden="true"
                                ></i>
                              </Button>
                            </Tooltip>
                          </Grid>
                          <Grid item xs={1} sm={1}>
                            <Tooltip
                              title="Add More"
                              enterDelay={500}
                              enterNextDelay={400}
                              placement="top-start"
                              classes={{ tooltip: "tooltip-show-data" }}
                            >
                              <Button
                                className="multiple-add-button"
                                onClick={this.addNew}
                              >
                                <AddCircleOutlineOutlinedIcon className="multiple-add-button-icon" />
                              </Button>
                            </Tooltip>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  ))}
                  <div>
                    <br />
                  </div>
                  <br />
                  <Box className="submt-button-float-bottom">
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={submitDisable}
                      onClick={this.saveData}
                    >
                      submit
                    </Button>
                  </Box>
                </Paper>
              ) : (
                <Box>
                  {fieldValue.map((data, index) => (
                    <Grid container key={index} className="position-relative">
                      {fieldValue.length > 1 && (
                        <Box className="red-text close-icon-text-fields-box">
                          <HighlightOffIcon
                            className="cross-btn-nominee end-flex-prop close-icon-multiple-add-text-fields"
                            onClick={() => this.deleteField(index)}
                          />
                        </Box>
                      )}
                      <Paper
                        className={classNames(
                          "multiple-add-paper",
                          "header-padding-top"
                        )}
                      >
                        <Grid container>
                          {this.renderFields(data, index, fieldDetails)}
                          <div>
                            <br />
                          </div>
                        </Grid>
                      </Paper>
                      {index === fieldValue.length - 1 && (
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
                              <ControlPointOutlinedIcon className="visibility-icon" />
                              <FormattedMessage {...commonMessages.addMore} />
                            </Button>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  ))}
                  <Box className="submt-button-float-bottom" mt={3}>
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={submitDisable}
                      onClick={this.saveData}
                    >
                      <FormattedMessage {...commonMessages.submit} />
                    </Button>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </>
    );
  }
}

export default withRouter(MultipleAdd);

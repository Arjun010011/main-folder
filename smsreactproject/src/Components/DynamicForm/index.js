import React, { Component } from "react";
import {
  Grid,
  TextField,
  TextareaAutosize,
  FormControl,
  FormHelperText,
  Box,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Checkbox from "@material-ui/core/Checkbox";

import PhoneNumber from "Components/PhoneNumber";
import {
  validateMobileNumber,
  validateDate,
  NumberFormatCustom,
} from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import classNames from "classnames";
import { getRequest } from "Includes/api/apicall";
import "./styles.scss";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { POST_URL } from "Includes/urls";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import { nameRegex } from "Constants/regularExpression";

const fieldDetail = [
  {
    label: "Publisher Name",
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

export default class index extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fieldErrors: {},
      list: [],
      inputValue: "",
      loadingChild: {},
    };
  }

  componentDidMount = () => {
    this.setDefaultValues();
  };

  componentDidUpdate = (prevProps) => {
    // Sync field defaults when fieldDetails prop changes
    const { fieldDetails } = this.props;
    const prevFieldDetails = prevProps.fieldDetails;
    
    // Check if fieldDetails array reference changed or any field default changed
    if (prevFieldDetails !== fieldDetails && fieldDetails) {
      const { fieldErrors, list } = this.state;
      let fieldUpdates = {};
      let listUpdates = { ...list };
      let hasChanges = false;
      
      fieldDetails.forEach((fields) => {
        const prevField = prevFieldDetails && prevFieldDetails.find(f => f.name === fields.name);
        const currentValue = this.state[fields.name];
        const newDefault = fields.default;
        
        // Check if default value has changed from previous props
        const defaultChanged = !prevField || prevField.default !== newDefault;
        
        // Update if default value is different from current state
        if (defaultChanged && newDefault !== undefined && newDefault !== null) {
          if (newDefault || newDefault == 0) {
            if (currentValue !== newDefault) {
              fieldUpdates[fields.name] = newDefault;
              hasChanges = true;
            }
          } else if (currentValue !== "" && currentValue !== undefined && currentValue !== null) {
            fieldUpdates[fields.name] = "";
            hasChanges = true;
          }
        } else if (defaultChanged && (newDefault === null || newDefault === undefined)) {
          // Handle null/undefined defaults
          if (currentValue !== "" && currentValue !== undefined && currentValue !== null) {
            fieldUpdates[fields.name] = "";
            hasChanges = true;
          }
        }
        
        if (fields.type === "dropDown" && fields.default === false && currentValue !== false) {
          fieldUpdates[fields.name] = false;
          hasChanges = true;
        }
        
        // Update list if it changed
        if (
          (fields.type === "dropDownWithGetRequest" ||
          fields.type === "dropDownWithSearchAndGetRequest") &&
          fields.list
        ) {
          const prevList = prevField && prevField.list;
          if (prevList !== fields.list) {
            listUpdates[fields.name] = fields.list;
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        this.setState({ 
          ...fieldUpdates, 
          list: listUpdates 
        });
      }
    }
  };

  setDefaultValues = () => {
    let field = this.state;
    let { fieldErrors, list } = this.state;
    const { fieldDetails } = this.props;
    fieldDetails.map((fields) => {
      if (fields.default || fields.default == 0) {
        field[fields.name] = fields.default;
      } else {
        field[fields.name] = "";
      }
      if (fields.type === "dropDown" && fields.default === false) {
        field[fields.name] = false;
      }
      fieldErrors[fields.name] = "";
      if (
        fields.type === "dropDownWithGetRequest" ||
        fields.type === "dropDownWithSearchAndGetRequest"
      ) {
        list[fields.name] = fields.list ? fields.list : [];
      }
    });
    this.setState({ ...field, fieldErrors, list });
  };
  handleSearchChange = (e, field) => {
    let { fieldErrors } = this.state;
    let value = e;
    let name = field.name;
    const { state } = this;
    fieldErrors[name] = "";
    if (
      field.type === "text" ||
      field.type === "multiline-text" ||
      field.type === "text_area"
    ) {
      value = e.target.value.replace(/  +/g, " ");
      if (field.convertUpperCase) {
        value = value.toUpperCase();
      }
    } else if (field.type === "number") {
      value = e.target.value;
      if (value === "") {
        if (field.required) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
        }
      }
      if (value > field.maxNumber) {
        return;
      }
    }
    if (field.type === "dropDown") {
      value = e.target.value;
      this.props.updateParent(name, value);
    } else if (field.type === "radio") {
      value = e.target.value === "true";
      this.props.updateParent(name, value);
    } else if (field.type === "multiselect") {
      value = e;
      this.props.updateParent(name, value);
    } else if (field.type === "date") {
      if (e === null) {
        value = "";
        if (field.required) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
        }
        if (field.childDependent) {
          this.setState({ [field.childDependent]: null });
          this.props.updateParent(field.childDependent, null);
        }
      } else {
        this.props.updateParent(name, value);
      }
    } else if (field.type === "checkbox" || field.type === "switch") {
      value = !this.state[name];
      this.props.updateParent(name, value);
      if (field.dependentChildren && !value) {
        field.dependentChildren.map((data) => {
          this.props.updateParent(data, null);
          this.setState({
            [data]: null,
          });
        });
      }
    } else if (field.type === "amount") {
      value = e.target.value;
      value = value.replace("₹", "").split(",").join("").trim();
    }

    this.setState({
      [name]: value,
      fieldErrors,
    });
  };

  changeInParent = (e, field) => {
    let { fieldErrors } = this.state;
    const { state } = this;
    let value =
      typeof state[field.name] === "string"
        ? state[field.name].trim()
        : state[field.name];
    let name = field.name;
    if (field.type === "phone_number") {
      let returnValue = validateMobileNumber(field, value);
      if (!returnValue.test) {
        fieldErrors[name] = returnValue.error;
      } else {
        value = returnValue.value;
      }
    } else if (
      field.required &&
      (value === "" || value === null || value === 0)
    ) {
      fieldErrors[name] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else if (field.regex && !field.regex.value.test(value) && value !== "") {
      fieldErrors[name] = field.regex.errorText;
    }
    if (field.type === "date") {
      if (e === null) {
        value = "";
      }
    }
    this.setState(
      {
        fieldErrors,
        [name]: value,
      },
      () => {
        this.props.updateParent(name, value);
      }
    );
  };

  onBlurDateValidation = (field) => {
    let { fieldErrors } = this.state;
    const { state } = this;
    let value = state[field.name];
    let name = field.name;
    let minDate = field.parentMinDate
      ? state[field.parentMinDate]
      : field.minDate;
    let maxDate = field.maxDate;
    let error = validateDate(value, minDate, maxDate);
    if (value === "" && field.required) {
      fieldErrors[name] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else {
      if (error !== "") {
        fieldErrors[name] = error;
        if (value === "" && !field.required) {
          fieldErrors[name] = "";
          this.props.updateParent(name, value);
        }
      } else {
        this.props.updateParent(name, value);
      }
    }
    this.setState({ fieldErrors });
  };

  updateErrors = (fieldErrors) => {
    this.setState({
      fieldErrors: fieldErrors,
    });
  };

  handleChangeGetRequest = (e, field) => {
    let { fieldErrors, list, loadingChild } = this.state;
    let value = e.target.value;
    const { state } = this;
    const { parentValues } = this.props;
    let name = field.name;
    fieldErrors[name] = "";
    if (field.requestURL) {
      loadingChild[field.updateListTo] = true;
      list[field.updateListTo] = [];
      this.setState({
        [field.updateListTo]: null,
        loadingChild,
        list,
      });
      let url = "";
      let param = { is_active: true };
      if (field.requestType == "dummyParam") {
        url = `${field.requestURL}${value}/`;
        Object.keys(field.params).map((data) => {
          param[data] = 1;
        });
      } else {
        url = field.requestURL;
        Object.keys(field.params).map((data) => {
          if (data === name) {
            param[field.params[data]] = value;
          } else if (parentValues[data]) {
            param[field.params[data]] = parentValues[data];
          }
        });
      }
      getRequest(url, param, this.props).then((response) => {
        if (response && response.status === 200) {
          list[field.updateListTo] = response.data.data;
          loadingChild[field.updateListTo] = false;
          this.setState({
            list,
            loadingChild,
          });
        }
      });
    }
    field["list"] = list[field.name];
    this.props.updateParent(name, value, list);
    this.setState({
      [name]: value,
      fieldErrors,
    });
  };

  handleDropDownSearchChangeGetRequest = (e, value, field) => {
    let { fieldErrors, list } = this.state;
    let { parentValues } = this.state;
    let name = field.name;
    fieldErrors[name] = "";
    if (field.requestURL) {
      let url = "";
      let param = {};
      if (field.requestType == "dummyParam") {
        url = `${field.requestURL}${value}/`;
        Object.keys(field.params).map((data) => {
          param[data] = 1;
        });
      } else {
        url = field.requestURL;
        Object.keys(field.params).map((data) => {
          if (data === name) {
            param[field.params[data]] = value;
          } else if (parentValues[data]) {
            param[field.params[data]] = parentValues[data];
          }
        });
      }
      getRequest(url, param, this.props).then((response) => {
        if (response && response.status === 200) {
          list[field.updateListTo] = response.data.data;
          this.setState({
            list,
          });
        }
      });
    }
    field["list"] = list[field.name];
    this.props.updateParent(name, value, list);
    this.setState({
      [name]: value,
      fieldErrors,
    });
  };

  handleDropDownSearchChange = (e, newValue, field) => {
    let { fieldErrors } = this.state;
    let name = field.name;
    fieldErrors[name] = "";
    let value = newValue;
    this.setState({
      [name]: value,
      fieldErrors,
    });
    this.props.updateParent(name, value);
  };

  updatePostFormat = (newData) => {
    const { publisher } = this.state;
    newData.name = newData.name
    newData.publisher_name = publisher
    let payload = {
      publisher: [newData]
    }
    return payload
  }

  updateType = (field) => {
    this.setState({ loadingOptions: true })
    let { list } = this.state;
    list.push(field)
    this.setState({ list }, () => {
      this.setState({ loadingOptions: false })
    })
    return true
  }

  render() {
    const {
      fieldDetails,
      loading,
      containerSpacing,
      idFormat = "",
      customClassName,
    } = this.props;
    const { fieldErrors, list, inputValue, loadingChild } = this.state;
    const { state } = this;

    return (
      <Grid container spacing={containerSpacing ? containerSpacing : 2}>
        {fieldDetails.map((field, index) => {
          let customHelperText = fieldErrors[field.name]
            ? fieldErrors[field.name]
            : (!state[field.name] && field.helperText) ||
            (state[field.parentValue] && state[field.parentValue] !== ""
              ? field.parentHelperText && field.parentHelperText
              : "");
          let className = customClassName
            ? customClassName
            : customHelperText
              ? "m-t-10px"
              : "m-t-10px m-b-10px";
          className = field.gridClassName
            ? `${field.gridClassName} ${className}`
            : className;
          return (
            !field.hidden &&
            ((field.dependentParent &&
              state[field.dependentParent] === field.dependentValue) ||
              (!field.dependentParent && !state[field.dependentParent])) && (
              <Grid
                item
                md={field.md}
                key={field.value}
                xs={12}
                sm={12}
                className={className}
              >
                {(field.type === "text" || field.type === "multiline-text") && (
                  <TextField
                    id={`${idFormat}${field.name}`}
                    label={field.label}
                    autoComplete={
                      "autoComplete" in field ? field.autoComplete : "on"
                    }
                    required={field.required}
                    name={field.name}
                    value={state[field.name]}
                    className={field.className}
                    inputProps={{ maxLength: field.maxLength }}
                    fullWidth={field.className ? false : true}
                    disabled={
                      field.disabled || state[field.parentValue]
                        ? state[field.parentValue] !== ""
                        : false
                    }
                    maxRows={field.rows}
                    variant="outlined"
                    helperText={customHelperText}
                    error={
                      fieldErrors[field.name] &&
                      (fieldErrors[field.name] === "" ? false : true)
                    }
                    onChange={(e) => this.handleSearchChange(e, field)}
                    onBlur={(e) => this.changeInParent(e, field)}
                    size={field.size}
                    multiline={field.multiline}
                  />
                )}
                {field.type === "number" && (
                  <TextField
                    id={`${idFormat}${field.name}`}
                    label={field.label}
                    required={field.required}
                    type={field.type}
                    name={field.name}
                    value={state[field.name]}
                    className={field.className}
                    inputProps={{
                      max: field.maxNumber,
                    }}
                    fullWidth={field.className ? false : true}
                    disabled={
                      field.disabled || state[field.parentValue]
                        ? state[field.parentValue] !== ""
                        : false
                    }
                    rows={field.rows}
                    variant="outlined"
                    helperText={
                      fieldErrors[field.name] === ""
                        ? field.helperText ||
                        (state[field.parentValue] &&
                          state[field.parentValue] !== ""
                          ? field.parentHelperText && field.parentHelperText
                          : "")
                        : fieldErrors[field.name]
                    }
                    error={
                      fieldErrors[field.name] &&
                      (fieldErrors[field.name] === "" ? false : true)
                    }
                    onChange={(e) => this.handleSearchChange(e, field)}
                    onBlur={(e) => this.changeInParent(e, field)}
                  />
                )}
                {field.type === "amount" && (
                  <TextField
                    id={`${idFormat}${field.name}`}
                    label={field.label}
                    required={field.required}
                    type={field.type}
                    name={field.name}
                    value={state[field.name]}
                    className={field.className}
                    InputProps={{
                      inputComponent: NumberFormatCustom,
                    }}
                    fullWidth={field.className ? false : true}
                    disabled={
                      field.disabled || state[field.parentValue]
                        ? state[field.parentValue] !== ""
                        : false
                    }
                    rows={field.rows}
                    variant="outlined"
                    helperText={
                      fieldErrors[field.name] === ""
                        ? field.helperText ||
                        (state[field.parentValue] &&
                          state[field.parentValue] !== ""
                          ? field.parentHelperText && field.parentHelperText
                          : "")
                        : fieldErrors[field.name]
                    }
                    error={
                      fieldErrors[field.name] &&
                      (fieldErrors[field.name] === "" ? false : true)
                    }
                    onChange={(e) => this.handleSearchChange(e, field)}
                    onBlur={(e) => this.changeInParent(e, field)}
                  />
                )}

                {field.type === "date" && (
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                      size={field.size}
                      id={`${idFormat}${field.name}`}
                      className={classNames(field.className)}
                      autoOk
                      variant="inline"
                      inputVariant="outlined"
                      label={field.label}
                      minDate={
                        field.parentMinDate
                          ? state[field.parentMinDate]
                          : field.minDate
                      }
                      maxDate={field.maxDate}
                      name={field.name}
                      InputLabelProps={{
                        shrink: state[field.name] ? true : false,
                      }}
                      format="dd-MM-yyyy"
                      value={state[field.name] ? state[field.name] : null}
                      disabled={
                        field.parentMinDate
                          ? state[field.parentMinDate]
                            ? false
                            : true
                          : field.disabled
                      }
                      required={field.required}
                      onChange={(e) => this.handleSearchChange(e, field)}
                      onBlur={() => this.onBlurDateValidation(field)}
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      helperText={
                        fieldErrors[field.name] === ""
                          ? field.helperText
                          : fieldErrors[field.name]
                      }
                      error={
                        fieldErrors[field.name] &&
                        (fieldErrors[field.name] === "" ? false : true)
                      }
                      FormHelperTextProps={{
                        style: field.name === "dob" && field.helperText && !fieldErrors[field.name] 
                          ? { color: '#1976d2', marginTop: '4px' } 
                          : {}
                      }}
                    />
                  </MuiPickersUtilsProvider>
                )}
                {field.type === "phone_number" && (
                  <PhoneNumber
                    id={`${idFormat}${field.name}`}
                    label={field.label}
                    className={field.className}
                    required={field.required}
                    value={state[field.name]}
                    name={field.name}
                    error={fieldErrors[field.name]}
                    onChange={(e) => this.handleSearchChange(e, field)}
                    helperText={
                      fieldErrors[field.name] === ""
                        ? field.helperText
                        : fieldErrors[field.name]
                    }
                    onBlur={(e) => this.changeInParent(e, field)}
                  />
                )}
                {field.type === "dropDown" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <Dropdown
                      id={`${idFormat}${field.name}`}
                      data={field.list}
                      name={field.name}
                      value={state[field.name]}
                      onChange={(e) => this.handleSearchChange(e, field)}
                      error={fieldErrors[field.name]}
                      label={field.label}
                      style={field.className}
                      disabled={field.disabled}
                      required={field.required}
                      hideSelect={field.required ? true : field.hideSelect}
                      customName={field.customName}
                      size={field.size}
                      customId={field.customId}
                    />
                  )}
                {field.type === "dropDownWithGetRequest" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <Dropdown
                      id={`${idFormat}${field.name}`}
                      data={list[field.name]}
                      name={field.name}
                      value={state[field.name]}
                      onChange={(e) => this.handleChangeGetRequest(e, field)}
                      error={fieldErrors[field.name]}
                      label={field.label}
                      style={field.className}
                      disabled={
                        field.parent
                          ? state[field.parent]
                            ? false
                            : true
                          : field.disabled
                      }
                      required={field.required}
                      helperText={
                        field.parent
                          ? state[field.parent]
                            ? false
                            : field.helperText
                          : ""
                      }
                      hideSelect={field.required ? true : field.hideSelect}
                      size={field.size}
                    />
                  )}
                {field.type === "checkbox" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <Box>
                      <Checkbox
                        id={`${idFormat}${field.name}`}
                        onChange={(e) =>
                          this.handleSearchChange(e, field, index)
                        }
                        color="primary"
                        name={field.name}
                        checked={state[field.name]}
                        inputProps={{
                          "aria-label": "primary checkbox",
                        }}
                      />
                      <span>{field.label}</span>
                    </Box>
                  )}
                {field.type === "dropDownWithSearch" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <DropDownWithSearch
                      id={`${idFormat}${field.name}`}
                      options={field.list}
                      value={state[field.name]}
                      optionValue={field.optionValue}
                      onChange={(e, newValue) =>
                        this.handleDropDownSearchChange(e, newValue, field)
                      }
                      name={field.name}
                      label={field.label}
                      className={field.className}
                      required={field.required}
                      error={fieldErrors[field.name]}
                      disabled={
                        field.parent
                          ? state[field.parent]
                            ? false
                            : true
                          : field.disabled
                      }
                      helperText={
                        fieldErrors[field.name]
                          ? fieldErrors[field.name]
                          : field.helperText
                      }
                      hideClearIcon={field.hideClearIcon}
                      size={field.size}
                    />
                  )}
                {field.type === "dropDownWithSearchAndGetRequest" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <DropDownWithSearch
                      id={`${idFormat}${field.name}`}
                      options={list[field.name]}
                      value={state[field.name]}
                      optionValue={field.optionValue}
                      onChange={(e, newValue) =>
                        this.handleDropDownSearchChangeGetRequest(
                          e,
                          newValue,
                          field
                        )
                      }
                      name={field.name}
                      className={field.className}
                      error={fieldErrors[field.name]}
                      label={field.label}
                      disabled={
                        field.disabled
                          ? field.disabled
                          : field.parent
                            ? state[field.parent]
                              ? false
                              : true
                            : false
                      }
                      required={field.required}
                      helperText={
                        field.parent
                          ? state[field.parent]
                            ? false
                            : field.helperText
                          : ""
                      }
                      loadingValue={
                        loadingChild[field.name]
                          ? loadingChild[field.name]
                          : false
                      }
                      size={field.size}
                    />
                  )}
                {field.type === "text_area" && (
                  <FormControl
                    fullWidth
                    error={
                      fieldErrors[field.name] &&
                      (fieldErrors[field.name] ? true : false)
                    }
                  >
                    <Box className="apply-leave-label-names">{field.label}</Box>
                    <TextareaAutosize
                      aria-label="minimum height"
                      id={`${idFormat}${field.name}`}
                      className="apply-leave-text-area-auto-size-reason"
                      value={state[field.name]}
                      maxLength={field.maxLength}
                      name={field.name}
                      onChange={(e) => this.handleSearchChange(e, field)}
                      onBlur={(e) => this.changeInParent(e, field)}
                    />
                    {fieldErrors[field.name] && (
                      <FormHelperText>{fieldErrors[field.name]}</FormHelperText>
                    )}
                  </FormControl>
                )}
                {field.type === "switch" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={state[field.name]}
                          id={`${idFormat}${field.name}`}
                          name={field.name}
                          value={state[field.name]}
                          color="primary"
                          onChange={(e) => this.handleSearchChange(e, field)}
                        />
                      }
                      label={field.label}
                    />
                  )}
                {field.type === "radio" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <div>
                      {field.label}
                      {field.list.map((data, index) => {
                        return (
                          <Box>
                            <label>
                              <input
                                type="radio"
                                value={data.value}
                                name={field.name}
                                checked={state[field.name] == data.value}
                                id={`${idFormat}${field.name}_${data.value}`}
                                defaultChecked={state[field.name] == data.value}
                                onChange={(e) =>
                                  this.handleSearchChange(e, field)
                                }
                              />{" "}
                              {data.label}
                            </label>
                          </Box>
                        );
                      })}
                    </div>
                  )}
                {field.type === "multiselect" &&
                  state[field.name] !== undefined &&
                  !loading && (
                    <MultipleSelectDropdown
                      id={`${idFormat}${field.name}`}
                      data_list={field.list}
                      selected_list={state[field.name]}
                      error={fieldErrors[field.name] && fieldErrors[field.name]}
                      label={field.label}
                      onChange={(e) => this.handleSearchChange(e, field)}
                      className={field.className}
                      customId={field.customId}
                      size={field.size}
                    />
                  )}
                {field.type === "dropDownWithSearchAndAddApi" &&
                  <DropDownWithSearchAndAddApi
                    options={field.list}
                    name={field.name}
                    value={state[field.name]}
                    optionValue={field.optionValue}
                    onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, field)}
                    error={state[field.name + "_error"]}
                    label={field.label}
                    className={field.className}
                    required={state[field.required]}
                    fieldDetails={fieldDetail}
                    postUrl={POST_URL.librarypublisher.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    hideClearIcon
                  />
                }
              </Grid>
            )
          );
        })}
      </Grid>
    );
  }
}

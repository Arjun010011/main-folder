import React, { Component } from "react";
import {
  IconButton,
  Grid,
  Tooltip,
  Box,
  Menu,
  MenuItem,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextareaAutosize,
  FormControl,
  FormHelperText,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import PhoneNumber from "Components/PhoneNumber";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import Swal from "sweetalert2";
import Checkbox from "@material-ui/core/Checkbox";
import { withRouter } from "react-router-dom";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { postRequest, putRequest, deleteRequest } from "Includes/api/apicall";
import { Dropdown } from "Components/DropDown";
import {
  validateDate,
  dateFormat,
  isObjectEmpty,
  NumberFormatCustom,
} from "Includes/functions";
import "./styles.scss";
import MultiSelect from "react-multi-select-component";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import moment from "moment";

const override = {
  selectSomeItems: "Select Standards",
  allItemsAreSelected: "All Standards are selected.",
  selectAll: "Select All",
  search: "Search",
  clearSearch: "Clear Search",
};

const ITEM_HEIGHT = 35;

// newEditData -> {'redirectToUrl': '' , 'params': {}, 'callback' : '' }
// newViewData =-> {'redirectToUrl: '', 'params': {}, 'callback': ''}
// callback if you are defining the function in ur own component
class ActionColumnNew extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      anchorEl: null,
      updateDisable: true,
      displayActionColumn: false,
      showData: "",
      fieldValue: {},
      fieldTypes: {},
      openMenu: "",
      errorContent: "",
      loadingData: false,
    };
  }

  handleClickOpen = () => {
    const { fieldDetails, fieldValues, isPricePlan, newEditData, selectedDate } = this.props;
    if (!isObjectEmpty(newEditData) && newEditData.redirectToUrl) {
      let pushData = { pathname: newEditData.redirectToUrl };
      if (newEditData.params) {
        let searchParam =
          "?" + new URLSearchParams(newEditData.params).toString();
        pushData["search"] = searchParam;
      }
      this.props.history.push(pushData);
    } else if (isPricePlan) {
      this.editPricePlan();
    } else {
      let data = {};
      let { fieldValue } = this.state;
      let fieldTypes = {};
      const minDateValue= moment(selectedDate).subtract(1, "days");
      const maxDateValue= moment(selectedDate).add(1, "days");
      fieldDetails.map((fields, index) => {
        if (!fields.hide) {
          data[fields.name] = fieldValues[index];
          data[fields.name + "_error"] = "";
          data[fields.name + "_required"] = fields.required;
          fieldTypes[fields.name] = fields.type;
          if (
            fields.isDisableWhenPresent &&
            fieldValues[fields.isDependentIndex]
          ) {
            data[fields.name + "_allowEmpty"] = true;
          }
          if (fields.isMinMaxDateNeedUpdate && selectedDate) {
            fields["minDate"] = minDateValue;
            fields["maxDate"] = maxDateValue;
          }
        }
      });
      fieldValue = data;
      this.setState({
        fieldTypes,
        fieldValue: fieldValue,
        open: true,
        errorContent: "",
      });
      this.handleCloseMenu();
      if (this.props.isGetData) {
        this.setState(
          {
            loadingData: true,
          },
          () => {
            this.props.getData(this.props.id).then(() => {
              this.setState({ loadingData: false });
            });
          }
        );
      }
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  async componentDidMount() {
    const { enabledActions, options } = this.props;
    if (enabledActions.length > 0) {
      let showData;
      if (enabledActions.length > 1) {
        let arrData = enabledActions.map((data) => {
          if (data === "update") {
            return "edit";
          }
          return data;
        });
        showData = arrData.join("/ ");
      } else {
        showData = enabledActions.join();
      }
      this.setState({
        displayActionColumn: true,
        showData: showData,
        options: options,
      });
    }
  }

  update = async () => {
    let validationValue = this.validation();
    if (validationValue) {
      let { fieldValue, fieldTypes } = this.state;
      let { id, rowData, updateUrl, postUrl } = this.props;
      let fieldValuesTest = true;
      let field = {};
      let temp = {};
      Object.keys(fieldValue).map((data) => {
        if (data.includes("error")) {
          if (fieldValue[data] !== "") {
            fieldValuesTest = false;
          }
        } else {
          if (
            (fieldValue[data] === "" ||
              fieldValue[data] === 0 ||
              !fieldValue[data]) &&
            fieldTypes[data] !== "checkbox" &&
            fieldTypes[data] !== "switch"
          ) {
            if (fieldValue[data + "_allowEmpty"]) {
            } else if (
              !data.includes("_allowEmpty") &&
              fieldValue[data + "_required"]
            ) {
              fieldValue[data + "_error"] = (
                <FormattedMessage {...commonMessages.fieldMandatoryError} />
              );
              fieldValuesTest = false;
            }
          } else if (!data.includes("_required")) {
            temp[data] = fieldValue[data];
          }
        }
      });
      field = temp;
      if (fieldValuesTest) {
        this.setState({
          updateDisable: true,
        });
        let post_data = this.props.updatePostFormat(field, id);
        if (post_data && typeof post_data === "object" && post_data.error) {
          this.setState({ errorContent: post_data.error });
          return;
        }
        const put_url = updateUrl + id + "/";
        let props = { ...this.props };
        props["return_error_message"] = true;
        if (postUrl) {
          postRequest(postUrl, post_data, props).then((response) => {
            if (response && response.status === 200) {
              let updated = this.props.updateType(field, id);
              if (updated) {
                Swal.fire({
                  position: "top-end",
                  type: "success",
                  title: response.data.Reason,
                  showConfirmButton: false,
                  timer: 1500,
                });
                this.handleClose();
              }
            } else {
              this.setState({
                errorContent: response,
              });
            }
          });
        } else {
          putRequest(put_url, post_data, props).then((response) => {
            if (response && response.status === 200) {
              let updated = this.props.updateType(field, id);
              if (updated) {
                Swal.fire({
                  position: "top-end",
                  type: "success",
                  title: response.data.Reason,
                  showConfirmButton: false,
                  timer: 1500,
                });
                this.handleClose();
              }
            } else {
              this.setState({
                errorContent: response,
              });
            }
          });
        }
      } else {
        this.setState({
          fieldValue,
        });
      }
    }
  };

  handleSearchChange = (e, field) => {
    let { fieldValue } = this.state;
    let { fieldDetails, updateChildValue } = this.props;
    let value = e;
    let name = field.name;
    let fieldValues = { ...fieldValue };
    if (
      field.type === "text" ||
      field.type === "dropDown" ||
      field.type === "time" ||
      field.type === "text_area" ||
      field.type === "amount"
    ) {
      value = e.target.value;
      name = e.target.name;
    }
    if (field.type === "time" && value) {
      value = `${e.target.value}:00`;
      name = e.target.name;
    }
    if (field.type === "switch" && field.emptyRemainingValues && value) {
      let data = {};
      let fieldValue = {};
      fieldDetails.map((fields) => {
        if (fields.type !== "switch") {
          data[fields.name] = "";
          data[fields.name + "_error"] = "";
          data[fields.name + "_allowEmpty"] = true;
        }
      });
      data[field.name] = value;
      data[field.name + "_error"] = "";
      fieldValue = data;

      this.setState({
        fieldValue,
      });
      return;
    } else if (
      field.type === "switch" &&
      field.emptyRemainingValues &&
      !value
    ) {
      fieldDetails.map((fields) => {
        if (fields.type !== "switch") {
          fieldValues[fields.name] = "";
          fieldValues[fields.name + "_error"] = "";
          fieldValues[fields.name + "_allowEmpty"] = false;
        }
      });
      fieldValues[field.name] = value;
      fieldValues[field.name + "_error"] = "";
    }
    if (field.type === "date") {
      fieldValues[name] = value;
      fieldValues[name + "_error"] = "";
      if (field.updateChildValue) {
        fieldValues = updateChildValue(fieldValues);
      }
    } else if (field.type === "amount") {
      fieldValues[name] = e.target.value;
    } else if (field.type === "checkbox") {
      fieldValues[name] = value;
      fieldValues[name + "_error"] = "";
      if (field.updateChildValue) {
        fieldValues = updateChildValue(fieldValues);
      }
    }
    if (field.type === "dropDown" && value === 0) {
    } else {
      fieldValues[name] = value;
      fieldValues[name + "_error"] = "";
      this.setState({
        fieldValue: fieldValues,
        updateDisable: false,
        errorContent: "",
      });
    }
  };

  handleClick = (event) => {
    this.setState({
      anchorEl: event.currentTarget,
      openMenu: Boolean(event.currentTarget),
    });
  };

  handleCloseMenu = () => {
    this.setState({
      anchorEl: null,
      openMenu: false,
    });
  };

  handleDeleteAndClose = () => {
    this.handleCloseMenu();
    const { id, deleteUrl, isMultipleDelete } = this.props;
    const del_url = deleteUrl;
    let post_data = "";
    if (isMultipleDelete) {
      post_data = { data: [id] };
    }
    const url = del_url + id + "/";
    deleteRequest(url, post_data, {}).then((response) => {
      if (response && response.status === 200) {
        this.props.deleteType(id);
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  onBlurValidation = (e, field) => {
    let { fieldValue } = this.state;
    let fieldValues = { ...fieldValue };
    const name = field.name;
    const minDate = field.parentMinDate
      ? fieldValues[field.parentMinDate]
      : field.minDate;
    const maxDate = field.maxDate;
    let value;
    value = fieldValue[name];
    const error = validateDate(value, minDate, maxDate);
    if (field.updateChildValue) {
      fieldValue = this.props.updateChildValue(fieldValue);
    }
    if (error !== "") {
      fieldValues[name + "_error"] = error;
      this.setState({
        fieldValue: fieldValues,
      });
    }
  };

  validation = () => {
    const { fieldValue } = this.state;
    let { fieldDetails } = this.props;
    let returnValue = true;
    let value, name;
    fieldDetails.map((field) => {
      value = fieldValue[field.name];
      name = field.name;
      if (field.type === "date") {
        const minDate = field.parentMinDate
          ? fieldValue[field.parentMinDate]
          : field.minDate;
        const error = validateDate(value, minDate, field.maxDate);
        if (error !== "") {
          fieldValue[name + "_error"] = error;
          returnValue = false;
        }
      }
    });
    this.setState({
      fieldValue,
    });
    return returnValue;
  };

  handleClickView = () => {
    const { id, viewURL, newViewData } = this.props;
    if (!isObjectEmpty(newViewData) && newViewData.redirectToUrl) {
      let pushData = { pathname: newViewData.redirectToUrl };
      if (newViewData.params) {
        let searchParam =
          "?" + new URLSearchParams(newViewData.params).toString();
        pushData["search"] = searchParam;
      }
      this.props.history.push(pushData);
    } else {
      this.props.history.push({
        pathname: viewURL,
        state: { detail: id },
      });
    }
  };

  editPricePlan = () => {
    let { yearName, year, planname, selectedStandards, isEdit, planid } =
      this.props;
    this.props.history.push({
      pathname: Actions.transport_priceplan.create.url,
      state: {
        detail: {
          yearName: yearName,
          year: year,
          planname: planname,
          selectedStandards: selectedStandards,
          isEdit: isEdit,
          planid: planid,
        },
      },
    });
  };

  onBlurTextValidation = (e, field) => {
    let { fieldValue } = this.state;
    let fieldValues = { ...fieldValue };
    const name = field.name;
    let value;
    value = fieldValue[name];
    if (
      field.regex &&
      value !== "" &&
      field.regex.value &&
      !field.regex.value.test(value)
    ) {
      fieldValues[name + "_error"] = field.regex.errorText;
    }
    if (
      field.regex &&
      field.regex.name == "numberRegex" &&
      ((field.minValue && parseInt(value) < parseInt(field.minValue)) ||
        (field.maxValue && parseInt(value) > parseInt(field.maxValue)))
    ) {
      if (parseInt(value) < parseInt(field.minValue)) {
        fieldValues[name + "_error"] = `Min Value ${field.minValue}`;
      }
      if (parseInt(value) > parseInt(field.maxValue)) {
        fieldValues[name + "_error"] = `Max Value ${field.maxValue}`;
      }
    }
    this.setState({
      fieldValue: fieldValues,
    });
  };

  handleApprove = () => {
    const { id } = this.props;
    this.handleCloseMenu();
    this.props.handleApproveButton(id);
  };

  handleReject = () => {
    const { id } = this.props;
    this.handleCloseMenu();
    this.props.handleRejectButton(id);
  };

  handleDisable = (value) => {
    let { id, updateUrl, fieldValues } = this.props;
    this.setState({
      updateDisable: true,
    });
    let post_data = this.props.updateDisableFormat(fieldValues, value, id);
    const put_url = updateUrl + id + "/";
    let props = { ...this.props };
    putRequest(put_url, post_data, props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.handleCloseMenu();
        this.handleClose();
        this.props.getAcademicYearList();
      } else {
        this.setState({
          errorContent: response,
        });
      }
    });
  };

  handleDropDownSearchChange = (e, newValue, field) => {
    let { fieldErrors, fieldValue } = this.state;
    let fieldValues = { ...fieldValue };
    let name = field.name;
    fieldValues[name] = newValue;
    this.setState({
      fieldValues,
      fieldErrors,
      updateDisable: false,
    });
  };

  render() {
    const {
      open,
      showData,
      openMenu,
      anchorEl,
      updateDisable,
      displayActionColumn,
      fieldValue,
      errorContent,
      loadingData,
      options,
    } = this.state;
    const {
      enabledActions,
      baseClassName,
      label,
      fieldDetails,
      rowData,
      selected,
    } = this.props;
    const {
      handleClick,
      handleClose,
      handleCloseMenu,
      handleClickOpen,
      handleDeleteAndClose,
      handleSearchChange,
      onBlurValidation,
      update,
      handleApprove,
      handleReject,
      handleDisable,
    } = this;
    const { textToShow } = this.props;
    const isShowText = Boolean(textToShow) ? true : false;
    return (
      <div>
        {!isShowText ? (
          <>
            <Tooltip
              title={showData}
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <IconButton
                aria-label="more"
                aria-controls="long-menu"
                aria-haspopup="true"
                onClick={handleClick}
                className={
                  displayActionColumn ? "padding-0" : "display-none padding-0"
                }
              >
                <MoreHorizIcon />
              </IconButton>
            </Tooltip>
            <Menu
              id="long-menu"
              anchorEl={anchorEl}
              keepMounted
              open={openMenu}
              onClose={handleCloseMenu}
              PaperProps={{
                style: {
                  maxHeight: ITEM_HEIGHT * 4.5,
                  width: 100,
                },
              }}
            >
              {enabledActions.includes("view") && (
                <MenuItem onClick={this.handleClickView}>View</MenuItem>
              )}

              {(enabledActions.includes("edit") ||
                enabledActions.includes("update")) && (
                <MenuItem onClick={handleClickOpen}>Edit</MenuItem>
              )}
              {enabledActions.includes("delete") && (
                <MenuItem onClick={handleDeleteAndClose}>Delete</MenuItem>
              )}
              {enabledActions.includes("disable") && (
                <MenuItem onClick={() => handleDisable(false)}>
                  Disable
                </MenuItem>
              )}
              {enabledActions.includes("enable") && (
                <MenuItem onClick={() => handleDisable(true)}>Enable</MenuItem>
              )}
              {enabledActions.includes("add") && (
                <MenuItem onClick={handleClickOpen}>Add</MenuItem>
              )}
              {enabledActions.includes("approve") && (
                <MenuItem onClick={handleApprove}>Approve</MenuItem>
              )}
              {enabledActions.includes("reject") && (
                <MenuItem onClick={handleReject}>Reject</MenuItem>
              )}
            </Menu>

            <Dialog
              open={open}
              className={baseClassName}
              aria-labelledby="form-dialog-title"
            >
              <DialogTitle id="form-dialog-title"></DialogTitle>
              <Box className={loadingData ? "" : "display-none"}>
                <Box className="loading">
                  <CircularProgress />
                </Box>
              </Box>
              <DialogContent className={loadingData ? "display-none" : ""}>
                <DialogContentText>
                  {label ? label : `Please Enter the Details`}
                </DialogContentText>
                <Grid container className="flex-justify-center">
                  {fieldDetails &&
                    fieldDetails.map((field) => (
                      <Grid item md={field.md} xs={10} sm={10}>
                        {(field.type === "text" ||
                          field.type === "multiline-text") && (
                          <TextField
                            autoComplete="off"
                            multiline={field?.rows ?? false}
                            id={field.id}
                            label={field.label}
                            name={field.name}
                            value={fieldValue[field.name]}
                            className={field.className}
                            autoFocus={field.autoFocus}
                            onBlur={(e) => {
                              this.onBlurTextValidation(e, field);
                            }}
                            rows={field.rows}
                            variant="outlined"
                            required={field.required}
                            inputProps={{ maxLength: field.maxLength }}
                            helperText={
                              fieldValue[field.name + "_error"] === ""
                                ? ""
                                : fieldValue[field.name + "_error"]
                            }
                            error={
                              fieldValue[field.name + "_error"] === ""
                                ? false
                                : true
                            }
                            onChange={(e) => handleSearchChange(e, field)}
                          />
                        )}
                        {field.type === "text_area" && (
                          <FormControl
                            fullWidth
                            autoComplete="off"
                            error={
                              fieldValue[field.name + "_error"] &&
                              (fieldValue[field.name + "_error"] ? true : false)
                            }
                          >
                            <Box className="apply-leave-label-names margin-top-20">
                              {field.label}
                            </Box>
                            <TextareaAutosize
                              aria-label="minimum height"
                              autoComplete="off"
                              className="apply-leave-text-area-auto-size-reason"
                              value={fieldValue[field.name]}
                              maxLength={field.maxLength}
                              name={field.name}
                              onChange={(e) => handleSearchChange(e, field)}
                            />
                            {fieldValue[field.name + "_error"] && (
                              <FormHelperText>
                                {fieldValue[field.name + "_error"]}
                              </FormHelperText>
                            )}
                          </FormControl>
                        )}
                        {field.type === "date" && (
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDatePicker
                              className={field.className}
                              autoOk
                              variant="inline"
                              inputVariant="outlined"
                              label={field.label}
                              name={field.name}
                              required={field.required}
                              minDate={
                                field.parentMinDate
                                  ? fieldValue[field.parentMinDate]
                                  : field.minDate
                              }
                              maxDate={field.maxDate}
                              onBlur={(e) => onBlurValidation(e, field)}
                              format="dd-MM-yyyy"
                              value={fieldValue[field.name]}
                              defaultValue={fieldValue[field.name]}
                              onChange={(e) => handleSearchChange(e, field)}
                              KeyboardButtonProps={{
                                "aria-label": "change date",
                              }}
                              inputProps={{ maxLength: 50 }}
                              helperText={
                                fieldValue[field.name + "_error"] === ""
                                  ? "Format DD-MM-YYYY"
                                  : fieldValue[field.name + "_error"]
                              }
                              error={
                                fieldValue[field.name + "_error"] === ""
                                  ? false
                                  : true
                              }
                              disabled={
                                field.isDisableWhenPresent
                                  ? fieldValue[field.isDisableWhenPresent]   // disable if value truthy
                                  : field.isEnableWhenPresent
                                  ? !fieldValue[field.isEnableWhenPresent]  // disable if value falsy
                                  : field.disabled
                              }
                            />
                          </MuiPickersUtilsProvider>
                        )}
                        {field.type === "time" && (
                          <TextField
                            id="time"
                            type="time"
                            variant="outlined"
                            label={field.label}
                            name={field.name}
                            required={field.required}
                            margin="normal"
                            value={fieldValue[field.name]}
                            onChange={(e) => this.handleSearchChange(e, field)}
                            className={
                              field.className ? field.className : "width-100"
                            }
                            disabled={
                              field.isDisableWhenPresent
                                ? fieldValue[field.isDisableWhenPresent]
                                : field.disabled
                            }
                            InputLabelProps={{
                              shrink: true,
                            }}
                            inputProps={{
                              step: 300, // 5 min
                            }}
                            helperText={
                              fieldValue[field.name + "_error"] === ""
                                ? "Validate Format HH:MM AM/PM"
                                : fieldValue[field.name + "_error"]
                            }
                            error={
                              fieldValue[field.name + "_error"] === ""
                                ? false
                                : true
                            }
                          />
                        )}
                        {field.type === "phone_number" && (
                          <PhoneNumber
                            label={field.label}
                            className={field.className}
                            value={fieldValue[field.name]}
                            name={field.name}
                            error={fieldValue[field.name + "_error"]}
                            onChange={(e) => this.handleSearchChange(e, field)}
                            helperText={
                              fieldValue[field.name + "_error"] === ""
                                ? field.helperText
                                : fieldValue[field.name + "_error"]
                            }
                            onBlur={(e) => this.changeInParent(e, field)}
                          />
                        )}
                        {field.type === "dropDown" &&
                          !loadingData &&
                          fieldValue[field.name] !== undefined && (
                            <Dropdown
                              data={field.list}
                              name={field.name}
                              value={fieldValue[field.name]}
                              onChange={(e) =>
                                this.handleSearchChange(e, field)
                              }
                              required={field.required}
                              error={fieldValue[field.name + "_error"]}
                              label={field.label}
                              style={field.className}
                              disabled={field.disabled}
                            />
                          )}
                        {field.type === "dropDownWithSearch" &&
                          fieldValue[field.name] !== undefined &&
                          !loadingData && (
                            <DropDownWithSearch
                              id={`${field.name}`}
                              options={field.list}
                              value={fieldValue[field.name]}
                              optionValue={field.optionValue}
                              onChange={(e, newValue) =>
                                this.handleDropDownSearchChange(
                                  e,
                                  newValue,
                                  field
                                )
                              }
                              name={field.name}
                              label={field.label}
                              className={field.className}
                              required={field.required}
                              error={fieldValue[field.name + "_error"]}
                              disabled={
                                field.parent
                                  ? fieldValue[field.parent]
                                    ? false
                                    : true
                                  : field.disabled
                              }
                              helperText={
                                fieldValue[field.name + "_error"]
                                  ? fieldValue[field.name + "_error"]
                                  : field.helperText
                              }
                              hideClearIcon={field.hideClearIcon}
                            />
                          )}
                        {field.type === "checkbox" &&
                          fieldValue[field.name] !== undefined && (
                            <Box>
                              <Checkbox
                                onChange={(e) =>
                                  this.handleSearchChange(
                                    !fieldValue[field.name],
                                    field
                                  )
                                }
                                color="primary"
                                name={field.name}
                                checked={fieldValue[field.name]}
                                inputProps={{
                                  "aria-label": "primary checkbox",
                                }}
                              />
                              <span>{field.label}</span>
                            </Box>
                          )}

                        {field.type === "switch" && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={fieldValue[field.name]}
                                name={field.name}
                                value={fieldValue[field.name]}
                                color="primary"
                                onChange={(e) =>
                                  this.handleSearchChange(
                                    !fieldValue[field.name],
                                    field
                                  )
                                }
                              />
                            }
                            label={field.label}
                          />
                        )}
                        {field.type === "date_time" && (
                          <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDateTimePicker
                              autoComplete="off"
                              className={field.className}
                              ampm={true}
                              autoOk
                              variant="dialog"
                              inputVariant="outlined"
                              label={field.label}
                              name={field.name}
                              format="dd-MM-yyyy hh:mm a"
                              disabled={
                                field.isDisableWhenPresent
                                  ? fieldValue[field.isDisableWhenPresent]
                                  : field.disabled
                              }
                              InputLabelProps={{
                                shrink: true,
                              }}
                              minDate={ 
                                field.parentMinDate
                                  ? fieldValue[field.parentMinDate]
                                  : field.minDate
                              }
                              maxDate={field.maxDate}
                              onBlur={(e) => onBlurValidation(e, field)}
                              value={fieldValue[field.name]}
                              onChange={(e) => handleSearchChange(e, field)}
                              KeyboardButtonProps={{
                                "aria-label": "change date",
                              }}
                              inputProps={{ maxLength: 50 }}
                              helperText={
                                fieldValue[field.name + "_error"] === ""
                                  ? "Format DD-MM-YYYY"
                                  : fieldValue[field.name + "_error"]
                              }
                              error={ 
                                fieldValue[field.name + "_error"] === ""
                                  ? false
                                  : true
                              }
                            />
                          </MuiPickersUtilsProvider>
                        )}
                        {field.type === "amount" && (
                          <TextField
                            InputProps={{
                              inputComponent: NumberFormatCustom,
                            }}
                            autoComplete="off"
                            id={field.id}
                            label={field.label}
                            name={field.name}
                            value={fieldValue[field.name]}
                            onBlur={(e) => {
                              this.onBlurTextValidation(e, field);
                            }}
                            className={field.className}
                            autoFocus={field.autoFocus}
                            rows={field.rows}
                            variant="outlined"
                            required={field.required}
                            helperText={
                              fieldValue[field.name + "_error"] === ""
                                ? ""
                                : fieldValue[field.name + "_error"]
                            }
                            error={
                              fieldValue[field.name + "_error"] === ""
                                ? false
                                : true
                            }
                            onChange={(e) => handleSearchChange(e, field)}
                            inputProps={{
                              maxLength: field.maxLength,
                              style: { textAlign: "right" },
                            }}
                          />
                        )}
                        {field.type === "multiselect" && !loadingData && (
                          <MultipleSelectDropdown
                            data_list={field.list}
                            selected_list={fieldValue[field.name]}
                            error={
                              fieldValue[field.name + "_error"] &&
                              fieldValue[field.name + "_error"]
                            }
                            label={field.selectLabel}
                            onChange={(e) => this.handleSearchChange(e, field)}
                            className={field.className}
                          />
                        )}
                      </Grid>
                    ))}
                </Grid>
                <Box className="action-error-content flex-justify-center margin-top-10">
                  {errorContent}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose} color="secondary">
                  Close
                </Button>
                <Button
                  disabled={updateDisable}
                  onClick={update}
                  color="primary"
                >
                  Update
                </Button>
              </DialogActions>
            </Dialog>
          </>
        ) : (
          <Box>{textToShow}</Box>
        )}
      </div>
    );
  }
}

export default withRouter(ActionColumnNew);

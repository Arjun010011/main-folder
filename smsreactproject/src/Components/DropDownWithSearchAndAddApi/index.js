import React, { useState, useEffect } from "react";
import Autocomplete from "@material-ui/lab/Autocomplete";
import {
  Dialog,
  DialogActions,
  DialogContent,
  TextareaAutosize,
  Button,
  DialogContentText,
  DialogTitle,
  Box,
  Grid,
  TextField,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import PhoneNumber from "Components/PhoneNumber";
import {
  validateDate,
  dateFormat,
  isObjectEmpty,
  NumberFormatCustom,
} from "Includes/functions";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import { postRequest } from "Includes/api/apicall";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import "./styles.scss";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function DropDownWithSearchAndAddApi(props) {
  const {
    optionValue,
    options,
    value,
    name,
    label,
    disabled,
    required,
    fullWidth,
    helperText,
    className,
    onChange,
    error,
    loadingValue,
    hideClearIcon,
    dialogLabel,
    fieldDetails,
    fieldValues,
    updateChildValue,
    showAddNew = true,
    size = "medium",
    variant = "outlined",
  } = props;

  const [loading, setLoading] = useState(false);
  const [newOptions, setNewOptions] = useState([]);
  const [fieldValue, setFieldValue] = React.useState({});
  const [errorContent, setErrorContent] = React.useState("");
  const [updateDisable, setUpdateDisable] = React.useState(false);
  const [fieldTypes, setFieldTypes] = React.useState({});
  const [isDialog, setIsDialog] = React.useState(false);
  const [loadingOptions, setLoadingOptions] = React.useState(false);

  useEffect(() => {
    if (loadingValue) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    if (options) {
      setLoadingOptions(() => true);
      let optionsTemp = [...options];
      if (showAddNew) {
        let newTempAdd = {};
        newTempAdd["id"] = "new";
        if (optionValue) {
          newTempAdd[optionValue] = "Add New";
        } else {
          newTempAdd["name"] = "Add New";
        }
        optionsTemp.push(newTempAdd);
      }
      setNewOptions(() => optionsTemp);
      setLoadingOptions(() => false);
    }
  }, [options]);

  const handleOnChange = (e, value) => {
    if (value && value["id"] !== "new") {
      onChange(e, value);
    } else if (value) {
      handleOpen();
      onChange(e, "");
    } else {
      onChange(e, "");
    }
  };

  const handleOpen = () => {
    let data = {};
    let fieldTypes = {};
    let fieldValue = {};
    fieldDetails.map((fields) => {
      if (!fields.hide) {
        data[fields.name] = fields.default;
        data[fields.name + "_error"] = "";
        data[fields.name + "_required"] = fields.required;
        fieldTypes[fields.name] = fields.type;
        if (
          fields.isDisableWhenPresent &&
          fieldValues[fields.isDependentIndex]
        ) {
          data[fields.name + "_allowEmpty"] = true;
        }
      }
    });
    fieldValue = data;
    setFieldValue(() => fieldValue);
    setFieldTypes(() => fieldTypes);
    setUpdateDisable(() => false);
    setIsDialog(() => true);
  };

  const handleClose = () => {
    setIsDialog(() => false);
  };

  const handleSearchChange = (e, field) => {
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

      setFieldValue(() => fieldValue);
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
    }
    if (field.type === "dropDown" && value === 0) {
    } else {
      fieldValues[name] = value;
      delete fieldValues[name + "_error"];
      setFieldValue(() => fieldValues);
      setErrorContent(() => "");
      setUpdateDisable(() => false);
    }
  };

  const onBlurValidation = (e, field) => {
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
      fieldValue = updateChildValue(fieldValue);
    }
    if (error !== "") {
      fieldValues[name + "_error"] = error;
      setFieldValue(() => fieldValues);
    }
  };

  const onBlurTextValidation = (e, field) => {
    let fieldValues = { ...fieldValue };
    const name = field.name;
    let value;
    value = fieldValue[name];
    if (field.required && value === "") {
      fieldValues[name + "_error"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
    } else if (
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
    setFieldValue(() => fieldValues);
  };

  const handleAddNew = () => {
    let validationValue = validation();
    if (validationValue) {
      let { postUrl } = props;
      let fieldValuesTest = true;
      let field = {};
      let temp = {};
      Object.keys(fieldValue).map((data) => {
        if (data.includes("error")) {
          fieldValuesTest = false;
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
        setUpdateDisable(() => true);
        let post_data = props.updatePostFormat(field, name);
        if (post_data && typeof post_data === "object" && post_data.error) {
          setErrorContent(() => post_data.error);
          return;
        }
        let props_value = { ...props };
        props_value["return_error_message"] = true;
        postRequest(postUrl, post_data, props_value).then((response) => {
          if (response && response.status === 200) {
            let updated = props.updateType(response.data.data[0]);
            if (updated) {
              onChange(
                { target: { name: "reason", value: response.data.data[0] } },
                response.data.data[0]
              );
              handleClose();
            }
          } else {
            setErrorContent(() => response);
          }
        });
      } else {
        setFieldValue(() => fieldValue);
      }
    }
  };

  const validation = () => {
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
    setFieldValue(() => fieldValue);
    return returnValue;
  };

  return (
    <div className="">
      {!loadingOptions && (
        <Autocomplete
          options={newOptions}
          value={value ? value : null}
          getOptionLabel={(option) =>
            option[optionValue ? optionValue : "name"]
          }
          onChange={handleOnChange}
          name={name}
          loading={loading}
          disabled={disabled}
          disableClearable={hideClearIcon ? true : false}
          size={size}
          onInputChange={async (event, value) => {
            if (!value) return;
            setLoading(true);
            await sleep(500);
            setLoading(false);
          }}
          renderOption={(props, option) => {
            return (
              <li
                {...props}
                className={props.name === "Add New" && "add-new-option"}
              >
                {props.name}
              </li>
            );
          }}
          renderInput={(params) => {
            params.inputProps.autoComplete = "new-password";
            return (
              <TextField
                {...params}
                label={label}
                className={className}
                required={required}
                fullWidth={fullWidth}
                variant={variant}
                helperText={error ? error : helperText}
                error={error}
                // InputProps={{
                //     className: "red"
                //  }}
              />
            );
          }}
        />
      )}
      <Dialog
        open={isDialog}
        className={"action-basic-detail-width"}
        // onClose={handleClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title"></DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogLabel ? dialogLabel : `Enter the Details`}
          </DialogContentText>
          <Grid container className="flex-justify-center">
            {fieldDetails &&
              fieldDetails.map((field) => (
                <Grid item md={field.md} xs={10} sm={10}>
                  {(field.type === "text" ||
                    field.type === "multiline-text") && (
                    <TextField
                      autoComplete="off"
                      id={field.id}
                      label={field.label}
                      name={field.name}
                      value={fieldValue[field.name]}
                      className={field.className}
                      autoFocus={field.autoFocus}
                      onBlur={(e) => {
                        onBlurTextValidation(e, field);
                      }}
                      rows={field.rows}
                      variant="outlined"
                      required={field.required}
                      inputProps={{ maxLength: field.maxLength }}
                      helperText={
                        fieldValue[field.name + "_error"]
                          ? fieldValue[field.name + "_error"]
                          : ""
                      }
                      error={fieldValue[field.name + "_error"] ? true : false}
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
                          fieldValue[field.name + "_error"]
                            ? fieldValue[field.name + "_error"]
                            : "Format DD-MM-YYYY"
                        }
                        error={fieldValue[field.name + "_error"] ? true : false}
                        disabled={field.disabled}
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
                        fieldValue[field.name + "_error"]
                          ? fieldValue[field.name + "_error"]
                          : "Validate Format HH:MM AM/PM"
                      }
                      error={fieldValue[field.name + "_error"] ? true : false}
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
                        fieldValue[field.name + "_error"] === "" ? false : true
                      }
                      onChange={(e) => handleSearchChange(e, field)}
                      inputProps={{
                        maxLength: field.maxLength,
                        style: { textAlign: "right" },
                      }}
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
            onClick={handleAddNew}
            color="primary"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

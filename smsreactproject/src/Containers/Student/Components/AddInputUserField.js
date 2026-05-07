import React from "react";
import { Grid, Tooltip, TextField } from "@material-ui/core";
import NumberFormat from "react-number-format";
import InfoIcon from "@material-ui/icons/Info";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import ErrorIcon from "@material-ui/icons/Error";
import { maxDate, minDate } from "Constants";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { each } from "highcharts";

export default function AddInputField(props) {
  const [fieldValue, setFieldValue] = React.useState("");

  const onChangeText = (e, max) => {
    setFieldValue(e.target.value);
  };

  const handleDateChange = (e, name, index) => {
    setFieldValue(e);
    props.onBlurDateFieldValue(e, name, index);
  };

  React.useEffect(() => {
    setFieldValue(props.fieldValue);
  }, [props.fieldValue]);

  const {
    fieldError,
    index,
    disabled,
    onBlurFieldValue,
    onBlurDateFieldValue,
    name,
    label,
    max,
    error,
    type,
    showPassword,
    currentIndex,
    handleClickShowPassword,
  } = props;
  return (
    <div className="position-relative width-200-px">
      {type === "text" && (
        <TextField
          id={index}
          label=""
          type="text"
          autoComplete="off"
          name={name}
          disabled={disabled}
          size="small"
          value={fieldValue}
          onBlur={(e) => onBlurFieldValue(e, index)}
          onChange={(e) => onChangeText(e)}
          helperText={fieldError}
          InputLabelProps={{
            shrink: true,
          }}
          InputProps={{
            max: 16,
            min: 0,
            endAdornment: fieldError ? (
              <Tooltip
                title={fieldError}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <InfoIcon className="time-table-info-icon cursor-pointer" />
              </Tooltip>
            ) : (
              ""
            ),
          }}
          error={fieldError && (fieldError ? true : false)}
        />
      )}
      {type === "password" && (
        <TextField
          type={showPassword ? "text" : "password"}
          autoComplete="off"
          value={fieldValue}
          onBlur={(e) => onBlurFieldValue(e, index)}
          onChange={(e) => onChangeText(e)}
          name={name}
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  style={{ padding: "2px", marginRight: "-3px" }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          required={true}
          // helperText={fieldError && fieldError}
          error={fieldError && fieldError}
          inputProps={{ maxLength: 50 }}
        />
      )}
      {type === "date" && (
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <KeyboardDatePicker
            size="small"
            className="width-100-per"
            autoOk
            variant="inline"
            minDate={minDate}
            maxDate={maxDate}
            name={name}
            InputLabelProps={{ shrink: fieldValue ? true : false }}
            format="dd-MM-yyyy"
            value={fieldValue ? fieldValue : null}
            onChange={(e) => handleDateChange(e, name, index)}
            KeyboardButtonProps={{
              "aria-label": "change date",
            }}
            error={fieldError}
          />
        </MuiPickersUtilsProvider>
      )}
      {fieldError && (
        <Tooltip
          title={fieldError}
          enterDelay={400}
          enterNextDelay={400}
          placement="top-start"
          classes={{ tooltip: "tooltip-show-data" }}
        >
          <ErrorIcon className="fee-username-error-icon cursor-pointer " />
        </Tooltip>
      )}
    </div>
  );
}

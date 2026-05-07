import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

import { Paper, TextField, Grid } from "@material-ui/core";
import { validateDate } from "Includes/functions";
import { minDate, maxDate } from "Constants";

class SchoolTimingNameAndDate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fieldError: {},
      shift_details: { name: "", from_date: null, to_date: null },
      isEdit: false,
      date_range: {},
    };
  }

  componentDidMount = () => {
    const { details } = this.props;
    let { shift_details } = this.state;
    shift_details["name"] = details["name"];
    this.setState({ shift_details });
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

  validate = () => {
    const { fieldError, shift_details } = this.state;
    let returnValue = true;
    if (!shift_details["name"]) {
      fieldError["name"] = "This field is mandatory";
      returnValue = false;
    }
    if (!shift_details["from_date"]) {
      fieldError["from_date"] = "This field is mandatory";
      returnValue = false;
    } else {
      let error = validateDate(shift_details["from_date"]);
      if (error !== "") {
        fieldError["from_date"] = error;
        returnValue = false;
      }
    }
    if (!shift_details["to_date"]) {
      fieldError["to_date"] = "This field is mandatory";
      returnValue = false;
    } else {
      let error = validateDate(shift_details["to_date"]);
      if (error !== "") {
        fieldError["to_date"] = error;
        returnValue = false;
      }
    }
    this.setState({ fieldError });
    if (returnValue) {
      returnValue = shift_details;
    }
    return returnValue;
  };

  onChangeDatesYears = (value, name) => {
    const { shift_details } = this.state;
    shift_details[name] = value;
    this.setState({
      shift_details,
    });
  };

  render() {
    const { fieldError, shift_details } = this.state;
    return (
      <Grid container spacing={2}>
        <Grid item lg={12} md={12} xs={12}>
          <TextField
            autoComplete="off"
            id="time"
            label="Plan Name"
            type="text"
            required
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
        <Grid item md={6} xs={12} className="margin-top-30">
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDatePicker
              autoOk
              variant="inline"
              autoComplete="off"
              inputVariant="outlined"
              label={<FormattedMessage {...commonMessages.start_date} />}
              required={true}
              fullWidth
              name="from_date"
              minDate={minDate}
              maxDate={maxDate}
              format="dd-MM-yyyy"
              value={shift_details.from_date}
              onChange={(e) => this.onChangeDatesYears(e, "from_date")}
              KeyboardButtonProps={{
                "aria-label": "change date",
              }}
              helperText={
                !fieldError.from_date
                  ? "Format DD-MM-YYYY"
                  : fieldError.from_date
              }
              error={
                fieldError.from_date && (fieldError.from_date ? true : false)
              }
            />
          </MuiPickersUtilsProvider>
        </Grid>
        <Grid item md={6} xs={12} className="margin-top-30">
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <KeyboardDatePicker
              autoOk
              variant="inline"
              inputVariant="outlined"
              autoComplete="off"
              label={<FormattedMessage {...commonMessages.end_date} />}
              fullWidth
              name="to_date"
              minDate={shift_details.from_date}
              required={true}
              maxDate={maxDate}
              disabled={!shift_details.from_date}
              format="dd-MM-yyyy"
              value={shift_details.to_date}
              onChange={(e) => this.onChangeDatesYears(e, "to_date")}
              KeyboardButtonProps={{
                "aria-label": "change date",
              }}
              helperText={
                !fieldError.to_date ? "Format DD-MM-YYYY" : fieldError.to_date
              }
              error={fieldError.to_date && (fieldError.to_date ? true : false)}
            />
          </MuiPickersUtilsProvider>
        </Grid>
      </Grid>
    );
  }
}

export default SchoolTimingNameAndDate;

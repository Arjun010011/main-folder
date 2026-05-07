import React, { Component } from "react";
import {
  Box,
  Button,
  Paper,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { Link, withRouter } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import classNames from "classnames";
import Swal from "sweetalert2";

import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { postRequest, getRequest } from "Includes/api/apicall";
import { POST_URL, GET_URL } from "Includes/urls";
import { dateFormat, validateDate, getSettingValue } from "Includes/functions";
import { minDate, maxDate } from "Constants";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

const isAcademicBranchMappingEnabled =
  parseInt(getSettingValue("is_academic_branch_mapping"), 10) === 1;

class ManageYear extends Component {
  constructor(props) {
    super(props);

    this.state = {
      manageyear: {
        start_date: null,
        end_date: null,
        alias_name: "",
      },
      finance_enabled: false,
      branch: [],
      branchList: [],
      errors: {},
    };
  }

  componentDidMount() {
    if (isAcademicBranchMappingEnabled) {
      getRequest(GET_URL.branch.api, { is_active: true }, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const list = response.data.data || response.data || [];
            this.setState({
              branchList: Array.isArray(list) ? list : [],
            });
          }
        }
      );
    }
  }

  handleAliasNameChange = (e) => {
    const { manageyear } = this.state;
    this.setState({
      manageyear: { ...manageyear, alias_name: e.target.value },
      errors: { ...this.state.errors, alias_name: "" },
    });
  };

  handleBranchChange = (selectedList) => {
    const branch = (selectedList || []).map((item) => item.id);
    this.setState({
      branch,
      errors: { ...this.state.errors, branch: "" },
    });
  };

  async submitear() {
    const validate_post_data = this.validate();
    if (validate_post_data) {
      this.setState({ submitDisable: true });
      const url = POST_URL.academicyear.api;
      postRequest(url, validate_post_data, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState({ submitDisable: false });
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          let year = "";
          if (response.data.data) {
            year = response.data.data.id;
          }
          let yearInformation = {
            year: year,
          };
          let searchParam =
            "?" + new URLSearchParams(yearInformation).toString();
          this.props.history.push({
            pathname: Actions.counter_format_setup.create.url,
            search: searchParam,
          });
        } else {
          this.setState({ submitDisable: false });
        }
      });
    }
  }

  validate = () => {
    let { manageyear, errors } = this.state;
    errors = {};
    let returnValue = true;
    if (manageyear["start_date"] === null) {
      errors["start_date"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnValue = false;
    } else {
      if (validateDate(manageyear["start_date"], minDate, maxDate)) {
        errors["start_date"] = validateDate(
          manageyear["start_date"],
          minDate,
          maxDate
        );
        returnValue = false;
      }
    }
    if (manageyear["end_date"] === null) {
      errors["end_date"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnValue = false;
    } else {
      if (
        validateDate(manageyear["end_date"], manageyear["start_date"], maxDate)
      ) {
        errors["end_date"] = `Date should start from ${dateFormat(
          manageyear["start_date"],
          "DD-MM-YYYY"
        )}`;
        returnValue = false;
      }
    }
    this.setState({
      errors,
    });
    const branchList = this.state.branch || [];
    if (
      returnValue &&
      isAcademicBranchMappingEnabled &&
      (!Array.isArray(branchList) || branchList.length === 0)
    ) {
      errors["branch"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      returnValue = false;
      this.setState({ errors: { ...errors, branch: errors["branch"] } });
    }
    if (returnValue) {
      let post_data = {
        academicyear: {
          start_date: dateFormat(manageyear.start_date, "YYYY-MM-DD"),
          end_date: dateFormat(manageyear.end_date, "YYYY-MM-DD"),
          alias_name: (manageyear.alias_name || "").trim() || undefined,
          finance_enabled: this.state.finance_enabled,
        },
      };
      if (
        isAcademicBranchMappingEnabled &&
        Array.isArray(branchList) &&
        branchList.length > 0
      ) {
        post_data.academicyear.branch = branchList;
      }
      returnValue = post_data;
    }
    return returnValue;
  };

  onChangeDatesYears = (e, date_name) => {
    let { manageyear } = this.state;
    manageyear[date_name] = e;
    if (date_name === "start_date" && e) {
      if (e.getDate() === "1") {
        e = new Date(e.getFullYear(), e.getMonth(), 0);
      } else {
        e = new Date(e.getFullYear() + 1, e.getMonth(), e.getDate() - 1);
      }
      manageyear["end_date"] = e;
    }
    this.setState({
      manageyear,
      openFromCalender: false,
      openToCalender: false,
      errors: {},
    });
  };

  onBlurValidation = (e, label) => {
    const { errors, manageyear } = this.state;
    let name = e.target.name;
    let value = manageyear[name];
    let error = "";
    if (value === null) {
      error = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
    } else {
      error = validateDate(value, minDate, maxDate);
    }
    if (error !== "") {
      errors[name] = error;
      this.setState({ errors });
    }
  };

  render() {
    let { manageyear, errors } = this.state;
    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">
              <FormattedMessage {...commonMessages.academicYear} />
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button
                variant="contained"
                component={Link}
                to={Actions.academic_year.view.url}
                className="editbutton-view"
              >
                <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                {Actions.academic_year.view.label}
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={6} xs={12}>
            <Paper className="paper-plain-background header-align p-t-20px p-b-20px">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                      autoOk
                      variant="inline"
                      autoComplete="off"
                      inputVariant="outlined"
                      label={
                        <FormattedMessage {...commonMessages.start_date} />
                      }
                      required={true}
                      fullWidth
                      name="start_date"
                      minDate={minDate}
                      maxDate={maxDate}
                      onBlur={(e) => this.onBlurValidation(e, "Start Date")}
                      format="dd-MM-yyyy"
                      value={manageyear.start_date}
                      onChange={(e) => this.onChangeDatesYears(e, "start_date")}
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      helperText={
                        !errors.start_date
                          ? "Format DD-MM-YYYY"
                          : errors.start_date
                      }
                      error={
                        errors.start_date && (errors.start_date ? true : false)
                      }
                    />
                  </MuiPickersUtilsProvider>
                </Grid>
                <Grid item xs={12}>
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                      autoOk
                      variant="inline"
                      inputVariant="outlined"
                      autoComplete="off"
                      label={<FormattedMessage {...commonMessages.end_date} />}
                      fullWidth
                      name="end_date"
                      minDate={minDate}
                      required={true}
                      maxDate={maxDate}
                      onBlur={(e) => this.onBlurValidation(e, "End Date")}
                      format="dd-MM-yyyy"
                      value={manageyear.end_date}
                      onChange={(e) => this.onChangeDatesYears(e, "end_date")}
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      helperText={
                        !errors.end_date ? "Format DD-MM-YYYY" : errors.end_date
                      }
                      error={
                        errors.end_date && (errors.end_date ? true : false)
                      }
                    />
                  </MuiPickersUtilsProvider>
                </Grid>
                {isAcademicBranchMappingEnabled && (
                  <Grid item xs={12}>
                    <MultipleSelectDropdown
                      id="manage-year-branch"
                      label="Branch"
                      data_list={(this.state.branchList || []).map((b) => ({
                        id: b.id,
                        name: b.name || b.branch_name || String(b.id),
                      }))}
                      selected_list={(this.state.branchList || []).filter((b) =>
                        (this.state.branch || []).includes(b.id)
                      ).map((b) => ({
                        id: b.id,
                        name: b.name || b.branch_name || String(b.id),
                      }))}
                      onChange={this.handleBranchChange}
                      error={Boolean(this.state.errors.branch)}
                      helperText={this.state.errors.branch}
                      optionValue="name"
                      customId="id"
                      enableSelectAll
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    label="Academic Year Alias Name"
                    name="alias_name"
                    value={manageyear.alias_name || ""}
                    onChange={this.handleAliasNameChange}
                    error={Boolean(this.state.errors.alias_name)}
                    helperText={this.state.errors.alias_name}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={this.state.finance_enabled}
                        onChange={(e) =>
                          this.setState({
                            finance_enabled: e.target.checked,
                          })
                        }
                        color="primary"
                        name="finance_enabled"
                      />
                    }
                    label="Finance Enabled"
                  />
                </Grid>
              </Grid>
              <Grid item md={12}>
                <Box
                  display="flex"
                  marginLeft="auto"
                  justifyContent="flex-end"
                  className="header-align"
                >
                  <Button
                    variant="contained"
                    onClick={(e) =>
                      this.setState({
                        manageyear: {
                          start_date: null,
                          end_date: null,
                          alias_name: "",
                        },
                        finance_enabled: false,
                        branch: [],
                        errors: {},
                      })
                    }
                  >
                    <FormattedMessage {...commonMessages.reset} />
                  </Button>
                  <Box ml={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={this.state.submitDisable}
                      onClick={(e) => this.submitear(e)}
                    >
                      <FormattedMessage {...commonMessages.submit} />
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    );
  }
}

export default withRouter(ManageYear);

import React, { Component } from "react";
import {
  IconButton,
  Grid,
  InputAdornment,
  Box,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import _ from "lodash";
import axiosAPI from "Includes/api/api";
import Snackbar from "@material-ui/core/Snackbar";

import { postRequest, putRequest } from "Includes/api/apicall";
import { POST_URL, PUT_URL } from "Includes/urls";
import PhoneNumber from "Components/PhoneNumber";
import {
  validateMobileNumber,
  Alert,
  getFullName,
  getKeyValueMap,
} from "Includes/functions";
import {
  emailRegex,
  numberRegex,
  passwordRegex,
} from "Constants/regularExpression";

const sending_email_otp_field_global = [
  {
    label: "Email",
    regex: emailRegex,
    name: "email",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "30",
  },
];

const sending_phone_otp_field_global = [
  {
    label: "Mobile Number",
    regex: null,
    name: "mobile_num",
    md: 12,
    className: "width-100 mt-20",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "phone_number",
    autoFocus: true,
    maxLength: "30",
  },
];

const otp_field = [
  {
    label: "OTP",
    regex: numberRegex,
    name: "otp",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "521675",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "10",
  },
];

const password_global = [
  {
    label: "Password",
    regex: passwordRegex,
    name: "password",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "password",
    autoFocus: true,
    maxLength: "30",
  },
  {
    label: "Confirm Password",
    regex: passwordRegex,
    name: "confirm_password",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "password",
    autoFocus: false,
    maxLength: "30",
  },
];

export default class ForgotPassword extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      fieldDetails: [],
      label: "",
      status: "",
      submitLabel: "",
      cancelLabel: "",
      optionLabel: "",
      fieldValue: {},
      showPassword: {},
      time: 60,
      enableCount: false,
      errorStatus: "error",
      selected_option: "email",
      selected_user: "",
      user_list: [],
    };
    this.setTime = null;
  }

  handleOpen = () => {
    this.setSendingOtpField();
  };

  setSendingOtpField = () => {
    let data = {};
    let {
      submitLabel,
      label,
      enableCount,
      status,
      cancelLabel,
      optionLabel,
      fieldDetails,
      fieldValue,
    } = this.state;
    label = "Enter valid email to send OTP";
    fieldDetails = _.cloneDeep(sending_email_otp_field_global);
    fieldDetails.map((fields) => {
      data[fields.name] = fields.default;
      data[fields.name + "_error"] = "";
    });
    fieldValue = data;
    status = "sendingField";
    submitLabel = "Send OTP";
    cancelLabel = "Close";
    optionLabel = "";
    enableCount = false;
    clearInterval(this.setTime);
    this.setState({
      fieldDetails,
      status,
      label,
      submitLabel,
      cancelLabel,
      fieldValue,
      optionLabel,
      open: true,
      enableCount,
    });
  };
  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.decreaseCount();
    }, 1000);
  };

  decreaseCount = () => {
    let { time, enableCount } = this.state;
    if (time === 0) {
      enableCount = false;
      clearInterval(this.setTime);
    } else {
      time = time - 1;
    }
    this.setState({
      enableCount,
      time,
    });
  };

  submit = (value) => {
    let {
      fieldDetails,
      openSnackbar,
      alertData,
      errorStatus,
      submitLabel,
      enableCount,
      label,
      cancelLabel,
      status,
      optionLabel,
      fieldValue,
      showPassword,
    } = this.state;
    if (value === "sendingField") {
      this.sendEmail();
    } else if (value === "OTP") {
      this.sendOTP();
    } else if (value === "selectUser") {
      this.selectUser();
    } else if (value === "password") {
      this.sendNewPassword();
    }
    this.setState({
      fieldDetails,
      label,
      submitLabel,
      cancelLabel,
      optionLabel,
      fieldValue,
      showPassword,
      status,
      enableCount,
      openSnackbar,
      alertData,
      errorStatus,
    });
  };

  sendNewPassword = async () => {
    let {
      fieldDetails,
      openSnackbar,
      alertData,
      errorStatus,
      submitLabel,
      enableCount,
      label,
      cancelLabel,
      status,
      optionLabel,
      fieldValue,
      showPassword,
      errorContent,
      updateDisable,
    } = this.state;
    let test = this.validation();
    if (test) {
      if (fieldValue["password"] === fieldValue["confirm_password"]) {
        this.setState({ updateDisable: true });
        const url =
          PUT_URL.changepassword.api + `?old_password_not_required=true`;
        let post_data = {
          new_password: fieldValue["password"],
        };
        let props = { ...this.props };
        props["token"] = `token ${fieldValue["token"]}`;
        props["return_error"] = true;
        await putRequest(url, post_data, props).then((response) => {
          if (response && response.status === 200) {
            axiosAPI.defaults.headers = {};
            openSnackbar = true;
            alertData = "Password Changed Successfully";
            errorStatus = "success";
            this.handleClose();
          } else {
            errorContent = "Entered Email is not registered";
            updateDisable = false;
            enableCount = false;
          }
        });
      } else {
        errorContent = "Entered Passwords are not same";
        this.setState({
          errorContent,
        });
      }
    }
    this.setState({
      fieldDetails,
      label,
      submitLabel,
      cancelLabel,
      optionLabel,
      fieldValue,
      showPassword,
      status,
      enableCount,
      openSnackbar,
      alertData,
      errorStatus,
      updateDisable,
    });
  };

  handleClose = (value) => {
    if (value && value === "reEnter") {
      this.setSendingOtpField();
    } else if (value === "OTP") {
      clearInterval(this.setTime);
      this.sendOtpAgain();
    } else {
      this.setState({
        open: false,
        fieldValue: {},
        fieldDetails: [],
        user_list: [],
        time: 60,
        selected_option: "email",
      });
      clearInterval(this.setTime);
    }
  };

  sendOtpAgain = async () => {
    let {
      fieldValue,
      fieldDetails,
      selected_option,
      label,
      openSnackbar,
      alertData,
      errorStatus,
      errorContent,
      updateDisable,
      enableCount,
    } = this.state;
    const url = POST_URL.otpdata.api;
    let props = { ...this.props };
    props["return_error_message"] = true;
    let post_data = {};
    if (selected_option === "email") {
      post_data["email"] = fieldValue["email"];
    } else {
      post_data["mobile_num"] = fieldValue["mobile_num"];
    }
    await postRequest(url, post_data, props).then((response) => {
      if (response && response.status === 200) {
        label = "Enter valid OTP";
        fieldDetails = [...otp_field];
        fieldDetails.map((fields) => {
          fieldValue[fields.name] = "";
          fieldValue[fields.name + "_error"] = "";
        });
        this.setIntervalTime();
        openSnackbar = true;
        alertData = "OTP Sent to entered Email";
        errorStatus = "success";
        errorContent = "";
        updateDisable = false;
      } else {
        errorContent = response;
        updateDisable = false;
        enableCount = false;
      }
    });
    this.setState({
      fieldDetails,
      openSnackbar,
      alertData,
      errorStatus,
      errorContent,
      updateDisable,
      enableCount,
      fieldValue,
    });
  };

  handleClickShowPassword = (name) => {
    let { showPassword } = this.state;
    showPassword[name] = !showPassword[name];
    this.setState({
      showPassword,
    });
  };

  handleSearchChange = (e, field) => {
    let { fieldValue } = this.state;
    let value = e;
    let name = field.name;
    let fieldValues = { ...fieldValue };
    if (field.type === "text" || field.type === "password") {
      value = e.target.value;
      field.default = value;
    }
    fieldValues[name] = value;
    fieldValues[name + "_error"] = "";
    this.setState({
      fieldValue: fieldValues,
      errorContent: "",
    });
  };

  sendEmail = async () => {
    let {
      fieldDetails,
      openSnackbar,
      updateDisable,
      alertData,
      errorStatus,
      submitLabel,
      enableCount,
      label,
      cancelLabel,
      status,
      optionLabel,
      fieldValue,
      showPassword,
      errorContent,
      selected_option,
    } = this.state;
    let test = this.validation();
    if (test) {
      this.setState({ updateDisable: true });
      const url = POST_URL.otpdata.api;
      let props = { ...this.props };
      props["return_error_message"] = true;
      let post_data = {};
      if (selected_option === "email") {
        post_data["email"] = fieldValue["email"];
      } else {
        post_data["mobile_num"] = fieldValue["mobile_num"];
      }
      await postRequest(url, post_data, props).then((response) => {
        if (response && response.status === 200) {
          label = "Enter valid OTP";
          fieldDetails = [...otp_field];
          fieldDetails.map((fields) => {
            fieldValue[fields.name] = "";
            fieldValue[fields.name + "_error"] = "";
          });
          this.setIntervalTime();
          status = "OTP";
          submitLabel = "Submit";
          cancelLabel = "Resend OTP";
          optionLabel = "Re Enter Email/Mobile";
          enableCount = true;
          openSnackbar = true;
          alertData = "OTP Sent to entered Email";
          errorStatus = "success";
          errorContent = "";
          updateDisable = false;
        } else {
          errorContent = response;
          updateDisable = false;
          enableCount = false;
        }
      });
    }
    this.setState({
      fieldDetails,
      label,
      submitLabel,
      cancelLabel,
      optionLabel,
      fieldValue,
      showPassword,
      status,
      enableCount,
      openSnackbar,
      alertData,
      errorStatus,
      errorContent,
      updateDisable,
    });
  };

  sendOTP = async () => {
    let {
      fieldDetails,
      openSnackbar,
      alertData,
      errorStatus,
      submitLabel,
      enableCount,
      label,
      cancelLabel,
      status,
      optionLabel,
      fieldValue,
      showPassword,
      errorContent,
      updateDisable,
      selected_option,
      user_list,
      selected_user,
    } = this.state;
    let test = this.validation();
    if (test) {
      this.setState({ updateDisable: true });
      const url = POST_URL.otpdata.api;
      let props = { ...this.props };
      props["return_error_message"] = true;
      let post_data = {
        otp: fieldValue["otp"],
        is_verify: 1,
      };
      if (selected_option === "email") {
        post_data["email"] = fieldValue["email"];
      } else {
        post_data["mobile_num"] = fieldValue["mobile_num"];
      }
      await postRequest(url, post_data, props).then((response) => {
        if (response && response.status === 200) {
          clearInterval(this.setTime);
          optionLabel = "";
          enableCount = false;
          if (response.data.data["userdetail"].length === 1) {
            fieldValue["token"] = response.data.data["userdetail"][0]["token"];
            let show = {};
            label = "Create new password";
            fieldDetails = [...password_global];
            fieldDetails.map((fields) => {
              fieldValue[fields.name] = "";
              show[fields.name] = false;
              fieldValue[fields.name + "_error"] = "";
            });
            showPassword = show;
            status = "password";
            submitLabel = "Change Password";
            cancelLabel = "Close";
          } else {
            user_list = response.data.data["userdetail"];
            fieldValue["username"] =
              response.data.data["userdetail"][0]["user"]["username"];
            selected_user = user_list[0]["user"]["username"];
            label = "Select user";
            fieldDetails = [];
            status = "selectUser";
            submitLabel = "Select";
            cancelLabel = "Close";
          }
        } else {
          errorContent = response;
          updateDisable = false;
          enableCount = false;
        }
      });
    }
    this.setState({
      fieldDetails,
      label,
      submitLabel,
      cancelLabel,
      optionLabel,
      fieldValue,
      showPassword,
      status,
      enableCount,
      openSnackbar,
      alertData,
      errorStatus,
      errorContent,
      updateDisable,
      user_list,
      selected_user,
    });
  };

  selectUser = async () => {
    let {
      selected_user,
      user_list,
      fieldValue,
      status,
      fieldDetails,
      submitLabel,
      cancelLabel,
      label,
      showPassword,
    } = this.state;
    let index = await user_list.findIndex(
      (data) => data["user"].username === selected_user
    );
    let login_details = user_list[index];
    fieldValue["token"] = login_details["token"];
    let show = {};
    label = "Create new password";
    fieldDetails = [...password_global];
    fieldDetails.map((fields) => {
      fieldValue[fields.name] = "";
      show[fields.name] = false;
      fieldValue[fields.name + "_error"] = "";
    });
    showPassword = show;
    status = "password";
    submitLabel = "Change Password";
    cancelLabel = "Close";
    user_list = [];
    this.setState({
      fieldDetails,
      label,
      submitLabel,
      cancelLabel,
      fieldValue,
      showPassword,
      status,
      user_list,
      selected_user,
    });
  };

  validation = () => {
    const { fieldValue, fieldDetails } = this.state;
    let test = true;
    fieldDetails.forEach((field) => {
      let value = fieldValue[field.name];
      let name = field.name;
      if (field.required && (value === "" || value === null || value === 0)) {
        fieldValue[name + "_error"] = `${field.label} is Mandatory`;
        test = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldValue[name + "_error"] = returnValue.error;
          test = false;
        } else {
          fieldValue[name] = returnValue.value;
          value = returnValue.value;
        }
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldValue[name + "_error"] = field.regex.errorText;
        test = false;
      }
    });
    this.setState({
      fieldDetails,
      fieldValue,
    });
    return test;
  };

  onBlurValidation = (e, field) => {
    const { fieldValue, fieldDetails } = this.state;
    let value = fieldValue[field.name];
    let name = field.name;
    if (field.required && (value === "" || value === null || value === 0)) {
      fieldValue[name + "_error"] = `${field.label} is Mandatory`;
    } else if (field.regex && !field.regex.value.test(value) && value !== "") {
      fieldValue[name + "_error"] = field.regex.errorText;
    }
    this.setState({
      fieldValue,
    });
  };

  handleCloseSnackBar = () => {
    this.setState({
      openSnackbar: false,
    });
  };

  onChangeOption = (e) => {
    let { fieldDetails, label } = this.state;
    let data = {};
    if (e.target.value === "mobile") {
      label = "Enter valid mobile to send OTP";
      fieldDetails = _.cloneDeep(sending_phone_otp_field_global);
      fieldDetails.map((fields) => {
        data[fields.name] = fields.default;
        data[fields.name + "_error"] = "";
      });
    } else {
      label = "Enter valid email to send OTP";
      fieldDetails = _.cloneDeep(sending_email_otp_field_global);
      fieldDetails.map((fields) => {
        data[fields.name] = fields.default;
        data[fields.name + "_error"] = "";
      });
    }
    this.setState({
      fieldDetails,
      selected_option: e.target.value,
      fieldValue: data,
      label,
      errorContent: "",
    });
  };

  onChangeUser = (e) => {
    this.setState({
      selected_user: e.target.value,
    });
  };

  render() {
    const {
      open,
      optionLabel,
      label,
      enableCount,
      alertData,
      openSnackbar,
      showPassword,
      time,
      submitLabel,
      fieldDetails,
      cancelLabel,
      updateDisable,
      errorContent,
      status,
      fieldValue,
      errorStatus,
      selected_option,
      selected_user,
      user_list,
    } = this.state;
    const { baseClassName } = this.props; 
    return (
      <Box className="end-flex-prop">
        <Box className="forgot-password" style={{backgroundColor:this.props?.color}} onClick={this.handleOpen}>
          Forgot Password?
        </Box>
        <Dialog
          open={open}
          className={baseClassName}
          // onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title"></DialogTitle>
          <DialogContent>
            <DialogContentText className="flex-justify-center-flex-prop ">
              {label ? label : `Enter the Details`}
            </DialogContentText>
            {status === "sendingField" && (
              <Box className="text-align-center">
                <label
                  onChange={this.onChangeOption}
                  className="cursor-pointer"
                >
                  <input
                    type="radio"
                    value={"email"}
                    name="first"
                    checked={"email" == selected_option}
                  />{" "}
                  Email
                </label>
                <label
                  onChange={this.onChangeOption}
                  className="cursor-pointer"
                >
                  <input
                    type="radio"
                    value={"mobile"}
                    name="first"
                    checked={"mobile" == selected_option}
                  />{" "}
                  Mobile Number
                </label>
              </Box>
            )}
            {fieldDetails.length > 0 && (
              <Grid container className="flex-justify-center mv-20">
                {fieldDetails &&
                  fieldDetails.map((field) => (
                    <Grid item md={field.md} xs={10} sm={10}>
                      {(field.type === "text" ||
                        field.type === "multiline-text") && (
                        <TextField
                          id={field.id}
                          label={field.label}
                          name={field.name}
                          value={fieldValue[field.name]}
                          className={field.className}
                          autoFocus={field.autoFocus}
                          rows={field.rows}
                          variant="outlined"
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
                          onChange={(e) => this.handleSearchChange(e, field)}
                        />
                      )}
                      {(field.type === "password" ||
                        field.type === "multiline-text") && (
                        <TextField
                          id={field.id}
                          label={field.label}
                          type={showPassword[field.name] ? "text" : "password"}
                          name={field.name}
                          value={fieldValue[field.name]}
                          className={field.className}
                          autoFocus={field.autoFocus}
                          rows={field.rows}
                          variant="outlined"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  edge="end"
                                  aria-label="toggle password visibility"
                                  onClick={() =>
                                    this.handleClickShowPassword(field.name)
                                  }
                                  style={{
                                    padding: "2px",
                                    marginRight: "-3px",
                                  }}
                                >
                                  {showPassword[field.name] ? (
                                    <VisibilityOff />
                                  ) : (
                                    <Visibility />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
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
                          onChange={(e) => this.handleSearchChange(e, field)}
                          onBlur={(e) => this.onBlurValidation(e, field)}
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
                        />
                      )}
                    </Grid>
                  ))}
              </Grid>
            )}
            {user_list.length > 1 && (
              <Box>
                {user_list.map((data) => {
                  return (
                    <Box>
                      <label
                        onChange={this.onChangeUser}
                        className="cursor-pointer"
                      >
                        <input
                          type="radio"
                          value={data["user"]["username"]}
                          name="first"
                          checked={data["user"]["username"] == selected_user}
                        />
                        {data["user"]["staff"]
                          ? getFullName(
                              data["user"]["staff"]["first_name"],
                              data["user"]["staff"]["middle_name"],
                              data["user"]["staff"]["last_name"]
                            )
                          : getFullName(
                              data["user"]["student"]["first_name"],
                              data["user"]["student"]["middle_name"],
                              data["user"]["student"]["last_name"]
                            )}
                      </label>
                    </Box>
                  );
                })}
              </Box>
            )}
            {enableCount && (
              <Box className="flex-justify-center margin-top-10">
                Re-Send OTP in {time} Seconds
              </Box>
            )}
            {errorContent && (
              <Box className="error-content flex-justify-center margin-top-10">
                {errorContent}
              </Box>
            )}
            {!errorContent && <Box className=" margin-top-10"></Box>}
          </DialogContent>
          <DialogActions>
            {optionLabel && (
              <Button
                disabled={enableCount ? true : false}
                onClick={() => this.handleClose("reEnter")}
                color="secondary"
              >
                {optionLabel}
              </Button>
            )}
            <Button
              disabled={enableCount ? true : false}
              onClick={() => this.handleClose(status)}
              color="secondary"
            >
              {cancelLabel}
            </Button>
            <Button
              textTransform="none"
              disabled={updateDisable}
              onClick={() => this.submit(status)}
              color="primary"
            >
              {submitLabel}
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          open={openSnackbar}
          autoHideDuration={2000}
          onClose={(e) => this.handleCloseSnackBar(e)}
        >
          <Alert
            onClose={(e) => this.handleCloseSnackBar(e)}
            severity={errorStatus}
          >
            {alertData}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
}

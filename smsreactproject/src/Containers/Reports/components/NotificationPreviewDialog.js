import React, { Component, forwardRef } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  Typography,
  Dialog,
  Select,
  TextareaAutosize,
  DialogActions,
  Tooltip,
  TextField,
  FormHelperText,
  MenuItem,
  DialogContent,
  FormControl,
  AppBar,
  DialogTitle,
  Toolbar,
  IconButton,
  CircularProgress,
  Slide,
} from "@material-ui/core";
import Swal from "sweetalert2";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import PropTypes from "prop-types";
import { Dropdown } from "Components/DropDown";
import { Close } from "@material-ui/icons";
import { cloneDeep } from "lodash";

import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import ScheduleIcon from "@material-ui/icons/Schedule";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import {
  validateDate,
  getKeyValueMap,
  getPaginationProps,
  getFullName,
  getUrlParam,
} from "Includes/functions";
import {
  maxDate,
  modules,
  formats,
  DEFAULT_PAGINATION_PROPS_ID_LIST,
  support_notification_upload,
  maxFileSize,
  supported_documet_submitted,
  supported_documet_bulk_upload,
} from "Constants";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

import "react-transliterate/dist/index.css";
import { image_formats } from "Containers/Expenses/Constants";
import ReactTranslatorField from "Components/ReactTranslatorField";
// import ShowPreviewTemplate from "./Components/ShowPreviewTemplate";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import NotificationRecieveUsers from "./NotificationRecieveUsers";

// import PreviewUsers from "./Components/PreviewUsers";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});
class NotificationPreviewDialog extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      open: false,
      alertData: "",
      branch_list: [],
      selected_branch: [],
      //fieldError: {},
      tabValue: 0,
      isDialogOpen: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      formDetails: {
        notification_medium: [],
        message: "",
        title: "",
        schedule_date_time: "",
        select_to_all: false,
        schedule_type: "now",
        imagesPreview: [],
        notification_medium_name: "",
      },
      message_format: {
        sms: {
          title: "",
          message: "",
        },
        email: {
          title: "",
          message: "",
        },
        push: {
          title: "",
          message: "",
        },
      },
      theme: "snow",
      enabled: true,
      readOnly: false,
      text: "",
      fieldError: {},
      selected_type: "",
      selected_details: { updated_list: [], selected_student_ids: [] },
      isEditReceiver: false,
      languageList: [],
      modules: modules,
      formats: formats,
      notificationMediumList: [],
      mediumKeyValue: {},
      isSelectTemplate: false,
      submitDisable: false,
      langKeyValueIdCode: {},
      transaction_id: Date.now(),
      isPreviewUsers: false,
      post_data: {},
      user_list: [],
      selected_year: "",
      original_message: "",
      customNotificationList: [],
      customNotification: "",
    };

    this.columns = [
      {
        name: "id", // replacing id index will impact onRowChange functionality also
        label: "id",
        options: {
          filter: false,
          sort: false,
          viewColumns: false,
          display: false,
        },
      },
      {
        name: "name",
        label: "User Name",
      },
      {
        name: "standard",
        label: "Standard",
        options: {
          filter: false,
          sort: false,
          viewColumns: false,
          display: false,
        },
      },
    ];
  }

  getReportId = () => {
    const { location, report_id } = this.props;
    const fromUrl = location?.search && getUrlParam(location.search).reportId;
    return fromUrl || report_id;
  };

  componentDidMount = async () => {
    const params = { is_active: true };
    const reportId = this.getReportId();
    const reportUrl =
      GET_URL.customreportmessagedata.api + reportId + "/";
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const academic_year = user?.other_details?.academic_year?.id;
      this.setState({
        selected_year: academic_year,
      });
      const res = await Promise.all([
        getRequest(GET_URL.language.api, params, this.props),
        getRequest(GET_URL.medium.api, params, this.props),
        getRequest(reportUrl, {}, this.props),
      ]);
      this.getLanguageList(res[0]);
      this.getMediumList(res[1]);
      this.updateMessageData(res[2]);
      this.setState({
        loading: false,
      });
    } catch {
      throw Error("Promise failed");
    }
  };

  updateMessageData = (response) => {
    if (response && response.status === 200) {
      let { message_format } = this.state;
      message_format["sms"]["title"] = response.data.data.sms_title;
      message_format["sms"]["message"] = response.data.data.sms_message;
      message_format["email"]["title"] = response.data.data.email_title;
      message_format["email"]["message"] = response.data.data.email_message;
      message_format["push"]["title"] = response.data.data.push_title;
      message_format["push"]["message"] = response.data.data.push_message;
      this.setState({
        message_format: { ...message_format },
      });
    }
  };

  getCustomNotificationList = (response) => {
    if (response && response.status === 200) {
      let customNotificationList = response.data.data;
      let customKeyValue = getKeyValueMap(customNotificationList, "id", "name");
      this.setState({ customNotificationList, customKeyValue });
    }
  };

  getTemplateDetails = (id) => {
    let { formDetails, selected_details, selected_type } = this.state;
    getRequest(GET_URL.bulknotification.api + id + "/", {}, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let updatedDetails = response.data.data;
          formDetails["message"] = updatedDetails.message_data;
          formDetails["notification_medium"] =
            updatedDetails.notification_medium_name;
          formDetails["schedule_date_time"] = updatedDetails.schedule;
          formDetails["schedule_type"] = updatedDetails?.schedule
            ? "schedule"
            : "now";
          formDetails["title"] = updatedDetails.heading;
          formDetails["language"] = updatedDetails?.language;
          formDetails["id"] = updatedDetails.id;
          if (updatedDetails.group_ids) {
            let temp_data_list = updatedDetails.group_names;
            temp_data_list.map((data) => {
              selected_details["updated_list"].push(data);
            });
            selected_type = "group";
          } else if (updatedDetails.standard_section_ids) {
            let temp_data_list = updatedDetails.standard_section_names;
            let temp_section = [];
            let temp_section_names = [];
            temp_data_list.map((data) => {
              temp_section = [];
              temp_section_names = [];
              data["id"] = data["standard_id"];
              data.section_list.map((sectionData) => {
                sectionData["standard_section"] = sectionData.id;
                temp_section.push(sectionData);
                temp_section_names.push(sectionData.section_name);
              });
              data["sections"] = temp_section;
              data["name"] = `${data.standard_name} [${temp_section_names.join(
                ", "
              )}]`;
              selected_details["updated_list"].push(data);
            });
            selected_type = "section";
          } else if (updatedDetails.user_ids) {
            let temp_data_list = updatedDetails.user_names;
            let is_student = temp_data_list[0]["staff"] ? "staff" : "student";
            temp_data_list.map((data) => {
              data["user_id"] = data["id"];
              data["name"] = data["student"]
                ? getFullName(
                    data["student"]["first_name"],
                    data["student"]["middle_name"],
                    data["student"]["last_name"]
                  )
                : "";
              data["standard_name"] = data["student"]
                ? data.student["enrollment_data"][
                    "standard_section__standard__name"
                  ]
                : "";
              data["section_name"] = data["student"]
                ? data.student["enrollment_data"][
                    "standard_section__section__name"
                  ]
                : "";
              selected_details["updated_list"].push(data);
              selected_details["selected_student_ids"].push(data["id"]);
            });
            selected_type = is_student;
          }
          this.setState({
            formDetails,
            loading: false,
            isEditReceiver: true,
            selected_type,
            selected_details,
          });
        }
      }
    );
  };

  getLanguageList = (response) => {
    let languageList = response.data.data;
    let langKeyValue = getKeyValueMap(languageList, "code", "id");
    let langKeyValueIdCode = getKeyValueMap(languageList, "id", "code");
    this.setState({ languageList, langKeyValue, langKeyValueIdCode });
  };

  getMediumList = (response) => {
    let notificationMediumList = response.data.data;
    let mediumKeyValue = getKeyValueMap(notificationMediumList, "id", "name");
    this.setState({ notificationMediumList, mediumKeyValue });
  };

  handleSubmit = () => {
    let validate = this.validateFields();
    if (validate) {
      this.setState({ submitDisable: true, post_data: validate }, () => {
        const url = POST_URL.generatecustomreport.api;
        const extra_params = { notification: 1 };
        postRequest(url, validate, this.props, extra_params).then(
          (response) => {
            if (response && response.status === 200) {
              Swal.fire({
                position: "top-end",
                type: "success",
                title: response.data.Reason,
                showConfirmButton: false,
                timer: 1500,
              });
            }
            this.setState({ submitDisable: false });
            this.props.handleClose();
          }
        );
      });
    }
  };

  handlePreviewChange = () => {
    this.setState({
      isPreviewUsers: !this.state.isPreviewUsers,
    });
  };

  validateFields = () => {
    let { formDetails, fieldError, transaction_id, langKeyValue } = this.state;
    fieldError = {};
    let return_test = true;
    if (!formDetails.title) {
      fieldError["title"] = "This field is mandatory";
    }
    if (!formDetails.message) {
      fieldError["message"] = "This field is mandatory";
    }
    if (
      !formDetails.notification_medium ||
      formDetails.notification_medium.length === 0
    ) {
      fieldError["notification_medium"] = "This field is mandatory";
    }
    if (Object.keys(fieldError).length > 0) {
      return_test = false;
    }
    this.setState({
      fieldError,
    });
    if (return_test) {
      let post_data = {
        report_id: Number(this.props.report_id),
        return_users_only: false,
        message_data: formDetails.message,
        selected_template: formDetails.selected_template,
        heading: formDetails.title,
        medium: formDetails.notification_medium,
        language: langKeyValue[formDetails.language],
        schedule: "",
        transaction_id: transaction_id,
        send_user_ids_as_per_backend: true,
        user_ids: [],
      };
      return_test = post_data;
    }
    return return_test;
  };

  getMediumIds = (type = "notification_medium", name = "name") => {
    const { formDetails } = this.state;
    let return_value = [];
    formDetails[type].map((data) => {
      return_value.push(data[name]);
    });
    return return_value.join(",");
  };

  handleClose = () => {
    this.setState({
      openSnackBar: false,
    });
    this.props.handleClose();
  };

  handleStateViewButton = () => {
    this.props.history.push(Actions.bulk_notification.view.url);
  };

  handleChangeTab = (e, value) => {
    this.setState({
      tabValue: value,
    });
  };

  onChangeMedium = (name) => {
    let { formDetails } = this.state;
    formDetails[name] = !formDetails[name];
    this.setState({
      formDetails,
    });
  };

  onChangeMessage = (e) => {
    let { formDetails } = this.state;
    formDetails.message = e.target.value;
    this.setState({
      formDetails,
    });
  };

  handleDialogChange = () => {
    this.setState({
      isDialogOpen: !this.state.isDialogOpen,
    });
  };

  onEditorChange = (content) => {
    let { formDetails } = this.state;
    formDetails["message"] = content;
    this.setState({
      formDetails,
    });
  };

  onChangeLang = (value, name) => {
    let { formDetails } = this.state;
    formDetails["language"] = value;
    formDetails["language_name"] = name;
    this.setState({
      formDetails,
    });
  };

  setText = (value) => {
    const { formDetails } = this.state;
    if (!this.checkMedium("sms")) {
      const quill = this.quillRef.getEditor();
      let index = 0;
      if (quill?.selection?.savedRange?.index) {
        index = quill.selection.savedRange.index;
      }
      quill.insertText(index, value);
    } else {
      formDetails["message"] = formDetails["message"] + value;
    }
    this.setState({
      formDetails,
    });
  };

  onChangeMultipleSelect = (value, name) => {
    let { formDetails, fieldError } = this.state;
    if (
      formDetails["message"] !== "" &&
      name === "notification_medium" &&
      value === "sms"
    ) {
      Swal.fire({
        title: "Are you sure?",
        text: "You want to change the notification medium, the entered message will be erased!",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Agree",
      }).then(async (result) => {
        if (result.value) {
          formDetails["message"] = "";
          formDetails[name] = value;
          formDetails["notification_medium_name"] = formDetails[name];
          delete fieldError[name];
          this.setState({
            formDetails,
            fieldError,
          });
        } else {
          return true;
        }
      });
    } else {
      formDetails[name] = value;
      if (name === "notification_medium") {
        formDetails["notification_medium_name"] = formDetails[name];
      }
      delete fieldError[name];
      this.setState({
        formDetails,
        fieldError,
      });
    }
  };

  handleChange = (e) => {
    let { formDetails, fieldError, message_format } = this.state;
    let { name, value } = e.target;
    formDetails[name] = value;
    delete fieldError[name];
    this.setState(
      {
        formDetails,
        fieldError,
      },
      () => {
        if (name === "notification_medium") {
          formDetails["title"] = message_format?.[value]?.["title"];
          formDetails["message"] = message_format?.[value]?.["message"];
          this.setState({
            formDetails: { ...formDetails },
          });
        }
      }
    );
  };

  updateNotificationMedium = () => {
    let { notificationMediumList, customNotificationList, formDetails } =
      this.state;
    let temp_list = cloneDeep(notificationMediumList);
    customNotificationList.map((data) => {
      if (data["id"] === formDetails["customNotification"]) {
        temp_list.map((medium) => {
          if (!data.supported_mediums.includes(medium.name)) {
            medium.hide = true;
          }
        });
      }
    });
    this.setState({
      notificationMediumList: cloneDeep(temp_list),
    });
  };

  getCustomNotificationTemplate = () => {
    let { formDetails, customNotificationList, original_message } = this.state;
    let selected_template = {};
    customNotificationList.map((data) => {
      if (data["id"] === formDetails["customNotification"]) {
        selected_template = data;
      }
    });
    let temp_details = { ...formDetails };
    if (formDetails.notification_medium === "email") {
      if (selected_template.email_title) {
        temp_details["title"] = selected_template.email_title;
      }
      temp_details["message"] = selected_template.email_message;
      original_message = selected_template.email_message;
    } else if (formDetails.notification_medium === "push") {
      if (selected_template.push_title) {
        temp_details["title"] = selected_template.push_title;
      }
      temp_details["message"] = selected_template.push_message;
      original_message = selected_template.push_message;
    } else if (formDetails.notification_medium === "sms") {
      if (selected_template.sms_title) {
        temp_details["title"] = selected_template.sms_title;
      }
      temp_details["message"] = selected_template.sms_message;
      original_message = selected_template.sms_message;
    }

    this.setState({
      formDetails: { ...temp_details },
      original_message,
    });
  };

  handleChangeSchedule = (name) => {
    let { formDetails } = this.state;
    formDetails[name] = !formDetails[name];
    this.setState({
      formDetails,
    });
  };

  updateParent = (selected_details, selected_type) => {
    this.setState({
      selected_details,
      selected_type,
      isDialogOpen: false,
      isEditReceiver: selected_details["updated_list"].length > 0,
    });
  };

  onBlurValidation = (e) => {
    let { formDetails, fieldError } = this.state;
    const today_date = new Date(new Date().getTime() + 5 * 60000);
    const error = validateDate(
      formDetails["schedule_date_time"],
      today_date,
      false,
      "time"
    );
    if (error !== "") {
      fieldError["schedule_date_time"] = error;
      this.setState({
        fieldError,
      });
    }
  };

  handleSearchChange = (e) => {
    const value = e;
    let { formDetails, fieldError } = this.state;
    formDetails["schedule_date_time"] = e;
    delete fieldError["schedule_date_time"];
    this.setState({
      formDetails,
      fieldError,
    });
  };

  handleTemplateChange = () => {
    this.setState({
      isSelectTemplate: !this.state.isSelectTemplate,
    });
  };

  handleSelectTemplate = (selected_template) => {
    let { formDetails, langKeyValueIdCode, original_message } = this.state;
    let temp_details = { ...formDetails };
    temp_details["title"] = selected_template.name;
    temp_details["notification_medium"] =
      selected_template.notification_medium_name;
    temp_details["notification_medium_name"] =
      selected_template.notification_medium_name;
    temp_details["language"] = langKeyValueIdCode[selected_template.language];
    temp_details["language_name"] = selected_template.language_name;
    temp_details["message"] = selected_template.data;
    original_message = selected_template.data;
    temp_details["selected_template"] = selected_template.id;
    this.setState({
      formDetails: { ...temp_details },
      original_message,
    });
    this.handleTemplateChange();
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  deleteUploadedImage = (index) => {
    let { formDetails } = this.state;
    formDetails.imagesPreview.splice(index, 1);
    this.setState({
      formDetails,
    });
  };

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  checkMedium = (medium) => {
    // let return_value = false;
    const { formDetails } = this.state;
    // formDetails.notification_medium.forEach((data) => {
    //   if (data["name"] === medium) {
    //     return_value = true;
    //   }
    // });
    if (formDetails.notification_medium === medium) {
      return true;
    }
  };

  render() {
    const {
      loading,
      openSnackBar,
      isDialogOpen,
      alertData,
      formDetails,
      modules,
      formats,
      user_list,
      selected_type,
      fieldError,
      selected_details,
      isEditReceiver,
      notificationMediumList,
      languageList,
      isSelectTemplate,
      submitDisable,
      isPreviewUsers,
      pagination,
      selected_year,
      original_message,
      largeImagePreview,
      customNotification,
      customNotificationList,
    } = this.state;
    let columns_list = [...this.columns];
    columns_list[2]["options"]["display"] =
      selected_type === "student" || selected_type === "section" ? true : false;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10],
      selectToolbarPlacement: "none",
      rowsPerPage: 10,
    };
    return (
      <Dialog fullScreen open={true} TransitionComponent={Transition}>
        {/* <DialogTitle id="customized-dialog-title" onClose={this.handleClose}> */}
        {/* <div className="d-flex align-items-center"></div> */}
        {/* </DialogTitle> */}
        <AppBar className={"app-bar"}>
          <Toolbar className="app-bar-color">
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => this.handleClose("clearAll")}
              aria-label="close"
            >
              <Close />
            </IconButton>
            <Typography variant="h6" className="diary-title">
              Send Notification
            </Typography>
          </Toolbar>
        </AppBar>
        {loading ? (
          <div className="loading-wish-birthday">
            <CircularProgress />
          </div>
        ) : (
          <Paper className={classNames("paper-background")}>
            {largeImagePreview && (
              <Box className="set-question-large-image-preview-box">
                <img
                  src={largeImagePreview}
                  alt="Image Preview"
                  className="set-question-large-image-preview"
                />
                <Tooltip title="Close Image" placement="top-start">
                  <Box
                    className="set-question-large-image-remove-icon-box"
                    onClick={this.handleCloseLargeImage}
                  >
                    <HighlightOffIcon className="set-question-large-image-remove-icon" />
                  </Box>
                </Tooltip>
              </Box>
            )}
            <Paper className="mt-100 height-75vh p-20">
              <Grid container spacing={3} className="mt-20">
                <Grid item md={6} xs={12}>
                  <Grid container spacing={3}>
                    <Grid item md={6} xs={12}>
                      <TextField
                        variant="outlined"
                        label="Title"
                        value={formDetails.title}
                        onChange={this.handleChange}
                        name={"title"}
                        className="w-100"
                        helperText={fieldError["title"] && fieldError["title"]}
                        error={fieldError["title"] && fieldError["title"]}
                      />
                    </Grid>
                    <Grid item md={6} xs={12}>
                      {/* <MultipleSelectDropdown
                      data_list={notificationMediumList}
                      selected_list={formDetails.notification_medium}
                      label={"Notification Medium"}
                      onChange={(e) =>
                        this.onChangeMultipleSelect(e, "notification_medium")
                      }
                      // size="small"
                      className="width-350px bg-white"
                    /> */}
                      <Dropdown
                        data={notificationMediumList}
                        name="notification_medium"
                        value={formDetails.notification_medium}
                        onChange={this.handleChange}
                        label="Notification Medium"
                        customId="name"
                        hideSelect={true}
                        error={fieldError["notification_medium"]}
                      />
                    </Grid>
                    <Grid item md={12} xs={12}>
                      <div>
                        <div className="display-flex align-items-center">
                          <Grid container spacing={3}>
                            <Grid item md={3} xs={12}>
                              <div className="fs-18 text-blue">Message</div>
                            </Grid>
                          </Grid>
                        </div>
                        {!formDetails.customNotification && (
                          <div className="mt-10">
                            <ReactTranslatorField
                              onChange={this.setText}
                              onChangeLang={this.onChangeLang}
                              languageList={languageList}
                            />
                          </div>
                        )}
                        <div className="mt-10">
                          <FormControl
                            fullWidth
                            error={
                              fieldError.message &&
                              (fieldError.message ? true : false)
                            }
                          >
                            {this.checkMedium("sms") ? (
                              <TextareaAutosize
                                aria-label="minimum height"
                                className="text-area-notification "
                                value={formDetails.message}
                                maxLength={"10000"}
                                name={"message"}
                                onChange={this.handleChange}
                                disable={
                                  formDetails.customNotification ? true : false
                                }
                              />
                            ) : (
                              <ReactQuill
                                ref={(el) => (this.quillRef = el)}
                                theme={this.state.theme}
                                value={formDetails.message}
                                defaultValue={formDetails.message}
                                onChange={this.onEditorChange}
                                modules={modules}
                                formats={formats}
                                className={"react-quill-min-height"}
                                readOnly={
                                  formDetails.customNotification ? true : false
                                }
                              />
                            )}
                            {fieldError.message && (
                              <FormHelperText>
                                {fieldError.message}
                              </FormHelperText>
                            )}
                          </FormControl>
                        </div>
                        {/* <Chip onClick={() => this.addTag('student_name')} label="Student Name" />
                                    <Chip onClick={() => this.addTag('father_name')} label="Father Name" /> */}
                      </div>
                    </Grid>
                  </Grid>
                </Grid>
                {/* <Grid item md={6} xs={12}>
                  <NotificationRecieveUsers report_id={this.props.report_id} />
                </Grid> */}
              </Grid>
              <Box className="submt-button-float-bottom">
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  disabled={submitDisable}
                  onClick={this.handleSubmit}
                >
                  {submitDisable && (
                    <CircularProgress className="white-text height-width-20px mr-5" />
                  )}
                  Submit
                </Button>
              </Box>
            </Paper>
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={openSnackBar}
              autoHideDuration={2000}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>
          </Paper>
        )}
      </Dialog>
    );
  }
}
export default withRouter(NotificationPreviewDialog);

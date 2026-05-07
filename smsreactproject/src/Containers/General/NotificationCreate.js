import React, { Component } from "react";
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
  Toolbar,
  IconButton,
  CircularProgress,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import CloseIcon from "@material-ui/icons/Close";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import PropTypes from "prop-types";
import DateFnsUtils from "@date-io/date-fns";
import { Dropdown } from "Components/DropDown";
import { PersonOutlined } from "@material-ui/icons";
import AllMUIDataTable from "Components/AllMUIDataTable";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { cloneDeep } from "lodash";

import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import ScheduleIcon from "@material-ui/icons/Schedule";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  validateDate,
  getKeyValueMap,
  dateFormat,
  getPaginationProps,
  getFullName,
} from "Includes/functions";
import NoticeBoard from "./Components/NoticeBoard";
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
import { ReactMic } from "react-mic";


import "react-transliterate/dist/index.css";
import { image_formats } from "Containers/Expenses/Constants";
import ReactTranslatorField from "Components/ReactTranslatorField";
import ShowPreviewTemplate from "./Components/ShowPreviewTemplate";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import PreviewUsers from "./Components/PreviewUsers";

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

class NotificationCreate extends Component {
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
      theme: "snow",
      enabled: true,
      readOnly: false,
      text: "",
      fieldError: {},
      selected_type: "",
      selected_details: { updated_list: [], selected_student_ids: [] },
      transport_route_plan_ids: [],
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
      is_custom_notification:false,
      last_activity_less_than_week:false,
      isRecording: false,
      showRecorder: false,
      recordedBlob: null,
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

  componentDidMount = async () => {
    let params = { is_active: true };
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const academic_year = user?.other_details?.academic_year?.id;
      this.setState({
        selected_year: academic_year,
      });
      const res = await Promise.all([
        getRequest(GET_URL.language.api, params, this.props),
        getRequest(GET_URL.medium.api, params, this.props),
        getRequest(GET_URL.getcustombulknotification.api, params, this.props),
      ]);
      this.getLanguageList(res[0]);
      this.getMediumList(res[1]);
      this.getCustomNotificationList(res[2]);
      if (
        this.props.location.pathname === Actions.bulk_notification.update.url
      ) {
        if (this.props.location.state && this.props.location.state.detail) {
          let id = this.props.location.state.detail;
          this.getTemplateDetails(id);
        } else {
          this.props.history.push(Actions.bulk_notification.view.url);
        }
      } else {
        this.setState({
          loading: false,
        });
      }
    } catch {
      throw Error("Promise failed");
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
                "standard_section_section_name"
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

  handleSubmit = (propLabel) => {
    let isApproved = propLabel === "isApproved" ? true : false;
    let validate = this.validateFields(isApproved);
    if (validate) {
      this.setState({ submitDisable: true, post_data: validate }, () => {
        if (isApproved) {
          this.postApiCall(validate);
        } else {
          this.postApiPaginationCall("first_time");
        }
      });
    }
  };

  postApiCall = (validate) => {
    let url = POST_URL.bulknotification.api;
    postRequest(url, validate, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.bulk_notification.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };

  postApiPaginationCall = (paginationProps) => {
    let { pagination, post_data } = this.state;
    this.setState({ tableUpdating: true });
    let currentPagination = pagination;
    if (paginationProps !== "first_time") {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      pagination: true,
    };
    let url = POST_URL.bulknotification.api;
    postRequest(url, post_data, this.props, params).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "first_time") {
          this.handlePreviewChange();
        }
        response.data.data.data_list.map((data) => {
          data["name"] = data["staff"]
            ? data["staff"]?.full_name
            : data["student"] &&
            getFullName(
              data["student"]["first_name"],
              data["student"]["middle_name"],
              data["student"]["last_name"]
            );
          data["standard"] = data["student"]
            ? `${data["student"]["enrollment_data"]?.standard_section__standard__name} [${data["student"]["enrollment_data"]?.standard_section__section__name}]`
            : "";
        });
        this.setState({
          pagination: { ...currentPagination },
          user_list: response.data.data,
        });
      }
      this.setState({ submitDisable: false });
    });
  };

  handlePreviewChange = () => {
    this.setState({
      isPreviewUsers: !this.state.isPreviewUsers,
    });
  };

  validateFields = (isApproved) => {
    let {
      formDetails,
      fieldError,
      selected_type,
      selected_details,
      transaction_id,
      langKeyValue,
      selected_year,
      last_activity_less_than_week,
    } = this.state;
    fieldError = {};
    let return_test = true;
    if (
      (!formDetails.title || formDetails.title.trim() === "")
    ){
      fieldError["title"] = "This field is mandatory";
    }
    if (
      formDetails.notification_medium !== "ivr" &&
      (!formDetails.message || formDetails.message.trim() === "")
    ) {
      fieldError["message"] = "This field is mandatory";
    }
    if (
      !formDetails.notification_medium ||
      formDetails.notification_medium.length === 0
    ) {
      fieldError["notification_medium"] = "This field is mandatory";
    }
    if (formDetails.notification_medium === "ivr") {
      if (
        !formDetails.imagesPreview ||
        formDetails.imagesPreview.length === 0
      ) {
        fieldError["imagesPreview"] = "You must upload one audio file for IVR";
      }
    }
    // if (formDetails.notification_medium === 'sms') {
    //     let tempMessage = original_message.split(' ')
    //     let message1 = []
    //     let message2 = formDetails.message.split(' ')
    //     let message3 = []
    //     for (var i = 0; i < tempMessage.length; i++) {
    //         if (tempMessage[i].trim() && tempMessage[i] !== '{#var#}') {
    //             message1.push(tempMessage[i].trim())
    //         }
    //     }
    //     if (message2.includes('{#var#}')) {
    //         this.setState({
    //             fieldError,
    //             openSnackBar: true,
    //             alertData: 'Please replace {#var#}'
    //         })
    //         return false
    //     }
    //     else {
    //         let wordFound = false
    //         let tempLength = 0
    //         for (var i = 0; i < message1.length; i++) {
    //             wordFound = false
    //             for (var j = 0; j < message2.length; j++) {
    //                 if (message1[i] === message2[j] && !wordFound) {
    //                     tempLength = 0
    //                     wordFound = true
    //                     message3.push(message1[i])
    //                 }
    //                 else if (wordFound && !message1.includes(message2[j])) {
    //                     tempLength += message2[j].length
    //                 }
    //                 else if (wordFound && message1.includes(message2[j])) {
    //                     break;
    //                 }
    //             }
    //         }
    //         if (message3.length !== message1.length) {
    //             alert('Invalid Message , Please correct as per template')
    //         }
    //     }
    // }
    if (Object.keys(fieldError).length > 0) {
      return_test = false;
    }
    this.setState({
      fieldError,
    });
    if (return_test) {
      let documentsData = [];

      if (formDetails?.imagesPreview && !this.checkMedium("sms")) {
        formDetails.imagesPreview.map((data) => {
          documentsData.push({
            document: data.uploadedId,
            title: data.imageName,
          });
        });
      }
      let post_data = {
        id: formDetails["id"],
        message_data: formDetails.message,
        selected_template: formDetails.selected_template,
        heading: formDetails.title,
        schedule: formDetails.schedule_date_time
          ? dateFormat(formDetails.schedule_date_time, "YYYY-MM-DD HH:mm:ss")
          : "",
        // medium: this.getMediumIds(),
        medium: formDetails.notification_medium,
        language: langKeyValue[formDetails.language],
        standard_ids: [],
        standard_section_ids: [],
        user_ids: [],
        group_ids: [],
        transport_route_plan_ids: [],
        transaction_id,
        return_users_only: isApproved ? false : true,
        academic_year: selected_year,
        documents: documentsData,
      };
      if (formDetails.customNotification) {
        post_data["custom_bulk_notification"] = formDetails.customNotification;
      }
      if (selected_type === "group") {
        let selected_ids = [];
        selected_details["updated_list"].forEach((data) => {
          selected_ids.push(data["id"]);
        });
        post_data["group_ids"] = selected_ids;
      } else if (selected_type === "section") {
        let selected_ids = [];
        selected_details["updated_list"].forEach((data) => {
          data["sections"].map((sec) => {
            selected_ids.push(sec.standard_section);
          });
        });
        post_data["standard_section_ids"] = selected_ids;
      } else if (selected_type === "student") {
        post_data["user_ids"] = selected_details["selected_student_ids"];
      } else if (selected_type === "staff") {
        let selected_ids = [];
        selected_details["updated_list"].forEach((data) => {
          selected_ids.push(data["user_id"]);
        });
        post_data["user_ids"] = selected_ids;
      } else if (selected_type === "transport") {
        let selected_ids = [];
        selected_details["updated_list"].forEach((data) => {
          selected_ids.push(data["id"]);
        });
        post_data["transport_route_plan_ids"] = selected_ids;
      }
      if (last_activity_less_than_week){
        post_data['last_activity_less_than_week'] = last_activity_less_than_week;
      }
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

  handleinactiveusers = () => {
    this.setState({
      last_activity_less_than_week :true
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
    let { formDetails, fieldError } = this.state;
    let { name, value } = e.target;
    formDetails[name] = value;
    delete fieldError[name];
    this.setState(
      {
        formDetails,
        fieldError,
      },
      () => {
        if (name === "customNotification") {
          this.updateNotificationMedium();
        } else if (
          name === "notification_medium" &&
          formDetails["customNotification"]
        ) {
          this.getCustomNotificationTemplate();
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
    let { formDetails, customNotificationList, original_message, is_custom_notification } = this.state;
    let selected_template = {};
    customNotificationList.map((data) => {
      if (data["id"] === formDetails["customNotification"]) {
        is_custom_notification=true;
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
    }else if (formDetails.notification_medium === "whatsapp") {
      if (selected_template.whatsapp_title) {
        temp_details["title"] = selected_template.whatsapp_title;
      }
      temp_details["message"] = selected_template.whatsapp_message;
      original_message = selected_template.whatsapp_message;
    }

    this.setState({
      formDetails: { ...temp_details },
      original_message,
      is_custom_notification,
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

  handleImageChange = (event) => {
    let { formDetails, image_name_list } = this.state;
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_image_type = true;
    if (this.state.formDetails.notification_medium === "ivr") {
      const allowedAudioTypes = ["mp3", "wav", "m4a", "ogg"];
      is_supported_image_type = allowedAudioTypes.includes(file_extension.toLowerCase());
    } else {
      is_supported_image_type = supported_documet_bulk_upload.type.includes(
        file_extension.toLowerCase()
      );
    }
    if (event.target.files[0] && is_supported_image_type) {
      if (event.target.files[0].size < maxFileSize["video"].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        let request = postRequest;
        let url = POST_URL.uploads.api;
        formDetails["imageUploading"] = true;
        this.setState({ formDetails });
        request(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            let uploadedId = response.data.data.id;
            let imagePreview = response.data.data.file;
            let imageName = fileName;
            formDetails.imagesPreview = {
              file_extension: file_extension,
              uploadedId: uploadedId,
              url: imagePreview,
              imageName: imageName,
            };
            this.setState({
              formDetails,
            });
          }
          formDetails["imageUploading"] = false;
          this.setState({
            formDetails,
          });
        });
      } else {
        this.setState({
          openSnackBar: true,
          alertData: maxFileSize.errorText,
        });
      }
    } else if (!is_supported_image_type) {
      this.setState({
        alertData: support_notification_upload.error,
        openSnackBar: true,
      });
    }
  };

  handleMultipleImageChange = (event) => {
    let { formDetails, image_name_list } = this.state;
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_image_type = true;
    is_supported_image_type = supported_documet_bulk_upload.type.includes(
      file_extension.toLowerCase()
    );
    // if (image_name_list.includes(fileName)) {
    //   this.setState({
    //     openSnackbar: true,
    //     alertData: "Image is already exist",
    //   });
    //   return;
    // }
    if (this.state.formDetails.notification_medium === "ivr") {
      const allowedAudioTypes = ["mp3", "wav", "m4a", "ogg"];
      if (!event.target.files || !event.target.files[0]) return;
      const fileName = event.target.files[0].name;
      const file_extension = fileName
        .slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)
        .toLowerCase();
    
      if (!allowedAudioTypes.includes(file_extension)) {
        this.setState({
          openSnackbar: true,
          alertData: "Only audio files (mp3, wav, m4a, ogg) are allowed for IVR.",
        });
        return;
      }
    
      // restrict to only one audio
      if (this.state.formDetails.imagesPreview.length > 0) {
        this.setState({
          openSnackbar: true,
          alertData: "Only one audio file can be uploaded for IVR.",
        });
        return;
      }
    }
    if (event.target.files[0] && is_supported_image_type) {
      if (event.target.files[0].size < maxFileSize["video"].size) {
        let post = new FormData();
        const newFileName = `img_${Date.now()}.${file_extension}`;

        // Create a new File object with renamed file
        const renamedFile = new File([event.target.files[0]], newFileName, {
          type: event.target.files[0].type
        });
        post.append("file", renamedFile);
        let request = postRequest;
        let url = POST_URL.uploads.api;
        formDetails["imageUploading"] = true;
        this.setState({ formDetails });
        request(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            let uploadedId = response.data.data.id;
            let imagePreview = response.data.data.file;
            let imageName = newFileName;
            // image_name_list.push(imageName);
            let temp = {
              file_extension: file_extension,
              uploadedId: uploadedId,
              url: imagePreview,
              imageName: imageName,
            };
            formDetails.imagesPreview.push(temp);
            this.setState({
              formDetails,
            });
          }
          formDetails["imageUploading"] = false;
          this.setState({
            formDetails,
          });
        });
      } else {
        this.setState({
          openSnackbar: true,
          alertData: maxFileSize.errorText,
        });
      }
    } else if (!is_supported_image_type) {
      this.setState({
        alertData: supported_documet_bulk_upload.error,
        openSnackbar: true,
      });
    }
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

  startRecording = () => {
    this.setState({ isRecording: true });
  };
  
  stopRecording = () => {
    this.setState({ isRecording: false });
  };
  
  onStopRecording = (recordedBlob) => {
    const newFileName = `ivr_${Date.now()}.wav`;
    const file = new File([recordedBlob.blob], newFileName, { type: "audio/wav" });
  
    this.handleMultipleImageChange({ target: { files: [file] } });
  
    this.setState({ showRecorder: false });
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
      is_custom_notification,
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

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
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
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Bulk Notification Create</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("bulk_notification", "view") && (
                  <Button
                    variant="contained"
                    onClick={this.handleStateViewButton}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.bulk_notification.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Paper className="mt-20 height-75vh p-20">
            <div className="d-flex">
              {customNotificationList.length > 0 && (
                <div className="mr-20 width-350px">
                  <Dropdown
                    data={customNotificationList}
                    name="customNotification"
                    value={formDetails["customNotification"]}
                    onChange={this.handleChange}
                    label="Custom Notification"
                    customName="label"
                    error={fieldError["customNotification"]}
                    width="width-100"
                    size="small"
                  />
                </div>
              )}
              <div>
                <Button
                  className={"custom-button"}
                  onClick={() => this.handleTemplateChange()}
                >
                  Select Template
                </Button>
              </div>
            </div>
            <Grid container spacing={2} className="mt-20">
              <Grid item md={8} xs={12}>
                <Grid container spacing={4}>
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
                          {formDetails.notification_medium === "ivr" ? (
                            <>
                              <TextField
                                label="Description"
                                name="message"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={3}
                                value={formDetails.message}
                                onChange={this.handleChange}
                                helperText="Enter short description about this IVR message"
                              />
                            </>
                          ) : this.checkMedium("sms") ? (
                            <TextareaAutosize
                              aria-label="minimum height"
                              className="text-area-notification "
                              value={formDetails.message}
                              maxLength={"10000"}
                              name={"message"}
                              onChange={this.handleChange}
                              disable={formDetails.customNotification ? true : false}
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
              <Grid item md={4} xs={12}>
                <FormControl>
                  <Select
                    name="schedule_type"
                    className="apply-leave-drop-down-Style"
                    value={formDetails.schedule_type}
                    required={true}
                    onChange={(e) => this.handleChange(e)}
                  >
                    <MenuItem value={"now"}>Now </MenuItem>
                    {/* <MenuItem value={'schedule'}>Schedule </MenuItem> */}
                  </Select>
                </FormControl>

                <ScheduleIcon />
                {formDetails["schedule_type"] === "schedule" && (
                  <div className="mt-20">
                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                      <KeyboardDateTimePicker
                        autoComplete="off"
                        className={"w-200"}
                        ampm={true}
                        variant="dialog"
                        inputVariant="outlined"
                        label={"Schedule date and time"}
                        name={"schedule_date_time"}
                        format="dd-MM-yyyy hh:mm a"
                        minDate={new Date(new Date().getTime() + 5 * 60000)}
                        maxDate={maxDate}
                        onBlur={(e) => this.onBlurValidation(e)}
                        InputLabelProps={{
                          shrink: formDetails.schedule_date_time ? true : false,
                        }}
                        value={formDetails.schedule_date_time}
                        onChange={(e) => this.handleSearchChange(e)}
                        onClose={(e) => this.onBlurValidation(e)}
                        KeyboardButtonProps={{
                          "aria-label": "change date",
                        }}
                        inputProps={{ maxLength: 50 }}
                        helperText={
                          fieldError["schedule_date_time"] &&
                          fieldError["schedule_date_time"]
                        }
                        error={
                          fieldError["schedule_date_time"] &&
                          fieldError["schedule_date_time"]
                        }
                      />
                    </MuiPickersUtilsProvider>
                  </div>
                )}
                {is_custom_notification &&
                <div className="mt-10">
                <Button
                  className={"custom-button"}
                  onClick={() => this.handleinactiveusers()}
                >
                  IN ACTIVE STUDENTS SINCE 1 WEEK
                </Button>
              </div>
                }
                <div className="mt-20">
                  <Button
                    className={"custom-button"}
                    onClick={() => this.handleDialogChange()}
                  >
                    {selected_details["updated_list"].length > 0 ? (
                      <div>Modify Receivers</div>
                    ) : (
                      <div>Select Receivers</div>
                    )}
                  </Button>
                </div>
                {selected_type === "group" && (
                  <div>
                    <div className="text-blue fs-18 mt-30">{`Groups (${selected_details["updated_list"].length})`}</div>
                    <div className="fs-16 mt-10">
                      {selected_details["updated_list"].map((data, index) => {
                        return (
                          <div key={index} className="pt-5">
                            {data.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selected_type === "section" && (
                  <div>
                    <div className="text-blue fs-18 mt-30">{`Standard Section (${selected_details["updated_list"].length})`}</div>
                    <div className="fs-16 mt-10">
                      {selected_details["updated_list"].map((data) => {
                        return <div className="pt-5">{data.name}</div>;
                      })}
                    </div>
                  </div>
                )}
                {selected_type === "student" && (
                  <div>
                    <div className="text-blue fs-18 mt-30">{`Students`}</div>
                    <div className="fs-16 mt-30">{`Total Students (${selected_details["updated_list"].length})`}</div>
                  </div>
                )}
                {selected_type === "staff" && (
                  <div>
                    <div className="text-blue fs-18 mt-30">{`Staffs`}</div>
                    <div className="fs-16 mt-30">{`Total Staffs (${selected_details["updated_list"].length})`}</div>
                  </div>
                )}
                {selected_type === "transport" && (
                  <div>
                    <div className="text-blue fs-18 mt-30">{`Transport Route`}</div>
                    <div className="fs-16 mt-30">{`Total Routes (${selected_details["updated_list"].length})`}</div>
                  </div>
                )}
                {!this.checkMedium("sms") && (
                  <div className="mt-30">
                    {formDetails.notification_medium === "ivr" && (
                      <Typography
                        variant="body2"
                        style={{ color: "orange", fontWeight: "bold", marginBottom: "10px" }}
                      >
                        Only audio files are allowed for IVR.
                        If the duration exceeds 28 seconds, one additional credit will be deducted.

                        IVR messages can be sent only between 9:00 AM and 9:00 PM.
                        Messages scheduled outside this time window will be queued automatically and sent during the next available time slot.
                      </Typography>
                    )}
                    <Box className="">
                      <div>
                        <label
                          htmlFor={`upload-pic`}
                          className={
                            formDetails["imageUploading"]
                              ? "upload-icon-uploading"
                              : ""
                          }
                        >
                          {formDetails.notification_medium === "ivr" && (
                            <Button
                              variant="contained"
                              color="secondary"
                              className="ml-10"
                              onClick={() => this.setState({ showRecorder: true })}
                            >
                              🎤 Record Voice
                            </Button>
                          )}
                          <Button
                            variant="raised"
                            component="span"
                            disabled={formDetails["imageUploading"]}
                            className="set-question-upload-images-button"
                          >
                            Upload ( Image, Audio, Video )
                            <Box className="upload-icon">
                              <i
                                className="fa fa-upload"
                                aria-hidden="true"
                              ></i>
                            </Box>
                          </Button>
                          <Box
                            className={
                              formDetails["imageUploading"]
                                ? "image-uploading-circular-icon"
                                : "display-none"
                            }
                          >
                            <CircularProgress className="set-question-upload-image-loading" />{" "}
                          </Box>
                        </label>
                        <input
                          disabled={formDetails["imageUploading"]}
                          // multiple
                          type="file"
                          id={`upload-pic`}
                          className="display-none"
                          onChange={(e) => this.handleMultipleImageChange(e)}
                          onClick={(e) => (e.target.value = null)}
                          accept={
                            formDetails.notification_medium === "ivr"
                              ? "audio/*"
                              : supported_documet_bulk_upload.files
                          }
                        />
                        {fieldError.imagesPreview && 
                          <div style={{color: 'red'}}>
                              {fieldError.imagesPreview}
                          </div>
                        }
                      </div>
                      <Box className="">
                        {formDetails.imagesPreview &&
                          formDetails.imagesPreview.map((temp, index) => {
                            return (
                              <div className="d-flex mt-20" key={index}>
                                <Box className="set-question-image-preview-outer-box">
                                  {image_formats.includes(
                                    temp.file_extension
                                  ) ? (
                                    <Tooltip
                                      title="Preview Image"
                                      placement="top-start"
                                    >
                                      <img
                                        src={temp.url}
                                        alt="image"
                                        className="set-question-uploaded-image"
                                      />
                                    </Tooltip>
                                  ) : (
                                    <div className="text-blue text-underline">
                                      {`${temp.imageName}.${temp.file_extension}`}
                                    </div>
                                  )}
                                  <Box
                                    onClick={() =>
                                      this.handleLargePreview(
                                        temp.file_extension,
                                        temp.url
                                      )
                                    }
                                    className="set-question-image-preview-icon"
                                  >
                                    <VisibilityOutlinedIcon />{" "}
                                  </Box>
                                </Box>
                                <Box
                                  className=""
                                  onClick={() =>
                                    this.deleteUploadedImage(index)
                                  }
                                >
                                  <DeleteOutlineIcon className="add-icon-stock-item text-red pointer" />
                                </Box>
                              </div>
                            );
                          })}
                      </Box>
                    </Box>
                    {/* <label
                    htmlFor={upload-pic}
                    className={
                      formDetails["imageUploading"]
                        ? "upload-icon-uploading"
                        : ""
                    }
                  >

{formDetails.notification_medium !== 'sms' && (
                    <Button
                      variant="raised"
                      component="span"
                      disabled={formDetails["imageUploading"]}
                      className="set-question-upload-images-button"
                    >
                      Upload Document
                      <Box className="upload-icon">
                        <i className="fa fa-upload" aria-hidden="true"></i>
                      </Box>
                    </Button>
                  )}
                    <Box
                      className={
                        formDetails["imageUploading"]
                          ? "image-uploading-circular-icon"
                          : "display-none"
                      }
                    >
                      <CircularProgress className="set-question-upload-image-loading" />{" "}
                    </Box>
                  </label> */}
                    {/* <input
                    disabled={formDetails["imageUploading"]}
                    type="file"
                    id={upload-pic}
                    className="display-none"
                    onChange={(e) => this.handleImageChange(e, "img")}
                    onClick={(e) => (e.target.value = null)}
                  /> */}
                  </div>
                )}
                {/* <div className="mt-20">
                  <a
                    className="text-blue text-bold pointer mt-20"
                    href={formDetails?.["imagesPreview"]?.url}
                    target="_blank"
                    download={formDetails?.["imagesPreview"]?.imageName}
                  >
                    {formDetails?.["imagesPreview"]?.imageName}
                  </a>
                </div> */}
              </Grid>
            </Grid>
            <Box className="submt-button-float-bottom">
              <Button
                variant="contained"
                color="primary"
                className="submit"
                disabled={submitDisable}
                onClick={this.handleSubmit}
              >
                {" "}
                Verify Receivers
              </Button>
            </Box>
            <Dialog
              open={isDialogOpen}
              fullScreen
              onClose={this.handleDialogChange}
              aria-labelledby="form-dialog-title"
            >
              <AppBar style={{ width: "100%", right: "auto" }}>
                <Toolbar>
                  <IconButton
                    edge="start"
                    color="inherit"
                    onClick={this.handleDialogChange}
                    aria-label="close"
                  >
                    <CloseIcon />
                  </IconButton>
                  <Typography variant="h6">Select Receivers</Typography>
                </Toolbar>
              </AppBar>
              <DialogContent>
                <NoticeBoard
                  updateParent={this.updateParent}
                  isEdit={isEditReceiver}
                  selected_details={selected_details}
                  selected_type={selected_type}
                  selected_year={selected_year}
                />
              </DialogContent>
            </Dialog>
            {isPreviewUsers && (
              <PreviewUsers
                user_list={user_list}
                columns_list={columns_list}
                options={options}
                pagination={pagination}
                onTableChange={this.postApiPaginationCall}
                handleCloseChange={this.handlePreviewChange}
                handleSubmit={this.handleSubmit}
              />
            )}
            {this.state.showRecorder && (
              <Dialog
                open={this.state.showRecorder}
                onClose={() => this.setState({ showRecorder: false })}
              >
                <DialogContent>
                  <h3>Record IVR Message</h3>

                  <ReactMic
                    record={this.state.isRecording}
                    className="sound-wave"
                    onStop={this.onStopRecording}
                    strokeColor="#000"
                    backgroundColor="#fff"
                  />

                  <div className="mt-10">
                    {!this.state.isRecording ? (
                      <Button onClick={this.startRecording} color="primary">Start 🎙️</Button>
                    ) : (
                      <Button onClick={this.stopRecording} color="secondary">Stop 🛑</Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

          </Paper>
          {isSelectTemplate && (
            <ShowPreviewTemplate
              handleDialogChange={this.handleTemplateChange}
              handleSubmit={this.handleSelectTemplate}
              isSelectTemplate={true}
            />
          )}
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
      );
    }
  }
}
export default withRouter(NotificationCreate);

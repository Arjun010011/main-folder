import React, { Component } from "react";
import {
  Grid,
  FormLabel,
  CircularProgress,
  TextField,
  Box,
  Paper,
  Avatar,
  Button,
  FormControlLabel,
  Divider,
  Switch,
} from "@material-ui/core";
import _ from "lodash";

import DynamicForm from "Components/DynamicForm";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { dateFormat } from "Includes/functions";
import { validateMobileNumber } from "Includes/functions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import LoadingGif from "Components/LoadingGif";
import blankProfile from "images/blank_profile_pic.png";
import { POST_URL } from "Includes/urls";
import { maxFileSize, image_formats, relation_ship } from "Constants";
import { getRequest, postRequest } from "Includes/api/apicall";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import "./styles.scss";
import { type } from "ramda";
import CameraPopup from "Components/CameraPopup";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class AdmissionParentInformation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      fatherDetails: null,
      motherDetails: null,
      guardianDetails: null,
      bplDetails: null,
      parent: {
        address: {},
        is_bpl: "no",
        f_tax_payee: false,
        m_tax_payee: false,
        g_tax_payee: false,
        custom_form_data: {},
        profile_pic: "",
        profile_pic_name: "",
        preview: {
          father: "",
          mother: "",
          guardian: "",
        },
      },
      open: false,
      alertData: "",
      handleOpenCamera: { father: false, mother: false, guardian: false },
      enableUploadIcons: {
        father: true,
        mother: true,
        guardian: true,
      },
      is_profile_pic_can_capture: isFormDefinitionEnabled(
        "student_configuration",
        "is_profile_pic_can_capture",
        1
      ),
    };
  }

  componentDidMount = () => {
    this.getParentInformation();
  };

  getParentInformation = () => {
    if (this.props.isEditForm) {
      this.updateFatherInfo(this.props.studentDetail);
      this.updateMotherInfo(this.props.studentDetail);
      this.updateGuardianInfo(this.props.studentDetail);
      this.updateBPLInfo(this.props.studentDetail);
    } else if (this.props.isEditForm !== null) {
      this.updateFatherInfo();
      this.updateMotherInfo();
      this.updateGuardianInfo();
      this.updateBPLInfo();
    }
  };

  getSiblingInformation = (parentInf) => {
    this.setState(
      {
        fatherDetails: null,
        motherDetails: null,
        guardianDetails: null,
      },
      () => {
        this.updateFatherInfo(parentInf);
        this.updateMotherInfo(parentInf);
        this.updateGuardianInfo(parentInf);
      }
    );
  };

  getEnquiry = (parentInf) => {
    this.setState(
      {
        fatherDetails: null,
        motherDetails: null,
        guardianDetails: null,
      },
      () => {
        this.updateFatherInfo(parentInf, true);
        this.updateMotherInfo(parentInf, true);
        this.updateGuardianInfo(parentInf, true);
      }
    );
  };

  getApplication = (parentInf) => {
    this.setState(
      {
        fatherDetails: null,
        motherDetails: null,
        guardianDetails: null,
        bplDetails: null,
      },
      () => {
        this.updateFatherInfo(parentInf, true);
        this.updateMotherInfo(parentInf, true);
        this.updateGuardianInfo(parentInf, true);
        this.updateBPLInfo(parentInf);
      }
    );
  };

  updateFatherInfo = (students, isApplication) => {
    let studentInf = students?.student_parent?.parent ?? {};
    if (isApplication) {
      studentInf = students?.student_parent?.application_parent;
    }
    let { parent } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.father_details.list);
    let value;
    let id = null;
    fieldDetail.forEach((field) => {
      if (field.name === "f_profile_pic") {
        field.hidden = true;
      }
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value =
          studentInf?.[field?.["name"]] ??
          students?.[field?.["name"]] ??
          field.default;
      }
      field.default = value;
      if (field.isCustom) {
        parent["custom_form_data"][field.name] = value;
      } else {
        parent[field["name"]] = value;
      }
    });
    id = studentInf?.["f_profile_pic_details"]
      ? studentInf["f_profile_pic_details"]["id"]
      : null;
    parent["preview"]["father"] = studentInf?.["f_profile_pic_details"]
      ? studentInf["f_profile_pic_details"]["file"]
      : "";
    this.props.isUpload(true, parseInt(id), "father");
    this.setState({
      parent,
      fatherDetails: fieldDetail,
    });
  };

  handleUploadChangeProfile = (event, acceptFileType, parentType) => {
    let { parent, enableUploadIcons } = this.state;
    if (event.target.files[0]) {
      let fileName = event.target.files[0]["name"];
      let file_extension = `${fileName.slice(
        (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
      )}`;
      let is_supported_types = true;
      is_supported_types = image_formats.type.includes(
        file_extension.toLowerCase()
      );
      if (
        event.target.files[0].size < maxFileSize[acceptFileType].size &&
        is_supported_types
      ) {
        this.props.isUpload(false);
        let reader = new FileReader();
        let file = event.target.files[0];
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          parent["preview"][parentType] = reader.result;
          enableUploadIcons[parentType] = false;
          this.setState({
            parent,
            enableUploadIcons,
          });
        };
        this.props.handlePrompt(true);
        let post = new FormData();
        post.append("file", event.target.files[0]);
        const url = POST_URL.uploads.api;
        postRequest(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            this.props.isUpload(true, response.data.data.id, parentType);
          } else {
            this.props.isUpload("failed");
          }
          enableUploadIcons[parentType] = true;
          this.setState({
            enableUploadIcons,
          });
        });
      } else if (!is_supported_types) {
        this.setState({
          open: true,
          alertData: image_formats.error,
        });
      } else {
        this.setState({
          open: true,
          alertData: maxFileSize[acceptFileType].errorText,
        });
      }
    }
  };

  handleChangeProfile = (event, acceptFileType, parentType) => {
    let { parent, enableUploadIcons } = this.state;
    if (event) {
      let fileName = event["name"];
      let file_extension = `${fileName.slice(
        (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
      )}`;
      let is_supported_types = true;
      is_supported_types = image_formats.type.includes(
        file_extension.toLowerCase()
      );
      if (event.size < maxFileSize[acceptFileType].size && is_supported_types) {
        this.props.isUpload(false);
        let reader = new FileReader();
        let file = event;
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          parent["preview"][parentType] = reader.result;
          enableUploadIcons[parentType] = false;
          this.setState({
            parent,
            enableUploadIcons,
          });
        };
        this.props.handlePrompt(true);
        let post = new FormData();
        post.append("file", event);
        const url = POST_URL.uploads.api;
        postRequest(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            this.props.isUpload(true, response.data.data.id, parentType);
          } else {
            this.props.isUpload("failed");
          }
          enableUploadIcons[parentType] = true;
          this.setState({
            enableUploadIcons,
          });
        });
      } else if (!is_supported_types) {
        this.setState({
          open: true,
          alertData: image_formats.error,
        });
      } else {
        this.setState({
          open: true,
          alertData: maxFileSize[acceptFileType].errorText,
        });
      }
    }
    this.handleClickCamera(parentType, false);
  };

  removeProfilePic = (parentType) => {
    let { parent } = this.state;
    parent["preview"][parentType] = "";
    this.setState(
      {
        parent,
      },
      () => {
        this.props.handlePrompt(true);
        this.props.isUpload(true, null, parentType);
      }
    );
  };

  updateMotherInfo = (students, isApplication) => {
    let studentInf = students?.student_parent?.parent ?? {};
    if (isApplication) {
      studentInf = students?.student_parent?.application_parent;
    }
    let { parent } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.mother_details.list);
    let value;
    let id = null;
    fieldDetail.forEach((field) => {
      if (field.name === "m_profile_pic") {
        field.hidden = true;
      }
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf?.[field["name"]] ?? field.default;
      }
      field.default = value;
      if (field.isCustom) {
        parent["custom_form_data"][field.name] = value;
      } else {
        parent[field["name"]] = value;
      }
    });
    id = studentInf?.["m_profile_pic_details"]
      ? studentInf["m_profile_pic_details"]["id"]
      : null;
    parent["preview"]["mother"] = studentInf?.["m_profile_pic_details"]
      ? studentInf["m_profile_pic_details"]["file"]
      : "";
    this.props.isUpload(true, parseInt(id), "mother");

    this.setState({
      parent,
      motherDetails: fieldDetail,
    });
  };

  updateGuardianInfo = (students, isApplication) => {
    let studentInf = students?.student_parent?.guardian ?? {};
    if (isApplication) {
      studentInf = students?.student_parent?.application_guardian;
    }
    let { parent } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.guardian_details.list);
    let value;
    let id = null;
    fieldDetail.forEach((field) => {
      if (field.name === "g_profile_pic") {
        field.hidden = true;
      }
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf?.[field["name"]]
          ? studentInf?.[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        parent["custom_form_data"][field.name] = value;
      } else {
        parent[field["name"]] = value;
      }
    });
    id = studentInf?.["g_profile_pic_details"]
      ? studentInf["g_profile_pic_details"]["id"]
      : null;
    parent["preview"]["guardian"] = studentInf?.["g_profile_pic_details"]
      ? studentInf["g_profile_pic_details"]["file"]
      : "";
    this.props.isUpload(true, parseInt(id), "guardian");
    this.setState({
      parent,
      guardianDetails: fieldDetail,
    });
  };

  updateBPLInfo = (students) => {
    let studentInf = students?.student_details ?? {};
    let { parent } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.bpl_details.list);
    let value;
    let bpl_exist = false;
    fieldDetail.forEach((field) => {
      if (field.required) {
        bpl_exist = true;
      }
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf[field["name"]]
          ? studentInf[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        parent["custom_form_data"][field.name] = value;
      } else {
        parent[field["name"]] = value;
      }
    });
    if (bpl_exist) {
      fieldDetail[0]["default"] = true;
      parent["is_bpl"] = "yes";
    }
    this.setState({
      parent,
      bplDetails: fieldDetail,
    });
  };

  updateFather = (name, value) => {
    let { parent, fatherDetails } = this.state;
    fatherDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          parent["custom_form_data"][name] = value;
        } else {
          parent[name] = value;
        }
      }
    });
    this.setState({
      fatherDetails,
      parent,
    });
    this.props.handlePrompt(true);
  };

  updateMother = (name, value) => {
    let { parent, motherDetails } = this.state;
    motherDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          parent["custom_form_data"][name] = value;
        } else {
          parent[name] = value;
        }
      }
    });
    this.setState({
      motherDetails,
      parent,
    });
    this.props.handlePrompt(true);
  };

  updateGuardian = (name, value) => {
    let { parent, guardianDetails } = this.state;
    guardianDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          parent["custom_form_data"][name] = value;
        } else {
          parent[name] = value;
        }
      }
    });
    this.setState({
      guardianDetails,
      parent,
    });
    this.props.handlePrompt(true);
  };

  updateBpl = (name, value) => {
    let { parent, bplDetails } = this.state;
    bplDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          parent["custom_form_data"][name] = value;
        } else {
          parent[name] = value;
        }
      }
    });
    this.setState({
      bplDetails,
      parent,
    });
    this.props.handlePrompt(true);
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  validate = () => {
    let {
      parent,
      fatherDetails,
      motherDetails,
      guardianDetails,
      bplDetails,
      fieldErrors,
    } = this.state;
    const { form_details } = this.props;
    fieldErrors = {};

    let fatherTest = true;
    let motherTest = true;
    let guardianTest = true;
    let bplTest = true;
    let showError = "";
    let fatherRequired = false;
    let motherRequired = false;
    let guardianRequired = false;

    this.refs.father.updateErrors(fieldErrors);
    this.refs.mother.updateErrors(fieldErrors);
    this.refs.guardian.updateErrors(fieldErrors);

    if (parent["is_bpl"] && !form_details.bpl_details.hidden) {
      this.refs.bpl.updateErrors(fieldErrors);
    }

    fatherDetails.map((field) => {
      if (Boolean(field.default)) {
        fatherRequired = true;
        guardianRequired = false;
      }
    });

    motherDetails.map((field) => {
      if (Boolean(field.default)) {
        motherRequired = true;
        guardianRequired = false;
      }
    });

    if (
      parent["parents_annual_income"] !== "" &&
      parent["mother_name"] === "" &&
      parent["father_name"] === ""
    ) {
      guardianRequired = true;
    }

    guardianDetails.map((field) => {
      if (Boolean(field.default)) {
        guardianRequired = true;
      }
    });

    parent["f_dob"] = parent["f_dob"]
      ? dateFormat(parent["f_dob"], "YYYY-MM-DD")
      : "";
    parent["m_dob"] = parent["m_dob"]
      ? dateFormat(parent["m_dob"], "YYYY-MM-DD")
      : "";
    parent["g_dob"] = parent["g_dob"]
      ? dateFormat(parent["g_dob"], "YYYY-MM-DD")
      : "";
    parent["bpl_issue_date"] = parent["bpl_issue_date"]
      ? dateFormat(parent["bpl_issue_date"], "YYYY-MM-DD")
      : "";

    if (parent["father_name"] === "" && parent["mother_name"] === "") {
      guardianRequired = true;
    } else {
      guardianRequired = false;
    }

    fatherDetails.forEach((field) => {
      if (fatherRequired) {
        if (field.name === "father_name") {
          field.required = true;
        }
      } else {
        field.required = false;
      }
      let value = field.default;
      let name = field.name;
      if (field.required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        fatherTest = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          fatherTest = false;
        } else {
          value = returnValue.value;
        }
      } else if (
        !field.hidden &&
        field.regex &&
        !field.regex.value.test(value) &&
        Boolean(value)
      ) {
        fieldErrors[name] = field.regex.errorText;
        fatherTest = false;
      }
    });

    motherDetails.forEach((field) => {
      if (motherRequired) {
        if (field.name === "mother_name") {
          field.required = true;
        }
      } else {
        field.required = false;
      }
      let value = field.default;
      let name = field.name;
      if (field.required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        motherTest = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          motherTest = false;
        } else {
          value = returnValue.value;
        }
      } else if (
        !field.hidden &&
        field.regex &&
        !field.regex.value.test(value) &&
        Boolean(value)
      ) {
        fieldErrors[name] = field.regex.errorText;
        motherTest = false;
      }
    });

    guardianDetails.forEach((field) => {
      if (guardianRequired) {
        if (field.name === "guardian_name") {
          field.required = true;
        }
      } else {
        field.required = false;
      }
      let value = field.default;
      let name = field.name;
      if (field.required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        guardianTest = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          guardianTest = false;
        } else {
          value = returnValue.value;
        }
      } else if (
        !field.hidden &&
        field.regex &&
        !field.regex.value.test(value) &&
        Boolean(value)
      ) {
        fieldErrors[name] = field.regex.errorText;
        guardianTest = false;
      }
    });

    if (!form_details.bpl_details.hidden) {
      bplDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.required && !Boolean(value)) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          bplTest = false;
        } else if (
          !field.hidden &&
          field.regex &&
          !field.regex.value.test(value) &&
          Boolean(value)
        ) {
          fieldErrors[name] = field.regex.errorText;
          bplTest = false;
        }
      });
    }

    if (fatherTest && motherTest && guardianTest && bplTest) {
      return parent;
    } else {
      if (!fatherTest) {
        showError = showError + " Father Details";
      }
      if (!motherTest) {
        showError = showError + " Mother Details";
      }
      if (!guardianTest) {
        showError = showError + " Guardian Details";
      }
      if (!bplTest) {
        showError = showError + " BPL Details ";
      }
      this.setState({
        open: true,
        alertData: `Please Clear ${showError} Errors`,
      });
      this.refs.father.updateErrors(fieldErrors);
      this.refs.mother.updateErrors(fieldErrors);
      this.refs.guardian.updateErrors(fieldErrors);
      if (parent["is_bpl"] && !form_details.bpl_details.hidden) {
        this.refs.bpl.updateErrors(fieldErrors);
      }
    }
  };
  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  changeTaxPayee = (e) => {
    const { name, value } = e.target;
    let { parent } = this.state;
    parent[name] = value;
    this.setState({
      parent,
    });
  };

  changeIsBpl = (e) => {
    const { name, value } = e.target;
    let { parent, bplDetails } = this.state;
    parent[name] = value;
    if (value === "no") {
      bplDetails.map((field) => {
        if (field.name !== "is_bpl") {
          parent[field.name] = "";
          field.default = "";
        }
      });
    }
    this.setState({
      parent,
    });
  };

  handleClickCamera = (type, value) => {
    let { handleOpenCamera } = this.state;
    handleOpenCamera[type] = value;
    this.setState({ handleOpenCamera: { ...handleOpenCamera } });
  };

  render() {
    const {
      open,
      alertData,
      fatherDetails,
      motherDetails,
      guardianDetails,
      parent,
      bplDetails,
      enableUploadIcons,
      handleOpenCamera,
      mother,
      guardian,
      is_profile_pic_can_capture,
    } = this.state;
    const { isEditForm, profile_pic, loading, form_details } = this.props;
    return (
      <>
        {loading && <LoadingGif />}
        {!loading && (
          <Paper className="paper-plain-background">
            {!form_details.father_details.hidden && (
              <>
                <Box className="display-flex">
                  <Box className="form-left-heading m-t-20px m-b-20px p-t-20px">
                    {form_details.father_details.label}
                  </Box>
                  <Box className="profile-pic-position">
                    {enableUploadIcons["father"] &&
                    is_profile_pic_can_capture ? (
                      <label className="staff-profile-camera-position">
                        <Button
                          variant="raised"
                          component="span"
                          className="profile-pic-button"
                          onClick={() => this.handleClickCamera("father", true)}
                        >
                          <i class="fa fa-camera fa-lg" aria-hidden="true"></i>
                        </Button>
                      </label>
                    ) : (
                      <label
                        htmlFor={"upload-pic-father"}
                        className="staff-profile-camera-position"
                      >
                        <Button
                          variant="raised"
                          component="span"
                          className="profile-pic-button"
                        >
                          <i class="fa fa-camera fa-lg" aria-hidden="true"></i>
                        </Button>
                      </label>
                    )}

                    {handleOpenCamera.father && (
                      <CameraPopup
                        handleCloseCamera={() =>
                          this.handleClickCamera("father", false)
                        }
                        submit={(event) =>
                          this.handleChangeProfile(event, "img", "father")
                        }
                      />
                    )}
                    <input
                      type="file"
                      id="upload-pic-father"
                      className="display-none"
                      onChange={(e) =>
                        this.handleUploadChangeProfile(e, "img", "father")
                      }
                      onClick={(e) => (e.target.value = null)}
                    />
                    {parent?.preview.father !== "" &&
                      enableUploadIcons["father"] && (
                        <Box className="avatar-profile-pic-position">
                          <Avatar
                            src={parent.preview.father}
                            alt="Preview"
                            className="hr-profile-pic"
                          />
                          <HighlightOffIcon
                            className="image-cross-remove"
                            onClick={(e) => this.removeProfilePic("father")}
                          />
                        </Box>
                      )}
                    {!enableUploadIcons["father"] && (
                      <Box className="upload-profile-loading">
                        <CircularProgress />
                      </Box>
                    )}
                    {parent.preview.father === "" &&
                      enableUploadIcons["father"] && (
                        <Avatar
                          src={blankProfile}
                          alt="Preview"
                          className="hr-profile-pic"
                        />
                      )}
                  </Box>
                </Box>
                {fatherDetails && (
                  <DynamicForm
                    fieldDetails={fatherDetails}
                    updateParent={this.updateFather}
                    loading={loading}
                    ref={"father"}
                    idFormat={"admission_2022_08_11_01_23_pm_"}
                  />
                )}
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}

            {!form_details.mother_details.hidden && (
              <>
                <Box className="display-flex">
                  <Box className="form-left-heading m-t-20px m-b-20px p-t-20px">
                    {form_details.mother_details.label}
                  </Box>
                  <Box className="profile-pic-position">
                    {enableUploadIcons["mother"] &&
                    is_profile_pic_can_capture ? (
                      <label className="staff-profile-camera-position">
                        <Button
                          variant="raised"
                          component="span"
                          className="profile-pic-button"
                          onClick={() => this.handleClickCamera("mother", true)}
                        >
                          <i class="fa fa-camera fa-lg" aria-hidden="true"></i>
                        </Button>
                      </label>
                    ) : (
                      <label
                        htmlFor={"upload-pic-mother"}
                        className="staff-profile-camera-position"
                      >
                        <Button
                          variant="raised"
                          component="span"
                          className="profile-pic-button"
                        >
                          <i class="fa fa-camera fa-lg" aria-hidden="true"></i>
                        </Button>
                      </label>
                    )}

                    <input
                      type="file"
                      id="upload-pic-mother"
                      className="display-none"
                      onChange={(e) =>
                        this.handleUploadChangeProfile(e, "img", "mother")
                      }
                      onClick={(e) => (e.target.value = null)}
                    />
                    {handleOpenCamera.mother && (
                      <CameraPopup
                        handleCloseCamera={() =>
                          this.handleClickCamera("mother", false)
                        }
                        submit={(event) =>
                          this.handleChangeProfile(event, "img", "mother")
                        }
                      />
                    )}
                    {parent?.preview.mother !== "" &&
                      enableUploadIcons["mother"] && (
                        <Box className="avatar-profile-pic-position">
                          <Avatar
                            src={parent.preview.mother}
                            alt="Preview"
                            className="hr-profile-pic"
                          />
                          <HighlightOffIcon
                            className="image-cross-remove"
                            onClick={(e) => this.removeProfilePic("mother")}
                          />
                        </Box>
                      )}
                    {!enableUploadIcons["mother"] && (
                      <Box className="upload-profile-loading">
                        <CircularProgress />
                      </Box>
                    )}
                    {parent.preview.mother === "" &&
                      enableUploadIcons["mother"] && (
                        <Avatar
                          src={blankProfile}
                          alt="Preview"
                          className="hr-profile-pic"
                        />
                      )}
                  </Box>
                </Box>
                {motherDetails && (
                  <DynamicForm
                    fieldDetails={motherDetails}
                    updateParent={this.updateMother}
                    loading={loading}
                    ref={"mother"}
                    idFormat={"admission_2022_08_11_01_23_pm_"}
                  />
                )}
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}

            {!form_details.guardian_details.hidden && (
              <>
                <Box className="display-flex">
                  <Box className="form-left-heading m-t-20px m-b-20px p-t-20px">
                    {form_details.guardian_details.label}
                  </Box>
                  <Box className="profile-pic-position">
                    {enableUploadIcons["guardian"] &&
                    is_profile_pic_can_capture ? (
                      <label className="staff-profile-camera-position">
                        <Button
                          variant="raised"
                          component="span"
                          className="profile-pic-button"
                          onClick={() =>
                            this.handleClickCamera("guardian", true)
                          }
                        >
                          <i class="fa fa-camera fa-lg" aria-hidden="true"></i>
                        </Button>
                      </label>
                    ) : (
                      <label
                        htmlFor={"upload-pic-guardian"}
                        className="staff-profile-camera-position"
                      >
                        <Button
                          variant="raised"
                          component="span"
                          className="profile-pic-button"
                        >
                          <i class="fa fa-camera fa-lg" aria-hidden="true"></i>
                        </Button>
                      </label>
                    )}

                    <input
                      type="file"
                      id="upload-pic-guardian"
                      className="display-none"
                      onChange={(e) =>
                        this.handleUploadChangeProfile(e, "img", "guardian")
                      }
                      onClick={(e) => (e.target.value = null)}
                    />
                    {handleOpenCamera.guardian && (
                      <CameraPopup
                        handleCloseCamera={() =>
                          this.handleClickCamera("guardian", false)
                        }
                        submit={(event) =>
                          this.handleChangeProfile(event, "img", "guardian")
                        }
                      />
                    )}
                    {parent?.preview.guardian !== "" &&
                      enableUploadIcons["guardian"] && (
                        <Box className="avatar-profile-pic-position">
                          <Avatar
                            src={parent.preview.guardian}
                            alt="Preview"
                            className="hr-profile-pic"
                          />
                          <HighlightOffIcon
                            className="image-cross-remove"
                            onClick={(e) => this.removeProfilePic("guardian")}
                          />
                        </Box>
                      )}
                    {!enableUploadIcons["guardian"] && (
                      <Box className="upload-profile-loading">
                        <CircularProgress />
                      </Box>
                    )}
                    {parent.preview.guardian === "" &&
                      enableUploadIcons["guardian"] && (
                        <Avatar
                          src={blankProfile}
                          alt="Preview"
                          className="hr-profile-pic"
                        />
                      )}
                  </Box>
                </Box>
                {guardianDetails && (
                  <DynamicForm
                    fieldDetails={guardianDetails}
                    updateParent={this.updateGuardian}
                    loading={loading}
                    ref={"guardian"}
                    idFormat={"admission_2022_08_11_01_23_pm_"}
                  />
                )}
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}
            {!form_details.bpl_details.hidden && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px p-t-20px">
                  {form_details.bpl_details.label}
                </Box>
                {bplDetails && (
                  <DynamicForm
                    fieldDetails={bplDetails}
                    updateParent={this.updateBpl}
                    loading={loading}
                    ref={"bpl"}
                    idFormat={"admission_2022_08_11_01_23_pm_"}
                  />
                )}
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={open}
              autoHideDuration={2000}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>
          </Paper>
        )}
      </>
    );
  }
}

export default AdmissionParentInformation;

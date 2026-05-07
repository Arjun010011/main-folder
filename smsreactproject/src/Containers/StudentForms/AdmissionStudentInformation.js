import React, { Component } from "react";
import classNames from "classnames";
import {
  Grid,
  CircularProgress,
  TextField,
  Box,
  Button,
  Paper,
  FormControlLabel,
  Divider,
  Switch,
  Avatar,
  InputAdornment,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from "@material-ui/core";
import _ from "lodash";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";

import DynamicForm from "Components/DynamicForm";
import blankProfile from "images/blank_profile_pic.png";
import AddressFields from "Components/AddressFields";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import {
  getAcademicYear,
  SetAcademicYear,
  getKeyValueMap,
  dateFormat,
  getElementOfIdInArray,
  validateMobileNumber,
  getSettingValue,
  getFullName,
} from "Includes/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from "sweetalert2";
import loadingBar from "images/loading.gif";
import { maxFileSize, image_formats, relation_ship } from "Constants";
import ReligionFields from "Components/ReligionFields";
import IsEnquiryForm from "Containers/StudentForms/Components/IsEnquiryForm";
import IsFromApplicationForm from "Containers/StudentForms/Components/IsFromApplicationForm";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import AddStudentAdmission from "./Components/AddStudentAdmission";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Webcam from "react-webcam";
// import Cropper from 'react-cropper';

import "./styles.scss";
import AutoCompleteAddress from "Components/AutoCompleteAddress";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import ReAdmissionStudentList from "./Components/ReAdmissionStudentList";
import CameraPopup from "Components/CameraPopup";
import CameraUpload from "Components/CameraUpload";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const isResidential = parseInt(getSettingValue("is_residential"));
const isSubjectPresent = parseInt(
  getSettingValue("subject_assignment") == 2 ? 0 : 1
);
const admission_in_reg = Boolean(parseInt(getSettingValue("admission_in_reg")));

const fee_config = JSON.parse(localStorage.getItem("fee_configurations"))
  ? JSON.parse(localStorage.getItem("fee_configurations"))
  : {};

const fee_plan_types = fee_config?.["fee_plan_types"];



class AdmissionStudentInformation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      datalist: {},
      standardList: [],
      medicalDetails: null,
      studentDetails: null,
      schoolDetails: null,
      schoolValue: null,
      currentAddressDetails: null,
      permanentAddressDetails: null,
      isThereValuePermanentAddress: false,
      isEditCurrentAddress: false,
      isEditReligion: false,
      documents_not_uploaded: [],
      entry_academic_year: null,
      is_profile_pic_can_capture: isFormDefinitionEnabled(
        "student_configuration",
        "is_profile_pic_can_capture",
        1
      ),
      is_application: parseInt(getSettingValue("is_application")),
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
      is_group_type: isFormDefinitionEnabled(
        "staff_configuration",
        "is_staff_group_type",
        1
      ),
      addressValue: {},
      handleOpenCamera: false,
      student: {
        currentAddress: {},
        permanentAddress: {},
        medical: {},
        isEnquiry: "no",
        physically_handicaped: "no",
        previous_school_details: {
          sslcMarks: {},
          pucMarks: {},
          sslc: {},
          puc: {},
          language: {},
          extraActivity: {},
        },
        current_address_checked: false,
        application_number: "",
        handicap_reason: "",
        profile_pic: "",
        profile_pic_name: "",
        isPreSchoolPresent: true,
        username: "",
        password: "",
        enquiry_number: "",
        isSslcPucPresent: false,
        isPucPresent: false,
        bank: {},
        extraActivities: "",
        is_existing_student: false,
        preview: "",
        custom_form_data: {},
        siblingList: [],
        sibling_data: [],
        existingSiblings: [],
      },
      open: false,
      loadingApplication: false,
      beforeApplication: true,
      alertData: "",
      currentAddressDatalist: {},
      permanentAddressDatalist: {},
      loading: true,
      enableUploadIcons: true,
      isApplicationDataRetrieved: false,
      prevStandardList: null,
      nationalList: null,
      religionList: null,
      categoryList: null,
      userNameExist: false,
      userLoading: false,
      showPassword: false,
      isEnquiryForm: false,
      pucMarksDetails: null,
      sslcMarksDetails: null,
      sslcDetails: null,
      pucDetails: null,
      secondLanguageDetails: null,
      mediumInstructionDetails: null,
      bankDetails: null,
      extraActivitiesDetails: null,
      documentList: null,
      isSibling: true,
      openDialog: false,
      isAddressExist: false,
      admission_num: "",
      isReAdmissionOpen: false,
      auto_login_create: isFormDefinitionEnabled(
        "student_configuration",
        "auto_login_create",
        1
      ),
      readmission: isFormDefinitionEnabled(
        "student_configuration",
        "readmission",
        1
      ),
      groupList: [],
    };
    
    this.cameraUploadRef = React.createRef();
  }

  async componentDidMount() {
    const { is_application, is_group_type } = this.state;
    const { studentDetail, isEditForm } = this.props;
    let doc_param = {};
    if (is_group_type) {
      doc_param = { is_active: true, group_type: 0 };
      if (isEditForm) {
        doc_param["standard_id"] = studentDetail.current_standard;
        doc_param["student_id"] = studentDetail.id;
      }
    }
    try {
      const res = await Promise.all([
        getRequest(GET_URL.nationality.api, {}, this.props),
        getRequest(GET_URL.religion.api, {}, this.props),
        getRequest(GET_URL.category.api, {}, this.props),
        getRequest(GET_URL.documenttype.api, doc_param, this.props),
        getRequest(GET_URL.getstudentgroups.api, {}, this.props),
      ]);
      this.getNationalList(res[0]);
      this.getReligionList(res[1]);
      this.getCategoryList(res[2]);
      this.getDocumetList(res[3]);
      this.getGroupList(res[4]);
      this.getYearList();
      if (!is_application && !this.props.isEditForm) {
        this.setState({
          beforeApplication: false,
          isEnquiryForm: true,
        });
        this.props.hideTabsAndNext();
      }
    } catch {
      throw Error("Promise failed");
    }
  }

  getNationalList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        nationalList: response.data.data,
      });
    }
  };

  getReligionList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        religionList: response.data.data,
      });
    }
  };

  getCategoryList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        categoryList: response.data.data,
      });
    }
  };

  getDocumetList = (response) => {
    let { student } = this.state;
    if (response && response.status === 200) {
      let doc_list = [];
      let doc_temp = {};
      response.data.data.map((data) => {
        doc_temp = {};
        doc_temp["doc_id"] = data["id"];
        doc_temp["name"] = data["name"];
        doc_temp["imageUploading"] = false;
        doc_temp["imagesPreview"] = [];
        doc_list.push(doc_temp);
      });
      student["documents_not_uploaded"] = response.data?.documents_not_uploaded ?? []
        this.setState({
          documentList: doc_list,
          student: { ...student },
        });
    }
  };

  updateGetList = () => {
    const { nationalList, religionList, categoryList } = this.state;
    if (nationalList && religionList && categoryList) {
      this.getYearList();
    }
  };

  getGroupList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        groupList: response.data.data,
      });
    }
  };

  getYearList = async () => {
    const { yearInformation, studentDetail, isEditForm } = this.props;
    let { student } = this.state;
    const year_url = GET_URL.getacademicyear.api;
    const params = { is_active: true, is_finance_page: true };
    getRequest(year_url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            yearList: response.data.data,
            year_name: !isEditForm ? yearInformation.year_name : "",
          },
          () => {
            if (isEditForm) {
              this.getStandardList(
                studentDetail.student_details.entry_academic_year,
                studentDetail,
                studentDetail.student_details.category
              );
            } else {
              this.getStandardList(yearInformation.year);
            }
          }
        );
      }
    });
  };

  getStandardList = (year, student_detail, category) => {
    let { student } = this.state;
    const url = GET_URL.getstandard.api;
    const params = { academic_year: year, is_finance_page: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            standardList: response.data.data,
            entry_academic_year: year,
          },
          () => {
            if (student_detail) {
              response.data.data.map((data) => {
                if (
                  data.id == student_detail.current_standard &&
                  data.codename === "standard11"
                ) {
                  student["isSslcPucPresent"] = true;
                  student["isPreSchoolPresent"] = true;
                }
                if (
                  data.id == student_detail.current_standard &&
                  data.codename === "standard12"
                ) {
                  student["isSslcPucPresent"] = true;
                  student["isPucPresent"] = true;
                  student["isPreSchoolPresent"] = true;
                }
              });
              student["id"] = student_detail.id;
              this.setState(
                {
                  student,
                },
                () => {
                  if (category) {
                    this.getCasteList(category, student_detail);
                  } else {
                    let currentAddress = null;
                    let permanentAddress = null;
                    student_detail.student_address.map((field) => {
                      if (field.type === "CP" || field.type === "C") {
                        if (field.type === "CP") {
                          student["current_address_checked"] = true;
                        }
                        currentAddress = field;
                        student["current_address_id"] = field.id;
                        if (field.country) {
                          this.setState({
                            isEditCurrentAddress: true,
                          });
                        } else {
                          this.setState({
                            isEditCurrentAddress: false,
                          });
                        }
                      } else {
                        permanentAddress = field;
                        student["permanent_address_id"] = field.id;
                        // student["current_address_checked"] = field.id
                        //   ? false
                        //   : true;
                        if (field.country) {
                          this.setState({
                            isThereValuePermanentAddress: true,
                          });
                        } else {
                          this.setState({
                            isEditCurrentAddress: false,
                          });
                        }
                      }
                    });
                    this.updateStudentInf(student_detail);
                    this.updateMedicalInf(
                      student_detail.student_details && student_detail
                    );
                    this.updatePreviousSchoolInf(
                      student_detail.student_details && student_detail
                    );
                    this.updateSslcPucDetails(
                      student_detail.student_details && student_detail
                    );
                    this.updateCurrentAddress(currentAddress && currentAddress);
                    this.updatePermanentAddress(
                      permanentAddress && permanentAddress
                    );
                    this.updateHandicap(
                      student_detail.student_details &&
                        student_detail.student_details
                    );
                    if (this.props.isEditForm) {
                      student["username"] = student_detail.username;
                    } else if (student_detail.email) {
                      student["username"] = student_detail.email;
                      this.validateNameExist("username", student_detail.email);
                    } else if (student_detail.mobile_num) {
                      student["username"] = student_detail.mobile_num
                        .replace(/\D/g, "")
                        .slice(-10);
                      this.validateNameExist("username", student["username"]);
                    }
                    this.setState({
                      student,
                    });
                    this.updateBankDetails(student_detail);
                  }
                }
              );
            } else {
              this.updateStudentInf();
              this.updateMedicalInf();
              this.updatePreviousSchoolInf();
              this.updateCurrentAddress();
              this.updatePermanentAddress();
              this.updateSslcPucDetails();
              this.updateBankDetails();
            }
          }
        );
      }
    });
  };

  getCasteList = (value, studentDetail) => {
    let { student } = this.state;
    const url = GET_URL.caste.api;
    const params = { category: value };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            casteList: response.data.data,
          },
          () => {
            let currentAddress = null;
            let permanentAddress = null;
            studentDetail.student_address.map((field) => {
              if (field.type === "CP" || field.type === "C") {
                if (field.type === "CP") {
                  student["current_address_checked"] = true;
                }
                currentAddress = field;
                student["current_address_id"] = field.id;
                if (field.country) {
                  this.setState({
                    isEditCurrentAddress: true,
                  });
                }
              } else {
                permanentAddress = field;
                student["permanent_address_id"] = field.id;
                // student["current_address_checked"] = field.id ? false : true;
                if (field.id) {
                  this.setState({
                    isThereValuePermanentAddress: true,
                  });
                }
              }
            });
            this.updateStudentInf(studentDetail);
            this.updateMedicalInf(studentDetail);
            this.updatePreviousSchoolInf(studentDetail);
            this.updateSslcPucDetails(studentDetail);
            this.updateCurrentAddress(currentAddress && currentAddress);
            this.updatePermanentAddress(permanentAddress && permanentAddress);
            this.updateHandicap(studentDetail.student_details);
            if (this.props.isEditForm) {
              student["username"] = studentDetail.username;
            } else if (studentDetail.email) {
              student["username"] = studentDetail.email;
              this.validateNameExist("username", studentDetail.email);
            } else if (studentDetail.mobile_num) {
              student["username"] = studentDetail.mobile_num
                .replace(/\D/g, "")
                .slice(-10);
              this.validateNameExist("username", student["username"]);
            }
            this.setState({
              student,
              year_name: studentDetail.entry_academic_year_value
                ? studentDetail.entry_academic_year_value
                : studentDetail.student_details.entry_academic_year_value,
            });
            this.updateBankDetails(studentDetail);
          }
        );
      }
    });
  };

  updatePreviousSchool = (name, value) => {
    let { student, schoolDetails } = this.state;
    schoolDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][name] = value;
        } else {
          student["previous_school_details"][name] = value;
        }
      }
    });
    this.setState({
      schoolDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateCurrentAddress = (addressInf) => {
    let { student, is_google_places } = this.state;
    let { form_details } = this.props;
    if (is_google_places) {
      let address = {};
      address["address_one_map"] = addressInf
        ? addressInf["map_address_data"]?.["address_one_map"] ?? ""
        : "";
      address["address_two_map"] = addressInf
        ? addressInf["map_address_data"]?.["address_two_map"] ?? ""
        : "";
      address["city_map"] = addressInf
        ? addressInf["map_address_data"]?.["city_map"] ?? ""
        : "";
      address["district_map"] = addressInf
        ? addressInf["map_address_data"]?.["district_map"] ?? ""
        : "";
      address["state_map"] = addressInf
        ? addressInf["map_address_data"]?.["state_map"] ?? ""
        : "";
      address["country_map"] = addressInf
        ? addressInf["map_address_data"]?.["country_map"] ?? ""
        : "";
      address["pincode_map"] = addressInf
        ? addressInf["map_address_data"]?.["pincode_map"] ?? ""
        : "";
      address["latitude_and_langitude_map"] = addressInf
        ? addressInf["map_address_data"]
          ? {
              lat: addressInf["map_address_data"]["latitude_map"],
              lng: addressInf["map_address_data"]["longitude_map"],
            }
          : {}
        : {};
      student.currentAddress = address;
      if (
        !addressInf?.["map_address_data"]?.["address_one_map"] &&
        addressInf?.["address"]
      ) {
        address["address_one_map"] = addressInf["address"];
        this.setState({
          isAddressExist: true,
        });
      }
      this.setState(
        {
          student,
        },
        () => {
          this.loadingFalse();
        }
      );
    } else {
      let fieldDetail = _.cloneDeep(form_details.current_address_details.list);
      let value;
      fieldDetail.forEach((field) => {
        if (addressInf) {
          value = addressInf[field["name"]];
          student.currentAddress = addressInf;
        } else {
          value = field.default;
          student.currentAddress[field["name"]] = value;
        }
        field.default = value;
      });
      this.setState({
        student,
        currentAddressDetails: fieldDetail,
      });
    }
    if (form_details.current_address_details.hidden) {
      this.loadingFalse();
    }
  };

  updatePermanentAddress = (addressInf) => {
    let { student, is_google_places } = this.state;
    let { form_details } = this.props;
    if (is_google_places) {
      let address = {};
      address["address_one_map"] = addressInf
        ? addressInf["map_address_data"]?.["address_one_map"] ?? ""
        : "";
      address["address_two_map"] = addressInf
        ? addressInf["map_address_data"]?.["address_two_map"] ?? ""
        : "";
      address["city_map"] = addressInf
        ? addressInf["map_address_data"]?.["city_map"] ?? ""
        : "";
      address["district_map"] = addressInf
        ? addressInf["map_address_data"]?.["district_map"] ?? ""
        : "";
      address["state_map"] = addressInf
        ? addressInf["map_address_data"]?.["state_map"] ?? ""
        : "";
      address["country_map"] = addressInf
        ? addressInf["map_address_data"]?.["country_map"] ?? ""
        : "";
      address["pincode_map"] = addressInf
        ? addressInf["map_address_data"]?.["pincode_map"] ?? ""
        : "";
      address["latitude_and_langitude_map"] = addressInf
        ? addressInf["map_address_data"]
          ? {
              lat: addressInf["map_address_data"]["latitude_map"],
              lng: addressInf["map_address_data"]["longitude_map"],
            }
          : {}
        : {};
      student.permanentAddress = address;
      this.setState(
        {
          student,
        },
        () => {
          this.loadingFalse();
        }
      );
    } else {
      let fieldDetail = _.cloneDeep(
        form_details.permanent_address_details.list
      );
      let value;
      fieldDetail.forEach((field) => {
        if (addressInf) {
          value = addressInf[field["name"]];
          student.permanentAddress = addressInf;
        } else {
          value = field.default;
          student.permanentAddress[field["name"]] = value;
        }
        field.default = value;
      });
      this.setState({
        student,
        permanentAddressDetails: fieldDetail,
      });
    }
    if (form_details.permanent_address_details.hidden) {
      this.loadingFalse();
    }
  };

  updateSslcPucDetails = (students) => {
    let schoolInf = students?.student_details?.previous_school_details ?? {};
    let { student } = this.state;
    let { form_details } = this.props;

    let sslcMarksDetails = _.cloneDeep(form_details.sslc_mark_details.list);
    let pucMarksDetails = _.cloneDeep(form_details.puc_mark_details.list);
    let sslcDetails = _.cloneDeep(form_details.sslc_details.list);
    let pucDetails = _.cloneDeep(form_details.puc_details.list);
    let secondLanguageDetails = _.cloneDeep(
      form_details.second_language_details.list
    );
    let mediumInstructionDetails = _.cloneDeep(
      form_details.medium_instruction_details.list
    );
    let extraActivitiesDetails = _.cloneDeep(
      form_details.extra_activity_details.list
    );

    let value, sslcMarks, pucMarks, sslc, puc, language, extraActivity;

    if (schoolInf) {
      sslcMarks = schoolInf.sslcMarks ? schoolInf.sslcMarks : {};
      pucMarks = schoolInf.pucMarks ? schoolInf.pucMarks : {};
      sslc = schoolInf.sslc ? schoolInf.sslc : {};
      puc = schoolInf.puc ? schoolInf.puc : {};
      language = schoolInf.language ? schoolInf.language : {};
      extraActivity = schoolInf.extraActivity ? schoolInf.extraActivity : {};
    }

    sslcMarksDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = sslcMarks?.[field["name"]]
          ? sslcMarks[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["sslcMarks"][field["name"]] = value;
      }
    });

    pucMarksDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = pucMarks?.[field["name"]]
          ? pucMarks[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["pucMarks"][field["name"]] = value;
      }
    });

    sslcDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = sslc?.[field["name"]] ? sslc[field["name"]] : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["sslc"][field["name"]] = value;
      }
    });

    pucDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = puc?.[field["name"]] ? puc[field["name"]] : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["puc"][field["name"]] = value;
      }
    });

    secondLanguageDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = language?.[field["name"]]
          ? language[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["language"][field["name"]] = value;
      }
    });

    mediumInstructionDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = language?.[field["name"]]
          ? language[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["language"][field["name"]] = value;
      }
    });

    extraActivitiesDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = extraActivity?.[field["name"]]
          ? extraActivity[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"]["extraActivity"][field["name"]] =
          value;
      }
    });

    this.setState({
      student,
      pucMarksDetails,
      sslcMarksDetails,
      sslcDetails,
      pucDetails,
      secondLanguageDetails,
      mediumInstructionDetails,
      extraActivitiesDetails,
    });
  };

  updateBankDetails = (students) => {
    let bankInf = students?.student_details ?? {};
    let { student } = this.state;
    let { form_details } = this.props;
    let bankDetails = _.cloneDeep(form_details.bank_details.list);
    let value;
    bankDetails.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = bankInf[field["name"]] ? bankInf[field["name"]] : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value;
      } else {
        student["bank"][field["name"]] = value;
      }
    });
    this.setState({
      student,
      bankDetails,
    });
  };

  updateCurrentAddressList = (datalist) => {
    let {
      currentAddressDatalist,
      permanentAddressDatalist,
      isThereValuePermanentAddress,
      isEditCurrentAddress,
    } = this.state;
    currentAddressDatalist = datalist;
    this.setState(
      {
        currentAddressDatalist,
      },
      () => {
        if (
          !isEditCurrentAddress &&
          !isThereValuePermanentAddress &&
          this.props.isEditForm &&
          (Object.keys(currentAddressDatalist).length === 1 ||
            Object.keys(permanentAddressDatalist).length === 1)
        ) {
          this.loadingFalse();
        } else if (
          this.props.isEditForm &&
          (Object.keys(currentAddressDatalist).length === 4 ||
            Object.keys(permanentAddressDatalist).length === 4)
        ) {
          this.loadingFalse();
        } else if (
          Object.keys(currentAddressDatalist).length === 1 ||
          Object.keys(permanentAddressDatalist).length === 1
        ) {
          this.loadingFalse();
        }
      }
    );
  };

  loadingFalse = () => {
    let { beforeApplication, loadingApplicationButton } = this.state;
    if (this.props.isEditForm || loadingApplicationButton) {
      loadingApplicationButton = false;
      this.props.hideTabsAndNext();
      beforeApplication = false;
    }
    this.setState({
      loading: false,
      loadingApplication: false,
      beforeApplication,
      loadingApplicationButton,
    });
    this.props.loadingFalse();
  };

  updatePermanentAddressList = (datalist) => {
    let {
      currentAddressDatalist,
      permanentAddressDatalist,
      isEditCurrentAddress,
      isThereValuePermanentAddress,
    } = this.state;
    permanentAddressDatalist = datalist;
    this.setState(
      {
        permanentAddressDatalist,
      },
      () => {
        if (
          !isEditCurrentAddress &&
          !isThereValuePermanentAddress &&
          this.props.isEditForm &&
          (Object.keys(currentAddressDatalist).length === 1 ||
            Object.keys(permanentAddressDatalist).length === 1)
        ) {
          this.loadingFalse();
        } else if (
          this.props.isEditForm &&
          (Object.keys(currentAddressDatalist).length === 4 ||
            Object.keys(permanentAddressDatalist).length === 4)
        ) {
          this.loadingFalse();
        } else if (
          Object.keys(currentAddressDatalist).length === 1 ||
          Object.keys(permanentAddressDatalist).length === 1
        ) {
          this.loadingFalse();
        }
      }
    );
  };

  updateStudentInf = (studentInf) => {
    let {
      student,
      yearList,
      standardList,
      entry_academic_year,
      nationalList,
      documentList,
      religionList,
      categoryList,
      casteList,
      groupList,
    } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.student_details.list);
    let value;
    let id = null;
    if (studentInf) {
      student["admission_num"] = studentInf["admission_num"];
      studentInf["is_new_student"] = Object.keys(studentInf).includes(
        "is_new_student"
      )
        ? studentInf["is_new_student"]
          ? "true"
          : "false"
        : "true";
      id = studentInf["profile_pic_details"]
        ? studentInf["profile_pic_details"]["id"]
        : null;
      student["preview"] = studentInf["profile_pic_details"]
        ? studentInf["profile_pic_details"]["file"]
        : "";
      this.props.isUpload(true, parseInt(id), "student");
      if (studentInf.sibling_data && studentInf.sibling_data.length > 0) {
        student.siblingList = [];
        studentInf.sibling_data.map((data) => {
          if (data.relation_ship_for_me !== "") {
            data["full_name"] = getFullName(
              data.student__first_name,
              data.student__middle_name,
              data.student__last_name
            );
            data["dob"] = data.student__dob;
            data["gender"] = data.student__gender;
            data["id"] = data.student_id;
            data["relation_name"] = data.relation_ship_for_me;
            data["relation_label"] = relation_ship[data.relation_ship_for_me];
            data["current_standard_name"] = data.standard_name;
            data["current_standard_section_name"] = data.section_name;
            student.siblingList.push(data);
          }
        });
      }
    }
    fieldDetail.forEach((field, index) => {
      if (field.name === "student_type" && !isResidential) {
        fieldDetail.splice(index, 1);
      }
    });
    fieldDetail.forEach((field, index) => {
      if (studentInf) {
        if (field.isCustom) {
          value = studentInf.custom_form_data?.[field.name] ?? field.default;
        } else {
          value = studentInf[field["name"]]
            ? studentInf[field["name"]]
            : studentInf["student_details"]
            ? studentInf["student_details"][field["name"]]
            : field.default;
        }
      } else {
        value = field.default;
      }
      if (field.name === "is_new_student" && studentInf && value) {
        field["disabled"] = fee_plan_types?.includes("3");
      } else if (field.name === "gender" && studentInf && value) {
        field["disabled"] = fee_plan_types?.includes("2");
      } else if (field.name === "entry_academic_year") {
        field["list"] = yearList;
        value = entry_academic_year;
        let entry_academic_year_value = getKeyValueMap(yearList, "id", "name");
        student["entry_academic_year_value"] = entry_academic_year_value[value];
        // field["disabled"] = is_application ? true : false;
        field["disabled"] = true;
        // field["hidden"] = true;
      } else if (field.name === "student_group") {
        field["list"] = groupList;
        if (studentInf) {
          let selected_group = getKeyValueMap(groupList, "id", "name");
          student["student_group_name"] = selected_group[value];
          if (selected_group[value]) {
            field["disabled"] = fee_plan_types?.includes("1");
          }
        }
      } else if (field.name === "current_standard") {
        field["list"] = standardList;
        if (studentInf && studentInf["admission_num"]) {
          delete field["parent"];
          field["disabled"] = true;
        }
        if (studentInf) {
          let current_standard_name = getKeyValueMap(
            standardList,
            "id",
            "name"
          );
          student["current_standard_name"] = current_standard_name[value];
        }
      } else if (field.name === "nationality") {
        field["list"] = nationalList;
        if (studentInf && studentInf["student_details"]) {
          student["nationality_name"] = studentInf["student_details"][
            "nationality_name"
          ]
            ? studentInf["student_details"]["nationality_name"]
            : "";
        }
      } else if (field.name === "religion") {
        field["list"] = religionList;
        if (studentInf && studentInf["student_details"]) {
          student["religion_name"] = studentInf["student_details"][
            "religion_name"
          ]
            ? studentInf["student_details"]["religion_name"]
            : "";
        }
      } else if (field.name === "document_list") {
        if (studentInf && studentInf["document_list"]) {
          field["list"] = this.getFormattedDocument(
            studentInf["document_list"]
          );
          value = this.getFormattedDocument(
            studentInf["document_list"],
            "value"
          );
        } else {
          field["list"] = documentList;
        }
      } else if (field.name === "category") {
        field["list"] = categoryList;
        if (studentInf && studentInf["student_details"]["category"]) {
          student["category_name"] = studentInf["student_details"][
            "category_name"
          ]
            ? studentInf["student_details"]["category_name"]
            : "";
        }
      } else if (field.name === "caste") {
        if (studentInf && studentInf["student_details"]) {
          field["list"] = casteList;
          if (
            studentInf["student_details"]["category"] &&
            studentInf["student_details"]["caste"]
          ) {
            value = getElementOfIdInArray(
              casteList,
              studentInf["student_details"]["caste"]
            );
            student["caste_name"] = studentInf["student_details"]["caste_name"]
              ? studentInf["student_details"]["caste_name"]
              : "";
          }
        }
      } else if (field.name === "current_reg_num" && admission_in_reg) {
        field.hidden = true;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student[field["name"]] = value;
      }
    });
    if (student["admission_num"]) {
      this.setState({
        admission_num: student["admission_num"],
      });
    }
    this.setState(
      {
        student,
        studentDetails: fieldDetail,
      },
      () => {
        this.updateSiblingFormat();
      }
    );
  };

  getFormattedDocument = (doc_list, name) => {
    let { documentList } = this.state;
    let return_data = [];
    let doc_temp = {};
    let doc_type_temp = {};
    let image_temp = {};
    doc_list.map((data) => {
      if (!doc_temp[data.document_type]) {
        doc_type_temp = {};
        doc_type_temp["doc_id"] = data.document_type_details.id;
        doc_type_temp["name"] = data.document_type_details.name;
        doc_temp[data.document_type] = doc_type_temp;
        doc_temp[data.document_type]["imagesPreview"] = [];
        doc_temp[data.document_type]["imageUploading"] = false;
        if (data.document_details) {
          image_temp = {};
          image_temp["file"] = data.document_details["file_name"];
          image_temp["file_extension"] = `${data.document_details[
            "file_name"
          ].slice(
            (Math.max(0, data.document_details["file_name"].lastIndexOf(".")) ||
              Infinity) + 1
          )}`.toLowerCase();
          image_temp["url"] = data.document_details["file"];
          image_temp["uploadedId"] = data.document_details["id"];
          image_temp["id"] = data["id"];
          doc_temp[data.document_type]["imagesPreview"].push(image_temp);
        } else {
          doc_temp[data.document_type]["edit_id"] = data["id"];
        }
      } else {
        image_temp = {};
        image_temp["file"] = data.document_details?.file_name || '';
        image_temp["file_extension"] = `${data.document_details?.file_name?.slice(
          (Math.max(0, data.document_details?.file_name?.lastIndexOf(".")) || Infinity) + 1
        ) || ''}`.toLowerCase();        
        image_temp["url"] = data.document_details?.file ||"";
        image_temp["uploadedId"] = data.document_details?.id ||"";
        image_temp["id"] = data["id"];
        doc_temp[data.document_type]["imagesPreview"].push(image_temp);
      }
    });
    documentList.map((data) => {
      if (doc_temp[data["doc_id"]]) {
        return_data.push(doc_temp[data["doc_id"]]);
      } else if (name !== "value") {
        return_data.push(data);
      }
    });
    return return_data;
  };

  updateMedicalInf = (students) => {
    let studentInf = students?.student_details?.medical_details ?? {};
    let { student } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.medical_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf[field["name"]]
          ? studentInf[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["medical"][field["name"]] = value;
      }
    });
    this.setState({
      student,
      medicalDetails: fieldDetail,
    });
  };

  updatePreviousSchoolInf = (students) => {
    let studentInf = students?.student_details?.previous_school_details ?? {};
    let { student } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.pre_school_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf[field["name"]]
          ? studentInf[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"][field["name"]] = value;
      }
    });
    this.setState({
      student,
      schoolDetails: fieldDetail,
    });
  };

  updateHandicap = (studentInf) => {
    let { student } = this.state;
    student["physically_handicaped"] =
      studentInf && studentInf.physically_handicaped;
    student["handicap_reason"] =
      studentInf && studentInf.handicap_reason
        ? studentInf.handicap_reason
        : "";
    this.setState({
      student,
    });
  };

  handleClickShowPassword = () => {
    let { showPassword } = this.state;
    this.setState({
      showPassword: !showPassword,
    });
  };

  updateStudent = (name, value, list) => {
    let {
      student,
      studentDetails,
      yearList,
      nationalList,
      religionList,
      categoryList,
      isPucPresent,
      standardList,
      groupList,
    } = this.state;
    const { isEditForm } = this.props;
    studentDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student[name] = value;
        }
      }
    });
    this.setState({
      studentDetails,
      student,
    });
    if (name === "entry_academic_year") {
      SetAcademicYear(value);
      let entry_academic_year_value = getKeyValueMap(yearList, "id", "name");
      student["entry_academic_year_value"] = entry_academic_year_value[value];
      student["entry_academic_year"] = value; // Add this line to define entry_academic_year
      if (student["current_standard"]) {
        let standardCodeName = getKeyValueMap(standardList, "id", "codename");
        let CodeName = standardCodeName[value];
        if (CodeName === "standard11") {
          student["isSslcPucPresent"] = true;
          student["isPucPresent"] = false;
          student["isPreSchoolPresent"] = true;
        } else if (CodeName === "standard12") {
          student["isSslcPucPresent"] = true;
          student["isPucPresent"] = true;
          student["isPreSchoolPresent"] = true;
        } else {
          student["isSslcPucPresent"] = false;
          student["isPucPresent"] = false;
        }
      }

      this.setState({
        student,
      });
    } else if (name === "current_standard") {
      let current_standard_name = getKeyValueMap(list[name], "id", "name");
      let standardCodeName = getKeyValueMap(list[name], "id", "codename");
      student["current_standard_name"] = current_standard_name[value];
      let CodeName = standardCodeName[value];
      if (CodeName === "standard11") {
        student["isSslcPucPresent"] = true;
        student["isPucPresent"] = false;
        student["isPreSchoolPresent"] = true;
      } else if (CodeName === "standard12") {
        student["isSslcPucPresent"] = true;
        student["isPucPresent"] = true;
        student["isPreSchoolPresent"] = true;
      } else {
        student["isSslcPucPresent"] = false;
        student["isPucPresent"] = false;
      }
      this.setState({
        student,
      });
    } else if (name === "nationality") {
      let nationality_name = getKeyValueMap(nationalList, "id", "name");
      student["nationality_name"] = nationality_name[value];
    } else if (name === "religion") {
      let religion_name = getKeyValueMap(religionList, "id", "name");
      student["religion_name"] = religion_name[value];
    } else if (name === "category") {
      let category_name = getKeyValueMap(categoryList, "id", "name");
      student["category_name"] = category_name[value];
    } else if (name === "caste") {
      student["caste_name"] = value ? value.name : "";
    } else if (name === "email" && !isEditForm) {
      student["username"] = value;
      this.validateNameExist("username", value);
    } else if (name === "student_group") {
      let group_name = getKeyValueMap(groupList, "id", "name");
      student["student_group_name"] = group_name[value];
    }
    this.setState({ student });
    this.props.handlePrompt(true);
  };

  getSubjects(name, yearId, standardId) {
    const { student, studentDetails } = this.state;
    let feeApi = GET_URL.getAssignSubject.api;
    let params = {
      academic_year: yearId,
      standard: standardId,
      for_admission: 1,
    };
    getRequest(feeApi, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let languageList = [];
        let subjectList = [];
        let resultData = response.data.data;
        let foundError = "";
        let title = "";
        resultData.map((data) => {
          if (data.subject_is_language) {
            languageList.push(data);
          } else {
            data["enable"] = "";
            subjectList.push(data);
          }
        });
        if (languageList.length === 0 && subjectList.length === 0) {
          foundError = 1;
          title = `Both language and subject is not assigned for ${student["current_standard_name"]} for ${student["entry_academic_year_value"]}`;
        } else if (languageList.length === 0) {
          foundError = 2;
          title = `Languages is not assigned for ${student["current_standard_name"]} for ${student["entry_academic_year_value"]}`;
        } else if (subjectList.length === 0) {
          foundError = 3;
          title = `Subjects is not assigned for ${student["current_standard_name"]} for ${student["entry_academic_year_value"]}`;
        }
        if (foundError) {
          Swal.fire({
            type: "info",
            title: title,
            showConfirmButton: true,
          });
          studentDetails.some((field) => {
            if (field.name === name) {
              field.default = "";
            }
          });
          if (name === "entry_academic_year") {
            student["entry_academic_year"] = "";
          } else {
            student["current_standard"] = "";
          }
          this.setState(
            {
              student,
              studentDetails,
            },
            () => {
              this.refs.student.setDefaultValues();
            }
          );
        }
      }
    });
  }

  updateMedical = (name, value) => {
    let { student, medicalDetails } = this.state;
    medicalDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["medical"][name] = value;
        }
      }
    });
    this.setState({
      medicalDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateSslcMarks = (name, value) => {
    let { student, sslcMarksDetails } = this.state;
    sslcMarksDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["sslcMarks"][name] = value;
        }
      }
    });
    this.setState({
      sslcMarksDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updatePucMarks = (name, value) => {
    let { student, pucMarksDetails } = this.state;
    pucMarksDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["pucMarks"][name] = value;
        }
      }
    });
    this.setState({
      pucMarksDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateSslc = (name, value) => {
    let { student, sslcDetails } = this.state;
    sslcDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["sslc"][name] = value;
        }
      }
    });
    this.setState({
      sslcDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updatePuc = (name, value) => {
    let { student, pucDetails } = this.state;
    pucDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["puc"][name] = value;
        }
      }
    });
    this.setState({
      pucDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateSecondLanguage = (name, value) => {
    let { student, secondLanguageDetails } = this.state;
    secondLanguageDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["language"][name] = value;
        }
      }
    });
    this.setState({
      secondLanguageDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateMediumInstruction = (name, value) => {
    let { student, mediumInstructionDetails } = this.state;
    mediumInstructionDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["language"][name] = value;
        }
      }
    });
    this.setState({
      mediumInstructionDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateBank = (name, value) => {
    let { student, bankDetails } = this.state;
    bankDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["bank"][name] = value;
        }
      }
    });
    this.setState({
      bankDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateExtraActivity = (name, value) => {
    let { student, extraActivitiesDetails } = this.state;
    extraActivitiesDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"]["extraActivity"][name] = value;
        }
      }
    });
    this.setState({
      extraActivitiesDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  onChangeStudent = (e) => {
    let { name, value } = e.target;
    let { fieldErrors, student } = this.state;
    if (name === "physically_handicaped" && value === "no") {
      student["handicap_reason"] = "";
    }
    delete fieldErrors["handicap_reason"];
    delete fieldErrors["applicationNumberMandatory"];
    delete fieldErrors["applicationNotFound"];
    delete fieldErrors["enquiryNumberMandatory"];
    delete fieldErrors["enquiryNotFound"];
    delete fieldErrors[name];
    student[name] = value;
    this.setState({
      student,
      fieldErrors: fieldErrors,
    });
  };

  handleUploadChangeProfile = async (event, acceptFileType) => {
    let { student, enableUploadIcons } = this.state;
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
        this.props.isUpload(true);
        let reader = new FileReader();
        let file = event.target.files[0];
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          // Open the crop dialog with the uploaded image
          this.setState({
            capturedImage: reader.result,
            showCropDialog: true,
            uploadedFileName: fileName,
            uploadedFile: file,
            tempPreview: reader.result,
            enableUploadIcons: false
          });
        };
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

  handleChangeProfile = (event, acceptFileType = "img") => {
    let { student, enableUploadIcons } = this.state;
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
        this.props.isUpload(true);
        let reader = new FileReader();
        let file = event;
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          student["preview"] = reader.result;
          enableUploadIcons = false;
          this.setState({
            student,
            enableUploadIcons,
          });
        };
        this.props.handlePrompt(true);
        let post = new FormData();
        post.append("file", event);
        const url = POST_URL.uploads.api;
        postRequest(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            this.props.isUpload(true, response.data.data.id, "student");
          } else {
            this.props.isUpload("failed");
          }
          enableUploadIcons = true;
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
    this.setState({ handleOpenCamera: false });
  };

  BlurValidation = (e) => {
    const { name, value } = e.target;
    let { fieldErrors } = this.state;
    if (value.trim().length < 8) {
      fieldErrors[name] = (
        <FormattedMessage {...commonMessages.passwordInvalidError} />
      );
    }
    this.setState({
      fieldErrors,
    });
  };

  validate = () => {
    let {
      student,
      studentDetails,
      medicalDetails,
      currentAddressDetails,
      permanentAddressDetails,
      fieldErrors,
      schoolDetails,
      userLoading,
      auto_login_create,
      userNameExist,
      is_google_places,
    } = this.state;
    let { isEditForm, form_details } = this.props;

    fieldErrors = { permanent: {} };

    let studentTest = true;
    let handicapTest = true;
    let medicalTest = true;
    let schoolTest = true;
    let loginTest = true;
    let currentAddressTest = true;
    let permanentAddressTest = true;
    let permanentAddressRequired = false;
    let medicalRequired = false;

    this.refs.student.updateErrors(fieldErrors);
    if (!form_details.medical_details.hidden) {
      this.refs.medical.updateErrors(fieldErrors);
    }
    if (
      student["isPreSchoolPresent"] &&
      !form_details.pre_school_details.hidden
    ) {
      this.refs.school.updateErrors(fieldErrors);
    }
    if (!form_details.current_address_details.hidden) {
      this.refs.CurrentAddressFields.updateErrors(fieldErrors);
    }
    if (
      !student["current_address_checked"] &&
      !form_details.permanent_address_details.hidden
    ) {
      this.refs.PermanentAddressFields.updateErrors(fieldErrors.permanent);
    }

    student["dob"] = dateFormat(student["dob"], "YYYY-MM-DD");
    student["admission_date"] = dateFormat(
      student["admission_date"],
      "YYYY-MM-DD"
    );

    student["isPreSchoolPresent"] = false;

    if (!is_google_places) {
      if (!form_details.current_address_details.hidden) {
        this.refs.CurrentAddressFields.updateErrors(fieldErrors);
      }
      if (
        student["permanentAddressRequired"] &&
        !form_details.permanent_address_details.hidden
      ) {
        this.refs.PermanentAddressFields.updateErrors(fieldErrors.permanent);
      }
    }

    let showError = "";

    schoolDetails.map((data) => {
      if (data.default !== "") {
        student["isPreSchoolPresent"] = true;
      }
    });

    if (!isEditForm && !auto_login_create) {
      if (!Boolean(student["username"]) || userNameExist) {
        fieldErrors["username"] = userNameExist
          ? "Username Exist Please Change"
          : "Username is Mandatory";
        loginTest = false;
      }
      if (userLoading) {
        fieldErrors["username"] = "Checking Username Exist or Not";
        loginTest = false;
      }
      if (!Boolean(student["password"])) {
        fieldErrors["password"] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        loginTest = false;
      }
    }

    if (!is_google_places) {
      permanentAddressDetails.map((data) => {
        if (data.default === "" || data.default === null) {
          permanentAddressRequired = false;
        } else {
          permanentAddressRequired = true;
        }
      });
    }
    if (
      student.medical.med_mobile !== "" ||
      student.medical.med_altmobile !== ""
    ) {
      if (
        student.medical.physician_name === "" &&
        student.medical.hospital === "" &&
        student.medical.ins_company === ""
      ) {
        medicalRequired = true;
      }
    }

    // if (is_google_places) {
    //   if (!student["permanentAddress"]["pincode_map"]) {
    //     student["current_address_checked"] = true;
    //   }
    // } else {
    // if (!permanentAddressRequired && !is_google_places) {
    //   // student["current_address_checked"] = true;
    // } else
    if (
      permanentAddressRequired &&
      !form_details.permanent_address_details.hidden &&
      !is_google_places
    ) {
      this.refs.PermanentAddressFields.updateErrors(fieldErrors.permanent);
    }
    // }

    studentDetails.forEach((field) => {
      let value = field.default;
      let name = field.name;
      if (!field.hidden && field.required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        studentTest = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          studentTest = false;
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
        studentTest = false;
      }
    });

    if (!form_details.medical_details.hidden) {
      medicalDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.name === "physician_name") {
          field.required = medicalRequired;
        }
        if (field.required && !Boolean(value)) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          medicalTest = false;
        } else if (field.type === "phone_number") {
          let returnValue = validateMobileNumber(field, value);
          if (!returnValue.test) {
            fieldErrors[name] = returnValue.error;
            medicalTest = false;
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
          medicalTest = false;
        }
      });
    }

    if (!form_details.pre_school_details.hidden) {
      schoolDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.type === "date") {
          if (value) {
            value = dateFormat(value, "YYYY-MM-DD");
          } else {
            value = null;
          }
          student["previous_school_details"][name] = value;
        }
        if (field.required && !Boolean(value)) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          schoolTest = false;
        } else if (
          !field.hidden &&
          field.regex &&
          !field.regex.value.test(value) &&
          Boolean(value)
        ) {
          fieldErrors[name] = field.regex.errorText;
          schoolTest = false;
        }
      });
    }

    if (!is_google_places) {
      if (!form_details.current_address_details.hidden) {
        currentAddressDetails.forEach((field) => {
          let value = field.default;
          let name = field.name;
          if (field.required && !Boolean(value)) {
            fieldErrors[name] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            currentAddressTest = false;
          } else if (field.regex && !field.regex?.value.test(value) && value) {
            fieldErrors[name] = field.regex.errorText;
            currentAddressTest = false;
          }
        });
      }
      if (!form_details.permanent_address_details.hidden) {
        permanentAddressDetails.forEach((field) => {
          let value = field.default;
          let name = field.name;
          // field.required = permanentAddressRequired;
          if (field.required && !Boolean(value)) {
            fieldErrors["permanent"][name] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            permanentAddressTest = false;
          } else if (field.regex && !field.regex.value.test(value) && value) {
            fieldErrors["permanent"][name] = field.regex.errorText;
            permanentAddressTest = false;
          }
        });
      }
    } else {
      if (!form_details.current_address_details.hidden) {
        if (
          student["currentAddress"]["country_map"] &&
          !student["currentAddress"]["address_one_map"]
        ) {
          fieldErrors["address_one_map"] = "This field is mandatory";
          currentAddressTest = false;
        }
        // if (!student['currentAddress']['address_one_map']) {
        //     fieldErrors['address_one_map'] = 'This field is mandatory';
        //     currentAddressTest = false
        // }
        // if (!student['currentAddress']['state_map']) {
        //     fieldErrors['state_map'] = 'This field is mandatory';
        //     currentAddressTest = false
        // }
        // if (!student['currentAddress']['district_map']) {
        //     fieldErrors['district_map'] = 'This field is mandatory';
        //     currentAddressTest = false
        // }
        // if (!student['currentAddress']['city_map']) {
        //     fieldErrors['city_map'] = 'This field is mandatory';
        //     currentAddressTest = false
        // }
        // if (!student['currentAddress']['pincode_map']) {
        //     fieldErrors['pincode_map'] = 'This field is mandatory';
        //     currentAddressTest = false
        // }
      }
      if (
        student["permanentAddressRequired"] &&
        !form_details.permanent_address_details.hidden
      ) {
        if (
          student["permanentAddress"]["country_map"] &&
          !student["permanentAddress"]["address_one_map"]
        ) {
          fieldErrors["permanent"]["address_one_map"] =
            "This field is mandatory";
          permanentAddressTest = false;
        }
        // if (!student['permanentAddress']['state_map']) {
        //     fieldErrors['permanent']['state_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!student['permanentAddress']['district_map']) {
        //     fieldErrors['permanent']['district_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!student['permanentAddress']['city_map']) {
        //     fieldErrors['permanent']['city_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!student['permanentAddress']['pincode_map']) {
        //     fieldErrors['permanent']['pincode_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
      }
    }
    if (
      studentTest &&
      medicalTest &&
      schoolTest &&
      currentAddressTest &&
      permanentAddressTest &&
      handicapTest &&
      loginTest
    ) {
      return student;
    } else {
      this.setState({
        open: true,
        alertData: <FormattedMessage {...commonMessages.clearAllErrors} />,
        fieldErrors,
      });
      this.refs.student.updateErrors(fieldErrors);
      if (!form_details.medical_details.hidden) {
        this.refs.medical.updateErrors(fieldErrors);
      }
      if (!form_details.current_address_details.hidden) {
        this.refs.CurrentAddressFields.updateErrors(fieldErrors);
      }
      if (
        student["isPreSchoolPresent"] &&
        !form_details.pre_school_details.hidden
      ) {
        this.refs.school.updateErrors(fieldErrors);
      }
      if (
        !student["current_address_checked"] &&
        !form_details.permanent_address_details.hidden
      ) {
        this.refs.PermanentAddressFields.updateErrors(fieldErrors.permanent);
      }
      return false;
    }
  };
  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  verifyApplication = (application_number) => {
    let { fieldErrors, entry_academic_year } = this.state;
    if (application_number === "") {
      fieldErrors["applicationNumberMandatory"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      this.setState({
        fieldErrors,
      });
    } else {
      this.setState(
        {
          loadingApplicationButton: true,
        },
        () => {
          this.props.verifyApplication(application_number, entry_academic_year);
        }
      );
    }
  };

  verifyEnquiry = (enquiry_number) => {
    let { fieldErrors } = this.state;
    if (enquiry_number === "") {
      fieldErrors["enquiryNumberMandatory"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      this.setState({
        fieldErrors,
      });
    } else {
      this.setState(
        {
          loadingApplicationButton: true,
        },
        () => {
          this.props.verifyEnquiry(enquiry_number);
        }
      );
    }
  };

  getEnquiry = (name, studentInf) => {
    let { fieldErrors } = this.state;
    if (name === "notFound") {
      fieldErrors["enquiryNotFound"] = (
        <FormattedMessage {...messages.enquiryNotFound} />
      );
      this.setState({
        fieldErrors,
        loadingApplicationButton: false,
        loadingApplication: false,
      });
    }
    if (name === "exist") {
      fieldErrors["enquiryNotFound"] = (
        <FormattedMessage {...messages.enquiryAlreadyExist} />
      );
      this.setState({
        fieldErrors,
        loadingApplicationButton: false,
        loadingApplication: false,
      });
    }
    if (name === "feesNotSet") {
      this.setState({
        loadingApplicationButton: false,
        loadingApplication: false,
      });
    }
    if (name === "studentDetails") {
      this.setState(
        {
          studentDetails: null,
          schoolDetails: null,
          schoolValue: null,
          currentAddressDetails: null,
          isEditCurrentAddress: true,
          isEditReligion: true,
          loadingApplication: true,
          beforeApplication: true,
          isApplicationDataRetrieved: true,
        },
        () => {
          this.getEnquiryStandardList(
            studentInf.entry_academic_year,
            studentInf
          );
        }
      );
    }
  };

  getEnquiryStandardList = (year, studentInf) => {
    let { student } = this.state;
    const url = GET_URL.getstandard.api;
    const params = { academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            standardList: response.data.data,
          },
          () => {
            response.data.data.map((data) => {
              if (
                data.id == studentInf.current_standard &&
                data.codename === "standard11"
              ) {
                student["isSslcPucPresent"] = true;
                student["isPreSchoolPresent"] = true;
              }
              if (
                data.id == studentInf.current_standard &&
                data.codename === "standard12"
              ) {
                student["isSslcPucPresent"] = true;
                student["isPucPresent"] = true;
                student["isPreSchoolPresent"] = true;
              }
            });
            this.setState(
              {
                student,
              },
              () => {
                this.updateStudentInf(studentInf);
                this.updatePreviousSchoolInf(studentInf);
                this.updateCurrentAddress(studentInf.student_details);
              }
            );
          }
        );
      }
    });
  };

  getApplication = (name, studentInf) => {
    let { fieldErrors } = this.state;
    if (name === "studentDetails") {
      this.setState(
        {
          studentDetails: null,
          religionDetails: null,
          schoolDetails: null,
          medicalDetails: null,
          schoolValue: null,
          currentAddressDetails: null,
          permanentAddressDetails: null,
          // isEditCurrentAddress: true,
          loadingApplication: true,
          isApplicationDataRetrieved: true,
        },
        () => {
          this.getStandardList(
            studentInf.entry_academic_year,
            studentInf && studentInf,
            studentInf.student_details && studentInf.student_details.category
          );
        }
      );
    } else {
      fieldErrors["applicationNotFound"] = name;
      this.setState({
        fieldErrors,
        loadingApplicationButton: false,
      });
    }
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  addressChecked = (e) => {
    let { student } = this.state;
    student["current_address_checked"] = e.target.checked;
    if (e.target.checked) {
      let { student } = this.state;
      let { form_details } = this.props;
      let fieldDetail = _.cloneDeep(
        form_details.permanent_address_details.list
      );
      let value;
      fieldDetail.forEach((field) => {
        value = "";
        student.permanentAddress[field["name"]] = value;
      });
      this.setState({
        student,
        permanentAddressDetails: fieldDetail,
      });
    }
    this.setState({
      student,
    });
  };

  removeProfilePic = () => {
    let { student } = this.state;
    student["preview"] = "";
    this.setState(
      {
        student,
      },
      () => {
        this.props.handlePrompt(true);
        this.props.isUpload(true, null, "student");
      }
    );
  };

  handleCloseEnquiryNumber = () => {
    this.setState({
      beforeApplication: true,
      isApplicationDataRetrieved: false,
    });
    this.props.emptyStudentDetails();
  };

  handleKeyDown = (e) => {
    let { student, isApplicationDataRetrieved } = this.state;
    if (e.key === "Enter" && !isApplicationDataRetrieved) {
      this.verifyApplication(student["application_number"]);
    }
  };

  onChangePresentSchool = (e) => {
    const { student } = this.state; // Add this line to get student from state

    const { name, value } = e.target;
    
    let updatedStudent = {
        ...student,
        [name]: value === "true",
    };

    if (!updatedStudent[name]) {
        updatedStudent.previous_school_details = {
            sslcMarks: {},
            pucMarks: {},
            sslc: {},
            puc: {},
            language: {},
            extraActivity: {},
        };
    }

    this.setState({
        student: updatedStudent
    });
  };

  onBlurUserExistCheck = async (e) => {
    let { fieldErrors, admission_num } = this.state;
    let { name, value } = e.target;
    if (value === "") {
      fieldErrors[name] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      this.setState({
        fieldErrors,
      });
      return;
    }
    if (name === "admission_num" && value !== admission_num) {
      this.validateAdmissionExist(name, value);
    } else if (name === "username") {
      this.validateNameExist(name, value);
    }
  };

  validateAdmissionExist = async (name, value) => {
    let returnValue = true;
    let { fieldErrors } = this.state;
    if (!value) {
      fieldErrors["admission_num"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      this.setState({
        fieldErrors,
      });
      return;
    }
    this.setState({ userLoading: true });
    let postdata = { admission_num: value };
    const post_url = POST_URL.checkadmissionnumexist.api;
    let props = { ...this.props };
    props["return_error"] = true;
    await postRequest(post_url, postdata, props).then((response) => {
      if (response && response.status === 200) {
        delete fieldErrors["admission_num"];
        this.setState({
          [name]: value,
          userLoading: false,
          userNameExist: false,
          fieldErrors: fieldErrors,
        });
      } else {
        fieldErrors["admission_num"] = (
          <FormattedMessage {...messages.userAlreadyExist} />
        );
        this.setState({
          fieldErrors: fieldErrors,
          userNameExist: true,
          userLoading: false,
        });
        returnValue = false;
      }
    });
    return returnValue;
  };

  validateNameExist = async (name, value) => {
    let returnValue = true;
    let { fieldErrors } = this.state;
    if (!value) {
      fieldErrors["username"] = (
        <FormattedMessage {...commonMessages.fieldMandatoryError} />
      );
      this.setState({
        fieldErrors,
      });
      return;
    }
    this.setState({ userLoading: true });
    let postdata = { username: value };
    const post_url = POST_URL.checkusernamenotexist.api;
    let props = { ...this.props };
    props["return_error"] = true;
    await postRequest(post_url, postdata, props).then((response) => {
      if (response && response.status === 200) {
        delete fieldErrors["username"];
        this.setState({
          [name]: value,
          userLoading: false,
          userNameExist: false,
          fieldErrors: fieldErrors,
        });
      } else {
        fieldErrors["username"] = (
          <FormattedMessage {...messages.userAlreadyExist} />
        );
        this.setState({
          fieldErrors: fieldErrors,
          userNameExist: true,
          userLoading: false,
        });
        returnValue = false;
      }
    });
    return returnValue;
  };

  handleExistingStudent = () => {
    const { student } = this.state;
    student["is_existing_student"] = !student["is_existing_student"];
    this.setState(
      {
        beforeApplication: false,
        student,
      },
      () => {
        if (!student.is_existing_student) {
          this.handleCloseEnquiryNumber();
        } else {
          this.props.hideTabsAndNext();
        }
      }
    );
  };

  updateCurrentParentAddress = (address) => {
    let { student } = this.state;
    student["currentAddress"] = address;
    this.setState({
      student,
    });
  };

  updatePermanentParentAddress = (address) => {
    let { student } = this.state;
    student["permanentAddress"] = address;
    this.setState({
      student,
    });
  };

  addSibling = (newStudent) => {
    let { student } = this.state;
    student.siblingList.push(newStudent);
    if (newStudent.sibling_data && newStudent.sibling_data.length > 1) {
      let temp = {};
      newStudent.sibling_data.map((data) => {
        if (data["student_id"] !== newStudent["id"]) {
          temp = {};
          temp["id"] = data["student_id"];
          temp["full_name"] = getFullName(
            data["student__first_name"],
            data["student__middle_name"],
            data["student__last_name"]
          );
          temp["current_standard_name"] = data["standard_name"];
          temp["current_standard_section_name"] = data["section_name"];
          temp["dob"] = data["student__dob"];
          temp["gender"] = data["student__gender"];
          student.siblingList.push(temp);
        }
      });
    }
    this.setState({ student }, () => {
      this.updateSiblingFormat();
    });
  };

  updateSiblingFormat = () => {
    let { student } = this.state;
    student.sibling_data = [];
    student.existingSiblings = [];
    let addedSelf = false;
    let relation_name_temp = "";
    student.dob = dateFormat(student.dob, "YYYY-MM-DD");
    student.siblingList.sort((a, b) => (a.dob > b.dob ? 1 : -1));
    student.siblingList.map((data, index) => {
      if (data["dob"] > student.dob) {
        data["relation_label"] =
          data.gender === "Boy" ? "Younger Brother" : "Younger Sister";
        data["relation_name"] =
          data.gender === "Boy" ? "youngerbrother" : "youngersister";
      } else if (data["dob"] < student.dob) {
        data["relation_label"] =
          data.gender === "Boy" ? "Elder Brother" : "Elder Sister";
        data["relation_name"] =
          data.gender === "Boy" ? "elderbrother" : "eldersister";
      } else {
        data["relation_label"] = "Twins";
        data["relation_name"] = "twins";
      }
      student.existingSiblings.push(data["id"]);
      if (index === 0) {
        if (data["dob"] >= student.dob) {
          student.sibling_data.push({
            student: "self",
            student_parent_tree: null,
          });
          student.sibling_data.push({
            student: data.id,
            student_parent_tree: "self",
          });
          addedSelf = true;
        } else {
          student.sibling_data.push({
            student: data.id,
            student_parent_tree: null,
          });
        }
      } else {
        if (!addedSelf && data["dob"] >= student.dob) {
          student.sibling_data.push({
            student: "self",
            student_parent_tree: student.siblingList[index - 1]["id"],
          });
          student.sibling_data.push({
            student: data.id,
            student_parent_tree: "self",
          });
          addedSelf = true;
        } else {
          student.sibling_data.push({
            student: data.id,
            student_parent_tree: student.siblingList[index - 1]["id"],
          });
        }
      }
    });
    if (!addedSelf && student.siblingList.length > 0) {
      relation_name_temp =
        student.siblingList[student.siblingList.length - 1]?.gender === "Boy"
          ? "elderbrother"
          : "eldersister";
      student.sibling_data.push({
        student: "self",
        student_parent_tree:
          student.siblingList[student.siblingList.length - 1]?.["id"],
      });
    }
    this.setState({ student });
  };

  handleDeleteSibling = (index) => {
    let { student } = this.state;
    student.siblingList.splice(index, 1);
    this.setState({ student }, () => {
      this.updateSiblingFormat();
    });
  };

  handleCloseSibling = () => {
    this.setState({
      openDialog: false,
    });
  };

  handleAddStudents = () => {
    this.setState({ openDialog: true });
  };

  handleClickCamera = () => {
    // Use the CameraUpload component
    if (this.cameraUploadRef && this.cameraUploadRef.current) {
      this.cameraUploadRef.current.handleOpen();
    } else {
      console.error("Camera upload reference is not available");
      this.setState({
        open: true,
        alertData: "Camera component is not initialized. Please try again."
      });
    }
  };
  
  // Update student data with profile picture information
  updateStudentProfilePicture = (profileData) => {
    let { student } = this.state;
    
    // Update student with the new profile picture
    student["preview"] = profileData.preview;
    student["profile_pic"] = profileData.profile_pic;
    student["profile_pic_name"] = profileData.profile_pic_name;
    
    this.setState({ student });
    
    // Call the isUpload method from props
    this.props.isUpload(true, profileData.profile_pic, "student");
  };


  render() {
    const {
      open,
      alertData,
      loading,
      studentDetails,
      student,
      medicalDetails,
      is_application,
      currentAddressDetails,
      permanentAddressDetails,
      loadingApplication,
      beforeApplication,
      fieldErrors,
      loadingApplicationButton,
      isThereValuePermanentAddress,
      isEditCurrentAddress,
      enableUploadIcons,
      isApplicationDataRetrieved,
      schoolDetails,
      userLoading,
      isEnquiryForm,
      showPassword,
      sslcMarksDetails,
      pucMarksDetails,
      sslcDetails,
      pucDetails,
      secondLanguageDetails,
      mediumInstructionDetails,
      bankDetails,
      extraActivitiesDetails,
      isSibling,
      openDialog,
      isAddressExist,
      auto_login_create,
      entry_academic_year,
      readmission,
      is_google_places,
      handleOpenCamera,
      is_profile_pic_can_capture,
    } = this.state;
    const { isEditForm, loadingForm, form_details } = this.props;
    return (
      <div>
        {!isEditForm && (
          <Paper onKeyDown={this.handleKeyDown}>
            {!isEnquiryForm && !student.is_existing_student && (
              <IsFromApplicationForm
                student={student}
                fieldErrors={fieldErrors}
                loadingApplicationButton={loadingApplicationButton}
                isApplicationDataRetrieved={isApplicationDataRetrieved}
                isEditForm={isEditForm}
                loadingForm={loadingForm}
                onChangeStudent={this.onChangeStudent}
                verifyApplication={this.verifyApplication}
                handleCloseEnquiryNumber={this.handleCloseEnquiryNumber}
              />
            )}
            {isEnquiryForm && !student.is_existing_student && (
              <IsEnquiryForm
                student={student}
                fieldErrors={fieldErrors}
                loadingEnquiryButton={loadingApplicationButton}
                isEnquiryDataRetrieved={isApplicationDataRetrieved}
                isEditForm={isEditForm}
                loadingForm={loadingForm}
                onChangeStudent={this.onChangeStudent}
                verifyEnquiry={this.verifyEnquiry}
                handleCloseEnquiryNumber={this.handleCloseEnquiryNumber}
              />
            )}
            {readmission && (
              <ReAdmissionStudentList year={entry_academic_year} />
            )}
          </Paper>
        )}
        {!!!isEditForm &&
          !!!student.is_existing_student &&
          !!!isApplicationDataRetrieved &&
          !!is_application && (
            <Box className="margin-top-15">
              <Button
                variant="contained"
                onClick={(e) => this.handleExistingStudent()}
                className="editbutton-view margin-top-10"
              >
                Existing Student
              </Button>
            </Box>
          )}
        {!!!isEditForm &&
          !!student.is_existing_student &&
          !!!isApplicationDataRetrieved &&
          !!is_application && (
            <Box className="margin-top-15">
              <Button
                variant="contained"
                onClick={(e) => this.handleExistingStudent()}
                className="editbutton-view margin-top-10"
              >
                From Application
              </Button>
            </Box>
          )}
        <Paper
          className={
            beforeApplication
              ? "display-none"
              : "paper-plain-background m-b-10px"
          }
        >
          {beforeApplication && loadingApplication && (
            <Box display="flex">
              <CircularProgress className="enquiry-for-application-loading" />
            </Box>
          )}
          <Box className={beforeApplication ? "display-none" : ""}>
            <Box className="display-flex">
              <Box className="form-left-heading align-self-center">
                {form_details.student_details.label}
              </Box>
              <Box className="profile-pic-position">
                <label className="staff-profile-camera-position">
                  {/* Changed to handleClickCamera to show options */}
                  <Button
                    variant="raised"
                    component="span"
                    className="profile-pic-button"
                    onClick={this.handleClickCamera}
                  >
                    <i className="fa fa-camera fa-lg" aria-hidden="true"></i>
                  </Button>
                </label>
                {/* CameraUpload component */}
                <CameraUpload
                  ref={this.cameraUploadRef}
                  id="student"
                  studentUpdateCallback={this.updateStudentProfilePicture}
                />
                {student.preview !== "" && enableUploadIcons && (
                  <Box className="avatar-profile-pic-position">
                    <Avatar
                      src={student.preview}
                      alt="Preview"
                      className="hr-profile-pic"
                    />
                    <HighlightOffIcon
                      className="image-cross-remove"
                      onClick={() => this.removeProfilePic("student")}
                    />
                  </Box>
                )}
                {!enableUploadIcons && (
                  <Box className="upload-profile-loading">
                    <CircularProgress />
                  </Box>
                )}
                {student.preview === "" && enableUploadIcons && (
                  <Avatar
                    src={blankProfile}
                    alt="Preview"
                    className="hr-profile-pic"
                  />
                )}
              </Box>
            </Box>
            {/* <Grid container className='mb-20' spacing={2}>
                            <Grid item md={4} xs={12} sm={12}>
                                <TextField
                                    id='outlined-name'
                                    label='Admission No.'
                                    name='admission_num'
                                    autoComplete="off"
                                    // disabled={isEditForm ? true : false}
                                    value={student['admission_num']}
                                    onChange={(e) => this.onChangeStudent(e)}
                                    onBlur={(e) => this.onBlurUserExistCheck(e)}
                                    InputProps={{
                                        endAdornment: (
                                            userLoading ?
                                                <CircularProgress size={30} /> : ''
                                        )
                                    }}
                                    margin='normal'
                                    className='width-form-90'
                                    required={true}
                                    variant='outlined'
                                    helperText={(fieldErrors.admission_num && fieldErrors.admission_num) || (student['admission_num'] === '' ? 'admission_num can be Email or Mobile Number' : '')}
                                    error={fieldErrors && (fieldErrors.admission_num || fieldErrors.admission_num ? true : false)}
                                    inputProps={{ maxLength: 50 }}
                                />
                            </Grid>
                        </Grid> */}
            {studentDetails && (
              <DynamicForm
                fieldDetails={studentDetails}
                updateParent={this.updateStudent}
                isEditForm={isEditForm}
                loading={
                  is_application
                    ? beforeApplication
                    : student["enquiry_number"] === ""
                    ? loading
                    : beforeApplication
                }
                ref={"student"}
                idFormat={"admission_2022_08_11_01_23_pm_"}
                parentValues={student}
              />
            )}
            <Box mt={3} mb={3}>
              <Divider />
            </Box>
          </Box>

          {!auto_login_create && (
            <>
              <Box className="form-left-heading m-t-20px m-b-20px">
                <FormattedMessage {...messages.loginDetails} />
              </Box>
              <Grid container>
                <Grid item md={4} xs={12} sm={12}>
                  <TextField
                    id="outlined-name"
                    label="Username"
                    name="username"
                    autoComplete="off"
                    disabled={isEditForm ? true : false}
                    value={student["username"]}
                    onChange={(e) => this.onChangeStudent(e)}
                    onBlur={(e) => this.onBlurUserExistCheck(e)}
                    InputProps={{
                      endAdornment: userLoading ? (
                        <CircularProgress size={30} />
                      ) : (
                        ""
                      ),
                    }}
                    margin="normal"
                    className="width-form-90"
                    required={true}
                    variant="outlined"
                    helperText={
                      (fieldErrors.username && fieldErrors.username) ||
                      (student["username"] === ""
                        ? "Username can be Email or Mobile Number"
                        : "")
                    }
                    error={
                      fieldErrors &&
                      (fieldErrors.username || fieldErrors.username
                        ? true
                        : false)
                    }
                    inputProps={{ maxLength: 50 }}
                  />
                </Grid>
                {!isEditForm && (
                  <Grid item md={4} xs={12} sm={12}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      value={student["password"]}
                      autoComplete={false}
                      onChange={(e) => this.onChangeStudent(e)}
                      onBlur={(e) => this.BlurValidation(e)}
                      name="password"
                      margin="normal"
                      className="width-form-90"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              aria-label="toggle password visibility"
                              onClick={this.handleClickShowPassword}
                              style={{ padding: "2px", marginRight: "-3px" }}
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      required={true}
                      helperText={
                        fieldErrors &&
                        (fieldErrors.password || fieldErrors.password)
                      }
                      error={
                        fieldErrors &&
                        (fieldErrors.password || fieldErrors.password
                          ? true
                          : false)
                      }
                      inputProps={{ maxLength: 50 }}
                    />
                  </Grid>
                )}
              </Grid>
              <Box mt={3} mb={3}>
                <Divider />
              </Box>
            </>
          )}
          {!form_details.medical_details.hidden && (
            <>
              <Box className="form-left-heading m-t-20px m-b-20px">
                {form_details.medical_details.label}
              </Box>
              {medicalDetails && (
                <DynamicForm
                  fieldDetails={medicalDetails}
                  updateParent={this.updateMedical}
                  loading={loading}
                  ref={"medical"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
              )}
              <Box mt={3} mb={3}>
                <Divider />
              </Box>
            </>
          )}

          {!form_details.bank_details.hidden && (
            <>
              <Box className="form-left-heading m-t-20px m-b-20px">
                {form_details.bank_details.label}
              </Box>
              {bankDetails && (
                <DynamicForm
                  fieldDetails={bankDetails}
                  updateParent={this.updateBank}
                  loading={loading}
                  ref={"bank"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
              )}
              <Box mt={3} mb={3}>
                <Divider />
              </Box>
            </>
          )}

          {!form_details.current_address_details.hidden && (
            <>
              <Box className="form-left-heading m-t-20px m-b-20px">
                {form_details.current_address_details.label}
              </Box>
              {loading && <CircularProgress />}
              {currentAddressDetails && !is_google_places && (
                <AddressFields
                  addressDetails={currentAddressDetails}
                  isEditForm={isEditCurrentAddress}
                  updateParentAddress={this.updateCurrentAddress}
                  loadingCountry={beforeApplication}
                  updateList={this.updateCurrentAddressList}
                  ref={"CurrentAddressFields"}
                />
              )}
              {!beforeApplication && is_google_places && (
                <AutoCompleteAddress
                  addressDetails={student.currentAddress}
                  updateParentAddress={this.updateCurrentParentAddress}
                  isEditForm={isEditCurrentAddress}
                  ref={"CurrentAddressFields"}
                  address_placeHolder={"Search place"}
                  isAddressExist={isAddressExist}
                />
              )}
              <Box mt={3} mb={3}>
                <Divider />
              </Box>
            </>
          )}

          {!form_details.current_address_details.hidden &&
            !form_details.permanent_address_details.hidden && (
              <Grid
                container
                className={beforeApplication ? "display-none" : ""}
              >
                <Grid item md={8}>
                  <label>
                    <input
                      type="checkbox"
                      checked={student["current_address_checked"]}
                      onChange={(e) => {
                        this.addressChecked(e);
                      }}
                    />
                    <span>
                      <FormattedMessage
                        {...messages.permanentAddressIsSameLabel}
                      />{" "}
                    </span>
                  </label>
                </Grid>
              </Grid>
            )}

          {!student["current_address_checked"] &&
            !form_details.permanent_address_details.hidden && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  {form_details.permanent_address_details.label}
                </Box>
                {loading && <CircularProgress />}
                {permanentAddressDetails && !is_google_places && (
                  <AddressFields
                    addressDetails={permanentAddressDetails}
                    isEditForm={isThereValuePermanentAddress}
                    updateParentAddress={this.updatePermanentAddress}
                    updateList={this.updatePermanentAddressList}
                    loadingCountry={beforeApplication}
                    ref={"PermanentAddressFields"}
                  />
                )}
                {!beforeApplication && is_google_places && (
                  <AutoCompleteAddress
                    addressDetails={student.permanentAddress}
                    updateParentAddress={this.updatePermanentParentAddress}
                    isEditForm={isThereValuePermanentAddress}
                    ref={"PermanentAddressFields"}
                    address_placeHolder={"Search place"}
                  />
                )}
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}
          {!form_details.pre_school_details.hidden && (
            <>
              <Box className="form-left-heading m-t-20px m-b-20px">
                {form_details.pre_school_details.label}
              </Box>
              {schoolDetails && (
                <DynamicForm
                  fieldDetails={schoolDetails}
                  updateParent={this.updatePreviousSchool}
                  loading={beforeApplication}
                  ref={"school"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
              )}
              <Box mt={3} mb={3}>
                <Divider />
              </Box>
            </>
          )}
          {student["isSslcPucPresent"] &&
            sslcDetails &&
            !form_details.sslc_details.hidden && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  {form_details.sslc_details.label}
                </Box>
                <DynamicForm
                  fieldDetails={sslcDetails}
                  updateParent={this.updateSslc}
                  loading={beforeApplication}
                  ref={"sslc"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}

          {student["isSslcPucPresent"] &&
            student["isPucPresent"] &&
            pucDetails &&
            !form_details.puc_details.hidden && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  {form_details.puc_details.label}
                </Box>
                <DynamicForm
                  fieldDetails={pucDetails}
                  updateParent={this.updatePuc}
                  loading={beforeApplication}
                  ref={"puc"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}

          {student["isSslcPucPresent"] &&
            secondLanguageDetails &&
            !form_details.second_language_details.hidden && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  {form_details.second_language_details.label}
                </Box>
                <DynamicForm
                  fieldDetails={secondLanguageDetails}
                  updateParent={this.updateSecondLanguage}
                  loading={beforeApplication}
                  ref={"secondLanguage"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}

          {student["isSslcPucPresent"] &&
            mediumInstructionDetails &&
            !form_details.medium_instruction_details.hidden && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  {form_details.medium_instruction_details.label}
                </Box>
                <DynamicForm
                  fieldDetails={mediumInstructionDetails}
                  updateParent={this.updateMediumInstruction}
                  loading={beforeApplication}
                  ref={"mediumInstruction"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </>
            )}

          {student["isSslcPucPresent"] &&
            sslcMarksDetails &&
            (!form_details.sslc_mark_details.hidden ||
              !form_details.puc_mark_details.hidden) && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  Subject With Marks Details
                </Box>
                {!form_details.sslc_mark_details.hidden && sslcMarksDetails && (
                  <>
                    <Box className="form-left-heading m-t-20px m-b-20px">
                      {form_details.sslc_mark_details.label}
                    </Box>
                    <DynamicForm
                      fieldDetails={sslcMarksDetails}
                      updateParent={this.updateSslcMarks}
                      loading={beforeApplication}
                      ref={"sslcMarks"}
                      idFormat={"admission_2022_08_11_01_23_pm_"}
                    />
                    <Box mt={3} mb={3}>
                      <Divider />
                    </Box>
                  </>
                )}
                {student["isPucPresent"] &&
                  pucMarksDetails &&
                  !form_details.puc_mark_details.hidden && (
                    <>
                      <Box className="form-left-heading m-t-20px m-b-20px">
                        {form_details.puc_mark_details.label}
                      </Box>
                      <DynamicForm
                        fieldDetails={pucMarksDetails}
                        updateParent={this.updatePucMarks}
                        loading={loading}
                        ref={"pucMarks"}
                        idFormat={"admission_2022_08_11_01_23_pm_"}
                      />
                      <Box mt={3} mb={3}>
                        <Divider />
                      </Box>
                    </>
                  )}
              </>
            )}
          {!form_details.extra_activity_details.hidden &&
            extraActivitiesDetails && (
              <>
                <Box className="form-left-heading m-t-20px m-b-20px">
                  {form_details.extra_activity_details.label}
                </Box>
                <DynamicForm
                  fieldDetails={extraActivitiesDetails}
                  updateParent={this.updateExtraActivity}
                  loading={beforeApplication}
                  ref={"extraActivities"}
                  idFormat={"admission_2022_08_11_01_23_pm_"}
                />
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
        {!beforeApplication &&
          isSibling &&
          !form_details.sibling_details.hidden && (
            <Paper className="paper-plain-background header-align mb-20 pb-20">
              <Box className="form-left-heading pt-20">Sibling Details</Box>
              <div className="staff-list-assigned-shift pb-20">
                Note: Can add only sibling of this school
              </div>
              {student.siblingList.length > 0 && (
                <Grid container>
                  <Grid item md={8} xs={12}>
                    <TableContainer className="add-sibling-table header-align m-b-60px">
                      <Table
                        size="small"
                        aria-label="simple table"
                        className="exam-mark-row-table"
                      >
                        <TableHead>
                          <TableRow className="">
                            <TableCell className="selectable-table-head text-align-center">
                              Student
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Standard
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Section
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              DOB
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Relation
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Action
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {student.siblingList.map((stdData, index) => {
                            return (
                              <TableRow className="">
                                <TableCell className="text-align-center">
                                  {stdData.full_name}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {stdData.current_standard_name}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {stdData.current_standard_section_name}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {dateFormat(stdData.dob, "DD-MM-YYYY")}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {stdData.relation_label}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  <DeleteOutlineIcon
                                    onClick={() =>
                                      this.handleDeleteSibling(index)
                                    }
                                    className="text-red cursor-pointer"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              )}
              {!form_details.sibling_details.hidden && (
                <Button
                  variant="contained"
                  color="primary"
                  className="custom-button"
                  onClick={() => this.handleAddStudents()}
                >
                  Add Sibling
                </Button>
              )}
              {openDialog && (
                <AddStudentAdmission
                  addSibling={this.addSibling}
                  handleClose={this.handleCloseSibling}
                  existingSiblings={student.existingSiblings}
                  studentId={student.id}
                />
              )}
            </Paper>
          )}
      </div>
    );
  }
}

export default AdmissionStudentInformation;

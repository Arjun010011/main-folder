import React, { Component } from "react";
import {
  Grid,
  CircularProgress,
  Box,
  Button,
  Paper,
  Divider,
  Avatar,
} from "@material-ui/core";
import _ from "lodash";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

import DynamicForm from "Components/DynamicForm";
import blankProfile from "images/blank_profile_pic.png";
import AddressFields from "Components/AddressFields";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import {
  getKeyValueMap,
  dateFormat,
  getElementOfIdInArray,
  getSettingValue,
  validateMobileNumber,
} from "Includes/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from "sweetalert2";
import { maxFileSize, image_formats } from "Constants";
import "./styles.scss";
import IsEnquiryForm from "Containers/StudentForms/Components/IsEnquiryForm";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import AutoCompleteAddress from "Components/AutoCompleteAddress";
import ExistingApplication from "./Components/ExistingApplication";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const isResidential = parseInt(getSettingValue("is_residential"));

class ApplicationStudentInformation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      datalist: {},
      medicalDetails: null,
      studentDetails: null,
      schoolDetails: null,
      schoolValue: null,
      currentAddressDetails: null,
      permanentAddressDetails: null,
      isThereValuePermanentAddress: false,
      isEditCurrentAddress: false,
      isEditReligion: false,
      entry_academic_year: null,
      addressValue: {},
      student: {
        currentAddress: {},
        permanentAddress: {},
        medical: {},
        isEnquiry: "no",
        previous_school_details: {},
        enquiry_number: "",
        current_address_checked: false,
        profile_pic: "",
        preview: "",
        handicap_reason: "",
        isPreSchoolPresent: false,
        custom_form_data: {},
      },
      open: false,
      alertData: "",
      loadingEnquiry: false,
      currentAddressDatalist: 0,
      permanentAddressDatalist: 0,
      loading: true,
      enableUploadIcons: true,
      isEnquiryDataRetrieved: false,
      prevStandardList: null,
      nationalList: null,
      religionList: null,
      categoryList: null,
      documentList: null,
      isAddressExist: true,
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
  }

  async componentDidMount() {
    try {
      const res = await Promise.all([
        getRequest(GET_URL.nationality.api, {}, this.props),
        getRequest(GET_URL.religion.api, {}, this.props),
        getRequest(GET_URL.category.api, {}, this.props),
        getRequest(GET_URL.documenttype.api, {}, this.props),
      ]);
      this.getNationalList(res[0]);
      this.getReligionList(res[1]);
      this.getCategoryList(res[2]);
      this.getDocumetList(res[3]);
      this.getYearList();
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
      this.setState({
        documentList: doc_list,
      });
    }
  };

  getYearList = async () => {
    let { isEditForm, yearInformation } = this.props;
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
            if (isEditForm && this.props.studentDetail.student_details) {
              this.getStandardList(
                this.props.studentDetail.entry_academic_year,
                this.props.studentDetail.student_details.category
              );
            } else {
              this.getStandardList(yearInformation.year);
            }
          }
        );
      }
    });
  };

  getStandardList = (year, category) => {
    const { isEditForm } = this.props;
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
            if (isEditForm) {
              this.getCasteList(category);
            } else {
              this.updateStudentInf();
              this.updateMedicalInf();
              this.updatePreviousSchoolInf();
              this.updateCurrentAddress();
              this.updatePermanentAddress();
            }
          }
        );
      }
    });
  };

  getCasteList = (value) => {
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
            student["current_address_checked"] = false;
            this.props.studentDetail.student_address.map((field) => {
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
                // student["current_address_checked"] = field.country
                //   ? true
                //   : false;
                if (field.country) {
                  this.setState({
                    isThereValuePermanentAddress: true,
                  });
                }
              }
            });
            this.updateStudentInf(this.props.studentDetail);
            if (this.props.studentDetail.student_details) {
              this.updateMedicalInf(this.props.studentDetail);
            } else {
              this.updateMedicalInf();
            }
            if (this.props.studentDetail.student_details) {
              this.updatePreviousSchoolInf(this.props.studentDetail);
            } else {
              this.updatePreviousSchoolInf();
            }
            this.updateCurrentAddress(currentAddress && currentAddress);
            this.updatePermanentAddress(permanentAddress && permanentAddress);
            this.setState({
              student,
              year_name: this.props.studentDetail.entry_academic_year_value,
            });
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

  updateCurrentAddressList = (datalist) => {
    let {
      currentAddressDatalist,
      permanentAddressDatalist,
      isEditCurrentAddress,
      isThereValuePermanentAddress,
    } = this.state;
    currentAddressDatalist = datalist;
    this.setState(
      {
        currentAddressDatalist: datalist,
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
    this.setState({
      loading: false,
      loadingEnquiryButton: false,
      loadingEnquiry: false,
    });
    this.props.loadingFalse();
  };

  updatePermanentAddressList = (datalist) => {
    const {
      currentAddressDatalist,
      permanentAddressDatalist,
      isEditCurrentAddress,
      isThereValuePermanentAddress,
    } = this.state;
    this.setState(
      {
        permanentAddressDatalist: datalist,
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
        image_temp["file"] = data.document_details["file_name"];
        image_temp["file_extension"] = `${data.document_details[
          "file_name"
        ].slice(
          (Math.max(0, data.document_details["file_name"].lastIndexOf(".")) ||
            Infinity) + 1
        )}`.toLowerCase();
        image_temp["url"] = data?.document_details?.["file"];
        image_temp["uploadedId"] = data?.document_details?.["id"];
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

  updateStudentInf = (studentInf) => {
    const { isEditForm, form_details } = this.props;
    let {
      student,
      yearList,
      standardList,
      entry_academic_year,
      nationalList,
      religionList,
      categoryList,
      casteList,
      documentList,
    } = this.state;
    let fieldDetail = _.cloneDeep(form_details.student_details.list);
    let value;
    let id = null;
    if (studentInf) {
      id = studentInf["profile_pic_details"]
        ? studentInf["profile_pic_details"]["id"]
        : null;
      student["preview"] = studentInf["profile_pic_details"]
        ? studentInf["profile_pic_details"]["file"]
        : "";
      this.props.isUpload(true, id);
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
          value =
            studentInf.student_details?.[field["name"]] ??
            studentInf?.[field["name"]] ??
            field.default;
        }
        if (studentInf["enquiry_date"] && field["name"] === "enquiry_date") {
          field.disabled = true;
        }
      } else {
        value = field.default;
      }
      if (field.name === "entry_academic_year") {
        field["list"] = yearList;
        field["hidden"] = true;
        value = entry_academic_year;
        let entry_academic_year_value = getKeyValueMap(yearList, "id", "name");
        student["entry_academic_year_value"] = entry_academic_year_value[value];
        if (isEditForm) {
          field["disabled"] = true;
        }
      } else if (field.name === "current_standard") {
        field["list"] = standardList;
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
        if (studentInf && studentInf["student_details"]) {
          student["category_name"] = studentInf["student_details"][
            "category_name"
          ]
            ? studentInf["student_details"]["category_name"]
            : "";
        }
      } else if (field.name === "caste") {
        if (studentInf && studentInf["student_details"]) {
          field["list"] = casteList;
          if (studentInf["student_details"]?.["caste"]) {
            value = getElementOfIdInArray(
              casteList,
              studentInf["student_details"]["caste"]
            );
            student["caste_name"] = studentInf["student_details"]["caste_name"]
              ? studentInf["student_details"]["caste_name"]
              : "";
          }
        }
      } else if (field.name === "application_date") {
        if (!isEditForm) {
          value = new Date();
        }
      }

      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student[field["name"]] = value;
      }
      field.default = value;
    });
    this.setState({
      student,
      studentDetails: fieldDetail,
    });
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
    let { student, prevStandardList } = this.state;
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
      if (field.name === "left_standard") {
        field.list = prevStandardList;
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

  updateStudent = (name, value, list) => {
    let {
      student,
      studentDetails,
      yearList,
      nationalList,
      religionList,
      categoryList,
      fieldErrors,
    } = this.state;
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
    this.props.handlePrompt(true);
    if (name === "entry_academic_year") {
      let entry_academic_year_value = getKeyValueMap(yearList, "id", "name");
      student["entry_academic_year_value"] = entry_academic_year_value[value];
      this.setState(
        {
          student,
        },
        () => {
          if (student["current_standard"] !== "") {
            this.checkApplicationFees(name, value, student["current_standard"]);
          }
        }
      );
    } else if (name === "current_standard") {
      let current_standard_name = getKeyValueMap(list[name], "id", "name");
      student["current_standard_name"] = current_standard_name[value];
      this.setState(
        {
          student,
        },
        () => {
          if (student["entry_academic_year"] !== "") {
            this.checkApplicationFees(
              name,
              student["entry_academic_year"],
              value
            );
          }
        }
      );
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
    } else if (name === "physically_handicaped" && !value) {
      student["handicap_reason"] = "";
      delete fieldErrors["handicap_reason"];
    }
    this.setState({
      student,
      fieldErrors,
    });
  };

  checkApplicationFees = (name, academic_year, standard) => {
    const { student, studentDetails } = this.state;
    let feeApi = GET_URL.applicationFeesPlan.api;
    let params = { academic_year: academic_year, standard: standard };
    getRequest(feeApi, params, this.props).then((amountData) => {
      if (amountData && amountData.status === 200) {
        if (amountData.data.data.amount === null) {
          Swal.fire({
            type: "info",
            title: `Fees is not set for ${student["current_standard_name"]} for ${student["entry_academic_year_value"]}`,
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
  };

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

  onChangeStudent = (e) => {
    let { name, value } = e.target;
    let { fieldErrors, student } = this.state;
    if (name === "physically_handicaped" && !value) {
      student["handicap_reason"] = "";
    } else if (name === "isEnquiry" && value === "no") {
      student["enquiry_number"] = "";
    }
    delete fieldErrors["handicap_reason"];
    delete fieldErrors["enquiryNumberMandatory"];
    delete fieldErrors["enquiryNotFound"];
    student[name] = value;
    this.setState({
      student,
      fieldErrors: fieldErrors,
    });
    this.props.handlePrompt(true);
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
      is_google_places,
    } = this.state;
    const { form_details } = this.props;
    fieldErrors = { permanent: {}, current: {} };
    let studentTest = true;
    let handicapTest = true;
    let medicalTest = true;
    let schoolTest = true;
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

    if (!is_google_places) {
      if (!form_details.current_address_details.hidden) {
        this.refs.CurrentAddressFields.updateErrors(fieldErrors.current);
      }
      if (
        student["permanentAddressRequired"] &&
        !form_details.permanent_address_details.hidden
      ) {
        this.refs.PermanentAddressFields.updateErrors(fieldErrors.permanent);
      }
    }

    student["dob"] = dateFormat(student["dob"], "YYYY-MM-DD");
    student["application_date"] = dateFormat(
      student["application_date"],
      "YYYY-MM-DD"
    );

    student["isPreSchoolPresent"] = false;

    let showError = "";

    schoolDetails.map((data) => {
      if (Boolean(data.default)) {
        student["isPreSchoolPresent"] = true;
      }
    });

    if (!is_google_places) {
      permanentAddressDetails.map((data) => {
        if (data.default === "" || data.default === null) {
          permanentAddressRequired = false;
        } else {
          permanentAddressRequired = true;
        }
      });
    }

    // if (is_google_places) {
    //   if (!student["permanentAddress"]["pincode_map"]) {
    //     student["current_address_checked"] = true;
    //   }
    // } else {
    // if (!permanentAddressRequired && !is_google_places) {
    // student["current_address_checked"] = true;
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
      if (field.required && !Boolean(value) && !field["hidden"]) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        studentTest = false;
      } else if (
        field.dependentParent &&
        student[field.dependentParent] &&
        !Boolean(value)
      ) {
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
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldErrors[name] = field.regex.errorText;
        studentTest = false;
      }
    });

    if (!form_details.medical_details.hidden) {
      medicalDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
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
          field.regex &&
          !field.regex.value.test(value) &&
          value !== ""
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
        if (name === "school_name") {
          field.required = student["isPreSchoolPresent"];
        }
        if (field.required && !Boolean(value)) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          schoolTest = false;
        } else if (
          field.regex &&
          !field.regex.value.test(value) &&
          value !== ""
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
            fieldErrors["current"][name] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            currentAddressTest = false;
          } else if (
            field.regex &&
            !field.regex.value.test(value) &&
            value?.trim()
          ) {
            fieldErrors["current"][name] = field.regex.errorText;
            currentAddressTest = false;
          }
        });
      }
      if (!form_details.permanent_address_details.hidden) {
        permanentAddressDetails.forEach((field) => {
          let value = field.default;
          let name = field.name;
          field.required = permanentAddressRequired;
          if (field.required && !Boolean(value)) {
            fieldErrors["permanent"][name] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            permanentAddressTest = false;
          } else if (
            field.regex &&
            !field.regex.value.test(value) &&
            value !== "" &&
            value?.trim()
          ) {
            fieldErrors["permanent"][name] = field.regex.errorText;
            permanentAddressTest = false;
          }
        });
      }
    } else {
      if (!form_details.current_address_details.hidden) {
        if (
          !student["currentAddress"]["address_one_map"] &&
          student["currentAddress"]["country_map"]
        ) {
          fieldErrors["current"]["address_one_map"] = "This field is mandatory";
          currentAddressTest = false;
        }
      }
      if (
        !student["current_address_checked"] &&
        !form_details.permanent_address_details.hidden
      ) {
        if (
          !student["permanentAddress"]["address_one_map"] &&
          student["permanentAddress"]["country_map"]
        ) {
          fieldErrors["permanent"]["address_one_map"] =
            "This field is mandatory";
          permanentAddressTest = false;
        }
      }
    }

    if (
      studentTest &&
      medicalTest &&
      schoolTest &&
      currentAddressTest &&
      permanentAddressTest &&
      handicapTest
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
        this.refs.CurrentAddressFields.updateErrors(fieldErrors.current);
      }
      if (
        student["isPreSchoolPresent"] &&
        !form_details.permanent_address_details.hidden
      ) {
        this.refs.school.updateErrors(fieldErrors);
      }
      if (
        student["permanentAddressRequired"] &&
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

  verifyEnquiry = (enquiry_number) => {
    let { fieldErrors } = this.state;
    if (enquiry_number === "") {
      fieldErrors["enquiryNumberMandatory"] = (
        <FormattedMessage {...messages.enterEnquiryNumber} />
      );
      this.setState({
        fieldErrors,
      });
    } else {
      this.setState(
        {
          loadingEnquiryButton: true,
        },
        () => {
          this.props.verifyEnquiry(enquiry_number);
        }
      );
    }
  };

  getAdmissionStudentDetails = (studentId) => {
    this.setState(
      {
        loadingEnquiryButton: true,
      },
      () => {
        this.props.getAdmissionStudentDetails(studentId);
      }
    );
  };

  getEnquiry = (name, studentInf) => {
    let { fieldErrors } = this.state;
    let { yearInformation } = this.props;
    if (name === "feesNotSet") {
      this.setState({
        loadingEnquiryButton: false,
        loadingEnquiry: false,
      });
    } else if (name === "studentDetails") {
      this.setState(
        {
          studentDetails: null,
          schoolDetails: null,
          schoolValue: null,
          currentAddressDetails: null,
          isEditCurrentAddress: studentInf.student_details["country"]
            ? true
            : false,
          isEditReligion: true,
          loadingEnquiry: true,
          isEnquiryDataRetrieved: true,
        },
        () => {
          this.getEnquiryStandardList(yearInformation.year, studentInf);
        }
      );
    } else {
      fieldErrors["enquiryNotFound"] = name;
      this.setState({
        fieldErrors,
        loadingEnquiryButton: false,
        loadingEnquiry: false,
      });
    }
  };

  getEnquiryStandardList = (year, studentInf) => {
    const url = GET_URL.getstandard.api;
    const params = { academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            standardList: response.data.data,
            entry_academic_year: year,
          },
          () => {
            this.updateStudentInf(studentInf);
            this.updatePreviousSchoolInf(studentInf);
            this.updateCurrentAddress(studentInf.student_details);
          }
        );
      }
    });
  };

  getExistingApplication = (name, studentInf) => {
    if (name === "studentDetails") {
      this.setState(
        {
          studentDetails: null,
          schoolDetails: null,
          schoolValue: null,
          currentAddressDetails: null,
          isEditCurrentAddress: studentInf.student_details["country"]
            ? true
            : false,
          isEditReligion: true,
          loadingEnquiry: true,
          isExistingDataRetrieved: true,
        },
        () => {
          if (studentInf.student_details.caste) {
            this.getCasteList(studentInf.student_details.category);
          } else {
            this.updateStudentInf(studentInf);
            this.updatePreviousSchoolInf(studentInf);
            this.updateCurrentAddress(studentInf.student_details);
          }
        }
      );
    }
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  addressChecked = (e) => {
    let { student } = this.state;
    let { form_details } = this.props;
    student["current_address_checked"] = e.target.checked;
    if (e.target.checked) {
      let { student } = this.state;
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

  handleChangeProfile = async (event, acceptFileType) => {
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
        this.props.isUpload(false);
        let reader = new FileReader();
        let file = event.target.files[0];
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
        post.append("file", event.target.files[0]);
        const url = POST_URL.uploads.api;
        postRequest(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            this.props.isUpload(true, response.data.data.id);
          } else {
            student["preview"] = "";
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
        this.props.isUpload(true, null);
      }
    );
  };

  handleKeyDown = (e) => {
    let { student, isEnquiryDataRetrieved } = this.state;
    if (
      e.key === "Enter" &&
      student["isEnquiry"] !== "" &&
      !isEnquiryDataRetrieved
    ) {
      this.verifyEnquiry(student["enquiry_number"]);
    }
  };

  handleCloseEnquiryNumber = () => {
    this.setState({
      loadingEnquiry: true,
    });
    this.props.emptyStudentDetails();
  };

  onChangePresentSchool = (e) => {
    let { name, value } = e.target;
    let { student } = this.state;
    student[name] = value === "true";
    if (!student[name]) {
      student["previous_school_details"] = {};
    }
    this.setState({
      student,
    });
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

  render() {
    const {
      open,
      alertData,
      loading,
      studentDetails,
      student,
      medicalDetails,
      schoolValue,
      currentAddressDetails,
      permanentAddressDetails,
      loadingEnquiry,
      fieldErrors,
      loadingEnquiryButton,
      isThereValuePermanentAddress,
      isEditCurrentAddress,
      enableUploadIcons,
      isEnquiryDataRetrieved,
      schoolDetails,
      isAddressExist,
      religionDetails,
      currentAddressDatalist,
      permanentAddressDatalist,
      is_google_places,
    } = this.state;
    const {
      isEditForm,
      loadingForm,
      form_details,
      isFromLogin,
      isExistingStudent,
    } = this.props;
    return (
      <Paper
        onKeyDown={this.handleKeyDown}
        className={
          loadingEnquiry ? "display-none" : "paper-plain-background m-b-10px"
        }
      >
        {!isEditForm && !isFromLogin && !isExistingStudent && (
          <IsEnquiryForm
            student={student}
            fieldErrors={fieldErrors}
            loadingEnquiryButton={loadingEnquiryButton}
            isEnquiryDataRetrieved={isEnquiryDataRetrieved}
            isEditForm={isEditForm}
            loadingForm={loadingForm}
            onChangeStudent={this.onChangeStudent}
            verifyEnquiry={this.verifyEnquiry}
            handleCloseEnquiryNumber={this.handleCloseEnquiryNumber}
          />
        )}
        {!isEditForm && !isFromLogin && !isEnquiryDataRetrieved && (
          <div className="mt-20">
            <ExistingApplication
              getAdmissionStudentDetails={this.getAdmissionStudentDetails}
              handleCloseEnquiryNumber={this.handleCloseEnquiryNumber}
              isExistingStudent={isExistingStudent}
            />
          </div>
        )}
        {loadingEnquiry && (
          <Box display="flex">
            <CircularProgress
              className="enquiry-for-application-loading"
              alt="loading"
            />
          </Box>
        )}
        <Box className="display-flex">
          <Box className="form-left-heading align-self-center">
            {form_details.student_details.label}
          </Box>
          <Box className="profile-pic-position">
            {enableUploadIcons && (
              <label
                htmlFor="upload-pic"
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
              id="upload-pic"
              className="display-none"
              onChange={(e) => this.handleChangeProfile(e, "img")}
              onClick={(e) => (e.target.value = null)}
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
                  onClick={() => this.removeProfilePic()}
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
        {studentDetails && (
          <DynamicForm
            fieldDetails={studentDetails}
            updateParent={this.updateStudent}
            isEditForm={isEditForm}
            loading={loading}
            ref={"student"}
            idFormat={"application_2022_08_11_01_23_pm_"}
          />
        )}
        <Box mt={3} mb={3}>
          <Divider />
        </Box>

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
                idFormat={"application_2022_08_11_01_23_pm_"}
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
                loadingCountry={loadingEnquiry ? loadingEnquiry : loadingForm}
                updateList={this.updateCurrentAddressList}
                ref={"CurrentAddressFields"}
              />
            )}
            {loadingEnquiry
              ? !loadingEnquiry
              : !loadingForm &&
                is_google_places && (
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
            <Grid container className={loadingEnquiry ? "display-none" : ""}>
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
                  loadingCountry={loadingEnquiry ? loadingEnquiry : loadingForm}
                  ref={"PermanentAddressFields"}
                />
              )}
              {loadingEnquiry
                ? !loadingEnquiry
                : !loadingForm &&
                  is_google_places && (
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
                loading={loading}
                ref={"school"}
                idFormat={"application_2022_08_11_01_23_pm_"}
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
    );
  }
}

export default ApplicationStudentInformation;

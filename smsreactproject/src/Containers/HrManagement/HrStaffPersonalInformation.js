import React, { Component } from "react";
import classNames from "classnames";
import {
  Grid,
  CircularProgress,
  Box,
  InputAdornment,
  TextField,
  Paper,
  IconButton,
  Divider,
  Button,
  Avatar,
} from "@material-ui/core";
import _ from "lodash";
import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import Skeleton from "@material-ui/lab/Skeleton";
import moment from "moment";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

import { DropDownWithSearch } from "Components/DropDownWithSearch";
import DynamicForm from "Components/DynamicForm";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import blankProfile from "images/blank_profile_pic.png";
import AddressFields from "Components/AddressFields";
import { numberAndDotRegex, pinCodeRegex } from "Constants/regularExpression";
import {
  dateFormat,
  validateMobileNumber,
  getKeyValueMap,
  getElementOfIdInArray,
  getFullName,
  getSettingValue,
} from "Includes/functions";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import {
  minDate,
  maxDate,
  includeStaffSection,
  excludeStaffSection,
} from "Constants";
import { Dropdown } from "Components/DropDown";
import { maxFileSize, image_formats } from "Constants";
import AutoCompleteAddress from "Components/AutoCompleteAddress";
import "./styles.scss";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const part_time_list = [
  { name: "Months", id: "M" },
  { name: "Weeks", id: "W" },
  { name: "Days", id: "D" },
  { name: "Hours", id: "H" },
];

const contract_list = [
  { name: "Months", id: "M" },
  { name: "Days", id: "D" },
];

class HrStaffPersonalInformation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      staffDetails: null,
      staffJoiningDetails: null,
      staffPreJobDetails: null,
      driverDetails: null,
      currentAddressDetails: null,
      permanentAddressDetails: null,
      isThereValuePermanentAddress: false,
      isEditCurrentAddress: false,
      groupTypes: [],
      staff: {
        currentAddress: {},
        permanentAddress: {},
        previousJobDetails: {},
        driverDetails: {},
        current_address_checked: false,
        user_name: "",
        role: null,
        pass_word: "",
        part_time_frequency: "",
        contract_frequency: "",
        measure: "",
        profile_pic: "",
        preview: "",
        parentUser: null,
        custom_form_data: {},
      },
      open: false,
      alertData: "",
      currentAddressDatalist: 0,
      permanentAddressDatalist: 0,
      loading: true,
      userLoading: false,
      roleList: [],
      roleAllList: [],
      parentRoleList: [],
      parentUserList: [],
      userNameDisabled: false,
      showPassword: false,
      userNameExist: false,
      enableUploadIcons: true,
      isUserLoading: false,
      isDynamicPageLoading: true,
      standardList: [],
      blankData: "Select Role to add Staff Details",
      hideRole: false,
      is_group_type: isFormDefinitionEnabled(
        "staff_configuration",
        "is_staff_group_type",
        1
      ),
      religionList: [],
      nationalList: [],
      documentList: [],
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
  }

  async componentDidMount() {
    const { is_group_type } = this.state;
    const { isEditForm } = this.props;
    this.scroll();
    const params = { is_active: true };
    let props = { ...this.props };
    props["return_error_message"] = true;
    try {
      const res = await Promise.all([
        getRequest(GET_URL.religion.api, params, props),
        getRequest(GET_URL.nationality.api, {}, this.props),
        getRequest(GET_URL.documenttype.api, params, props),
        is_group_type
          ? getRequest(GET_URL.grouptypes.api, { is_active: true }, this.props)
          : getRequest(GET_URL.groups.api, params, this.props),
        getRequest(GET_URL.getstandardandsection.api, params, props),
      ]);
      this.getReligionList(res[0]);
      this.getNationality(res[1]);
      this.getDocumetList(res[2]);
      if (is_group_type) {
        this.getGroupTypes(res[3]);
      } else {
        this.getRoleList(res[3]);
      }
      this.getStandardList(res[4]);
      if (isEditForm) {
        this.getRequestRoleList();
      }
    } catch {
      throw Error("Promise failed");
    }
  }

  componentDidUpdate(prevProps) {
    // When interviewPrefill arrives after initial render, re-apply prefill
    if (this.props.interviewPrefill && !prevProps.interviewPrefill) {
      const prefill = this.props.interviewPrefill;
      this.updateStaffInf(prefill);
      // Auto-set profile pic if provided
      if (prefill.profile_pic_id) {
        this.props.isUpload(true, parseInt(prefill.profile_pic_id));
      }
    }
  }

  getReligionList = (response) => {
    if (response && response.status === 200) {
      this.setState({
        religionList: response.data.data,
      });
    }
  };

  getNationality = (response) => {
    if (response && response.status === 200) {
      this.setState({
        nationalList: response.data.data,
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

  getRequestDocumetList = (group_type) => {
    const { staffDetails } = this.state;
    const url = GET_URL.documenttype.api;
    const params = { group_type: group_type, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let documentList = [];
        let doc_temp = {};
        response.data.data.map((data) => {
          doc_temp = {};
          doc_temp["doc_id"] = data["id"];
          doc_temp["name"] = data["name"];
          doc_temp["imageUploading"] = false;
          doc_temp["imagesPreview"] = [];
          documentList.push(doc_temp);
        });
        staffDetails.forEach((field) => {
          if (field.name === "document_list") {
            field["list"] = documentList;
          }
        });
        this.setState({
          staffDetails: [...staffDetails],
          documentList: [...documentList],
        });
      }
    });
  };

  getGroupTypes = (response) => {
    const { isEditForm } = this.props;
    if (response && response.status === 200) {
      this.setState({
        groupTypes: response.data.data,
      });
    }
  };

  getStandardList = (response) => {
    if (response && response.status === 200) {
      this.setState(
        {
          standardList: response.data.data,
        },
        () => {
          this.getStaffInformation();
        }
      );
    } else {
      this.setState(
        {
          blankData: response,
          hideRole: true,
        },
        () => {
          this.loadingFalse();
        }
      );
    }
  };

  getStaffInformation = () => {
    if (this.props.isEditForm) {
      let { staff } = this.state;
      let currentAddress = null;
      let permanentAddress = null;
      this.props.staffDetail.staff_address.map((field) => {
        if (field.type === "CP" || field.type === "C") {
          currentAddress = field;
          staff["current_address_id"] = field.id;
          this.setState({
            isEditCurrentAddress: field["country"] ? true : false,
            staff,
          });
        } else {
          permanentAddress = field;
          staff["permanent_address_id"] = field.id;
          staff["current_address_checked"] = false;
          this.setState({
            isThereValuePermanentAddress: field["country"] ? true : false,
            staff,
          });
        }
      });
      this.updateStaffInf(this.props.staffDetail);
      this.updateJoiningDetails(this.props.staffDetail);
      this.updatePreJobInf(this.props.staffDetail);
      this.updateDriverInformation(this.props.staffDetail);
      this.updateFields(this.props.staffDetail);
      this.updateCurrentAddress(currentAddress && currentAddress);
      this.updatePermanentAddress(permanentAddress && permanentAddress);
    } else {
      const prefill = this.props.interviewPrefill || null;
      this.updateStaffInf(prefill);
      this.updateJoiningDetails();
      this.updatePreJobInf();
      this.updateDriverInformation();
      this.updateCurrentAddress();
      this.updatePermanentAddress();
    }
  };

  getRequestRoleList = (group_id) => {
    const url = GET_URL.groups.api;
    const params = { group_type: group_id, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.getRoleList(response);
      }
    });
  };

  getRoleList = (response) => {
    if (response && response.status === 200) {
      let roleList = [];
      let roleAllList = response.data.data;
      response.data.data.map((data, index) => {
        if (!(data.id === 7 || data.id === 1)) {
          roleList.push(data);
        }
      });
      this.setState({
        roleList,
        roleAllList,
      });
    }
  };

  updateStaffInf = (staffInf) => {
    let {
      staff,
      profileId,
      standardList,
      religionList,
      nationalList,
      documentList,
    } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.staff_details.list);
    let value;
    let id = null;
    if (staffInf) {
      id = staffInf["profile_pic_details"]
        ? staffInf["profile_pic_details"]["id"]
        : null;
      staff["preview"] = staffInf["profile_pic_details"]
        ? staffInf["profile_pic_details"]["file"]
        : "";
      if (id) {
        profileId = id;
      }
      this.props.isUpload(true, parseInt(id));
    }
    let selected_std_temp = [];
    fieldDetail.forEach((field) => {
      if (staffInf) {
        if (field.isCustom) {
          value = staffInf.custom_form_data?.[field.name] ?? field.default;
        } else {
          value = staffInf[field["name"]]
            ? staffInf[field["name"]]
            : field.default;
        }
      } else {
        value = field.default;
      }
      if (field.name === "selected_standards") {
        field.list = standardList;
        if (staffInf?.staff_standard_mapping_staff) {
          staffInf.staff_standard_mapping_staff.map((data) => {
            selected_std_temp.push({
              id: data["standard"],
              name: ["standard_name"],
            });
          });
        }
        value = selected_std_temp;
      } else if (field.name === "religion") {
        field["list"] = religionList;
      } else if (field.name === "document_list") {
        if (staffInf && staffInf["document_list"]) {
          field["list"] = this.getFormattedDocument(staffInf["document_list"]);
          value = this.getFormattedDocument(staffInf["document_list"], "value");
        } else {
          field["list"] = documentList;
        }
      } else if (field.name === "nationality") {
        field["list"] = nationalList;
      }
      field.default = value;
      staff[field["name"]] = value;
    });
    this.setState({
      staff,
      staffDetails: [...fieldDetail],
      profileId,
    });
  };

  updateJoiningDetails = (staffInf) => {
    let { staff } = this.state;
    const { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.joining_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (staffInf) {
        if (field.isCustom) {
          value = staffInf.custom_form_data?.[field.name] ?? field.default;
        } else {
          value = staffInf[field["name"]]
            ? staffInf[field["name"]]
            : field.default;
        }
        if (field.name === "date_joined") {
          field["disabled"] = true;
        }
      } else {
        value = field.default;
      }
      field.default = value;
      staff[field["name"]] = value;
    });
    this.setState({
      staff,
      staffJoiningDetails: fieldDetail,
    });
  };

  updatePreJobInf = (staffInf) => {
    let { staff } = this.state;
    let preJobInf = staffInf?.previous_job_details;
    const { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.pre_job_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (preJobInf) {
        if (field.isCustom) {
          value = staffInf.custom_form_data?.[field.name] ?? field.default;
        } else {
          value = preJobInf[field["name"]]
            ? preJobInf[field["name"]]
            : field.default;
        }
      } else {
        value = field.default;
      }
      field.default = value;
      staff["previousJobDetails"][field["name"]] = value;
    });
    this.setState({
      staff,
      staffPreJobDetails: fieldDetail,
    });
  };

  updateDriverInformation = (driverInf) => {
    let { staff } = this.state;
    const { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.driver_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (driverInf) {
        if (field.isCustom) {
          value = driverInf.custom_form_data?.[field.name] ?? field.default;
        } else {
          value = driverInf[field["name"]]
            ? driverInf[field["name"]]
            : driverInf["previous_job_details"][field["name"]]
              ? driverInf["previous_job_details"][field["name"]]
              : field.default;
        }
      } else {
        value = field.default;
      }
      field.default = value;
      staff["driverDetails"][field["name"]] = value;
    });
    this.setState({
      staff,
      driverDetails: fieldDetail,
    });
  };

  updateCurrentAddress = (addressInf) => {
    let { staff, is_google_places } = this.state;
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
      staff.currentAddress = address;
      this.setState({
        staff,
      });
    } else {
      let fieldDetail = _.cloneDeep(form_details.current_address_details.list);
      let value;
      fieldDetail.forEach((field) => {
        if (addressInf) {
          value = addressInf[field["name"]];
          staff.currentAddress = addressInf;
        } else {
          value = field.default;
          staff.currentAddress[field["name"]] = value;
        }
        field.default = value;
      });
      this.setState({
        staff,
        currentAddressDetails: fieldDetail,
      });
    }
    if (form_details.current_address_details.hidden) {
      this.loadingFalse();
    }
  };

  updatePermanentAddress = (addressInf) => {
    let { staff, is_google_places } = this.state;
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
      staff.permanentAddress = address;
      this.setState(
        {
          staff,
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
          staff.permanentAddress = addressInf;
        } else {
          value = field.default;
          staff.permanentAddress[field["name"]] = value;
        }
        field.default = value;
      });
      this.setState({
        staff,
        permanentAddressDetails: fieldDetail,
      });
    }
    if (form_details.permanent_address_details.hidden) {
      this.loadingFalse();
    }
  };

  updateFields = (staffInf) => {
    let { staff } = this.state;
    staff["user_name"] = staffInf.users && staffInf.users.username;
    if (staffInf["employee_status"] === "P") {
      staff["part_time_frequency"] = staffInf["frequency"];
    } else if (staffInf["employee_status"] === "C") {
      staff["contract_frequency"] = staffInf["frequency"];
    }
    staff["measure"] = staffInf["measure"];
    this.setState({
      staff,
      userNameDisabled: true,
    });
  };

  updateStaff = (name, value) => {
    let { staff, staffDetails, religionList, nationalList } = this.state;
    staffDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          staff["custom_form_data"][field.name] = value;
        } else {
          staff[name] = value;
        }
      }
    });
    if (name === "religion") {
      let religion_name = getKeyValueMap(religionList, "id", "name");
      staff["religion_name"] = religion_name[value];
    } else if (name === "nationality") {
      let nationality_name = getKeyValueMap(nationalList, "id", "name");
      staff["nationality_name"] = nationality_name[value];
    }

    this.setState({
      staffDetails,
      staff: { ...staff },
    });
    this.props.handlePrompt(true);
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
        image_temp["url"] = data.document_details["file"];
        image_temp["uploadedId"] = data.document_details["id"];
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

  updateJoining = (name, value) => {
    let { staff, staffJoiningDetails } = this.state;
    staffJoiningDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          staff["custom_form_data"][field.name] = value;
        } else {
          staff[name] = value;
        }
      }
    });
    staff[name] = value;
    this.setState({
      staffJoiningDetails,
      staff,
    });
    this.props.handlePrompt(true);
  };

  updatePreJob = (name, value) => {
    let { staff, staffPreJobDetails } = this.state;
    staffPreJobDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          staff["custom_form_data"][field.name] = value;
        } else {
          staff[name] = value;
        }
      }
    });
    staff["previousJobDetails"][name] = value;
    this.setState({
      staffPreJobDetails,
      staff,
    });
    this.props.handlePrompt(true);
  };

  updateDriver = (name, value) => {
    let { staff, driverDetails } = this.state;
    driverDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          staff["custom_form_data"][field.name] = value;
        } else {
          staff[name] = value;
        }
      }
    });
    staff["driverDetails"][name] = value;
    this.setState({
      driverDetails,
      staff,
    });
    this.props.handlePrompt(true);
  };

  updateCurrentAddressList = (datalist) => {
    let {
      permanentAddressDatalist,
      isThereValuePermanentAddress,
      isEditCurrentAddress,
    } = this.state;
    let currentAddressDatalist = datalist;
    this.setState(
      {
        currentAddressDatalist,
      },
      () => {
        if (
          this.props.isEditForm &&
          (Object.keys(currentAddressDatalist).length === 4 ||
            Object.keys(permanentAddressDatalist).length === 4)
        ) {
          this.loadingFalse();
        } else if (
          this.props.isEditForm &&
          !isEditCurrentAddress &&
          !isThereValuePermanentAddress &&
          (Object.keys(currentAddressDatalist).length === 1 ||
            Object.keys(permanentAddressDatalist).length === 1)
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

  updatePermanentAddressList = (datalist) => {
    const {
      currentAddressDatalist,
      permanentAddressDatalist,
      isThereValuePermanentAddress,
      isEditCurrentAddress,
    } = this.state;
    this.setState(
      {
        permanentAddressDatalist: datalist,
      },
      () => {
        if (
          this.props.isEditForm &&
          (Object.keys(currentAddressDatalist).length === 4 ||
            Object.keys(permanentAddressDatalist).length === 4)
        ) {
          this.loadingFalse();
        } else if (
          this.props.isEditForm &&
          !isEditCurrentAddress &&
          !isThereValuePermanentAddress &&
          (Object.keys(currentAddressDatalist).length === 1 ||
            Object.keys(permanentAddressDatalist).length === 1)
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

  onChangeStaff = (e) => {
    let { name, value } = e.target;
    let { fieldErrors, staff } = this.state;
    staff[name] = value;
    delete fieldErrors[name];
    this.setState({
      staff,
      fieldErrors: fieldErrors,
      userNameExist: false,
    });
  };

  onChangeJobRole = (e, value, name) => {
    let {
      fieldErrors,
      staff,
      isUserLoading,
      isReportingUserPresent,
      parentUserList,
    } = this.state;

    if (value !== 0) {
      delete fieldErrors[name];
      staff[name] = value;
      if (name === "role") {
        staff["parentUser"] = null;
        staff["parentRole"] = null;
        isReportingUserPresent = false;
        this.getReportingRoles(value.id);
        this.props.handleEnableTabs();
        this.updateDriverInformation();
      } else if (name === "parentRole") {
        staff["parentUser"] = null;
        isUserLoading = true;
        isReportingUserPresent = false;
        this.getUsers(value.id);
      } else if (name === "parentUser") {
        let userList = getKeyValueMap(parentUserList, "id", "name");
        staff["parentUserName"] = userList[value];
        isReportingUserPresent = true;
      } else if (name === "group_type") {
        this.getRequestRoleList(value.id);
        this.getRequestDocumetList(value.id);
      }
      this.setState({
        staff,
        fieldErrors,
        isReportingUserPresent,
        isUserLoading,
      });
    }
  };

  getReportingRoles = (value) => {
    let { roleList, parentRoleList, roleAllList } = this.state;
    const { isEditForm } = this.props;
    let reporting_group;
    parentRoleList = [];
    roleList.map((data) => {
      if (data.id == value) {
        reporting_group = data.reporting_group;
      }
    });

    roleAllList.map((data) => {
      if (reporting_group && reporting_group.includes(data.id)) {
        parentRoleList.push(data);
      }
    });
    this.setState({
      parentRoleList,
      isDynamicPageLoading: isEditForm ? true : false,
    });
  };

  getUsers = async (roleId, parentUser) => {
    let { staff, loading } = this.state;
    const { staff_id, isEditForm } = this.props;
    let parentUserList;
    const url = GET_URL.users.api;
    const params = { groups: roleId, is_active: true };
    await getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        parentUserList = [];
        response.data.data.map((data) => {
          if (data?.["staff"]?.id && staff_id !== data?.["staff"]?.id) {
            data["full_name"] = getFullName(
              data["staff"]["first_name"],
              data["staff"]["middle_name"],
              data["staff"]["last_name"]
            );
            parentUserList.push(data);
          } else if (!data?.["staff"]?.id) {
            data["full_name"] = data.username;
            parentUserList.push(data);
          }
        });
        if (parentUser) {
          staff["parentUser"] = getElementOfIdInArray(
            parentUserList,
            parentUser
          );
        }
        this.props.loadingFalse();
        loading = false;
        this.setState({
          parentUserList,
          isUserLoading: false,
          staff,
          loading,
          isDynamicPageLoading: isEditForm
            ? false
            : this.state.isDynamicPageLoading,
        });
      }
    });
    return true;
  };

  loadingFalse = () => {
    let { staff, isReportingUserPresent, roleList, roleAllList, loading } =
      this.state;
    const { isEditForm } = this.props;
    if (isEditForm) {
      staff["role"] =
        this.props.staffDetail["users"] &&
        this.props.staffDetail["users"]["groups"][0]["id"];
      staff["role"] = staff["role"]
        ? getElementOfIdInArray(roleList, staff["role"])
        : "";
      staff["parentRole"] =
        this.props.staffDetail["users"] &&
        this.props.staffDetail["users"]?.["reporting_to"]?.["groups"]?.[0][
        "id"
        ];
      staff["parentRole"] = getElementOfIdInArray(
        roleAllList,
        staff["parentRole"]
      );
      this.getReportingRoles(staff["role"].id);
      let parentUser =
        this.props.staffDetail["users"]?.["reporting_to"] &&
        this.props.staffDetail["users"]?.["reporting_to"]["id"];
      staff["parentUserName"] =
        this.props.staffDetail["users"]?.["reporting_to"]?.staff?.full_name ??
        this.props.staffDetail["users"]?.["reporting_to"]?.["username"];
      if (staff["parentUser"] === null) {
        this.getUsers(staff["parentRole"].id, parentUser);
      }
    } else {
      this.props.loadingFalse();
      loading = false;
    }
    this.setState({
      staff,
      isReportingUserPresent,
      loading,
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  scroll = () => {
    window.scrollTo(0, 0);
  };

  addressChecked = (e) => {
    let { staff } = this.state;
    staff["current_address_checked"] = e.target.checked;
    this.setState({
      staff,
    });
  };

  onBlurUserExistCheck = async (e) => {
    let { fieldErrors } = this.state;
    let { name, value } = e.target;
    if (value === "") {
      fieldErrors["user_name"] = "Username Mandatory";
      this.setState({
        fieldErrors,
      });
      return;
    }
    this.setState({ fieldErrors: fieldErrors, userLoading: true });
    let postdata = { username: e.target.value };
    const post_url = POST_URL.checkusernamenotexist.api;
    let props = { ...this.props };
    props["return_error"] = true;
    postRequest(post_url, postdata, props).then((response) => {
      if (response && response.status === 200) {
        delete fieldErrors["user_name"];
        this.setState({
          [name]: value,
          userLoading: false,
          userNameExist: false,
          fieldErrors: fieldErrors,
        });
      } else {
        fieldErrors["user_name"] = "username already exists";
        this.setState({
          fieldErrors: fieldErrors,
          userNameExist: true,
          userLoading: false,
        });
      }
    });
  };

  showMessage = () => {
    this.setState({
      open: true,
      alertData: "Select Job Role to Enable Fields",
    });
  };

  validate = () => {
    let {
      staff,
      staffDetails,
      staffJoiningDetails,
      staffPreJobDetails,
      driverDetails,
      currentAddressDetails,
      permanentAddressDetails,
      fieldErrors,
      userLoading,
      userNameExist,
      is_google_places,
    } = this.state;
    const { isEditForm, form_details } = this.props;
    fieldErrors = { permanent: {} };

    let staffTest = true;
    let joiningTest = true;
    let preJobTest = true;
    let driverTest = true;
    let currentAddressTest = true;
    let permanentAddressTest = true;
    let permanentExist = false;

    let showError = "";

    if (!staff["role"]) {
      fieldErrors["role"] = "Job Role is Mandatory";
      showError = "Select Job Role to Enable Fields";
      this.setState({ fieldErrors, alertData: showError, open: true });
      return;
    }
    if (!staff["parentRole"]) {
      fieldErrors["parentRole"] = "Reporting Job Role is Mandatory";
      showError = "Select Reporting Job Role to Enable Fields";
      this.setState({ fieldErrors, alertData: showError, open: true });
      return;
    }
    if (!staff["parentUser"]) {
      fieldErrors["parentUser"] = "Reporting to user is Mandatory";
      showError = "Select Reporting to User";
      this.setState({ fieldErrors, alertData: showError, open: true });
      return;
    }

    staff["dob"] = dateFormat(staff["dob"], "YYYY-MM-DD");

    let years = moment().diff(staff["dob"], "years");
    if (years <= parseInt(staff["experience_in_num"])) {
      fieldErrors["experience_in_num"] =
        "Experience should not increase from the age";
      staffTest = false;
    }

    staff["date_joined"] = staff["date_joined"]
      ? dateFormat(staff["date_joined"], "YYYY-MM-DD")
      : "";
    staff["date_left"] = staff["date_left"]
      ? dateFormat(staff["date_left"], "YYYY-MM-DD")
      : "";

    staff["previousJobDetails"]["prev_date_joined"] = staff[
      "previousJobDetails"
    ]["prev_date_joined"]
      ? dateFormat(
        staff["previousJobDetails"]["prev_date_joined"],
        "YYYY-MM-DD"
      )
      : "";

    staff["previousJobDetails"]["prev_date_left"] = staff["previousJobDetails"][
      "prev_date_left"
    ]
      ? dateFormat(staff["previousJobDetails"]["prev_date_left"], "YYYY-MM-DD")
      : "";

    if (!isEditForm) {
      if (staff["user_name"] === "" || userNameExist) {
        fieldErrors["user_name"] = userNameExist
          ? "Username Exist Please Change"
          : "Username is Mandatory";
        staffTest = false;
      }
      if (userLoading) {
        fieldErrors["user_name"] = "Checking Username Exist or Not";
        staffTest = false;
      }
      if (staff["pass_word"] === "") {
        fieldErrors["pass_word"] = "Password is Mandatory";
      }
    }

    if (
      staff["employee_status"] === "P" &&
      staff["part_time_frequency"] === ""
    ) {
      staffTest = false;
      fieldErrors["part_time_frequency"] = "Frequency is Mandatory";
    }

    if (
      staff["employee_status"] === "C" &&
      staff["contract_frequency"] === ""
    ) {
      staffTest = false;
      fieldErrors["contract_frequency"] = "Frequency is Mandatory";
    }

    if (
      (staff["employee_status"] === "C" || staff["employee_status"] === "P") &&
      staff["measure"] === ""
    ) {
      staffTest = false;
      fieldErrors["measure"] = "Measure is Mandatory";
    }

    if (!form_details.permanent_address_details.hidden) {
      if (!is_google_places) {
        permanentAddressDetails.map((data) => {
          if (data.default === "" || data.default === null) {
            permanentExist = false;
          } else {
            permanentExist = true;
          }
        });
      }
      // if (is_google_places) {
      //   if (!staff["permanentAddress"]["pincode_map"]) {
      //     staff["current_address_checked"] = true;
      //   }
      // }
    }

    staffDetails.forEach((field) => {
      let value = field.default;
      let name = field.name;
      if (field.required && (value === "" || value === null || value === 0)) {
        fieldErrors[name] = `${field.label} is Mandatory`;
        staffTest = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          staffTest = false;
        } else {
          value = returnValue.value;
        }
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldErrors[name] = field.regex.errorText;
        staffTest = false;
      }
    });
    if (!form_details.joining_details.hidden) {
      staffJoiningDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.required && (value === "" || value === null || value === 0)) {
          fieldErrors[name] = `${field.label} is Mandatory`;
          joiningTest = false;
        } else if (
          field.regex &&
          !field.regex.value.test(value) &&
          value !== ""
        ) {
          fieldErrors[name] = field.regex.errorText;
          joiningTest = false;
        }
      });
    }
    if (
      !excludeStaffSection["previous"].includes(
        staff["role"] && staff["role"].id
      ) &&
      !form_details.pre_job_details.hidden
    ) {
      staffPreJobDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.required && (value === "" || value === null || value === 0)) {
          fieldErrors[name] = `${field.label} is Mandatory`;
          preJobTest = false;
        } else if (
          field.regex &&
          !field.regex.value.test(value) &&
          value !== ""
        ) {
          fieldErrors[name] = field.regex.errorText;
          preJobTest = false;
        }
      });
    }

    if (
      includeStaffSection["driver"].includes(
        staff["role"] && staff["role"].id
      ) &&
      !form_details.driver_details.hidden
    ) {
      driverDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.required && (value === "" || value === null || value === 0)) {
          fieldErrors[name] = `${field.label} is Mandatory`;
          driverTest = false;
        } else if (
          field.regex &&
          !field.regex.value.test(value) &&
          value !== ""
        ) {
          fieldErrors[name] = field.regex.errorText;
          driverTest = false;
        }
      });
    }
    if (!is_google_places) {
      if (!form_details.current_address_details.hidden) {
        currentAddressDetails.forEach((field) => {
          let value = field.default;
          let name = field.name;
          if (
            field.required &&
            (value === "" || value === null || value === 0)
          ) {
            fieldErrors[name] = `${field.label} is Mandatory`;
            currentAddressTest = false;
          } else if (
            field.regex &&
            !field.regex.value.test(value) &&
            Boolean(value)
          ) {
            fieldErrors[name] = field.regex.errorText;
            currentAddressTest = false;
          }
        });
      }
      if (!form_details.permanent_address_details.hidden) {
        permanentAddressDetails.forEach((field) => {
          if (permanentExist) {
            field.required = true;
          }
          let value = field.default;
          let name = field.name;
          if (
            field.required &&
            (value === "" || value === null || value === 0)
          ) {
            fieldErrors["permanent"][name] = `${field.label} is Mandatory`;
            permanentAddressTest = false;
          } else if (
            field.regex &&
            !field.regex.value.test(value) &&
            value !== "" &&
            value !== null
          ) {
            fieldErrors["permanent"][name] = field.regex.errorText;
            permanentAddressTest = false;
          }
        });
      }
    } else {
      // if (!staff['currentAddress']['address_one_map']) {
      //     fieldErrors['address_one_map'] = 'This field is mandatory';
      //     currentAddressTest = false
      // }
      // if (!staff['currentAddress']['country_map']) {
      //     fieldErrors['country_map'] = 'This field is mandatory';
      //     currentAddressTest = false
      // }
      // if (!staff['currentAddress']['state_map']) {
      //     fieldErrors['state_map'] = 'This field is mandatory';
      //     currentAddressTest = false
      // }
      // if (!staff['currentAddress']['district_map']) {
      //     fieldErrors['district_map'] = 'This field is mandatory';
      //     currentAddressTest = false
      // }
      // if (!staff['currentAddress']['city_map']) {
      //     fieldErrors['city_map'] = 'This field is mandatory';
      //     currentAddressTest = false
      // }
      // if (!staff['currentAddress']['pincode_map']) {
      //     fieldErrors['pincode_map'] = 'This field is mandatory';
      //     currentAddressTest = false
      // }
      if (!staff["current_address_checked"]) {
        // if (!staff['permanentAddress']['address_one_map']) {
        //     fieldErrors['permanent']['address_one_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!staff['permanentAddress']['country_map']) {
        //     fieldErrors['permanent']['country_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!staff['permanentAddress']['state_map']) {
        //     fieldErrors['permanent']['state_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!staff['permanentAddress']['district_map']) {
        //     fieldErrors['permanent']['district_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!staff['permanentAddress']['city_map']) {
        //     fieldErrors['permanent']['city_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
        // if (!staff['permanentAddress']['pincode_map']) {
        //     fieldErrors['permanent']['pincode_map'] = 'This field is mandatory';
        //     permanentAddressTest = false
        // }
      }
    }
    if (
      staffTest &&
      joiningTest &&
      currentAddressTest &&
      preJobTest &&
      driverTest &&
      permanentAddressTest
    ) {
      return staff;
    } else {
      if (!staffTest) {
        showError = showError + " Staff Details";
      }
      if (!joiningTest) {
        showError = showError + " Joining Details";
      }
      if (!preJobTest) {
        showError = showError + " Previous  Job Details";
      }
      if (!driverTest) {
        showError = showError + " Driver Details";
      }
      if (!currentAddressTest) {
        showError = showError + " Current Address Details";
      }
      if (!permanentAddressTest) {
        showError = showError + " Permanent Address Details";
      }
      this.setState({
        open: true,
        alertData: `Please Clear ${showError}  Errors`,
        fieldErrors,
      });
      this.refs.staff.updateErrors(fieldErrors);
      if (!form_details.joining_details.hidden) {
        this.refs.joining.updateErrors(fieldErrors);
      }
      if (!form_details.current_address_details.hidden) {
        this.refs.CurrentAddressFields.updateErrors(fieldErrors);
      }
      if (
        !staff["current_address_checked"] &&
        !form_details.permanent_address_details.hidden
      ) {
        this.refs.PermanentAddressFields.updateErrors(fieldErrors.permanent);
      }
      if (
        includeStaffSection["driver"].includes(
          staff["role"] && staff["role"].id
        ) &&
        !form_details.driver_details.hidden
      ) {
        this.refs.driver.updateErrors(fieldErrors);
      }
      if (
        !excludeStaffSection["previous"].includes(
          staff["role"] && staff["role"].id
        ) &&
        !form_details.pre_job_details.hidden
      ) {
        this.refs.preJob.updateErrors(fieldErrors);
      }
      return false;
    }
  };

  handleChangeProfile = async (event, acceptFileType) => {
    let { staff, enableUploadIcons, profileId } = this.state;
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
          staff["preview"] = reader.result;
          enableUploadIcons = false;
          this.setState({
            staff,
            enableUploadIcons,
          });
        };
        this.props.handlePrompt(true);
        let post = new FormData();
        post.append("file", event.target.files[0]);
        if (profileId) {
          this.postingExistingProfilePic(post);
        } else {
          this.postingNewProfilePic(post);
        }
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

  postingNewProfilePic = (post) => {
    let { profileId, enableUploadIcons } = this.state;
    const url = POST_URL.uploads.api;
    postRequest(url, post, this.props).then((response) => {
      if (response && response.status === 200) {
        profileId = response.data.data.id;
        this.props.isUpload(true, response.data.data.id);
      } else {
        this.props.isUpload("failed");
      }
      enableUploadIcons = true;
      this.setState({
        enableUploadIcons,
        profileId,
      });
    });
  };

  postingExistingProfilePic = (post) => {
    let { profileId, enableUploadIcons } = this.state;
    const url = PUT_URL.uploads.api + profileId + "/";
    putRequest(url, post, this.props).then((response) => {
      if (response && response.status === 200) {
        profileId = response.data.data.id;
        this.props.isUpload(true, response.data.data.id);
      } else {
        this.props.isUpload("failed");
      }
      enableUploadIcons = true;
      this.setState({
        enableUploadIcons,
        profileId,
      });
    });
  };

  handleClickShowPassword = () => {
    let { showPassword } = this.state;
    this.setState({
      showPassword: !showPassword,
    });
  };

  BlurValidation = (e) => {
    const { name, value } = e.target;
    let { fieldErrors } = this.state;
    if (value.trim().length < 8) {
      fieldErrors[name] = "Password Should Contain Atleast 8 length";
    }
    this.setState({
      fieldErrors,
    });
  };

  removeProfilePic = () => {
    let { staff } = this.state;
    staff["preview"] = "";
    this.setState({
      staff,
    });
    this.props.handlePrompt(true);
    this.props.isUpload(true, null);
  };

  onChangeMeasure = (e) => {
    let { name, value } = e.target;
    let { fieldErrors, staff } = this.state;
    if (value >= 0 && value <= 1825) {
      staff[name] = value;
      delete fieldErrors[name];
      this.setState({
        staff,
        fieldErrors,
      });
    }
  };

  updateCurrentParentAddress = (address) => {
    let { staff } = this.state;
    staff["currentAddress"] = address;
    this.setState({
      staff,
    });
  };

  updatePermanentParentAddress = (address) => {
    let { staff } = this.state;
    staff["permanentAddress"] = address;
    this.setState({
      staff,
    });
  };

  render() {
    const {
      open,
      alertData,
      loading,
      staffDetails,
      staff,
      staffJoiningDetails,
      userLoading,
      currentAddressDetails,
      permanentAddressDetails,
      driverDetails,
      roleList,
      fieldErrors,
      staffPreJobDetails,
      isThereValuePermanentAddress,
      isEditCurrentAddress,
      userNameDisabled,
      showPassword,
      enableUploadIcons,
      isDynamicPageLoading,
      parentRoleList,
      parentUserList,
      isUserLoading,
      blankData,
      hideRole,
      groupTypes,
      is_group_type,
      is_google_places,
    } = this.state;
    const { isEditForm, loadingForm, form_details } = this.props;
    return (
      <div>
        <Paper>
          {!hideRole && (
            <Grid container className="padding-15">
              <Grid item md={4} xs={12} sm={12}>
                <Box className="form-left-heading header-align">Job role</Box>
              </Grid>
              {is_group_type && !loadingForm && (
                <Grid item md={4} xs={12} sm={12} className="margin-top-20">
                  <DropDownWithSearch
                    options={groupTypes}
                    name="group_type"
                    value={staff["group_type"]}
                    onChange={(e, newValue) =>
                      this.onChangeJobRole(e, newValue, "group_type")
                    }
                    error={fieldErrors.group_type}
                    label="Group Type"
                    helperText=""
                    className="drop-down-width"
                    hideClearIcon={true}
                  />
                </Grid>
              )}
              <Grid item md={4} xs={12} sm={12} className="margin-top-20">
                {roleList.length > 0 && !loadingForm && (
                  <DropDownWithSearch
                    options={roleList}
                    name="role"
                    value={staff["role"]}
                    onChange={(e, newValue) =>
                      this.onChangeJobRole(e, newValue, "role")
                    }
                    error={fieldErrors.role}
                    label="Job Role"
                    helperText=""
                    className="drop-down-width"
                    hideClearIcon={true}
                  />
                )}
              </Grid>
            </Grid>
          )}

          {staff["role"] !== null && (
            <Grid container className="padding-15">
              <Grid item md={4} xs={12} sm={12}>
                <Box className="form-left-heading header-align">
                  Reporting to
                </Box>
              </Grid>
              <Grid item md={8} xs={12} sm={12} className="margin-top-20">
                <Grid container>
                  <Grid item md={6}>
                    <DropDownWithSearch
                      options={parentRoleList}
                      name="parentRole"
                      value={staff["parentRole"]}
                      onChange={(e, newValue) =>
                        this.onChangeJobRole(e, newValue, "parentRole")
                      }
                      error={fieldErrors.parentRole}
                      label="Select Role"
                      helperText=""
                      className="drop-down-width"
                      hideClearIcon={true}
                    />
                  </Grid>
                  {!isUserLoading && (
                    <Grid item md={6}>
                      <DropDownWithSearch
                        options={parentUserList}
                        name="parentUser"
                        disabled={staff["parentRole"] ? false : true}
                        value={staff["parentUser"]}
                        onChange={(e, newValue) =>
                          this.onChangeJobRole(e, newValue, "parentUser")
                        }
                        error={fieldErrors.parentUser}
                        label="Select User"
                        optionValue="full_name"
                        helperText=""
                        className="drop-down-width"
                        hideClearIcon={true}
                      />
                    </Grid>
                  )}
                  {isUserLoading && (
                    <Grid item md={6}>
                      <Skeleton
                        variant="rect"
                        className="drop-down-reporting-user-skeleton"
                      ></Skeleton>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </Grid>
          )}
        </Paper>
        <Box
          className={
            staff["role"] === null && !isEditForm
              ? "margin-top-15"
              : "display-none"
          }
        >
          <BlankPagewithIcon data={blankData} />
        </Box>
        <Paper
          className={
            staff["role"] === null && !isEditForm ? "display-none" : ""
          }
        >
          <Grid container className="padding-15 margin-top-20">
            <Grid item md={4} xs={12} sm={12}>
              <Box className="form-left-heading header-align">
                {form_details.staff_details.label}
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
                {staff.preview !== "" && enableUploadIcons && (
                  <Box className="avatar-profile-pic-position">
                    <Avatar
                      src={staff.preview}
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
                {staff.preview === "" && enableUploadIcons && (
                  <Avatar
                    src={blankProfile}
                    alt="Preview"
                    className="hr-profile-pic"
                  />
                )}
              </Box>

              <Box
                className={classNames("form-inner-border", "hide-vl-on-900")}
              ></Box>
            </Grid>
            <Grid item md={8} xs={12} sm={12}>
              {staffDetails && (
                <DynamicForm
                  fieldDetails={staffDetails}
                  updateParent={this.updateStaff}
                  isEditForm={isEditForm}
                  loading={isDynamicPageLoading}
                  ref={"staff"}
                  idFormat={"staff_form_2022_08_11_01_23_pm_"}
                />
              )}

              <Grid item xs={12}>
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid container className="padding-15">
            <Grid item md={4} xs={12} sm={12}>
              <Box className="form-left-heading header-align">
                Login details
              </Box>
              <Box
                className={classNames("form-inner-border", "hide-vl-on-900")}
              ></Box>
            </Grid>
            <Grid item md={8} xs={12} sm={12}>
              <Grid container>
                <Grid item md={6} xs={12} sm={12}>
                  <TextField
                    id="outlined-name"
                    label="Username"
                    name="user_name"
                    disabled={userNameDisabled}
                    autoComplete={false}
                    value={staff["user_name"]}
                    onChange={(e) => this.onChangeStaff(e)}
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
                      (fieldErrors.user_name && fieldErrors.user_name) ||
                      (staff["user_name"] === ""
                        ? "Username can be Email or Mobile No."
                        : "")
                    }
                    error={
                      fieldErrors &&
                      (fieldErrors.user_name || fieldErrors.user_name
                        ? true
                        : false)
                    }
                    inputProps={{ maxLength: 50 }}
                  />
                </Grid>
                {!isEditForm && (
                  <Grid item md={6} xs={12} sm={12}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      type={showPassword ? "text" : "password"}
                      label="Password"
                      value={staff["pass_word"]}
                      autoComplete={false}
                      onChange={(e) => this.onChangeStaff(e)}
                      onBlur={(e) => this.BlurValidation(e)}
                      name="pass_word"
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
                        (fieldErrors.pass_word || fieldErrors.pass_word)
                      }
                      error={
                        fieldErrors &&
                        (fieldErrors.pass_word || fieldErrors.pass_word
                          ? true
                          : false)
                      }
                      inputProps={{ maxLength: 50 }}
                    />
                  </Grid>
                )}
              </Grid>
              <Grid item xs={12}>
                <Box mt={6} mb={3}>
                  <Divider />
                </Box>
              </Grid>
            </Grid>
          </Grid>
          {!form_details.joining_details.hidden && (
            <Grid container className="padding-15">
              <Grid item md={4} xs={12} sm={12}>
                <Box className="header-align">
                  <Box className="form-left-heading">
                    {form_details.joining_details.label}
                  </Box>
                </Box>
                <Box
                  className={classNames("form-inner-border", "hide-vl-on-900")}
                ></Box>
              </Grid>
              <Grid item md={8} xs={12} sm={12}>
                {staffJoiningDetails && (
                  <DynamicForm
                    fieldDetails={staffJoiningDetails}
                    updateParent={this.updateJoining}
                    loading={staff["role"] !== null ? false : true}
                    ref={"joining"}
                    idFormat={"staff_form_2022_08_11_01_23_pm_"}
                  />
                )}
                <Grid container>
                  {staff["employee_status"] === "P" && (
                    <Grid item md={6} xs={12} sm={12}>
                      <Dropdown
                        data={part_time_list}
                        name="part_time_frequency"
                        value={staff["part_time_frequency"]}
                        onChange={this.onChangeStaff}
                        error={fieldErrors.part_time_frequency}
                        label="Part Time Frequency"
                        style="width-90"
                        required
                      />
                    </Grid>
                  )}
                  {staff["employee_status"] === "C" && (
                    <Grid item md={6} xs={12} sm={12}>
                      <Dropdown
                        data={contract_list}
                        name="contract_frequency"
                        value={staff["contract_frequency"]}
                        onChange={this.onChangeStaff}
                        error={fieldErrors.contract_frequency}
                        label="Contract Frequency"
                        style="width-90"
                        required
                      />
                    </Grid>
                  )}
                  {(staff["employee_status"] === "P" ||
                    staff["employee_status"] === "C") && (
                      <Grid item md={6} xs={12} sm={12}>
                        <TextField
                          label="Measure"
                          className="width-form-90"
                          name="measure"
                          required
                          value={staff["measure"]}
                          type="number"
                          onChange={this.onChangeMeasure}
                          margin="normal"
                          variant="outlined"
                          InputProps={{
                            inputProps: {
                              max: 1825,
                              min: 0,
                            },
                          }}
                          helperText={fieldErrors.measure && fieldErrors.measure}
                          error={
                            fieldErrors.measure &&
                            (fieldErrors.measure ? true : false)
                          }
                          inputProps={{ maxLength: 5 }}
                        />
                      </Grid>
                    )}
                </Grid>
                <Grid item xs={12}>
                  <Box mt={3} mb={3}>
                    <Divider />
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          )}

          {!excludeStaffSection["previous"].includes(
            staff["role"] && staff["role"].id
          ) &&
            staff["role"] !== null &&
            !form_details.joining_details.hidden && (
              <Grid container className="padding-15">
                <Grid item md={4} xs={12} sm={12}>
                  <Box className="header-align">
                    <Box className="form-left-heading">
                      {form_details.pre_job_details.label}
                    </Box>
                  </Box>
                  <Box
                    className={classNames(
                      "form-inner-border",
                      "hide-vl-on-900"
                    )}
                  ></Box>
                </Grid>
                <Grid item md={8} xs={12} sm={12}>
                  {staffPreJobDetails && (
                    <DynamicForm
                      fieldDetails={staffPreJobDetails}
                      updateParent={this.updatePreJob}
                      loading={staff["role"] !== null ? false : true}
                      ref={"preJob"}
                      idFormat={"staff_form_2022_08_11_01_23_pm_"}
                    />
                  )}
                  <Grid item xs={12}>
                    <Box mt={3} mb={3}>
                      <Divider />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            )}

          {includeStaffSection["driver"].includes(
            staff["role"] && staff["role"].id
          ) &&
            !form_details.driver_details.hidden && (
              <Grid container className="padding-15">
                <Grid item md={4} xs={12} sm={12}>
                  <Box className="header-align">
                    <Box className="form-left-heading">
                      {form_details.driver_details.label}
                    </Box>
                  </Box>
                  <Box
                    className={classNames(
                      "form-inner-border",
                      "hide-vl-on-900"
                    )}
                  ></Box>
                </Grid>
                <Grid item md={8} xs={12} sm={12}>
                  {driverDetails && (
                    <DynamicForm
                      fieldDetails={driverDetails}
                      updateParent={this.updateDriver}
                      loading={staff["role"] !== null ? false : true}
                      ref={"driver"}
                      idFormat={"staff_form_2022_08_11_01_23_pm_"}
                    />
                  )}
                  <Grid item xs={12}>
                    <Box mt={3} mb={3}>
                      <Divider />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            )}
          {!form_details.current_address_details.hidden && (
            <Grid container className="padding-15">
              <Grid item md={4} xs={12} sm={12}>
                <Box className="header-align">
                  <Box className="form-left-heading">
                    {form_details.current_address_details.label}
                  </Box>
                </Box>
                <Box
                  className={classNames("form-inner-border", "hide-vl-on-900")}
                ></Box>
              </Grid>
              {loading && <CircularProgress />}
              <Grid
                item
                md={8}
                xs={12}
                sm={12}
                className={loading ? "display-none" : ""}
              >
                {currentAddressDetails && !is_google_places && (
                  <AddressFields
                    addressDetails={currentAddressDetails}
                    isEditForm={isEditCurrentAddress}
                    updateParentAddress={this.updateCurrentAddress}
                    updateList={this.updateCurrentAddressList}
                    loadingCountry={staff["role"] !== null ? false : true}
                    ref={"CurrentAddressFields"}
                  />
                )}
                {staff["role"] !== null && is_google_places && (
                  <AutoCompleteAddress
                    addressDetails={staff.currentAddress}
                    updateParentAddress={this.updateCurrentParentAddress}
                    isEditForm={isEditCurrentAddress}
                    ref={"CurrentAddressFields"}
                    address_placeHolder={"Search place"}
                  />
                )}
                <Grid item xs={12}>
                  <Box mt={3} mb={3}>
                    <Divider />
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          )}
          <Grid container className="padding-15">
            <Grid item md={4}></Grid>
            <Grid item md={8}>
              <label>
                <input
                  type="checkbox"
                  checked={staff["current_address_checked"]}
                  onChange={(e) => {
                    this.addressChecked(e);
                  }}
                />
                <span>Permanent address is same as current address</span>
              </label>
            </Grid>
          </Grid>

          {!staff["current_address_checked"] &&
            !form_details.permanent_address_details.hidden && (
              <Grid container className="padding-15">
                <Grid item md={4} xs={12} sm={12}>
                  <Box className="header-align">
                    <Box className="form-left-heading">
                      {form_details.permanent_address_details.label}
                    </Box>
                  </Box>
                  <Box
                    className={classNames(
                      "form-inner-border",
                      "hide-vl-on-900"
                    )}
                  ></Box>
                </Grid>
                {loading && <CircularProgress />}
                <Grid
                  item
                  md={8}
                  xs={12}
                  sm={12}
                  className={loading ? "display-none" : ""}
                >
                  {permanentAddressDetails && !is_google_places && (
                    <AddressFields
                      addressDetails={permanentAddressDetails}
                      isEditForm={isThereValuePermanentAddress}
                      updateParentAddress={this.updatePermanentAddress}
                      updateList={this.updatePermanentAddressList}
                      loadingCountry={staff["role"] !== null ? false : true}
                      ref={"PermanentAddressFields"}
                    />
                  )}
                  {staff["role"] !== null && is_google_places && (
                    <AutoCompleteAddress
                      addressDetails={staff.permanentAddress}
                      updateParentAddress={this.updatePermanentParentAddress}
                      isEditForm={isThereValuePermanentAddress}
                      ref={"PermanentAddressFields"}
                      address_placeHolder={"Search place"}
                    />
                  )}
                </Grid>
              </Grid>
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
      </div>
    );
  }
}

export default HrStaffPersonalInformation;

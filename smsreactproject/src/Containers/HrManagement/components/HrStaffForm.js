import React, { Component } from "react";
import {
  Tabs,
  AppBar,
  Tab,
  Typography,
  Box,
  Button,
  Grid,
} from "@material-ui/core";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import Swal from "sweetalert2";
import { Prompt } from "react-router";
import { Link } from "react-router-dom";
import { cloneDeep } from "lodash";

import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, POST_URL } from "Includes/urls";
import StaffNomineeDetails from "Containers/HrManagement/StaffNomineeDetails";
import StaffBankDetails from "Containers/HrManagement/StaffBankDetails";
import StaffSubmission from "./../StaffSubmission";
import { Actions } from "Constants/permissions";
import { includeStaffSection, excludeStaffSection } from "Constants";
import HrStaffPersonalInformation from "Containers/HrManagement/HrStaffPersonalInformation";
import LoadingGif from "Components/LoadingGif";
import {
  isUserHasPermission,
  getSettingValue,
  getCommaSeperatedArrayOfObjects,
} from "Includes/functions";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { Forms } from "Constants/FormDefinition";
import { CustomForms } from "Constants/FormDefinition/CustomAdmissionForm";
import * as regulars from "Constants/regularExpression";
import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeStaffFormList } from "Components/CommonComponent/selectors";
import { setStaffFormList } from "Components/CommonComponent/actions";

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

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

class HrStaffForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 0,
      errors: {},
      staffError: false,
      nomineeError: false,
      BankError: false,
      disable: false,
      open: false,
      alertData: "",
      payDisabled: false,

      loading: true,
      isEditForm: null,
      staffDetail: null,
      interviewPrefill: null,
      profile_pic: null,
      isUploadFailed: false,
      isUploaded: true,
      isPrompt: false,
      enableTabs: false,
      form_details: cloneDeep(Forms),
      staff_form_details: null,
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
      form_name: "staff_form",
      // is_google_places: false
    };
  }
  updateTab = () => {
    this.setState({ disable: false });
  };

  handleChange = (e, newValue) => {
    const { staff_form_details } = this.state;
    if (newValue === 0) {
      this.setState({
        value: newValue,
      });
    } else if (newValue === 1) {
      const studentTest = this.refs.staff.validate();
      if (studentTest) {
        this.setState({
          value: newValue,
          studentError: false,
        });
        this.scrollTop();
      } else {
        this.setState({
          studentError: true,
        });
      }
    } else if (newValue === 2) {
      let studentTest = this.refs.staff.validate();
      let nomineeTest = true;
      if (!staff_form_details.nominee_details.hidden) {
        nomineeTest = this.refs.nominee.validate();
      }
      if (studentTest) {
        if (nomineeTest) {
          this.setState({
            value: newValue,
            nomineeError: false,
            studentError: false,
          });
          this.scrollTop();
        } else {
          this.setState({
            value: 1,
            nomineeError: true,
            studentError: false,
          });
        }
      } else {
        this.setState({
          studentError: true,
        });
      }
    } else if (newValue === 3) {
      let studentTest = this.refs.staff.validate();
      let nomineeTest = true;
      let bankTest = true;
      if (!staff_form_details.nominee_details.hidden) {
        nomineeTest = this.refs.nominee.validate();
      }
      if (!staff_form_details.bank_details.hidden) {
        bankTest = this.refs.bank.validate();
      }
      if (studentTest) {
        if (nomineeTest) {
          if (bankTest) {
            this.setState(
              {
                value: newValue,
                nomineeError: false,
                studentError: false,
              },
              () => {
                studentTest = { ...studentTest, ...nomineeTest, ...bankTest };
                this.refs.review.reviewStaff(
                  studentTest,
                  this.state.isEditForm
                );
                this.scrollTop();
              }
            );
          } else {
            this.setState({
              value: 2,
              nomineeError: false,
              studentError: false,
              bankError: true,
            });
          }
        } else {
          this.setState({
            value: 1,
            nomineeError: true,
            studentError: false,
          });
        }
      } else {
        this.setState({
          studentError: true,
        });
      }
    }
  };
  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  check = async (staff) => {
    let {
      staff_id,
      bank_id,
      users_id,
      profile_pic,
      isUploaded,
      isUploadFailed,
      current_map_address_id,
      permanent_map_address_id,
      current_address_id,
      permanent_address_id,
      is_google_places,
    } = this.state;
    let bank = staff["bank"];
    let previous = staff["previousJobDetails"];
    let bank_deletable_ids = [];
    if (Object.keys(staff["bank"]).length === 0 && bank_id !== "") {
      bank_deletable_ids.push(bank_id);
    }
    this.setState({ payDisabled: true, staff: staff, isPrompt: false });
    let frequency = "M";
    if (staff.employee_status === "C") {
      frequency = staff.contract_frequency;
    } else if (staff.employee_status === "P") {
      frequency = staff.part_time_frequency;
    } else {
      staff["measure"] = "12"; //for fulltime
    }
    let post_data = {
      staff: {
        ...(this.state.isEditForm
          ? {
            id: staff_id,
          }
          : {}),
        first_name: staff.first_name ? staff.first_name.trim() : "",
        middle_name: staff.middle_name ? staff.middle_name.trim() : "",
        last_name: staff.last_name ? staff.last_name.trim() : "",
        dob: staff.dob ? staff.dob.trim() : "",
        email: staff.email ? staff.email.trim() : "",
        mobile_num: staff.mobile_num ? staff.mobile_num.trim() : "",
        alternate_mobile_num: staff.alternate_mobile_num
          ? staff.alternate_mobile_num.trim()
          : "",
        qualification: staff.qualification ? staff.qualification.trim() : "",
        designation: staff.designation ? staff.designation.trim() : "",
        gender: staff.gender,
        marital_status: staff.marital_status,
        employee_status: staff.employee_status,
        frequency: frequency,
        blood_group: staff.blood_group ? staff.blood_group : '',
        measure: staff.measure,
        salary: staff.salary === 0 ? null : staff.salary,
        aadhar_num: staff.aadhar_num ? staff.aadhar_num.trim() : "",
        job_title: staff.job_title ? staff.job_title.trim() : "",
        date_joined: staff.date_joined ? staff.date_joined.trim() : "",
        date_left: staff.date_left ? staff.date_left.trim() : "",
        employee_id: staff.employee_id ? staff.employee_id.trim() : "",
        reason_for_leaving: staff.reason_for_leaving
          ? staff.reason_for_leaving.trim()
          : "",
        father_or_husband_name: staff.father_or_husband_name
          ? staff.father_or_husband_name.trim()
          : "",
        experience_in_num: staff.experience_in_num
          ? staff.experience_in_num.trim()
          : "",
        nationality: staff.nationality ? staff.nationality : "",
        religion: staff.religion ? staff.religion : "",
        document_list: this.getDocumentListFormat(staff),
        deletable_document_list: this.getDocumentListFormat(staff, true),
        ...(!excludeStaffSection["previous"].includes(staff["role"]["id"])
          ? {
            previous_job_details: {
              prev_school_name: previous.prev_school_name
                ? previous.prev_school_name.trim()
                : "",
              prev_date_joined: previous.prev_date_joined
                ? previous.prev_date_joined.trim()
                : "",
              prev_date_left: previous.prev_date_left
                ? previous.prev_date_left.trim()
                : "",
              prev_designation: previous.prev_designation
                ? previous.prev_designation.trim()
                : "",
              prev_reason_leaving: previous.prev_reason_leaving
                ? previous.prev_reason_leaving.trim()
                : "",
            },
          }
          : {}),
        ...(includeStaffSection["driver"].includes(staff["role"]["id"])
          ? {
            dl_number: staff.driverDetails.dl_number
              ? staff.driverDetails.dl_number.trim()
              : "",
            previous_job_details: {
              prev_work_place_name: staff.driverDetails.prev_work_place_name
                ? staff.driverDetails.prev_work_place_name.trim()
                : "",
            },
          }
          : {}),
        ...(profile_pic
          ? {
            profile_pic: profile_pic,
          }
          : {
            profile_pic: null,
          }),
      },
      staff_nominee: staff.nominee,
      staff_standard_list:
        staff.selected_standards.length > 0
          ? getCommaSeperatedArrayOfObjects(staff.selected_standards, "id")
            .split(" ,")
            .map((element) => {
              return Number(element);
            })
          : [],
      accounts: {
        ...(bank_deletable_ids.length === 0
          ? {
            ...(this.state.isEditForm && bank_id
              ? {
                id: bank_id,
              }
              : {}),
            name: bank.name ? bank.name.trim() : "",
            bank_name: bank.bank_name ? bank.bank_name.trim() : "",
            branch_name: bank.branch_name ? bank.branch_name.trim() : "",
            account_num: bank.account_num ? bank.account_num.trim() : "",
            ifsc: bank.ifsc ? bank.ifsc.trim() : "",
            mobile_num: bank.mobile_num ? bank.mobile_num.trim() : "",
            pan_num: bank.pan_num ? bank.pan_num.trim() : "",
            pf_num: bank.pf_num ? bank.pf_num.trim() : "",
            esi_num: bank.esi_num ? bank.esi_num.trim() : "",
            uan_num: bank.uan_num ? bank.uan_num.trim() : "",
          }
          : []),
      },
      ...(bank_deletable_ids.length !== 0
        ? {
          bank_deletable_ids: bank_deletable_ids,
        }
        : {}),
      ...(staff["nominee_deletable_ids"].length !== 0
        ? {
          nominee_deletable_ids: staff["nominee_deletable_ids"],
        }
        : {}),

      ...(!this.state.isEditForm
        ? {
          users: {
            username: staff.user_name,
            password: staff.pass_word,
            groups: [staff.role.id],
            reporting_to: staff.parentUser.id,
          },
        }
        : {
          users: {
            id: users_id,
            groups: [staff.role.id],
            reporting_to: staff.parentUser.id,
          },
        }),
    };

    // 'staff_address': {
    //     'cp': staff.current_address_checked,
    //     ...((!staff.current_address_checked) ? {
    //         'permanent_address': {
    //             ...((this.state.isEditForm) ? {
    //                 "id": staff.permanent_address_id,
    //             } : {}),
    //             'address': (staff.permanentAddress.address) ? staff.permanentAddress.address : null,
    //             'country': staff.permanentAddress.country === 0 ? null : staff.permanentAddress.country,
    //             'state': staff.permanentAddress.state === 0 ? null : staff.permanentAddress.state,
    //             'district': staff.permanentAddress.district === 0 ? null : staff.permanentAddress.district,
    //             'city': staff.permanentAddress.city === 0 ? null : staff.permanentAddress.city,
    //             'pincode': (staff.permanentAddress.pincode) ? staff.permanentAddress.pincode : null
    //         },
    //     } : {}),
    //     'current_address': {
    //         ...((this.state.isEditForm) ? {
    //             "id": staff.current_address_id,
    //         } : {}),
    //         'address': (staff.currentAddress.address) ? staff.currentAddress.address : null,
    //         'country': staff.currentAddress.country === 0 ? null : staff.currentAddress.country,
    //         'state': staff.currentAddress.state === 0 ? null : staff.currentAddress.state,
    //         'district': staff.currentAddress.district === 0 ? null : staff.currentAddress.district,
    //         'city': staff.currentAddress.city === 0 ? null : staff.currentAddress.city,
    //         'pincode': (staff.currentAddress.pincode) ? staff.currentAddress.pincode : null
    //     },

    post_data["staff_address"] = { current_address: {}, permanent_address: {} };
    if (is_google_places && staff?.currentAddress?.["address_one_map"]) {
      post_data["staff_address"] = {
        current_address: { map_address_data: {} },
        permanent_address: { map_address_data: {} },
      };
      post_data["staff_address"]["cp"] = staff.current_address_checked;
      post_data["staff_address"]["current_address"]["id"] = current_address_id;
      post_data["staff_address"]["current_address"]["map_address_data"]["id"] =
        current_map_address_id;
      post_data["staff_address"]["current_address"]["map_address_data"][
        "address_one_map"
      ] = staff.currentAddress["address_one_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "address_two_map"
      ] = staff.currentAddress["address_two_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "city_map"
      ] = staff.currentAddress["city_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "district_map"
      ] = staff.currentAddress["district_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "state_map"
      ] = staff.currentAddress["state_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "country_map"
      ] = staff.currentAddress["country_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "pincode_map"
      ] = staff.currentAddress["pincode_map"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "latitude_map"
      ] = staff.currentAddress["latitude_and_langitude_map"]["lat"];
      post_data["staff_address"]["current_address"]["map_address_data"][
        "longitude_map"
      ] = staff.currentAddress["latitude_and_langitude_map"]["lng"];

      if (!staff.current_address_checked) {
        post_data["staff_address"]["permanent_address"]["id"] =
          permanent_address_id;
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "id"
        ] = permanent_map_address_id;
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "address_one_map"
        ] = staff.permanentAddress["address_one_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "address_two_map"
        ] = staff.permanentAddress["address_two_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "city_map"
        ] = staff.permanentAddress["city_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "district_map"
        ] = staff.permanentAddress["district_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "state_map"
        ] = staff.permanentAddress["state_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "country_map"
        ] = staff.permanentAddress["country_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "pincode_map"
        ] = staff.permanentAddress["pincode_map"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "latitude_map"
        ] = staff.permanentAddress["latitude_and_langitude_map"]["lat"];
        post_data["staff_address"]["permanent_address"]["map_address_data"][
          "longitude_map"
        ] = staff.permanentAddress["latitude_and_langitude_map"]["lng"];
      }
    } else if (!is_google_places) {
      post_data["staff_address"]["cp"] = staff.current_address_checked;
      post_data["staff_address"]["current_address"]["address"] = Boolean(
        staff.currentAddress.address
      )
        ? staff.currentAddress.address.trim()
        : "";
      post_data["staff_address"]["current_address"]["country"] =
        staff.currentAddress.country;
      post_data["staff_address"]["current_address"]["state"] =
        staff.currentAddress.state;
      post_data["staff_address"]["current_address"]["district"] =
        staff.currentAddress.district;
      post_data["staff_address"]["current_address"]["city"] =
        staff.currentAddress.city;
      post_data["staff_address"]["current_address"]["pincode"] =
        staff.currentAddress.pincode;

      if (!staff.current_address_checked) {
        post_data["staff_address"]["permanent_address"]["address"] = Boolean(
          staff.permanentAddress.address
        )
          ? staff.permanentAddress.address.trim()
          : "";
        post_data["staff_address"]["permanent_address"]["country"] =
          staff.permanentAddress.country;
        post_data["staff_address"]["permanent_address"]["state"] =
          staff.permanentAddress.state;
        post_data["staff_address"]["permanent_address"]["district"] =
          staff.permanentAddress.district;
        post_data["staff_address"]["permanent_address"]["city"] =
          staff.permanentAddress.city;
        post_data["staff_address"]["permanent_address"]["pincode"] =
          staff.permanentAddress.pincode;
      }
      if (this.state.isEditForm) {
        if (staff.current_address_id) {
          post_data["staff_address"]["current_address"]["id"] =
            staff.current_address_id;
        }
        if (staff.permanent_address_id) {
          post_data["staff_address"]["permanent_address"]["id"] =
            staff.permanent_address_id;
        }
      }
    }
    post_data["custom_form_data"] = staff.custom_form_data;
    if (isUploaded) {
      if (this.state.isEditForm) {
        const put_url = PUT_URL.staffalldetail.api;
        const url = put_url + this.props.location.state.detail + "/";
        putRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            });
            if (isUserHasPermission("general_staff", "view")) {
              this.props.history.push({
                pathname: Actions.general_staff.view.url,
                state: { detail: this.props.location.state.detail },
              });
            } else {
              this.props.history.push(Actions.staff_list.view.url);
            }
          }
          this.setState({ payDisabled: false });
        });
      } else {
        const url = POST_URL.staffalldetail.api;
        postRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            }).then(this.props.history.push(Actions.staff_list.view.url));
          }
          this.setState({ payDisabled: false });
        });

        // this.props.history.push(`/dashboard/staffdetails/admission/view/${data['data']['id']}`)
      }
    } else if (isUploadFailed) {
      Swal.fire({
        type: "error",
        title: "Something Went Wrong Upload Profile Pic Again",
        showConfirmButton: true,
      });
    }
  };

  getDocumentListFormat = (staff, isDelete) => {
    const { isEditForm, staffDetail } = this.state;
    let return_data = [];
    let return_temp = {};
    let edit_ids = [];
    let deletable_ids = [];
    if (staff.document_list) {
      staff.document_list.map((data) => {
        if (data.imagesPreview.length > 0) {
          data.imagesPreview.map((imgData) => {
            return_temp = {};
            return_temp["document"] = imgData.uploadedId;
            return_temp["document_type"] = data.doc_id;
            if (isEditForm && imgData?.id) {
              return_temp["id"] = imgData?.id;
              edit_ids.push(imgData?.id);
            }
            return_data.push(return_temp);
          });
        } else {
          return_temp = {};
          return_temp["document"] = null;
          return_temp["document_type"] = data.doc_id;
          if (isEditForm && data.edit_id) {
            return_temp["id"] = data.edit_id;
            edit_ids.push(data?.edit_id);
          }
          return_data.push(return_temp);
        }
      });
    }
    if (isEditForm) {
      staffDetail.document_list.map((data) => {
        if (!edit_ids.includes(data.id)) {
          deletable_ids.push(data.id);
        }
      });
    }
    if (isDelete) {
      return_data = deletable_ids;
    }
    return return_data;
  };

  componentDidMount = () => {
    if (this.props.location.pathname === Actions.staff_list.update.url) {
      if (this.props.location.state && this.props.location.state.detail) {
        this.getStaffDetails();
      } else {
        this.props.history.push(Actions.staff_list.view.url);
      }
    } else {
      this.setState({
        isEditForm: false,
      });
      // Check for interview hire prefill
      const params = new URLSearchParams(this.props.location.search);
      const prefill = params.get("prefill");
      const applicationId = params.get("application_id");
      if (prefill === "interview" && applicationId) {
        this.fetchInterviewPrefill(applicationId);
      }
    }
    let { form_details } = this.state;
    form_details.map((parentField) => {
      if (
        parentField.page_details.form_name === "staff_form" &&
        Object.keys(CustomForms).includes(user.institute_details.code)
      ) {
        parentField.page_details =
          CustomForms[user.institute_details.code]["page_details"];
      }
    });
    this.setState(
      {
        form_details: [...form_details],
      },
      () => {
        this.getCustomFormDetails();
      }
    );
  };

  fetchInterviewPrefill = (applicationId) => {
    const url = GET_URL.jobapplication.api + applicationId + "/hire_prefill/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200 && response.data && response.data.data) {
        this.setState({ interviewPrefill: response.data.data });
      }
    });
  };

  getCustomFormDetails = () => {
    let { form_name, form_details, custom_form_id } = this.state;
    const url = GET_URL.customform.api;
    const params = { form_for: form_name, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let customDetails = response.data.data[0];
        let form_index = "";
        form_details.map((parentField, index) => {
          if (parentField["page_details"]["form_name"] === form_name) {
            form_index = index;
          }
        });
        let index_temp = "";
        let section_temp = "";
        if (customDetails) {
          custom_form_id = customDetails.id;
          customDetails.field_structure.map((data) => {
            index_temp = "";
            if (
              form_details[form_index]["page_details"]["sub_sections"][
              data["sub_section"]
              ]
            ) {
              form_details[form_index]["page_details"]["sub_sections"][
                data["sub_section"]
              ].list.map((dataList, dataIndex) => {
                if (
                  dataList.name === data["coming_after"] &&
                  form_details[form_index]["page_details"]["sub_sections"][
                    data["sub_section"]
                  ]["list"][dataIndex + 1]?.name !== data["name"]
                ) {
                  index_temp = dataIndex;
                  section_temp = data["sub_section"];
                }
              });
            }
            if (index_temp !== "" && section_temp !== "") {
              data["regex"] = regulars[data["regex"]];
              form_details[form_index]["page_details"]["sub_sections"][
                section_temp
              ]["list"].splice(index_temp + 1, 0, data);
            }
          });
        }
        this.setState(
          {
            form_details: [...form_details],
            custom_form_id,
          },
          () => {
            this.getFormDetails(form_name);
          }
        );
      }
    });
  };

  getFormDetails = (form_name) => {
    let storedStaffFormList = this.props.getStaffFormList;
    if (!storedStaffFormList) {
      const url = GET_URL.formdefinition.api;
      const params = { form_name: form_name };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.updateFields(response.data.data);
          this.props.setStaffFormList(response.data.data);
        }
      });
    } else {
      this.updateFields(storedStaffFormList);
    }
  };

  updateFields = (backendFieldsValue) => {
    let { staff_form_details, form_details, isEditForm } = this.state;
    let updated_form_details;

    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        form_details,
        backendFieldsValue,
        "staff_form",
        "update_label",
        isEditForm
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === "staff_form") {
          staff_form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      form_details.map((data) => {
        if (data["page_details"]["form_name"] === "staff_form") {
          staff_form_details = data["page_details"]["sub_sections"];
        }
      });
    }
    this.setState({
      staff_form_details,
    });
  };

  getStaffDetails = async () => {
    const { is_google_places } = this.state;
    const id = this.props.location.state.detail;
    const g_url = GET_URL.staffalldetail.api;
    const params = id + "/";
    const url = g_url + params;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let current_map_address_id = "";
        let permanent_map_address_id = "";

        let current_address_id = "";
        let permanent_address_id = "";

        if (is_google_places) {
          response.data.data["staff_address"].map((data) => {
            if (data.type === "CP" || data.type === "C") {
              current_map_address_id = data["map_address_data"]?.["id"];
              current_address_id = data["id"];
            } else {
              permanent_map_address_id = data["map_address_data"]?.["id"];
              permanent_address_id = data["id"];
            }
          });
        }
        this.setState({
          staffDetail: response.data.data,
          staff_id: response.data.data.id,
          bank_id:
            response.data.data.accounts.length > 0
              ? response.data.data.accounts[0]["id"]
              : "",
          users_id: response.data.data.users && response.data.data.users["id"],
          isEditForm: true,
          enableTabs: true,

          current_map_address_id,
          permanent_map_address_id,
          current_address_id,
          permanent_address_id,
        });
      }
    });
  };

  scrollTop = () => {
    const { staff_form_details } = this.state;
    this.refs.staff.scroll();
    if (!staff_form_details.nominee_details.hidden) {
      this.refs.nominee.scroll();
    }
    if (!staff_form_details.bank_details.hidden) {
      this.refs.bank.scroll();
    }
    this.refs.review.scroll();
  };

  loadingFalse = () => {
    this.setState({
      loading: false,
    });
  };

  isUpload = (name, id) => {
    let { profile_pic, staff, payDisabled, isUploadFailed } = this.state;
    profile_pic = id ? id : null;
    if (payDisabled && id) {
      this.setState(
        {
          profile_pic,
          isUploaded: true,
        },
        () => {
          this.check(staff);
        }
      );
    } else if (name === "failed") {
      payDisabled = false;
      isUploadFailed = true;
    }
    this.setState({
      profile_pic,
      isUploadFailed,
      isUploaded: name,
      payDisabled,
    });
  };

  handlePrompt = (name) => {
    this.setState({
      isPrompt: name,
    });
  };

  handleEnableTabs = () => {
    this.setState({
      enableTabs: true,
    });
  };

  render() {
    const {
      open,
      alertData,
      isEditForm,
      payDisabled,
      staffDetail,
      loading,
      value,
      isPrompt,
      enableTabs,
      staff_id,
      staff_form_details,
    } = this.state;
    return (
      <div>
        {loading && (
          <Box>
            <LoadingGif />
          </Box>
        )}
        <div className={loading ? "display-none" : ""}>
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">Staff Details</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                <Button
                  variant="contained"
                  component={Link}
                  to={Actions.staff_list.view.url}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.staff_list.view.label}
                </Button>
              </Box>
            </Grid>
          </Grid>
          <AppBar position="static" className="app-bar-heading mt-20">
            <Tabs
              value={value}
              variant="fullWidth"
              aria-selected="false"
              onChange={this.handleChange}
              backgroundColor="#ffffff"
              indicatorColor="transparent"
              className={
                enableTabs ? "md-up-justify-space-between" : "display-none"
              }
            >
              <Tab
                classes=""
                icon={
                  <Box display="flex" width="100%">
                    <Box className="form-number-heading">1</Box>
                    <Box className="tabs-heading">
                      <span>Staff Details</span>
                    </Box>
                  </Box>
                }
                style={this.state.studentError ? { color: "red" } : {}}
                {...a11yProps(3)}
              ></Tab>
              {!staff_form_details?.nominee_details?.hidden && (
                <Tab
                  classes={{ root: "form-tab" }}
                  value={1}
                  icon={
                    <Box display="flex" width="100%">
                      <Box className="form-number-heading">2</Box>
                      <div className="tabs-heading">
                        <span>Nominee Details</span>
                      </div>
                    </Box>
                  }
                  style={this.state.nomineeError ? { color: "red" } : {}}
                  {...a11yProps(3)}
                />
              )}
              {!staff_form_details?.bank_details?.hidden && (
                <Tab
                  classes={{ root: "form-tab" }}
                  value={2}
                  icon={
                    <Box display="flex" width="100%">
                      <Box className="form-number-heading">3</Box>
                      <div className="tabs-heading">
                        <span>Bank Details</span>
                      </div>
                    </Box>
                  }
                  style={this.state.nomineeError ? { color: "red" } : {}}
                  {...a11yProps(3)}
                />
              )}
              <Tab
                classes={{ root: "form-tab" }}
                value={3}
                icon={
                  <Box display="flex" width="100%">
                    <Box className="form-number-heading">4</Box>
                    <div className="tabs-heading">
                      <span>Review and Submission</span>
                    </div>
                  </Box>
                }
                {...a11yProps(5)}
              />
            </Tabs>
          </AppBar>

          <TabPanel value={value} index={0}>
            {(staffDetail || isEditForm !== null) &&
              staff_form_details && (
                <HrStaffPersonalInformation
                  staffDetail={staffDetail}
                  isEditForm={isEditForm}
                  loadingFalse={this.loadingFalse}
                  loadingForm={loading}
                  isUpload={this.isUpload}
                  handlePrompt={this.handlePrompt}
                  handleEnableTabs={this.handleEnableTabs}
                  ref={"staff"}
                  staff_id={staff_id}
                  form_details={staff_form_details}
                  interviewPrefill={this.state.interviewPrefill}
                />
              )}
          </TabPanel>

          <TabPanel value={value} index={1}>
            {(staffDetail || isEditForm !== null) &&
              staff_form_details &&
              !staff_form_details.nominee_details.hidden && (
                <StaffNomineeDetails
                  staffDetail={staffDetail}
                  isEditForm={isEditForm}
                  handlePrompt={this.handlePrompt}
                  loadingForm={loading}
                  ref={"nominee"}
                  form_details={staff_form_details}
                />
              )}
          </TabPanel>

          <TabPanel value={value} index={2}>
            {(staffDetail || isEditForm !== null) &&
              staff_form_details &&
              !staff_form_details.bank_details.hidden && (
                <StaffBankDetails
                  staffDetail={staffDetail}
                  isEditForm={isEditForm}
                  loading={loading}
                  handlePrompt={this.handlePrompt}
                  ref={"bank"}
                  form_details={staff_form_details}
                />
              )}
          </TabPanel>

          <TabPanel value={value} index={3}>
            <StaffSubmission
              payDisabled={payDisabled}
              value={value}
              ref={"review"}
              check={this.check}
              loadingFalse={this.loadingFalse}
              onClick={this.review}
              form_details={staff_form_details}
            />
          </TabPanel>
          {enableTabs && (
            <Box display="flex" justifyContent="flex-end" mr={3}>
              <Box
                marginRight="10px"
                display={
                  this.state.value === 1 || this.state.value === 2 ? "" : "none"
                }
                onClick={
                  this.state.value === 1
                    ? (e) => this.handleChange(e, 0)
                    : (e) => this.handleChange(e, 1)
                }
              >
                <Button className="form-next-pre-button">Previous</Button>
              </Box>
              <Box
                display={this.state.value === 3 ? "none" : "flex"}
                onClick={
                  this.state.value === 0
                    ? (e) => this.handleChange(e, 1)
                    : this.state.value === 1
                      ? (e) => this.handleChange(e, 2)
                      : (e) => this.handleChange(e, 3)
                }
              >
                <Button className="form-next-pre-button" ml={2}>
                  Next
                </Button>
              </Box>
            </Box>
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
        </div>
        <Prompt
          when={isPrompt}
          message="Staff Form is not submitted, Are you sure to exit ?"
        />
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getStaffFormList: makeStaffFormList(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setStaffFormList }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(HrStaffForm)
);

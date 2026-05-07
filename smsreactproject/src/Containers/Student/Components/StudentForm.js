import React, { Component } from "react";
import { Tabs, AppBar, Tab, Typography, Box, Button } from "@material-ui/core";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import Skeleton from "@material-ui/lab/Skeleton";
import Swal from "sweetalert2";
import { Prompt } from "react-router";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeAdmissionFormList } from "Components/CommonComponent/selectors";
import { setAdmissionFormList } from "Components/CommonComponent/actions";

import { getRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, getSettingValue } from "Includes/functions";
import AdmissionStudentInformation from "Containers/StudentForms/AdmissionStudentInformation";
import AdmissionParentInformation from "Containers/StudentForms/AdmissionParentInformation";
import AdmissionStudentSubmission from "Containers/StudentForms/AdmissionStudentSubmission";
import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
import { Forms } from "Constants/FormDefinition";
import LoadingGif from "Components/LoadingGif";
import { cloneDeep } from "lodash";
import * as regulars from "Constants/regularExpression";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { CustomForms } from "Constants/FormDefinition/CustomAdmissionForm";
let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";
const is_new_previous_details = false;
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

class StudentForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: 0,
      errors: {},
      disable: false,
      open: false,
      alertData: "",
      payDisabled: false,

      hideTabsAndNext: true,
      loading: true,

      isEditForm: null,
      studentDetail: null,
      applicationId: "",
      parentId: "",
      guardianId: "",
      isUploaded: true,
      profile_pic: {},
      isUploadFailed: false,
      isPrompt: false,
      student_form_details: null,
      form_name: "admission_form",
      form_details: cloneDeep(Forms),
      custom_form_id: "",
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
  }

  updateTab = () => {
    this.setState({ disable: false, loadingApplication: false });
  };

  handleChange = (e, newValue) => {
    if (newValue === 0) {
      this.setState({
        value: newValue,
      });
    } else if (newValue === 1) {
      const studentTest = this.refs.student.validate();
      if (studentTest) {
        this.setState({
          value: newValue,
          studentError: false,
        });
      } else {
        this.setState({
          studentError: true,
        });
      }
    } else if (newValue === 2) {
      let studentTest = this.refs.student.validate();
      let parentTest = this.refs.parent.validate();
      if (studentTest) {
        if (parentTest) {
          this.setState(
            {
              value: newValue,
              parentError: false,
              studentError: false,
            },
            () => {
              parentTest["custom_form_data"] = {
                ...studentTest.custom_form_data,
                ...parentTest.custom_form_data,
              };
              studentTest = { ...studentTest, ...parentTest };
              this.refs.review.reviewStudent(
                studentTest,
                this.state.isEditForm
              );
            }
          );
        } else {
          this.setState({
            value: 1,
            parentError: true,
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

  check = async (student) => {
    this.setState({ payDisabled: true, student: student, isPrompt: false });
    let {
      applicationId,
      isEditForm,
      parentId,
      guardianId,
      profile_pic,
      isUploaded,
      isUploadFailed,
      current_map_address_id,
      permanent_map_address_id,
      custom_form_id,
      is_google_places,
    } = this.state;
    let post_data = {
      student: {
        first_name: student.first_name.trim(),
        middle_name: Boolean(student.middle_name)
          ? student.middle_name.trim()
          : null,
        current_reg_num: student.current_reg_num
          ? student.current_reg_num.trim()
          : "",
        last_name: student.last_name ? student.last_name.trim() : "",
        gender: student.gender,
        sts: student.sts ? student.sts.trim() : "",
        dob: student.dob,
        mobile_num: student.mobile_num,
        email: Boolean(student.email) ? student.email.trim() : "",
        current_standard:
          student.current_standard === 0 ? null : student.current_standard,
        is_new_student: student.is_new_student == "false" ? false : true,
        student_group:
          student.student_group === 0 ? null : student.student_group,
        ...(profile_pic["student"]
          ? {
              profile_pic: profile_pic["student"],
            }
          : {
              profile_pic: null,
            }),
        barcode_number: student.barcode_number,
      },
      student_detail: {
        admission_date: student.admission_date,
        entry_academic_year:
          student.entry_academic_year === 0
            ? null
            : student.entry_academic_year,
        application: applicationId ? applicationId : null,
        is_existing_student: applicationId ? applicationId : true,
        aadhar_num: student.aadhar_num,
        mother_tongue: student.mother_tongue
          ? student.mother_tongue.trim()
          : "",
        eid_num: student.eid_num,
        place_of_birth:
          typeof student.place_of_birth === "string"
            ? student.place_of_birth.trim()
            : student.place_of_birth,
        nationality:
          typeof student.nationality === "string"
            ? student.nationality.trim()
            : student.nationality,
        religion: student.religion ? student.religion : "",
        caste: student.caste ? student.caste.id : "",
        category: student.category ? student.category : "",
        blood_group: student.blood_group ? student.blood_group : "",
        ...(student.physically_handicaped === "yes"
          ? {
              handicap_reason: student.handicap_reason.trim(),
            }
          : {}),
        physically_handicaped: student.physically_handicaped,
        ...(is_new_previous_details
          ? {
              previous_school_details: {
                sslcMarks: student.previous_school_details.sslcMarks,
                pucMarks: student.previous_school_details.pucMarks,
                sslc: student.previous_school_details.sslc,
                language: student.previous_school_details.language,
                particulars_last_exam_passed:
                  student.previous_school_details.particulars_last_exam_passed,
              },
              previousschool_details_new: {
                pre_school_name:
                  student.previous_school_details.pre_school_name,
                pre_left_standard:
                  student.previous_school_details.pre_left_standard,
                pre_school_address:
                  student.previous_school_details.pre_school_address,
                pre_tc_issued_date:
                  student.previous_school_details.pre_tc_issued_date,
                pre_school_tc_number:
                  student.previous_school_details.pre_school_tc_number,
                pre_register_number:
                  student.previous_school_details.pre_register_number,
                pre_working_experiance:
                  student.previous_school_details.pre_working_experiance,
                pre_working_joining_date:
                  student.previous_school_details.pre_working_joining_date,
                pre_working_date_of_leaving:
                  student.previous_school_details.pre_working_date_of_leaving,
                pre_total_marks:
                  student.previous_school_details.pre_total_marks,
                pre_secured_marks:
                  student.previous_school_details.pre_secured_marks,
                extra_activities:
                  student.previous_school_details.extra_activities,
                pre_school_date_of_joining:
                  student.previous_school_details.pre_school_date_of_joining,
                pre_school_left_date:
                  student.previous_school_details.pre_school_left_date,
                extra_activities:
                  student.previous_school_details.extra_activities,
              },
            }
          : {
              previous_school_details: student.previous_school_details,
            }),
        medical_details: {
          physician_name:
            typeof student.medical.physician_name === "string"
              ? student.medical.physician_name.trim()
              : student.medical.physician_name,
          med_mobile: student.medical.med_mobile,
          med_altmobile: student.medical.med_altmobile,
          hospital:
            typeof student.medical.hospital === "string"
              ? student.medical.hospital.trim()
              : student.hospital,
          ins_company:
            typeof student.medical.ins_company === "string"
              ? student.medical.ins_company.trim()
              : student.ins_company,
        },
        is_bpl: student.is_bpl,
        ...(student.is_bpl
          ? {
              bpl_num: student.bpl_num,
              bpl_issue_authority:
                typeof student.bpl_issue_authority === "string"
                  ? student.bpl_issue_authority.trim()
                  : student.bpl_issue_authority,
              bpl_issue_date: student.bpl_issue_date,
            }
          : {}),
      },
      parent_detail: {
        father_name: student.father_name.trim(),
        f_aadhar: student.f_aadhar,
        f_mobile_num: student.f_mobile_num,
        f_occupation: student.f_occupation.trim(),
        f_education: student.f_education,
        f_office_address: student.f_office_address.trim(),
        f_dob: student.f_dob ? student.f_dob : null,
        m_dob: student.m_dob ? student.m_dob : null,
        f_pan: student.f_pan.trim(),
        f_email: student.f_email.trim(),
        mother_name: student.mother_name.trim(),
        m_aadhar: student.m_aadhar,
        m_mobile_num: student.m_mobile_num,
        m_occupation: student.m_occupation.trim(),
        m_education: student.m_education.trim(),
        m_office_address: student.m_office_address.trim(),
        m_pan: student.m_pan,
        m_email: student.m_email.trim(),
        parents_annual_income: student.parents_annual_income
          ? student.parents_annual_income
          : null,
        f_tax_payee:
          student.f_tax_payee === "yes"
            ? true
            : student.father_name.trim() || student.mother_name.trim()
            ? false
            : "",
        m_tax_payee:
          student.m_tax_payee === "yes"
            ? true
            : student.father_name.trim() || student.mother_name.trim()
            ? false
            : "",
        ...(isEditForm
          ? {
              id: parentId,
            }
          : {}),

        ...(profile_pic["father"]
          ? {
              f_profile_pic: profile_pic["father"],
            }
          : {
              f_profile_pic: null,
            }),

        ...(profile_pic["mother"]
          ? {
              m_profile_pic: profile_pic["mother"],
            }
          : {
              m_profile_pic: null,
            }),
      },
      guardian_detail: {
        g_tax_payee: student.guardian_name.trim() ? student.g_tax_payee : "",
        guardian_name: student.guardian_name.trim(),
        g_dob: student.g_dob ? student.g_dob : null,
        g_aadhar: student.g_aadhar.trim(),
        g_mobile_num: student.g_mobile_num.trim(),
        g_occupation: student.g_occupation.trim(),
        g_education: student.g_education.trim(),
        g_office_address: student.g_office_address.trim(),
        g_pan: student.g_pan.trim(),
        g_email: student.g_email.trim(),
        annual_income: student.annual_income ? student.annual_income : null,
        ...(isEditForm
          ? {
              id: guardianId,
            }
          : {}),

        ...(profile_pic["guardian"]
          ? {
              g_profile_pic: profile_pic["guardian"],
            }
          : {
              g_profile_pic: null,
            }),
      },
      feature: student.feature,
      subject_detail: student.subject_detail,
      sibling_data: student.sibling_data,
      student_address: { current_address: {}, permanent_address: {} },
      fee_plan_item_selling_mapping:
        student?.fee_plan_item_selling_mapping ?? {},
    };
    post_data["standard_section_id"] = student?.["standard_section_id"] ?? null;
    if (is_google_places && student.currentAddress["country_map"]) {
      post_data["student_address"] = {
        current_address: { map_address_data: {} },
        permanent_address: {},
      };
      post_data["student_address"]["cp"] = student.current_address_checked;
      post_data["student_address"]["current_address"]["map_address_data"][
        "id"
      ] = current_map_address_id;
      post_data["student_address"]["current_address"]["map_address_data"][
        "address_one_map"
      ] = student.currentAddress["address_one_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "address_two_map"
      ] = student.currentAddress["address_two_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "city_map"
      ] = student.currentAddress["city_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "district_map"
      ] = student.currentAddress["district_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "state_map"
      ] = student.currentAddress["state_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "country_map"
      ] = student.currentAddress["country_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "pincode_map"
      ] = student.currentAddress["pincode_map"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "latitude_map"
      ] = student.currentAddress["latitude_and_langitude_map"]["lat"];
      post_data["student_address"]["current_address"]["map_address_data"][
        "longitude_map"
      ] = student.currentAddress["latitude_and_langitude_map"]["lng"];

      if (
        !student.current_address_checked &&
        student.permanentAddress["address_one_map"]
      ) {
        post_data["student_address"]["permanent_address"] = {
          map_address_data: {},
        };
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "id"
        ] = permanent_map_address_id;
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "address_one_map"
        ] = student.permanentAddress["address_one_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "address_two_map"
        ] = student.permanentAddress["address_two_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "city_map"
        ] = student.permanentAddress["city_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "district_map"
        ] = student.permanentAddress["district_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "state_map"
        ] = student.permanentAddress["state_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "country_map"
        ] = student.permanentAddress["country_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "pincode_map"
        ] = student.permanentAddress["pincode_map"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "latitude_map"
        ] = student.permanentAddress["latitude_and_langitude_map"]["lat"];
        post_data["student_address"]["permanent_address"]["map_address_data"][
          "longitude_map"
        ] = student.permanentAddress["latitude_and_langitude_map"]["lng"];
      }
    } else if (is_google_places && student.currentAddress["address_one_map"]) {
      post_data["student_address"]["current_address"]["address"] =
        student.currentAddress["address_one_map"];
      post_data["student_address"]["cp"] = true;
    } else if (!is_google_places) {
      post_data["student_address"] = {
        current_address: {},
        permanent_address: {},
      };
      post_data["student_address"]["cp"] = student.current_address_checked;
      post_data["student_address"]["current_address"]["address"] = Boolean(
        student.currentAddress.address
      )
        ? student.currentAddress.address.trim()
        : "";
      post_data["student_address"]["current_address"]["country"] =
        student.currentAddress.country;
      post_data["student_address"]["current_address"]["state"] =
        student.currentAddress.state;
      post_data["student_address"]["current_address"]["district"] =
        student.currentAddress.district;
      post_data["student_address"]["current_address"]["city"] =
        student.currentAddress.city;
      post_data["student_address"]["current_address"]["pincode"] =
        student?.currentAddress?.pincode ?? null;
      if (
        !student.current_address_checked &&
        (student.permanentAddress.country || student.permanentAddress.address)
      ) {
        post_data["student_address"]["permanent_address"] = {};
        post_data["student_address"]["permanent_address"]["address"] = Boolean(
          student.permanentAddress.address
        )
          ? student.permanentAddress.address.trim()
          : "";
        post_data["student_address"]["permanent_address"]["country"] =
          student.permanentAddress.country;
        post_data["student_address"]["permanent_address"]["state"] =
          student.permanentAddress.state;
        post_data["student_address"]["permanent_address"]["district"] =
          student.permanentAddress.district;
        post_data["student_address"]["permanent_address"]["city"] =
          student.permanentAddress.city;
        post_data["student_address"]["permanent_address"]["pincode"] =
          student?.permanentAddress?.pincode ?? null;
        if (
          this.state.isEditForm &&
          post_data["student_address"]?.["permanent_address"]
        ) {
          post_data["student_address"]["permanent_address"]["id"] =
            student.permanent_address_id;
        }
      }

      if (this.state.isEditForm) {
        post_data["student_address"]["current_address"]["id"] =
          student.current_address_id;
      }
    }

    post_data["document_list"] = this.getDocumentListFormat(student);
    post_data["deletable_document_list"] = this.getDocumentListFormat(
      student,
      true
    );
    post_data["custom_form_data"] = student.custom_form_data;
    post_data["custom_form_id"] = custom_form_id;
    if (isUploaded) {
      if (isEditForm) {
        const put_url = PUT_URL.studentall.api;
        const url = put_url + this.props.location.state.detail + "/";
        putRequest(url, post_data, this.props).then((response) => {
          if (response && response.status === 200) {
            this.setState({ payDisabled: false });
            Swal.fire({
              position: "top-end",
              type: "success",
              title: response.data.Reason,
              showConfirmButton: false,
              timer: 1500,
            });
            if (isUserHasPermission("general_student", "view")) {
              let currentSelectedList = {
                studentId: this.props.location.state.detail,
              };
              let searchParam =
                "?" + new URLSearchParams(currentSelectedList).toString();
              this.props.history.push({
                pathname: Actions.general_student.view.url,
                search: searchParam,
                state: { detail: this.props.location.state.detail },
              });
            } else {
              this.props.history.push(Actions.general_student_list.view.url);
            }
          } else {
            this.setState({ payDisabled: false });
          }
        });
      }
    } else if (isUploadFailed) {
      Swal.fire({
        type: "error",
        title: "Something Went Wrong Upload Profile Pic Again",
        showConfirmButton: true,
      });
    }
  };

  getDocumentListFormat = (student, isDelete) => {
    const { isEditForm, studentDetail } = this.state;
    let return_data = [];
    let return_temp = {};
    let edit_ids = [];
    let deletable_ids = [];
    student.document_list.map((data) => {
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
    if (isEditForm) {
      studentDetail.document_list.map((data) => {
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
          if (
            parentField.page_details.form_name === "admission_form" &&
            Object.keys(CustomForms).includes(user.institute_details.code)
          ) {
            parentField.page_details =
              CustomForms[user.institute_details.code]["page_details"];
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
            form_details,
            custom_form_id,
          },
          () => {
            this.getFormDetails(form_name);
          }
        );
      }
    });
  };

  componentDidMount = async () => {
    if (
      this.props.location.pathname === Actions.general_student_list.update.url
    ) {
      this.getCustomFormDetails();
      if (this.props.location.state && this.props.location.state.detail) {
        this.hideTabsAndNext();
        this.getStudentDetails();
      } else {
        this.props.history.push(Actions.general_student_list.view.url);
      }
    } else {
      this.setState({
        isEditForm: false,
      });
    }
  };

  getFormDetails = (form_name) => {
    let storedAdmissionFormList = this.props.getAdmissionFormList;
    if (!storedAdmissionFormList) {
      const url = GET_URL.formdefinition.api;
      const params = { form_name: form_name };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.updateFields(response.data.data);
          this.props.setAdmissionFormList(response.data.data);
        }
      });
    } else {
      this.updateFields(storedAdmissionFormList);
    }
  };

  updateFields = (backendFieldsValue) => {
    let { student_form_details, form_details } = this.state;
    let updated_form_details;
    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        form_details,
        backendFieldsValue,
        "admission_form",
        "update_label",
        true
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === "admission_form") {
          student_form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      form_details.map((data) => {
        if (data["page_details"]["form_name"] === "admission_form") {
          student_form_details = data["page_details"]["sub_sections"];
        }
      });
    }
    this.setState({
      student_form_details,
    });
  };

  getStudentDetails = async () => {
    const { is_google_places } = this.state;
    const id = this.props.location.state.detail;
    const g_url = GET_URL.getallstudents.api;
    const params = id + "/";
    const url = g_url + params;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let current_map_address_id = "";
        let permanent_map_address_id = "";

        if (is_google_places) {
          response.data.data["student_address"].map((data) => {
            if (data.type === "CP" || data.type === "C") {
              current_map_address_id = data["map_address_data"]?.["id"];
            } else {
              permanent_map_address_id = data["map_address_data"]?.["id"];
            }
          });
        }
        this.setState({
          studentDetail: response.data.data,
          applicationId: response.data.data.student_details.application,
          isEditForm: true,
          parentId: response.data.data.student_parent?.parent?.id,
          guardianId: response.data.data.student_parent?.guardian?.id,
          current_map_address_id,
          permanent_map_address_id,
        });
      }
    });
  };

  UpdatingStudentDetails(data, name) {
    let student = data.data;
    let parent = { ...data.data.student_details, ...data.data.student_parent };
    let previousSchool = data.data.student_details;
    this.refs.studentInformation.updatePreviousSchool(previousSchool);
    this.refs.studentInformation.updateStudent(student, name);
    this.refs.parentInformation.updateParent(parent, name);
  }

  scrollTop = () => {
    this.refs.student.scroll();
    this.refs.parent.scroll();
    this.refs.review.scroll();
  };

  loadingFalse = () => {
    this.setState({
      loading: false,
    });
  };

  hideTabsAndNext = () => {
    this.setState({
      hideTabsAndNext: false,
    });
  };

  isUpload = (name, id, parentType) => {
    let { profile_pic, student, payDisabled, isUploadFailed } = this.state;
    profile_pic[parentType] = id ? id : null;
    if (payDisabled && id) {
      this.setState(
        {
          profile_pic,
          isUploaded: true,
        },
        () => {
          this.check(student);
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

  render() {
    const {
      open,
      alertData,
      isEditForm,
      payDisabled,
      studentDetail,
      loading,
      hideTabsAndNext,
      isPrompt,
      student_form_details,
    } = this.state;
    return (
      <div>
        {loading && (
          <Box>
            <LoadingGif />
          </Box>
        )}
        <div className={loading ? "display-none" : ""}>
          <Box fontWeight="500" className="form-heading-title">
            Student Details
          </Box>
          <AppBar
            position="static"
            className={hideTabsAndNext ? "display-none" : "app-bar-heading"}
          >
            <Tabs
              value={this.state.value}
              variant="fullWidth"
              aria-selected="false"
              onChange={this.handleChange}
              backgroundColor="#ffffff"
              indicatorColor="transparent"
              className="md-up-justify-space-between"
            >
              <Tab
                classes=""
                icon={
                  <Box display="flex" width="100%">
                    <Box className="form-number-heading">1</Box>
                    <Box className="tabs-heading">
                      <span>Student Details</span>
                    </Box>
                  </Box>
                }
                style={this.state.studentError ? { color: "red" } : {}}
                {...a11yProps(3)}
              ></Tab>
              {this.state.disable && (
                <Box display="flex" width="80%" justifyContent="center">
                  <Skeleton
                    variant="circle"
                    width={40}
                    height={40}
                    className="skeleton-circle"
                  />
                  <Skeleton
                    variant="rect"
                    width={270}
                    height={48}
                    className="skeleton-rect"
                  />
                </Box>
              )}
              {!this.state.disable && (
                <Tab
                  classes={{ root: "form-tab" }}
                  icon={
                    <Box display="flex" width="100%">
                      <Box className="form-number-heading">2</Box>
                      <div className="tabs-heading">
                        <span>Parent Details</span>
                      </div>
                    </Box>
                  }
                  style={this.state.parentError ? { color: "red" } : {}}
                  {...a11yProps(3)}
                />
              )}
              {this.state.disable && (
                <Box display="flex" width="80%" justifyContent="flex-start">
                  <Skeleton
                    variant="circle"
                    width={40}
                    height={40}
                    className="skeleton-circle"
                  />
                  <Skeleton
                    variant="rect"
                    width={270}
                    height={48}
                    className="skeleton-rect"
                  />
                </Box>
              )}
              {!this.state.disable && (
                <Tab
                  classes={{ root: "form-tab" }}
                  icon={
                    <Box display="flex" width="100%">
                      <Box className="form-number-heading">3</Box>
                      <div className="tabs-heading">
                        <span>Review and Submission</span>
                      </div>
                    </Box>
                  }
                  {...a11yProps(5)}
                />
              )}
            </Tabs>
          </AppBar>

          <TabPanel value={this.state.value} index={0}>
            {(studentDetail || isEditForm !== null) && student_form_details && (
              <AdmissionStudentInformation
                studentDetail={studentDetail}
                form_details={student_form_details}
                isEditForm={isEditForm}
                loadingFalse={this.loadingFalse}
                verifyApplication={this.verifyApplication}
                hideTabsAndNext={this.hideTabsAndNext}
                loadingForm={loading}
                isUpload={this.isUpload}
                handlePrompt={this.handlePrompt}
                ref={"student"}
              />
            )}
          </TabPanel>

          <TabPanel value={this.state.value} index={1}>
            {(studentDetail || isEditForm !== null) && student_form_details && (
              <AdmissionParentInformation
                studentDetail={studentDetail}
                form_details={student_form_details}
                isEditForm={isEditForm}
                isUpload={this.isUpload}
                verifyEnquiry={this.verifyEnquiry}
                loading={loading}
                handlePrompt={this.handlePrompt}
                ref={"parent"}
              />
            )}
          </TabPanel>

          <TabPanel value={this.state.value} index={2}>
            {student_form_details && (
              <AdmissionStudentSubmission
                payDisabled={payDisabled}
                form_details={student_form_details}
                value={this.state.value}
                ref={"review"}
                check={this.check}
                reviewStudent={this.reviewStudent}
                onClick={this.review}
              />
            )}
          </TabPanel>
          <Box
            display="flex"
            justifyContent="flex-end"
            mr={3}
            onClick={this.scrollTop}
            className={hideTabsAndNext ? "display-none" : ""}
          >
            <Box
              marginRight="10px"
              display={this.state.value === 1 ? "" : "none"}
              onClick={
                this.state.value === 1 ? (e) => this.handleChange(e, 0) : ""
              }
            >
              <Button className="form-next-pre-button">Previous</Button>
            </Box>
            <Box
              display={this.state.value === 2 ? "none" : "flex"}
              onClick={
                this.state.value === 0
                  ? (e) => this.handleChange(e, 1)
                  : (e) => this.handleChange(e, 2)
              }
            >
              <Button className="form-next-pre-button" ml={2}>
                {" "}
                Next{" "}
              </Button>
            </Box>
          </Box>
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
          message="Application Form is not submitted, Are you sure to exit ?"
        />
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAdmissionFormList: makeAdmissionFormList(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setAdmissionFormList }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(StudentForm)
);

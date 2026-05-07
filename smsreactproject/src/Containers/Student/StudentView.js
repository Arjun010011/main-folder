import React, { Component } from "react";
import PersonIcon from "@material-ui/icons/Person";
import PagesIcon from "@material-ui/icons/Pages";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import { Box, Grid, Button, Paper } from "@material-ui/core";
import { withRouter } from "react-router-dom";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeAdmissionFormList } from "Components/CommonComponent/selectors";
import { setAdmissionFormList } from "Components/CommonComponent/actions";

import ProfileFormInfo from "Components/Profile_View/ProfileFormInfo";
import DetailsFillForm from "Components/Profile_View/DetailsFillForm";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  getSettingValue,
  getFullName,
  setProfileTab,
} from "Includes/functions";  
import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
import { Forms } from "Constants/FormDefinition";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";
import { relation_ship } from "Constants";
import { getUrlParam } from "Includes/functions";
import StudentFeeCollection from "./Components/StudentFeeCollection";
import StudentFeeHistory from "./Components/StudentFeeHistory";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { CustomForms } from "Constants/FormDefinition/CustomAdmissionForm";
import StudentCertifications from "./Components/StudentCertifications";
import StudentAttendance from "./Components/StudentAttendance";
import StudentMarksCard from "./Components/StudentMarksCard";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const admission_in_reg = parseInt(getSettingValue("admission_in_reg"));
const isResidential = parseInt(getSettingValue("is_residential"));

class StudentView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      profile: 1,
      student_id: "",
      loading: true,
      enabledAction: [],
      short_info: {
        1: { label: "image", value: "" },
        2: { label: "profile_firstName", value: "" },
        3: { label: "profile_middleName", value: "" },
        4: { label: "profile_lastName", value: "" },
        5: { label: "profile_standard", value: "" },
        6: { label: "profile_section", value: "" },
      },
      profile_info: [],
      tabs: [],
      profile_heading: { 1: { value: "" }, 2: { value: "" }, 3: { value: "" } },
      profile_data: {
        1: [],
        2: [],
        3: [],
        4: [],
      },
      form_name: "admission_form",
      forms: cloneDeep(Forms),
      currentTab: "profile",
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
  }

  onClicked = (key) => {
    this.setState({
      profile: key,
    });
  };

  componentDidUpdate(prevProps) {
    let { studentId } = getUrlParam();
    const newStudentId = getUrlParam(prevProps.location.search).studentId;
    const oldStudentId = getUrlParam(
      prevProps.history.location.search
    ).studentId;
    if (newStudentId && oldStudentId && newStudentId != oldStudentId) {
      this.setState(
        {
          loading: true,
          student_id: studentId,
          profile_info: [],
          tabs: [],
          profile_heading: {
            1: { value: "" },
            2: { value: "" },
            3: { value: "" },
            4: { value: "" },
          },
          profile_data: {
            1: [],
            2: [],
            3: [],
            4: [],
          },
        },
        () => {
          if (
            this.props.location.pathname === Actions.general_student.view.url
          ) {
            this.getStudentDetails();
          } else if (
            this.props.location.pathname ===
            Actions.fee_collection_student.view.url
          ) {
            this.setState({
              currentTab: "feeCollection",
              student_id: studentId,
              loading: false,
            });
          } else if (
            this.props.location.pathname ===
            Actions.fee_history_student.view.url
          ) {
            this.setState({
              currentTab: "feeHistory",
              student_id: studentId,
              loading: false,
            });
          }
        }
      );
    }
  }

  componentDidMount() {
    let { studentId, onlyView } = getUrlParam();
    if (studentId) {
      if (this.props.location.pathname === Actions.general_student.view.url) {
        this.getCustomFormDetails();
        let enabledAction = [];
        if (
          !onlyView &&
          isUserHasPermission("general_student_list", "update")
        ) {
          enabledAction.push("edit");
        }
        this.setState({
          enabledAction: enabledAction,
          student_id: studentId,
        });
      } else if (
        this.props.location.pathname === Actions.fee_collection_student.view.url
      ) {
        this.setState({
          currentTab: "feeCollection",
          student_id: studentId,
          loading: false,
        });
      } else if (
        this.props.location.pathname === Actions.fee_history_student.view.url
      ) {
        this.setState({
          currentTab: "feeHistory",
          student_id: studentId,
          loading: false,
        });
      }
    } else {
      this.props.history.push(Actions.general_student_list.view.url);
    }
  }

  getCustomFormDetails = () => {
    const { form_name, forms } = this.state;
    const url = GET_URL.customform.api;
    const params = { form_for: form_name, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let customDetails = response.data.data[0];
        let form_index = "";
        forms.map((parentField, index) => {
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
          customDetails.field_structure.map((data) => {
            index_temp = "";
            if (
              forms[form_index]["page_details"]["sub_sections"][
                data["sub_section"]
              ]
            ) {
              forms[form_index]["page_details"]["sub_sections"][
                data["sub_section"]
              ].list.map((dataList, dataIndex) => {
                if (
                  dataList.name === data["coming_after"] &&
                  forms[form_index]["page_details"]["sub_sections"][
                    data["sub_section"]
                  ]["list"][dataIndex + 1]?.name !== data["name"]
                ) {
                  index_temp = dataIndex;
                  section_temp = data["sub_section"];
                }
              });
            }
            if (index_temp !== "" && section_temp !== "") {
              forms[form_index]["page_details"]["sub_sections"][section_temp][
                "list"
              ].splice(index_temp + 1, 0, data);
            }
          });
        }
        this.setState(
          {
            forms,
            // student_id: this.props?.location?.state?.detail,
          },
          () => {
            this.getFormDetails(form_name);
          }
        );
      }
    });
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
    let { form_details, forms } = this.state;
    let updated_form_details;
    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        forms,
        backendFieldsValue,
        "admission_form",
        "update_label"
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === "admission_form") {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      forms.map((data) => {
        if (data["page_details"]["form_name"] === "admission_form") {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    }
    this.setState({
      form_details,
    });
    this.getStudentDetails();
  };

  getStudentDetails = () => {
    const id = this.state.student_id;
    const g_url = GET_URL.getallstudents.api;
    const params = id;
    const url = g_url + params + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            student: response.data.data,
          },
          () => {
            this.setApplicationView();
          }
        );
      }
    });
  };

  getValuesSubmitted = (doc_list) => {
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
          image_temp["url"] = data.document_details["file"];
          image_temp["uploadedId"] = data.document_details["id"];
          image_temp["id"] = data["id"];
          doc_temp[data.document_type]["imagesPreview"].push(image_temp);
        } else {
          doc_temp[data.document_type]["edit_id"] = data["id"];
        }
      } else {
        image_temp = {};
        image_temp["url"] = data.document_details["file"];
        image_temp["uploadedId"] = data.document_details["id"];
        image_temp["id"] = data["id"];
        doc_temp[data.document_type]["imagesPreview"].push(image_temp);
      }
    });
    Object.keys(doc_temp).map((data) => {
      return_data.push(doc_temp[data]);
    });
    return return_data;
  };

  getSiblingDetails = (student) => {
    let return_data = [];
    if (student.sibling_data && student.sibling_data.length > 0) {
      let temp = {};
      student.sibling_data.map((sibData) => {
        if (sibData.relation_ship_for_me) {
          temp = {};
          temp["full_name"] = getFullName(
            sibData.student__first_name,
            sibData.student__middle_name,
            sibData.student__last_name
          );
          temp["standard_name"] = sibData.standard_name;
          temp["section_name"] = sibData.section_name;
          temp["dob"] = dateFormat(sibData.student__dob, "DD-MM-YYYY");
          temp["relation_ship"] = relation_ship[sibData.relation_ship_for_me];
          temp["student_id"] = sibData.student_id;
          return_data.push(temp);
        }
      });
    }
    return return_data;
  };

  setApplicationView = () => {
    let {
      isSslcPucPresent,
      isPucPresent,
      form_details,
      student,
      is_google_places,
    } = this.state;
    const url = GET_URL.getstandard.api;
    const params = {
      academic_year: student.student_details.entry_academic_year,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let { profile_data, profile_heading, short_info, profile_info, tabs } =
          this.state;

        response.data.data.map((data) => {
          if (
            data.id == student.current_standard &&
            (data.codename === "standard11" || data.codename === "standard12")
          ) {
            if (data.codename === "standard12") {
              isPucPresent = true;
            }
            isSslcPucPresent = true;
          }
        });
        short_info[1].value = student["profile_pic_details"]
          ? student["profile_pic_details"]["file"]
          : "";
        short_info[2].value = student["first_name"]
          ? student["first_name"]
          : "";
        short_info[3].value = student["middle_name"]
          ? student["middle_name"]
          : "";
        short_info[4].value = student["last_name"] ? student["last_name"] : "";
        short_info[5].value = student["current_standard_name"]
          ? student["current_standard_name"]
          : "";
        short_info[6].value = student?.student_details?.section_name
        let student_profile = { label: "Email", value: student["email"] };
        profile_info.push(student_profile);
        student_profile = { label: "Mobile No", value: student["mobile_num"] };
        profile_info.push(student_profile);
        student_profile = { label: "DOB", value: student["dob"] };
        profile_info.push(student_profile);

        let currentAddress, permanentAddress;
        let school = student.student_details.previous_school_details;
        let studentMedical = student.student_details.medical_details;

        let parent = student?.student_parent?.parent ?? {};
        let guardian = student?.student_parent?.guardian
          ? student.student_parent.guardian
          : {};

        let student_address = student.student_address;
        let student_details = student.student_details;

        let second_language = school?.["language"] ?? {};
        let sslc = school?.["sslc"] ?? {};
        let sslcMarks = school?.["sslcMarks"] ?? {};
        let puc = school?.["puc"] ?? {};
        let pucMarks = school?.["pucMarks"] ?? {};
        let extraActivity = school?.["extraActivity"] ?? {};
        student_address.map((field) => {
          if (field.type === "CP" || field.type === "C") {
            currentAddress = field;
            if (field.type === "CP") {
              student["current_address_checked"] = true;
            }
          } else {
            permanentAddress = field;
            student["current_address_checked"] = false;
          }
        });

        let student_tabs = {};

        let student_basic = { sub_heading: "", data: [] };
        student_basic["sub_heading"] = form_details.student_details.label;
        let temp = {};
        form_details.student_details.list.map((field) => {
          if (!field.hidden) {
            temp = {};
            temp["label"] = field.label;
            let value;
            if (field.isCustom) {
              value = student.custom_form_data?.[field.name] ?? "";
            } else {
              value = student_details?.[field.name] ?? student[field.name];
            }
            if (field.view_name) {
              temp["value"] = student[field.view_name]
                ? student[field.view_name]
                : student_details[field.view_name];
            } else if (field.name === "document_list" && student[field.name]) {
              temp["md"] = 6;
              temp["list"] = true;
              temp["value"] = this.getValuesSubmitted(student[field.name]);
            } else if (field.type === "date") {
              temp["value"] = dateFormat(value, "DD-MM-YYYY");
            } else if (field.name === "student_type" && !isResidential) {
              return;
            } else if (
              field.boolean ||
              field.type === "switch" ||
              field.type === "checkbox"
            ) {
              temp["value"] = value ? "Yes" : "No";
            } else {
              temp["value"] = value;
            }
            if (field.view_className) {
              temp["className"] = field.view_className;
            }
            if (field.name === "is_new_student") {
              value = student[field.name] ? "New Student" : "Old Student";
            }
            student_basic.data.push(temp);
          }
        });
        temp = {};
        temp["label"] = "Admission Date";
        temp["value"] = dateFormat(student["admission_date"], "DD-MM-YYYY");
        student_basic.data.push(temp);

        temp = {};
        if (!admission_in_reg) {
          temp["label"] = "Admission Number";
          temp["value"] = student["admission_num"];
          temp["className"] = "text-transform-none";
          student_basic.data.push(temp);
        }
        temp = {};
        temp["label"] = "Register Number";
        temp["value"] = student["current_reg_num"];
        temp["className"] = "text-transform-none";
        student_basic.data.push(temp);
        profile_data[1].push(student_basic);

        let staff_user_login = {
          sub_heading: "User Login",
          data: [
            {
              label: "User Name",
              value: student["username"],
              className: "text-transform-none",
            },
          ],
        };
        profile_data[1].push(staff_user_login);

        if (!form_details.medical_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.medical_details.label;
          temp = {};

          form_details.medical_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = studentMedical?.[field.name];
              }
              temp["value"] = value;
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[1].push(student_basic);
        }

        if (!form_details.bank_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.bank_details.label;
          temp = {};
          form_details.bank_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = student_details[field.name];
              }
              temp["value"] = value;
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });

          profile_data[1].push(student_basic);
        }

        if (!form_details.pre_school_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.pre_school_details.label;
          temp = {};
          form_details.pre_school_details.list.map((field) => {
            if (!field.hidden && field.name !== "isPreSchoolPresent") {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = school?.[field.name];
              }
              if (field.type === "date") {
                temp["value"] = value
                  ? dateFormat(school[field.name], "DD-MM-YYYY")
                  : "";
              } else {
                temp["value"] = value;
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[1].push(student_basic);
        }

        if (isSslcPucPresent) {
          if (!form_details.sslc_details.hidden) {
            student_basic = { sub_heading: "", data: [] };
            student_basic["sub_heading"] = form_details.sslc_details.label;
            temp = {};

            form_details.sslc_details.list.map((field) => {
              if (!field.hidden) {
                temp = {};
                temp["label"] = field.label;
                let value;
                if (field.isCustom) {
                  value = student.custom_form_data?.[field.name] ?? "";
                } else {
                  value = sslc[field.name];
                }
                temp["value"] = sslc[field.name];
                student_basic.data.push(temp);
              }
            });
            profile_data[4].push(student_basic);
          }

          if (isPucPresent) {
            if (!form_details.puc_details.hidden) {
              student_basic = { sub_heading: "", data: [] };
              student_basic["sub_heading"] = form_details.puc_details.label;
              temp = {};

              form_details.puc_details.list.map((field) => {
                if (!field.hidden) {
                  temp = {};
                  temp["label"] = field.label;
                  temp["value"] = puc[field.name];
                  student_basic.data.push(temp);
                }
              });
              profile_data[4].push(student_basic);
            }
          }

          if (!form_details.second_language_details.hidden) {
            student_basic = { sub_heading: "", data: [] };
            student_basic["sub_heading"] =
              form_details.second_language_details.label;
            temp = {};

            form_details.second_language_details.list.map((field) => {
              if (!field.hidden) {
                temp = {};
                temp["label"] = field.label;
                temp["value"] = second_language[field.name];
                student_basic.data.push(temp);
              }
            });
            profile_data[4].push(student_basic);
          }

          if (!form_details.medium_instruction_details.hidden) {
            student_basic = { sub_heading: "", data: [] };
            student_basic["sub_heading"] =
              form_details.medium_instruction_details.label;
            temp = {};

            form_details.medium_instruction_details.list.map((field) => {
              if (!field.hidden) {
                temp = {};
                temp["label"] = field.label;
                temp["value"] = second_language[field.name];
                student_basic.data.push(temp);
              }
            });
            profile_data[4].push(student_basic);
          }

          if (!form_details.sslc_mark_details.hidden) {
            student_basic = { sub_heading: "", data: [] };
            student_basic["sub_heading"] = form_details.sslc_mark_details.label;
            temp = {};

            form_details.sslc_mark_details.list.map((field) => {
              if (!field.hidden) {
                temp = {};
                temp["label"] = field.label;
                temp["value"] = sslcMarks[field.name];
                student_basic.data.push(temp);
              }
            });
            profile_data[4].push(student_basic);
          }

          if (isPucPresent) {
            if (!form_details.puc_mark_details.hidden) {
              student_basic = { sub_heading: "", data: [] };
              student_basic["sub_heading"] =
                form_details.puc_mark_details.label;
              temp = {};

              form_details.puc_mark_details.list.map((field) => {
                if (!field.hidden) {
                  temp = {};
                  temp["label"] = field.label;
                  temp["value"] = pucMarks[field.name];
                  student_basic.data.push(temp);
                }
              });
              profile_data[4].push(student_basic);
            }
          }
        }
        if (is_google_places && !form_details.current_address_details.hidden) {
          if (
            student.current_address_checked &&
            !currentAddress?.map_address_data?.["address_one_map"]
          ) {
            if (!currentAddress["map_address_data"]) {
              currentAddress = {
                ...currentAddress,
                ...{ map_address_data: { address_one_map: "" } },
              };
            }
            currentAddress["map_address_data"]["address_one_map"] =
              currentAddress?.["address_one_map"] ?? currentAddress["address"];
          }
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = student["current_address_checked"]
            ? "Current and Permanent Address Details"
            : form_details.current_address_details.label;
          student_basic["data"] = [
            {
              label: <FormattedMessage {...commonMessages.address1} />,
              value: currentAddress?.map_address_data?.["address_one_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.address2} />,
              value: currentAddress?.map_address_data?.["address_two_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.city} />,
              value: currentAddress?.map_address_data?.["city_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.district} />,
              value: currentAddress?.map_address_data?.["district_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.state} />,
              value: currentAddress?.map_address_data?.["state_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.country} />,
              value: currentAddress?.map_address_data?.["country_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.pincode} />,
              value: currentAddress?.map_address_data?.["pincode_map"],
            },
          ];
          profile_data[3].push(student_basic);
        } else if (
          !is_google_places &&
          !form_details.current_address_details.hidden
        ) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = student["current_address_checked"]
            ? "Current and Permanent Address Details"
            : form_details.current_address_details.label;
          temp = {};
          if (
            student.current_address_checked &&
            !currentAddress?.["address_one_map"]
          ) {
            if (!currentAddress["map_address_data"]) {
              currentAddress = {
                ...currentAddress,
                ...{ address_one_map: "" },
              };
            }
            currentAddress["address_one_map"] =
              currentAddress?.["address_one_map"] ?? currentAddress["address"];
          }
          form_details.current_address_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              if (field.view_name) {
                temp["value"] = currentAddress?.[field.view_name];
              } else {
                temp["value"] = currentAddress?.[field.name];
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[3].push(student_basic);
        }

        if (
          is_google_places &&
          !student["current_address_checked"] &&
          !form_details.permanent_address_details.hidden
        ) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] =
            form_details.permanent_address_details.label;
          student_basic["data"] = [
            {
              label: <FormattedMessage {...commonMessages.address1} />,
              value:
                permanentAddress?.["map_address_data"]?.["address_one_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.address2} />,
              value:
                permanentAddress?.["map_address_data"]?.["address_two_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.city} />,
              value: permanentAddress?.["map_address_data"]?.["city_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.district} />,
              value: permanentAddress?.["map_address_data"]?.["district_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.state} />,
              value: permanentAddress?.["map_address_data"]?.["state_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.country} />,
              value: permanentAddress?.["map_address_data"]?.["country_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.pincode} />,
              value: permanentAddress?.["map_address_data"]?.["pincode_map"],
            },
          ];
          profile_data[3].push(student_basic);
        } else if (
          !is_google_places &&
          !student["current_address_checked"] &&
          !form_details.permanent_address_details.hidden
        ) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] =
            form_details.permanent_address_details.label;
          temp = {};
          form_details.permanent_address_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              if (field.view_name) {
                temp["value"] = permanentAddress?.[field.view_name];
              } else {
                temp["value"] = permanentAddress?.[field.name];
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[3].push(student_basic);
        }

        if (!form_details.extra_activity_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] =
            form_details.extra_activity_details.label;
          temp = {};
          form_details.extra_activity_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              temp["value"] = extraActivity[field.name];
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[1].push(student_basic);
        }

        if (!form_details.father_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.father_details.label;
          temp = {};

          form_details.father_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = parent?.[field.name] ?? "";
              }
              if (field.view_name) {
                value = parent[field.view_name];
              } else if (field.type === "date") {
                value = dateFormat(value, "DD-MM-YYYY");
              } else if (field.type === "multiselect") {
                value = this.getMultiSelectValue(value);
              } else if (field.type === "dropDownWithSearch") {
                value = value?.name;
              } else if (
                field.boolean ||
                field.type === "switch" ||
                field.type === "checkbox"
              ) {
                value = value ? "Yes" : "No";
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              if (field.name === "f_profile_pic") {
                temp["value"] = parent["f_profile_pic_details"]
                  ? parent["f_profile_pic_details"]["file"]
                  : "";
              } else {
                temp["value"] = value;
              }
              temp["type"] = field.type;
              student_basic.data.push(temp);
            }
          });
          profile_data[2].push(student_basic);
        }

        if (!form_details.mother_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.mother_details.label;
          temp = {};

          form_details.mother_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = parent?.[field.name] ?? "";
              }
              if (field.view_name) {
                value = parent[field.view_name];
              } else if (field.type === "date") {
                value = dateFormat(value, "DD-MM-YYYY");
              } else if (field.type === "multiselect") {
                value = this.getMultiSelectValue(value);
              } else if (field.type === "dropDownWithSearch") {
                value = value?.name;
              } else if (
                field.boolean ||
                field.type === "switch" ||
                field.type === "checkbox"
              ) {
                value = value ? "Yes" : "No";
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              if (field.name === "m_profile_pic") {
                temp["value"] = parent["m_profile_pic_details"]
                  ? parent["m_profile_pic_details"]["file"]
                  : "";
              } else {
                temp["value"] = value;
              }
              temp["type"] = field.type;
              student_basic.data.push(temp);
            }
          });
          profile_data[2].push(student_basic);
        }

        if (!form_details.guardian_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.guardian_details.label;
          temp = {};

          form_details.guardian_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = guardian[field.name];
              }
              if (field.view_name) {
                value = guardian[field.view_name];
              } else if (field.type === "date") {
                value = dateFormat(value, "DD-MM-YYYY");
              } else if (field.type === "multiselect") {
                value = this.getMultiSelectValue(value);
              } else if (field.type === "dropDownWithSearch") {
                value = value?.name;
              } else if (
                field.boolean ||
                field.type === "switch" ||
                field.type === "checkbox"
              ) {
                value = value ? "Yes" : "No";
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              if (field.name === "g_profile_pic") {
                temp["value"] = guardian["g_profile_pic_details"]
                  ? guardian["g_profile_pic_details"]["file"]
                  : "";
              } else {
                temp["value"] = value;
              }
              temp["type"] = field.type;
              student_basic.data.push(temp);
            }
          });
          profile_data[2].push(student_basic);
        }

        if (!form_details.bpl_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.bpl_details.label;
          temp = {};

          form_details.bpl_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              if (field.type === "date") {
                temp["value"] = dateFormat(
                  student_details[field.name],
                  "DD-MM-YYYY"
                );
              } else if (
                field.boolean ||
                field.type === "switch" ||
                field.type === "checkbox"
              ) {
                temp["value"] = student_details[field.name] ? "Yes" : "No";
              } else {
                temp["value"] = student_details[field.name];
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[2].push(student_basic);
        }
        if (!form_details.sibling_details.hidden) {
          let column_data = [
            { name: "full_name", label: "Sibling" },
            { name: "standard_name", label: "Standad" },
            { name: "section_name", label: "Section" },
            { name: "dob", label: "DOB" },
            { name: "relation_ship", label: "Relation" },
          ];
          let row_data = this.getSiblingDetails(student);
          profile_data[1].push({
            sub_heading: "Sibling Details",
            data: [
              {
                label: "Sibling Details",
                table: true,
                md: 12,
                column_data: column_data,
                row_data: row_data,
                is_sibling_table: true,
              },
            ],
          });
        }
        if (profile_data[1].length !== 0) {
          profile_heading[1].value = "Student Information";
          student_tabs = {
            icon: <PersonIcon />,
            value: "student Overview",
            key: 1,
          };
          tabs.push(student_tabs);
        }

        if (profile_data[2].length !== 0) {
          profile_heading[2].value = "Parent Information";
          student_tabs = {
            icon: <PersonIcon />,
            value: "Parent Overview",
            key: 2,
          };
          tabs.push(student_tabs);
        }
        if (profile_data[3].length !== 0) {
          profile_heading[3].value = "Contact Information";
          student_tabs = {
            icon: <PagesIcon />,
            value: "Address Overview",
            key: 3,
          };
          tabs.push(student_tabs);
        }
        this.setState({
          profile_heading,
          profile_data,
          profile_info,
          tabs,
          loading: false,
          student_id: student.id,
        });
      }
    });
  };

  changeTab = (name) => {
    const { currentTab, student_id } = this.state;
    if (currentTab !== name) {
      setProfileTab(name);
      this.setState({
        currentTab: name,
      });
      if (name === "feeCollection") {
        let currentSelectedList = {
          studentId: student_id,
        };
        let searchParam =
          "?" + new URLSearchParams(currentSelectedList).toString();
        this.props.history.push({
          pathname: Actions.fee_collection_student.view.url,
          search: searchParam,
          state: { detail: student_id },
        });
      } else if (name === "profile") {
        let currentSelectedList = {
          studentId: student_id,
        };
        let searchParam =
          "?" + new URLSearchParams(currentSelectedList).toString();
        this.props.history.push({
          pathname: Actions.general_student.view.url,
          search: searchParam,
          state: { detail: student_id },
        });
      } else if (name === "feeHistory") {
        let currentSelectedList = {
          studentId: student_id,
        };
        let searchParam =
          "?" + new URLSearchParams(currentSelectedList).toString();
        this.props.history.push({
          pathname: Actions.fee_history_student.view.url,
          search: searchParam,
          state: { detail: student_id },
        });
      }
    }
  };

  render() {
    const { loading, enabledAction, currentTab, student_id } = this.state;
    return (
      <div>
        <Box className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">Student Form</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                {isUserHasPermission("general_student_list", "view") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.general_student_list.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.general_student_list.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Paper className={"mt-20"}>
            <Grid container className="">
              <Box
                className={
                  currentTab === "profile"
                    ? "admission-tab-selected-heading"
                    : "admission-tab-heading"
                }
                onClick={() => this.changeTab("profile")}
              >
                Student Profile
                {currentTab === "profile" && (
                  <Box className="admission-tab-selected-heading-underline" />
                )}
              </Box>
              {isUserHasPermission("fee_collection", "view") && (
                <Box
                  className={
                    currentTab === "feeCollection"
                      ? "admission-tab-selected-heading"
                      : "admission-tab-heading"
                  }
                  onClick={() => this.changeTab("feeCollection")}
                >
                  Fee Collection
                  {currentTab === "feeCollection" && (
                    <Box className="admission-tab-selected-heading-underline" />
                  )}
                </Box>
              )}
              {isUserHasPermission("fee_history_student", "view") && (
                <Box
                  className={
                    currentTab === "feeHistory"
                      ? "admission-tab-selected-heading"
                      : "admission-tab-heading"
                  }
                  onClick={() => this.changeTab("feeHistory")}
                >
                  Fee Paid History
                  {currentTab === "feeHistory" && (
                    <Box className="admission-tab-selected-heading-underline" />
                  )}
                </Box>
              )}
              {/* {isUserHasPermission("fee_history_student", "view") && (
                <Box
                  className={
                    currentTab === "attendance"
                      ? "admission-tab-selected-heading"
                      : "admission-tab-heading"
                  }
                  onClick={() => this.changeTab("attendance")}
                >
                  Fee Paid History
                  {currentTab === "attendance" && (
                    <Box className="admission-tab-selected-heading-underline" />
                  )}
                </Box>
              )} */}
              <Box
                className={
                  currentTab === "markscard"
                    ? "admission-tab-selected-heading"
                    : "admission-tab-heading"
                }
                onClick={() => this.changeTab("markscard")}
              >
                Marks Card
                {currentTab === "markscard" && (
                  <Box className="admission-tab-selected-heading-underline" />
                )}
              </Box>
              <Box
                className={
                  currentTab === "certifications"
                    ? "admission-tab-selected-heading"
                    : "admission-tab-heading"
                }
                onClick={() => this.changeTab("certifications")}
              >
                Certifications
                {currentTab === "certifications" && (
                  <Box className="admission-tab-selected-heading-underline" />
                )}
              </Box>
              <Box
                className={
                  currentTab === "studentattendance"
                    ? "admission-tab-selected-heading"
                    : "admission-tab-heading"
                }
                onClick={() => this.changeTab("studentattendance")}
              >
                Attendance
                {currentTab === "studentattendance" && (
                  <Box className="admission-tab-selected-heading-underline" />
                )}
              </Box>
            </Grid>
          </Paper>
          {loading ? (
            <LoadingGif />
          ) : (
            <div>
              {currentTab === "profile" && (
                <Grid container spacing={2} className="m-t-20px">
                  <Grid item lg={4} md={12} xs={12} className="header-align">
                    <DetailsFillForm
                      short_info={this.state.short_info}
                      tabs={this.state.tabs}
                      change={this.onClicked}
                      editURL={Actions.general_student_list.update.url}
                      enabledAction={enabledAction}
                      studentID={this.state.student_id}
                    />
                  </Grid>
                  <Grid item lg={8} md={12} xs={12} className="header-align">
                    <ProfileFormInfo
                      profile_heading={this.state.profile_heading}
                      profile_data={this.state.profile_data}
                      profile={this.state.profile}
                    />
                  </Grid>
                </Grid>
              )}
              {currentTab === "certifications" && (
                <div>
                <StudentCertifications studentId={student_id} />
              </div>  
                )}
              {currentTab === "studentattendance" && (
                <div>
                  <StudentAttendance studentId={student_id} />
                </div>
              )}
              {currentTab === "feeCollection" && (
                <div>
                  <StudentFeeCollection student_id={student_id} />
                </div>
              )}
              {currentTab === "feeHistory" && (
                <div>
                  <StudentFeeHistory student_id={student_id} />
                </div>
              )}
               {currentTab === "markscard" && (
                <div>
                  <StudentMarksCard studentId={student_id} />
                </div>
              )}
            </div>
          )}
        </Box>
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
  connect(mapStateToProps, mapDispatchToProps)(StudentView)
);

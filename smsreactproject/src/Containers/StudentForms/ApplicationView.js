import React, { Component } from "react";
import PersonIcon from "@material-ui/icons/Person";
import PagesIcon from "@material-ui/icons/Pages";
import { Box, Grid, Button } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";

import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeApplicationFormList } from "Components/CommonComponent/selectors";
import { setApplicationFormList } from "Components/CommonComponent/actions";

import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
import { Forms } from "Constants/FormDefinition";

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
} from "Includes/functions";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

const isResidential = parseInt(getSettingValue("is_residential"));

class ApplicationView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      profile: 1,
      student_id: "",
      loading: true,
      enabledAction: [],
      form_details: {},
      short_info: {
        1: { label: "image", value: "" },
        2: { label: "profile_firstName", value: "" },
        3: { label: "profile_middleName", value: "" },
        4: { label: "profile_lastName", value: "" },
        5: { label: "profile_standard", value: "" },
      },
      profile_info: [],
      tabs: [],
      profile_heading: { 1: { value: "" }, 2: { value: "" }, 3: { value: "" } },
      profile_data: {
        1: [],
        2: [],
        3: [],
      },
      form_name: "application_form",
      forms: cloneDeep(Forms),
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

  componentDidMount() {
    this.getCustomFormDetails();
    let enabledAction = [];
    if (isUserHasPermission("application_student_list", "update")) {
      enabledAction.push("edit");
    }
    this.setState({
      enabledAction: enabledAction,
    });
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
                if (dataList.name === data["coming_after"]) {
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
          },
          () => {
            this.getFormDetails(form_name);
          }
        );
      }
    });
  };

  getFormDetails = (form_name) => {
    let storedApplicationFormList = this.props.getApplicationFormList;
    if (!storedApplicationFormList) {
      const url = GET_URL.formdefinition.api;
      const params = { form_name: form_name };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.updateFields(response.data.data);
          this.props.setApplicationFormList(response.data.data);
        }
      });
    } else {
      this.updateFields(storedApplicationFormList);
    }
  };

  updateFields = (backendFieldsValue) => {
    let { form_details, forms } = this.state;
    let updated_form_details;
    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        forms,
        backendFieldsValue,
        "application_form",
        "update_label"
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === "application_form") {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      forms.map((data) => {
        if (data["page_details"]["form_name"] === "application_form") {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    }
    this.setState(
      {
        form_details,
        isEditable: true,
      },
      () => {
        this.setApplicationView();
      }
    );
  };

  getValuesSubmitted = (doc_list) => {
    let return_data = [];
    let doc_temp = {};
    let doc_type_temp = {};
    let image_temp = {};
    let fileName = "";
    let file_extension = "";
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
        image_temp["url"] = data?.document_details?.["file"] ?? "";
        image_temp["uploadedId"] = data?.document_details?.["id"] ?? "";
        image_temp["id"] = data["id"];
        doc_temp[data.document_type]["imagesPreview"].push(image_temp);
      }
    });
    Object.keys(doc_temp).map((data) => {
      return_data.push(doc_temp[data]);
    });
    return return_data;
  };

  getMultiSelectValue = (values) => {
    let return_data = [];
    values.map((data) => {
      return_data.push(data.name);
    });
    return return_data.join();
  };

  setApplicationView = () => {
    let { form_details, is_google_places } = this.state;
    if (this.props.location.state) {
      const id = this.props.location.state.detail;
      const g_url = GET_URL.getapplication.api;
      const params = id;
      const url = g_url + params + "/";
      getRequest(url, {}, this.props).then((response) => {
        if (response && response.status === 200) {
          let {
            profile_data,
            profile_heading,
            short_info,
            profile_info,
            tabs,
          } = this.state;
          let student = response.data.data;
          short_info[1].value = student["profile_pic_details"]
            ? student["profile_pic_details"]["file"]
            : "";
          short_info[2].value = student["first_name"]
            ? student["first_name"]
            : "";
          short_info[3].value = student["middle_name"]
            ? student["middle_name"]
            : "";
          short_info[4].value = student["last_name"]
            ? student["last_name"]
            : "";
          short_info[5].value = student["current_standard_name"]
            ? student["current_standard_name"]
            : "";

          let student_profile = { label: "Email", value: student["email"] };
          profile_info.push(student_profile);
          student_profile = {
            label: "Mobile No",
            value: student["mobile_num"],
          };
          profile_info.push(student_profile);
          student_profile = { label: "DOB", value: student["dob"] };
          profile_info.push(student_profile);

          let student_tabs = {};

          let currentAddress, permanentAddress;
          let school =
            response.data.data.student_details &&
            response.data.data.student_details.previous_school_details;
          let studentMedical =
            response.data.data.student_details &&
            response.data.data.student_details.medical_details;

          let parent =
            response.data.data.student_parent &&
            response.data.data.student_parent.application_parent;
          let guardian =
            response.data.data.student_parent &&
            response.data.data.student_parent.application_guardian;

          let student_address =
            response.data.data.student_address &&
            response.data.data.student_address;
          let student_details =
            response.data.data.student_details &&
            response.data.data.student_details;

          student_address.map((field) => {
            if (field.type === "CP" || field.type === "C") {
              currentAddress = field;
              student["current_address_checked"] = true;
            } else {
              permanentAddress = field;
              student["current_address_checked"] = false;
            }
          });

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
                value = student[field.name];
              }
              if (field.view_name) {
                value = student[field.view_name];
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
              if (field.name === "student_type" && !isResidential) {
                return;
              } else if (
                field.name === "document_list" &&
                student[field.name]
              ) {
                temp["md"] = 6;
                temp["list"] = true;
                value = this.getValuesSubmitted(student[field.name]);
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              temp["value"] = value;
              student_basic.data.push(temp);
            }
          });
          temp = {};
          temp["label"] = "Application Number";
          temp["value"] = student["application_num"];
          temp["className"] = "text-transform-none";
          student_basic.data.push(temp);

          profile_data[1].push(student_basic);

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
                if (field.view_name) {
                  value = studentMedical[field.view_name];
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
                temp["value"] = value;
                student_basic.data.push(temp);
              }
            });

            profile_data[1].push(student_basic);
          }

          if (!form_details.pre_school_details.hidden) {
            student_basic = { sub_heading: "", data: [] };
            student_basic["sub_heading"] =
              form_details.pre_school_details.label;
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
                if (field.view_name) {
                  value = school[field.view_name];
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
                temp["value"] = value;
                student_basic.data.push(temp);
              }
            });
            profile_data[1].push(student_basic);
          }

          if (
            is_google_places &&
            !form_details.current_address_details.hidden
          ) {
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

            form_details.current_address_details.list.map((field) => {
              if (!field.hidden) {
                temp = {};
                temp["label"] = field.label;
                try{
                  if (field.view_name) {
                    temp["value"] = currentAddress[field.view_name];
                  } else {
                    temp["value"] = currentAddress[field.name];
                  }
                }catch{
                  temp['value'] = ''
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
                if (field.view_name && permanentAddress) {
                  temp["value"] = permanentAddress[field.view_name];
                } else {
                  temp["value"] = permanentAddress
                    ? permanentAddress[field.name]
                    : field.default;
                }
                if (field.view_className) {
                  temp["className"] = field.view_className;
                }
                student_basic.data.push(temp);
              }
            });
            profile_data[3].push(student_basic);
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
                  value = parent?.[field.name];
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
                temp["value"] = value;
                student_basic.data.push(temp);
              }
            });
            profile_data[2].push(student_basic);
          }

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
                value = parent?.[field.name];
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
              temp["value"] = value;
              student_basic.data.push(temp);
            }
          });
          profile_data[2].push(student_basic);

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
                value = guardian?.[field.name] ?? "";
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
              temp["value"] = value;
              student_basic.data.push(temp);
            }
          });
          profile_data[2].push(student_basic);

          if (!form_details.bpl_details.hidden) {
            student_basic = { sub_heading: "", data: [] };
            student_basic["sub_heading"] = form_details.bpl_details.label;
            temp = {};

            form_details.bpl_details.list.map((field) => {
              if (!field.hidden) {
                temp = {};
                temp["label"] = field.label;
                let value;
                if (field.isCustom) {
                  value = student.custom_form_data?.[field.name] ?? "";
                } else {
                  value = student_details?.[field.name];
                }
                if (field.view_name) {
                  value = student_details[field.view_name];
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
                temp["value"] = value;
                student_basic.data.push(temp);
              }
            });
            profile_data[2].push(student_basic);
          }
          if (profile_data[1].length !== 0) {
            profile_heading[1].value = "Student Overview";
            student_tabs = {
              icon: <PersonIcon />,
              value: "student Overview",
              key: 1,
            };
            tabs.push(student_tabs);
          }
          if (profile_data[2].length !== 0) {
            profile_heading[2].value = "Parent Overview";
            student_tabs = {
              icon: <PersonIcon />,
              value: "Parent Overview",
              key: 2,
            };
            tabs.push(student_tabs);
          }
          if (profile_data[3].length !== 0) {
            profile_heading[3].value = "Address Overview";
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
            student_id: response.data.data.id,
          });
        }
      });
    } else {
      this.props.history.push(Actions.application_student_list.view.url);
    }
  };

  render() {
    const { loading, enabledAction, short_info, student_id } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Box className="paper-background">
            <Grid container>
              <Grid item md={6} xs={12} className="header-align">
                <Box className="heading">
                  <FormattedMessage {...messages.applicationFormLabel} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("application_student_list", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.application_student_list.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.application_student_list.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={2} className="m-t-20px">
              <Grid item lg={4} md={12} xs={12} className="header-align">
                <DetailsFillForm
                  short_info={short_info}
                  tabs={this.state.tabs}
                  change={this.onClicked}
                  editURL={Actions.application_student_list.update.url}
                  enabledAction={enabledAction}
                  studentID={student_id}
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
          </Box>
        </div>
      );
    }
  }
}

const mapStateToProps = createStructuredSelector({
  getApplicationFormList: makeApplicationFormList(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setApplicationFormList }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(ApplicationView)
);

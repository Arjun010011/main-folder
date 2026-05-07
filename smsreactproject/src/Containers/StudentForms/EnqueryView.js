import React, { Component } from "react";
import PersonIcon from "@material-ui/icons/Person";
import PagesIcon from "@material-ui/icons/Pages";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import { Box, Grid, Button } from "@material-ui/core";
import { withRouter } from "react-router-dom";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeEnquiryFormList } from "Components/CommonComponent/selectors";
import { setEnquiryFormList } from "Components/CommonComponent/actions";

import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
import { Forms } from "Constants/FormDefinition";
import {
  isUserHasPermission,
  dateFormat,
  getSettingValue,
} from "Includes/functions";
import ProfileFormInfo from "Components/Profile_View/ProfileFormInfo";
import DetailsFillForm from "Components/Profile_View/DetailsFillForm";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Actions } from "Constants/permissions";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";
// const is_google_places = Boolean(parseInt(getSettingValue("google_places")));
// const is_google_places = true;
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

class EnqueryView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      profile: 1,
      student_id: "",
      enabledAction: [],
      form_details: {},
      loading: true,
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
      form_name: "enquiry_form",
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

  async componentDidMount() {
    this.getCustomFormDetails();
    let enabledAction = [];
    if (isUserHasPermission("enquiry_student_list", "update")) {
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
    let storedEnquiryFormList = this.props.getEnquiryFormList;
    if (!storedEnquiryFormList) {
      const url = GET_URL.formdefinition.api;
      const params = { form_name: form_name };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.updateFields(response.data.data);
          this.props.setEnquiryFormList(response.data.data);
        }
      });
    } else {
      this.updateFields(storedEnquiryFormList);
    }
  };

  updateFields = (backendFieldsValue) => {
    let { form_details, forms } = this.state;
    let updated_form_details;
    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        forms,
        backendFieldsValue,
        "enquiry_form",
        "update_label"
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === "enquiry_form") {
          form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      forms.map((data) => {
        if (data["page_details"]["form_name"] === "enquiry_form") {
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
        this.setEnquiryView();
      }
    );
  };

  getMultiSelectValue = (values) => {
    let return_data = [];
    values.map((data) => {
      return_data.push(data["name"]);
    });
    return return_data.join(",");
  };

  setEnquiryView = () => {
    let { form_details, is_google_places } = this.state;
    const id = this.props.location.state.detail;
    const g_url = GET_URL.getenquiry.api;
    const params = id;
    const url = g_url + params + "/";
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let { profile_data, profile_heading, short_info, profile_info, tabs } =
          this.state;
        let student = response.data.data;
        short_info[1].value = student["profile_pic"];
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

        let student_profile = { label: "Email", value: student["email"] };
        profile_info.push(student_profile);
        student_profile = { label: "Mobile No", value: student["mobile_num"] };
        profile_info.push(student_profile);
        student_profile = { label: "DOB", value: student["dob"] };
        profile_info.push(student_profile);

        let student_tabs = {};

        let student_basic = { sub_heading: "", data: [] };
        student_basic["sub_heading"] = form_details.student_details.label;
        let temp = {};
        let value = "";
        form_details.student_details.list.map((field) => {
          if (!field.hidden) {
            temp = {};
            temp["label"] = field.label;
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
            if (field.view_className) {
              temp["className"] = field.view_className;
            }
            temp["value"] = value;
            student_basic.data.push(temp);
          }
        });
        temp = {};
        temp["label"] = <FormattedMessage {...messages.enquiryNo} />;
        temp["value"] = student["enquiry_num"];
        student_basic.data.push(temp);

        profile_data[1].push(student_basic);

        let parent = response.data.data.student_details;
        student_basic = { sub_heading: "", data: [] };
        student_basic["sub_heading"] = form_details.parent_details.label;
        form_details.parent_details.list.map((field) => {
          if (!field.hidden) {
            temp = {};
            temp["label"] = field.label;
            if (field.isCustom) {
              value = student.custom_form_data?.[field.name] ?? "";
            } else {
              value = parent[field.name];
            }
            if (field.view_name) {
              value = parent[field.view_name];
            } else if (field.type === "date") {
              value = dateFormat(value, "DD-MM-YYYY");
            } else if (field.type === "multiselect") {
              value = this.getMultiSelectValue(value);
            } else if (
              field.boolean ||
              field.type === "switch" ||
              field.type === "checkbox"
            ) {
              value = value ? "Yes" : "No";
            }
            temp["value"] = value;
            student_basic.data.push(temp);
          }
        });
        profile_data[2].push(student_basic);
        let pre_school = response.data.data.student_details
          .previous_school_details
          ? response.data.data.student_details.previous_school_details
          : {};
        if (!form_details.pre_school_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.pre_school_details.label;
          form_details.pre_school_details.list.map((field) => {
            if (!field.hidden && field.name !== "isPreSchoolPresent") {
              temp = {};
              temp["label"] = field.label;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = pre_school[field.name];
              }
              if (field.view_name) {
                value = pre_school[field.view_name];
              } else if (field.type === "date") {
                value = dateFormat(value, "DD-MM-YYYY");
              } else if (field.type === "multiselect") {
                value = this.getMultiSelectValue(value);
              } else if (
                field.boolean ||
                field.type === "switch" ||
                field.type === "checkbox"
              ) {
                value = value ? "Yes" : "No";
              }
              temp["value"] = value;
              student_basic.data.push(temp);
            }
          });
          profile_data[1].push(student_basic);
        }

        let exam_details = response.data.data.student_details
          ? response.data.data.student_details
          : {};
        if (!form_details.exam_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.exam_details.label;
          form_details.exam_details.list.map((field) => {
            if (!field.hidden && field.name !== "isPreSchoolPresent") {
              temp = {};
              temp["label"] = field.label;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = exam_details[field.name];
              }
              if (field.name === "eligible_type") {
                value = value === 2 ? "Not Eligible" : "Eligible";
              } else if (field.view_name) {
                value = exam_details[field.view_name];
              } else if (field.type === "date") {
                value = dateFormat(value, "DD-MM-YYYY");
              } else if (field.type === "multiselect") {
                value = this.getMultiSelectValue(value);
              } else if (
                field.boolean ||
                field.type === "switch" ||
                field.type === "checkbox"
              ) {
                value = value ? "Yes" : "No";
              }
              temp["value"] = value;
              student_basic.data.push(temp);
            }
          });
          profile_data[1].push(student_basic);
        }

        if (is_google_places && !form_details.address_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.address_details.label;
          student_basic["data"] = [
            {
              label: <FormattedMessage {...commonMessages.address1} />,
              value: parent["map_address_data"]?.["address_one_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.address2} />,
              value: parent["map_address_data"]?.["address_two_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.city} />,
              value: parent["map_address_data"]?.["city_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.district} />,
              value: parent["map_address_data"]?.["district_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.state} />,
              value: parent["map_address_data"]?.["state_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.country} />,
              value: parent["map_address_data"]?.["country_map"],
            },
            {
              label: <FormattedMessage {...commonMessages.pincode} />,
              value: parent["map_address_data"]?.["pincode_map"],
            },
          ];
          profile_data[3].push(student_basic);
        } else if (!is_google_places && !form_details.address_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.address_details.label;
          form_details.address_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              if (field.view_name) {
                temp["value"] = parent[field.view_name];
              } else {
                temp["value"] = parent[field.name];
              }
              if (field.view_className) {
                temp["className"] = field.view_className;
              }
              student_basic.data.push(temp);
            }
          });
          profile_data[3].push(student_basic);
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
          student_id: response.data.data.id,
          loading: false,
        });
      }
    });
  };

  render() {
    const { loading, enabledAction, student_id, short_info } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Box className="paper-background">
            <Grid container>
              <Grid item md={6} xs={12} className="header-align">
                <Box className="heading">
                  <FormattedMessage {...messages.enquiryFormLabel} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("enquiry_student_list", "view") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.enquiry_student_list.view.url}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.enquiry_student_list.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={4} className="m-t-20px">
              <Grid item lg={4} md={12} xs={12} className="header-align">
                <DetailsFillForm
                  short_info={short_info}
                  tabs={this.state.tabs}
                  change={this.onClicked}
                  editURL={Actions.enquiry_student_list.update.url}
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
  getEnquiryFormList: makeEnquiryFormList(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setEnquiryFormList }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(EnqueryView)
);

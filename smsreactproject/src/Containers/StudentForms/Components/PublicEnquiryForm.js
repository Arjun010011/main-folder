import React from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import { Prompt } from "react-router";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import { Box, Grid, Button, Paper } from "@material-ui/core";

import { GET_URL, PUT_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest } from "Includes/api/apicall";
import {
  dateFormat,
  getUrlParam,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { updateFormFields } from "Containers/Admin/FormDefinition/functions";
import { Forms } from "Constants/FormDefinition";
import messages from "./../messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";
import * as regulars from "Constants/regularExpression";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import EnquiryStudentInformation from "./../EnquiryStudentInformation";

class PublicEnquiryForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      student: 0,
      errors: {},
      submitDisable: false,
      isEditForm: false, // Always false for public form
      studentDetail: null,
      isPrompt: false,
      student_form_details: null,
      form_name: "enquiry_form",
      form_details: cloneDeep(Forms),
      custom_form_id: "",
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
  }

  async componentDidMount() {
    window.addEventListener("beforeunload", this.beforeunload.bind(this));
    
    const { year, year_name, start_date, end_date } = getUrlParam();
    this.setState({
      isEditForm: false,
      year: year || 2025,
      year_name: year_name || "2025-2026",
      start_date: start_date || "2025-04-01",
      end_date: end_date || "2026-03-31",
    });
    
    this.getCustomFormDetails();
  }

  getCustomFormDetails = () => {
    let { form_name, form_details, custom_form_id } = this.state;
    const url = GET_URL.customform.api;
    const params = { form_for: form_name, is_active: true };
    getRequest(url, params, { return_error: true }).then((response) => {
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
                if (dataList.name === data["coming_after"]) {
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

  getFormDetails = (form_name) => {
    const url = GET_URL.formdefinition.api;
    const params = { form_name: form_name };
    getRequest(url, params, { return_error: true }).then((response) => {
      if (response && response.status === 200) {
        this.updateFields(response.data.data);
      }
    });
  };

  updateFields = (backendFieldsValue) => {
    let { student_form_details, form_details } = this.state;
    let updated_form_details;
    if (backendFieldsValue.length !== 0) {
      updated_form_details = updateFormFields(
        form_details,
        backendFieldsValue,
        "enquiry_form",
        "update_label",
        false // Always false for public form
      );
      updated_form_details.map((data) => {
        if (data["page_details"]["form_name"] === "enquiry_form") {
          student_form_details = data["page_details"]["sub_sections"];
        }
      });
    } else {
      form_details.map((data) => {
        if (data["page_details"]["form_name"] === "enquiry_form") {
          student_form_details = data["page_details"]["sub_sections"];
        }
      });
    }
    this.setState({
      student_form_details,
    });
  };

  beforeunload(e) {
    if (this.state.isPrompt) {
      e.preventDefault();
      e.returnValue = true;
    }
  }

  submit = async (student) => {
    this.setState({ submitDisable: true, isPrompt: false });
    const { custom_form_id, is_google_places } = this.state;
    
    let post_data = {
      student: {
        first_name: student.first_name.trim(),
        middle_name: student.middle_name.trim(),
        last_name: student.last_name.trim(),
        dob: dateFormat(student.dob, "YYYY-MM-DD"),
        enquiry_date: dateFormat(student.enquiry_date, "YYYY-MM-DD"),
        gender: student.gender,
        email: student.email.trim(),
        mobile_num: student.mobile_num,
        student_type: student.student_type.trim(),
        transport_required: student.transport_required,
        entry_academic_year:
          student.entry_academic_year === 0 ? null : student.entry_academic_year,
        current_standard:
          student.current_standard === 0 ? null : student.current_standard,
      },
      student_detail: {
        father_name: student.father_name.trim(),
        f_mobile_num: student.f_mobile_num.trim(),
        f_email: student.f_email.trim(),
        f_occupation: student.f_occupation.trim(),
        mother_name: student.mother_name.trim(),
        m_mobile_num: student.m_mobile_num.trim(),
        m_email: student.m_email.trim(),
        m_occupation: student.m_occupation.trim(),
        guardian_name: student.guardian_name.trim(),
        g_mobile_num: student.g_mobile_num.trim(),
        g_email: student.g_email.trim(),
        g_occupation: student.g_occupation.trim(),
        previous_school_details: student.previous_school_details,
        about_school: student.about_school,
        eligible_type: 0,
        marks: null,
        remarks: null,
      },
    };

    if (student.exam_details?.eligible_type === 1) {
      post_data["student_detail"]["eligible_type"] = 1;
      post_data["student_detail"]["marks"] = student.exam_details?.marks;
    } else if (student.exam_details?.eligible_type === 2) {
      post_data["student_detail"]["eligible_type"] = 2;
      post_data["student_detail"]["remarks"] = student.exam_details?.remarks.trim();
    }

    if (is_google_places && student.address["address_one_map"]) {
      post_data["student_detail"]["map_address_data"] = {
        address_one_map: student.address["address_one_map"],
        address_two_map: student.address["address_two_map"],
        city_map: student.address["city_map"],
        district_map: student.address["district_map"],
        state_map: student.address["state_map"],
        country_map: student.address["country_map"],
        pincode_map: student.address["pincode_map"],
        latitude_map: student.address["latitude_and_langitude_map"]["lat"],
        longitude_map: student.address["latitude_and_langitude_map"]["lng"],
      };
    } else if (!is_google_places) {
      post_data["student_detail"]["address"] = student.address.address?.trim() || "";
      post_data["student_detail"]["country"] = student.address.country || null;
      post_data["student_detail"]["state"] = student.address.state || null;
      post_data["student_detail"]["district"] = student.address.district || null;
      post_data["student_detail"]["city"] = student.address.city || null;
      post_data["student_detail"]["pincode"] = student.address.pincode || null;
    }

    post_data["custom_form_data"] = student.custom_form_data;
    post_data["custom_form_id"] = custom_form_id;

    const url = POST_URL.enquiry.api;
    postRequest(url, post_data, { return_error: true }).then((response) => {
      if (response && response.status === 200) {
        this.setState({ submitDisable: false });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: response.data.Reason || "Enquiry submitted successfully!",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          // Redirect to thank you page or clear form
          this.props.history.push("/enquiry-thank-you");
        });
      } else {
        this.setState({ submitDisable: false });
        Swal.fire({
          icon: "error",
          title: "Error",
          text: response?.data?.Reason || "Failed to submit enquiry",
        });
      }
    });
  };

  loadingFalse = () => {
    this.setState({
      loading: false,
    });
  };

  handlePrompt = (name) => {
    this.setState({
      isPrompt: name,
    });
  };

  render() {
    const {
      submitDisable,
      loading,
      isPrompt,
      year,
      year_name,
      start_date,
      end_date,
      student_form_details,
    } = this.state;
    
    return (
      <div style={{ maxWidth: "100%" }}>
        <Paper className={loading ? "display-none" : "paper-plain-background p-b-20px"}>
            {loading && <LoadingGif />}
            <Grid container spacing={2}>
              <Grid item xs={12} className="header-align">
                <Box className="heading">
                ENQUIRY FORM
                </Box>
              </Grid>
            </Grid>
            
            {student_form_details && (
              <EnquiryStudentInformation
                studentDetail={null}
                form_details={student_form_details}
                isEditForm={false}
                loadingFalse={this.loadingFalse}
                submitDisable={submitDisable}
                loading={loading}
                submit={this.submit}
                handlePrompt={this.handlePrompt}
                yearInformation={{
                  year: year,
                  year_name: year_name,
                  start_date: start_date,
                  end_date: end_date,
                }}
              />
            )}
          <Prompt
            when={isPrompt}
            message="Enquiry Form is not submitted, Are you sure to exit?"
          />
          </Paper>
        </div>
        
    );
  }
}

export default withRouter(PublicEnquiryForm);
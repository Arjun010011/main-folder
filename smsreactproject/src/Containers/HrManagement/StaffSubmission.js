import React, { Component } from "react";
import {
  Box,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";

import { image_formats } from "Containers/Expenses/Constants";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import StudentReviewAndSubmit from "Components/FormReviewAndSubmit";
import { includeStaffSection, excludeStaffSection } from "Constants";
import {
  dateFormat,
  getSettingValue,
  getCommaSeperatedArrayOfObjects,
  numberWithCommas,
} from "Includes/functions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { POST_URL } from "Includes/urls";
import { postRequest } from "Includes/api/apicall";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { supported_documet_submitted, maxFileSize } from "Constants";

// const is_google_places = Boolean(parseInt(getSettingValue("google_places")));
// const is_google_places = true;
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

export default class StaffSubmission extends Component {
  constructor(props) {
    super(props);
    this.state = {
      staff: {},
      staffData: [],
      isEdit: 0,
      openPaymentModal: false,
      totalAmount: 0,
      postData: {},
      image_name_list: [],
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
  }
  reviewStaff(staff) {
    this.setState(
      {
        staff: staff,
      },
      () => {
        this.updateStaffData();
      }
    );
  }

  scroll = () => {
    window.scrollTo(0, 0);
  };

  getValuesSubmitted = (values) => {
    let return_data = [];
    if (values) {
      values.map((data) => {
        return_data.push(data.name);
      });
    }
    return return_data.join();
  };

  updateStaffData = () => {
    let { staff, is_google_places } = this.state;
    let { form_details } = this.props;
    let staffData = [];
    let staff_basic = { sub_heading: "", data: [] };
    staff_basic["sub_heading"] = form_details.staff_details.label;
    let temp = {};
    form_details.staff_details.list.map((field) => {
      if (!field.hidden) {
        temp = {};
        temp["label"] = field.label;
        let value;
        if (field.isCustom) {
          value = staff.custom_form_data?.[field.name] ?? "";
        } else {
          value = staff[field.name];
        }
        if (field.view_name) {
          value = staff[field.view_name];
        } else if (field.type === "date") {
          value = dateFormat(value, "DD-MM-YYYY");
        } else if (field.type === "multiselect") {
          value = this.getValuesSubmitted(value);
        } else if (field.type === "dropDownWithSearch") {
          value = value?.name;
        } else if (
          field.boolean ||
          field.type === "switch" ||
          field.type === "checkbox"
        ) {
          value = value ? "Yes" : "No";
        }
        if (field.name === "selected_standards" && staff[field.name]) {
          value = getCommaSeperatedArrayOfObjects(
            staff[field.name] ? staff[field.name] : [],
            "name"
          );
        } 
        if (field.view_className) {
          temp["className"] = field.view_className;
        }
        temp["value"] = value;
        staff_basic.data.push(temp);
      }
    });
    staffData.push(staff_basic);

    // let staff_basic = {
    //   sub_heading: "Personal Details",
    //   data: [
    //     { label: "First Name", value: staff["first_name"] },
    //     { label: "Middle Name", value: staff["middle_name"] },
    //     { label: "Last Name", value: staff["last_name"] },
    //     {
    //       label: "Gender",
    //       value:
    //         staff["gender"] === "M"
    //           ? "Male"
    //           : staff["gender"] === "F"
    //           ? "Female"
    //           : "Other",
    //     },
    //     {
    //       label: "Date Of Birth",
    //       value: dateFormat(staff["dob"], "DD-MM-YYYY"),
    //     },
    //     { label: "Mobile Number", value: staff["mobile_num"] },
    //     {
    //       label: "Email",
    //       value: staff["email"],
    //       className: "form-review-value",
    //     },
    //     { label: "Aadhaar No", value: staff["aadhar_num"] },
    //     { label: "Alternative Number", value: staff["alternate_mobile_num"] },
    //     {
    //       label: "Father/Husband Name",
    //       value: staff["father_or_husband_name"],
    //     },
    //     { label: "Experience in Years", value: staff["experience_in_num"] },

    //     { label: "Qualification", value: staff["qualification"] },
    //     {
    //       label: "Marital Status",
    //       value: staff["marital_status"],
    //       className: "form-review-value",
    //     },
    //     {
    //       label: "Job Type",
    //       value:
    //         staff["employee_status"] === "F"
    //           ? "Full Time"
    //           : staff["jobType"] === "P"
    //           ? "Part Time"
    //           : "Contract",
    //     },
    //     { label: "Salary", value: numberWithCommas(staff["salary"]) },
    //     (staff["employee_status"] === "P" ||
    //       staff["employee_status"] === "C") && {
    //       label: "Measure",
    //       value: staff["measure"],
    //     },
    //     staff["employee_status"] === "P" && {
    //       label: "Part Time Frequency",
    //       value:
    //         staff["partTimeFrequency"] === "M"
    //           ? "Months"
    //           : staff["partTimeFrequency"] === "W"
    //           ? "Weeks"
    //           : staff["partTimeFrequency"] === "D"
    //           ? "Days"
    //           : "Hours",
    //     },

    //     staff["employee_status"] === "C" && {
    //       label: "Contract Frequency",
    //       value: staff["contractFrequency"] === "M" ? "Months" : "Days",
    //     },
    //     // { label: "Documents List", value: getCommaSeperatedArrayOfObjects(staff['document_list']?staff['document_list']:[],'name') , md:12},
    //     { label: `Religion`, value: staff["religion_name"] },
    //     { label: `nationality`, value: staff["nationality_name"] },
    //     {
    //       label: `Expertise ${alias_names["standard"]}`,
    //       value: getCommaSeperatedArrayOfObjects(
    //         staff["selected_standards"] ? staff["selected_standards"] : [],
    //         "name"
    //       ),
    //       md: 12,
    //     },
    //   ],
    // };
    // staffData.push(staff_basic);
    let bank = staff["bank"];
    let staff_bank = {
      sub_heading: "Bank details",
      data: [
        { label: "Account Name", value: bank["name"] },
        { label: "Bank Name", value: bank["bank_name"] },
        { label: "Branch Name", value: bank["branch_name"] },
        { label: "Account Number", value: bank["account_num"] },
        { label: "IFSC Code", value: bank["ifsc"] },
        { label: "Mobile", value: bank["mobile_num"] },
        { label: "PAN Card", value: bank["pan_num"] },
        { label: "PF Number", value: bank["pf_num"] },
        { label: "ESI Number", value: bank["esi_num"] },
        { label: "UAN Number", value: bank["uan_num"] },
      ],
    };
    staffData.push(staff_bank);
    let staff_Joining = {
      sub_heading: "Joining details",
      data: [
        { label: "Job Title", value: staff["job_title"] },
        { label: "Designation", value: staff["designation"] },
        {
          label: "Joining Date",
          value: dateFormat(staff["date_joined"], "DD-MM-YYYY"),
        },
        {
          label: "Employee ID",
          value: staff["employee_id"],
          className: "form-review-value",
        },
      ],
    };
    staffData.push(staff_Joining);

    if (!excludeStaffSection["previous"].includes(staff["role"]["id"])) {
      let previous = staff["previousJobDetails"];
      let staff_PreviousJobDetails = {
        sub_heading: "Previous Job Details",
        data: [
          {
            label: "Institute Name",
            value: previous["prev_school_name"],
            className: "form-review-value",
          },
          {
            label: "Date Joined",
            value: dateFormat(previous["prev_date_joined"], "DD-MM-YYYY"),
          },
          {
            label: "Last Working Day",
            value: dateFormat(previous["prev_date_left"], "DD-MM-YYYY"),
          },
          { label: "Designation", value: previous["prev_designation"] },
          {
            label: "Reason for Leaving",
            value: previous["prev_reason_leaving"],
            className: "form-review-value",
          },
        ],
      };
      staffData.push(staff_PreviousJobDetails);
    }

    if (includeStaffSection["driver"].includes(staff["role"]["id"])) {
      let driver = staff["driverDetails"];
      let staff_driverJobDetails = {
        sub_heading: "Driver Details",
        data: [
          { label: "Driving Licence Number", value: driver["dl_number"] },
          {
            label: "Previous Work Place",
            value: driver["prev_work_place_name"],
          },
        ],
      };
      staffData.push(staff_driverJobDetails);
    }
    let address_sub_heading = "";
    if (staff["current_address_checked"]) {
      address_sub_heading = "Current and Permanent address";
    } else {
      address_sub_heading = "Current Address Details";
    }
    let currentAddress = staff["currentAddress"];
    let permanentAddress = staff["permanentAddress"];

    if (is_google_places) {
      let staff_address = { sub_heading: "", data: [] };
      staff_address["sub_heading"] = staff["current_address_checked"]
        ? "Current and Permanent Address Details"
        : "Current Address Details";
      staff_address["data"] = [
        {
          label: <FormattedMessage {...commonMessages.address1} />,
          value: currentAddress?.["address_one_map"],
        },
        {
          label: <FormattedMessage {...commonMessages.address2} />,
          value: currentAddress?.["address_two_map"],
        },
        {
          label: <FormattedMessage {...commonMessages.city} />,
          value: currentAddress?.["city_map"],
        },
        {
          label: <FormattedMessage {...commonMessages.district} />,
          value: currentAddress?.["district_map"],
        },
        {
          label: <FormattedMessage {...commonMessages.state} />,
          value: currentAddress?.["state_map"],
        },
        {
          label: <FormattedMessage {...commonMessages.country} />,
          value: currentAddress?.["country_map"],
        },
        {
          label: <FormattedMessage {...commonMessages.pincode} />,
          value: currentAddress?.["pincode_map"],
        },
      ];
      staffData.push(staff_address);
    } else {
      let current_address = {
        sub_heading: staff["current_address_checked"]
          ? "Current and Permanent Address Details"
          : "Current Address Details",
        data: [
          {
            label: "Address",
            value: currentAddress["address"],
            className: "form-review-value",
          },
          { label: "Country", value: currentAddress["country_name"] },
          { label: "State", value: currentAddress["state_name"] },
          { label: "District", value: currentAddress["district_name"] },
          { label: "City", value: currentAddress["city_name"] },
          { label: "Pincode", value: currentAddress["pincode"] },
        ],
      };
      staffData.push(current_address);
    }

    if (!staff["current_address_checked"]) {
      if (is_google_places) {
        let staff_basic = { sub_heading: "", data: [] };
        staff_basic["sub_heading"] = "Permanent Address Details";
        staff_basic["data"] = [
          {
            label: <FormattedMessage {...commonMessages.address1} />,
            value: permanentAddress?.["address_one_map"],
          },
          {
            label: <FormattedMessage {...commonMessages.address2} />,
            value: permanentAddress?.["address_two_map"],
          },
          {
            label: <FormattedMessage {...commonMessages.city} />,
            value: permanentAddress?.["city_map"],
          },
          {
            label: <FormattedMessage {...commonMessages.district} />,
            value: permanentAddress?.["district_map"],
          },
          {
            label: <FormattedMessage {...commonMessages.state} />,
            value: permanentAddress?.["state_map"],
          },
          {
            label: <FormattedMessage {...commonMessages.country} />,
            value: permanentAddress?.["country_map"],
          },
          {
            label: <FormattedMessage {...commonMessages.pincode} />,
            value: permanentAddress?.["pincode_map"],
          },
        ];
        staffData.push(staff_basic);
      } else {
        let permanent_address = {
          sub_heading: "Permanent Address Details",
          data: [
            {
              label: "Address",
              value: permanentAddress["address"],
              className: "form-review-value",
            },
            { label: "Country", value: permanentAddress["country_name"] },
            { label: "State", value: permanentAddress["state_name"] },
            { label: "District", value: permanentAddress["district_name"] },
            { label: "City", value: permanentAddress["city_name"] },
            { label: "Pincode", value: permanentAddress["pincode"] },
          ],
        };
        staffData.push(permanent_address);
      }
    }

    let nominee = {};
    staff.nominee.map((data, index) => {
      if (staff.nominee.length === 1 || staff.nominee.length === 0) {
        nominee = {
          sub_heading: `Nominee`,
          data: [],
        };
      } else {
        nominee = {
          sub_heading: `Nominee ${index + 1}`,
          data: [],
        };
      }
      nominee.data.push(
        { label: "Name", value: data["name"] },
        { label: "DOB", value: dateFormat(data["dob"], "DD-MM-YYYY") },
        { label: "Nominee Relationship", value: data["relationship_name"] },
        { label: "Mobile Number", value: data["mobile_num"] },
        { label: "Email", value: data["email"] },
        { label: "Address", value: data["address"] }
      );
      staffData.push(nominee);
    });
    let staff_user_login = {
      sub_heading: "User Login , Role and Reporting details",
      data: [
        { label: "User Name", value: staff["user_name"] },
        { label: "Role", value: staff["role"]["name"] },
        { label: "Reporting Role", value: staff["parentRole"]["name"] },
        { label: "Reporting To User", value: staff["parentUser"]["full_name"] },
      ],
    };
    staffData.push(staff_user_login);

    this.setState({
      staffData: staffData,
    });
  };

  handleImageChange = (event, acceptFileType, dIndex) => {
    let { staff, image_name_list } = this.state;
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_image_type = true;
    is_supported_image_type = supported_documet_submitted.type.includes(
      file_extension.toLowerCase()
    );
    if (image_name_list.includes(fileName)) {
      this.setState({
        openSnackbar: true,
        alertData: "Image is already exist",
      });
      return;
    }
    if (event.target.files[0] && is_supported_image_type) {
      if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        let request = postRequest;
        let url = POST_URL.uploads.api;
        staff["document_list"][dIndex]["imageUploading"] = true;
        this.setState({ staff });
        request(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            let uploadedId = response.data.data.id;
            let imagePreview = response.data.data.file;
            let imageName = fileName;
            image_name_list.push(imageName);
            let temp = {
              file_extension: file_extension,
              uploadedId: uploadedId,
              url: imagePreview,
              imageName: imageName,
            };
            staff["document_list"][dIndex].imagesPreview.push(temp);
            this.setState({
              staff,
            });
          }
          staff["document_list"][dIndex]["imageUploading"] = false;
          this.setState({
            staff,
          });
        });
      } else {
        this.setState({
          openSnackbar: true,
          alertData: maxFileSize.errorText,
        });
      }
    } else if (!is_supported_image_type) {
      this.setState({
        alertData: supported_documet_submitted.error,
        openSnackbar: true,
      });
    }
  };

  check = () => {
    const { staff } = this.state;
    this.props.check(staff);
  };

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  deleteUploadedImage = (dIndex, index) => {
    let { staff } = this.state;
    staff.document_list[dIndex].imagesPreview.splice(index, 1);
    this.setState({
      staff,
    });
  };

  render() {
    let { staffData, staff } = this.state;
    return (
      <div>
        <StudentReviewAndSubmit
          check={this.check}
          disabled={this.props.payDisabled}
          student={staffData}
          heading="Review And Submission for Staff details"
          sub_heading=""
          isTerm={true}
        />
        {staff?.document_list && staff?.document_list.length > 0 && (
          <Paper className="paper-plain-background header-align mv-30 pb-20">
            <Box className="heading">Document Submitted</Box>

            {staff.document_list.map((data, dIndex) => {
              return (
                <Grid container className="pv-10">
                  <Grid item md={5}>
                    {data.name}
                  </Grid>
                  <Grid item md={5}>
                    <Box className="set-question-uploaded-images-outer-box">
                      <label
                        htmlFor={`${dIndex}upload-pic`}
                        className={
                          data["imageUploading"] ? "upload-icon-uploading" : ""
                        }
                      >
                        <Button
                          variant="raised"
                          component="span"
                          disabled={data["imageUploading"]}
                          className="set-question-upload-images-button"
                        >
                          Upload Images
                          <Box className="upload-icon">
                            <i className="fa fa-upload" aria-hidden="true"></i>
                          </Box>
                        </Button>
                        <Box
                          className={
                            data["imageUploading"]
                              ? "image-uploading-circular-icon"
                              : "display-none"
                          }
                        >
                          <CircularProgress className="set-question-upload-image-loading" />{" "}
                        </Box>
                      </label>
                      <input
                        disabled={data["imageUploading"]}
                        type="file"
                        id={`${dIndex}upload-pic`}
                        className="display-none"
                        onChange={(e) =>
                          this.handleImageChange(e, "img", dIndex)
                        }
                        onClick={(e) => (e.target.value = null)}
                      />
                      <Box className="set-question-image-list-box">
                        {data.imagesPreview &&
                          data.imagesPreview.map((temp, index) => {
                            return (
                              <Box className="set-question-image-preview-outer-box">
                                <Tooltip
                                  title="Preview Image"
                                  placement="top-start"
                                >
                                  <>
                                    {image_formats.includes(
                                      temp.file_extension
                                    ) && (
                                      <img
                                        src={temp.url}
                                        alt="image"
                                        className="document_list-uploaded-image"
                                      />
                                    )}
                                    {temp.file_extension === "pdf" && (
                                      <Box className="view-details-file-pdf-icon">
                                        <i class="fa fa-file-pdf-o" />
                                      </Box>
                                    )}
                                  </>
                                </Tooltip>
                                <Box
                                  onClick={() =>
                                    this.handleLargePreview(
                                      temp.file_extension,
                                      temp.url
                                    )
                                  }
                                  className="set-question-image-preview-icon"
                                >
                                  <VisibilityOutlinedIcon />{" "}
                                </Box>
                                <Box
                                  className="set-question-delete-image-input"
                                  onClick={() =>
                                    this.deleteUploadedImage(dIndex, index)
                                  }
                                >
                                  <HighlightOffIcon />
                                </Box>
                              </Box>
                            );
                          })}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              );
            })}
          </Paper>
        )}
        <Box className="end-flex-prop mb-20 pb-20 mt-20">
          <Button
            variant="contained"
            color="primary"
            onClick={this.check}
            disabled={this.props.payDisabled}
            className="submit"
          >
            Submit
          </Button>
        </Box>
      </div>
    );
  }
}

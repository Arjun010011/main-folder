import React, { Component } from "react";

import StudentReviewAndSubmit from "Components/FormReviewAndSubmit";
import PaymentModal from "Components/PaymentModalNew";
import PaymentGatewayModel from "Components/PaymentGatewayModel";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from 'sweetalert2';
import {
  Box,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

import { dateFormat, getSettingValue, getFullName } from "Includes/functions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { supported_documet_submitted, maxFileSize } from "Constants";
import { image_formats } from "Containers/Expenses/Constants";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";


const isResidential = parseInt(getSettingValue("is_residential"));
export default class ApplicationStudentSubmission extends Component {
  constructor(props) {
    super(props);
    this.state = {
      student: {},
      studentData: [],
      isEdit: 0,
      openPaymentModal: false,
      totalAmount: 0,
      onlineAmount: 0,
      postData: {},
      largeImagePreview: "",
      image_name_list: [],
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
      is_application_amount_editable: isFormDefinitionEnabled(
        "fee_configurations",
        "is_application_amount_editable",
        1
      ),
    };
  }
  reviewStudent(student, isEdit) {
    this.setState(
      {
        student,
        isEdit: isEdit,
      },
      () => {
        if (!isEdit)
          this.getFeeTypes(
            student.entry_academic_year,
            student.current_standard
          );
        this.updateStudentData();
      }
    );
  }

  scroll = () => {
    window.scrollTo(0, 0);
  };

  async getFeeTypes(yearid, sid) {
    let feeApi = GET_URL.applicationFeesPlan.api;
    let params = { academic_year: yearid, standard: sid };
    getRequest(feeApi, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let resultData = response.data.data;
        const amount = Number(resultData?.amount) || 0;
        const onlineAmount = Number(resultData?.online_amount ?? resultData?.onlineAmount ?? amount) || amount;
        this.setState({
          application_plan: resultData.id,
          totalAmount: amount,
          onlineAmount,
        });
      }
    });
  }

  getValuesSubmitted = (values) => {
    let return_data = [];
    if (values) {
      values.map((data) => {
        return_data.push(data.name);
      });
    }
    return return_data.join();
  };

  updateStudentData = () => {
    let { student, is_google_places } = this.state;
    let { form_details } = this.props;

    let currentAddress = student["currentAddress"] || {};
    let permanentAddress = student["permanentAddress"] || {};
    let school = student["previous_school_details"] || {};
    let studentMedical = student["medical"] || {};

    let studentData = [];

    let student_basic = { sub_heading: "", data: [] };
    student_basic["sub_heading"] = form_details.student_details?.label ?? form_details.student_details?.name ?? "";
    let temp = {};
    let value = "";
    form_details.student_details.list.map((field) => {
      if (!field.hidden) {
        temp = {};
        temp["label"] = field.label ?? field.column_alias ?? field.name ?? "";

        if (field.isCustom) {
          value = student.custom_form_data?.[field.name] ?? "";
        } else {
          value = student[field.name];
        }
        if (field.view_name) {
          value = student[field.view_name];
        }
        if (value === undefined || value === null) {
          value = "";
        }
        if (field.type === "date") {
          value = value ? dateFormat(value, "DD-MM-YYYY") : "";
        } else if (field.type === "multiselect") {
          value = this.getValuesSubmitted(value);
        } else if (field.type === "dropDownWithSearch") {
          value = value?.name ?? "";
        } else if (
          field.boolean ||
          field.type === "switch" ||
          field.type === "checkbox"
        ) {
          value = value ? "Yes" : "No";
        }
        if (field.name === "student_type" && !isResidential) {
          return;
        } else if (field.name === "document_list" && student[field.name]) {
          value = this.getValuesSubmitted(student[field.name]);
        }
        if (field.view_className) {
          temp["className"] = field.view_className;
        }
        temp["value"] = value !== undefined && value !== null ? value : "";
        student_basic.data.push(temp);
      }
    });
    studentData.push(student_basic);

    if (!form_details.medical_details.hidden) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = form_details.medical_details?.label ?? form_details.medical_details?.name ?? "";
      temp = {};

      form_details.medical_details.list.map((field) => {
        if (!field.hidden) {
          temp = {};
          temp["label"] = field.label ?? field.column_alias ?? field.name ?? "";
          if (field.isCustom) {
            value = student.custom_form_data?.[field.name] ?? "";
          } else {
            value = studentMedical[field.name];
          }
          if (field.view_name) {
            value = studentMedical[field.view_name];
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
          if (field.view_className) {
            temp["className"] = field.view_className;
          }
          temp["value"] = value;
          student_basic.data.push(temp);
        }
      });

      studentData.push(student_basic);
    }

    if (!form_details.pre_school_details.hidden) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = form_details.pre_school_details?.label ?? form_details.pre_school_details?.name ?? "";
      temp = {};

      form_details.pre_school_details.list.map((field) => {
        if (!field.hidden) {
          temp = {};
          temp["label"] = field.label ?? field.column_alias ?? field.name ?? "";
          if (field.isCustom) {
            value = student.custom_form_data?.[field.name] ?? "";
          } else {
            value = school[field.name] ?? school[field.name === "school_name" ? "pre_school_name" : field.name === "school_address" ? "pre_school_address" : field.name];
          }
          if (field.view_name) {
            value = school[field.view_name] ?? school[field.view_name === "school_name" ? "pre_school_name" : field.view_name === "school_address" ? "pre_school_address" : field.view_name] ?? value;
          }
          value = value !== undefined && value !== null ? value : "";
          if (field.type === "date") {
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
          if (field.view_className) {
            temp["className"] = field.view_className;
          }
          temp["value"] = value !== undefined && value !== null ? value : "";
          student_basic.data.push(temp);
        }
      });
      studentData.push(student_basic);
    }

    if (is_google_places && !form_details.current_address_details.hidden) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = student["current_address_checked"]
        ? "Current and Permanent Address Details"
        : (form_details.current_address_details?.label ?? form_details.current_address_details?.name ?? "");
      student_basic["data"] = [
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
      studentData.push(student_basic);
    } else if (
      !is_google_places &&
      !form_details.current_address_details.hidden
    ) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = student["current_address_checked"]
        ? "Current and Permanent Address Details"
        : (form_details.current_address_details?.label ?? form_details.current_address_details?.name ?? "");
      temp = {};

      form_details.current_address_details.list.map((field) => {
        if (!field.hidden) {
          temp = {};
          temp["label"] = field.label ?? field.column_alias ?? field.name ?? "";
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
      studentData.push(student_basic);
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
      studentData.push(student_basic);
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
          try{
            if (field.view_name) {
              temp["value"] = permanentAddress[field.view_name];
            } else {
              temp["value"] = permanentAddress[field.name];
            }
          }catch(error){
            temp['value'] = ''
          }
          if (field.view_className) {
            temp["className"] = field.view_className;
          }
          student_basic.data.push(temp);
        }
      });
      studentData.push(student_basic);
    }

    student_basic = { sub_heading: "", data: [] };
    student_basic["sub_heading"] = form_details.father_details.label;
    temp = {};

    form_details.father_details.list.map((field) => {
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
        if (field.view_className) {
          temp["className"] = field.view_className;
        }
        temp["value"] = value;
        student_basic.data.push(temp);
      }
    });

    studentData.push(student_basic);

    student_basic = { sub_heading: "", data: [] };
    student_basic["sub_heading"] = form_details.mother_details.label;
    temp = {};

    form_details.mother_details.list.map((field) => {
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
        if (field.view_className) {
          temp["className"] = field.view_className;
        }
        temp["value"] = value;
        student_basic.data.push(temp);
      }
    });
    studentData.push(student_basic);

    student_basic = { sub_heading: "", data: [] };
    student_basic["sub_heading"] = form_details.guardian_details.label;
    temp = {};

    form_details.guardian_details.list.map((field) => {
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
        if (field.view_className) {
          temp["className"] = field.view_className;
        }
        temp["value"] = value;
        student_basic.data.push(temp);
      }
    });
    studentData.push(student_basic);

    if (!form_details.bpl_details.hidden) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = form_details.bpl_details.label;
      temp = {};

      form_details.bpl_details.list.map((field) => {
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
          if (field.view_className) {
            temp["className"] = field.view_className;
          }
          temp["value"] = value;
          student_basic.data.push(temp);
        }
      });
      studentData.push(student_basic);
    }

    this.setState({
      studentData,
    });
  };
  check = (data) => {
    let { postData, student } = this.state;
    postData.mode_of_payment = data && data.paymentValue;
    postData.payment_ref_num = data && data.refNo;
    postData.application_plan = this.state.application_plan;
    postData.amount = data ? data.amountToPay : 0
    postData.bank_detail_id = data && data.bank_detail_id;
    student["fees"] = postData;
    this.setState(
      {
        student,
      },
      () => {
        this.props.check(student);
      }
    );
  };

  // Create application without payment for online payment gateway
  // Note: This requires parent/guardian data which is in the parent component
  // For now, return null - PaymentGatewayModel will need application_student_id
  // from student object or this will need to be implemented with full data access
  onCreateApplication = async () => {
    // This should create the application and return { application_student_id: <id> } or { id: <id> }
    // For now, if student already has an ID, return it
    const { student } = this.state;
    
    if (student && (student.id || student.application_student_id)) {
      return {
        application_student_id: student.id || student.application_student_id,
        id: student.id || student.application_student_id
      };
    }
    
    // If no ID exists, we would need to create the application here
    // But we need parent/guardian/address data from parent component
    // For now, return null and let PaymentGatewayModel handle the error
    return null;
  };

  collectFees = async () => {
    const { isEdit, student, totalAmount, onlineAmount } = this.state;
    const { isFromLogin } = this.props;
    
    // Check if student exists before accessing its properties
    if (!student || !student.first_name) {
      Swal.fire({
        type: 'error',
        title: 'Error',
        text: 'Student information is missing. Please try again.',
      });
      return;
    }
    
    const studentName = getFullName(
      student.first_name,
      student.middle_name,
      student.last_name
    );
    
    if (!isEdit) {
      const amountDetails = {
        student: studentName,
        amount: totalAmount,
      };
      
      // For isFromLogin (application form), use online_amount for payment
      if (isFromLogin) {
        const amount = (onlineAmount > 0 ? onlineAmount : totalAmount) || totalAmount;
        const onlineAmountDetails = { student: studentName, amount };
        this.setState({ openPaymentModal: true, amountDetails: onlineAmountDetails });
      } else if (totalAmount > 0) {
        this.setState({ openPaymentModal: true, amountDetails });
      } else {
        this.check();
      }
    } else {
      const amountDetails = {
        student: studentName,
        amount: 100,
      };
      this.props.check(student);
    }
  };
  closeFeePaymentModal = () => {
    this.setState({ openPaymentModal: false });
  };

  handleImageChange = (event, acceptFileType, dIndex) => {
    let { student, image_name_list } = this.state;
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
        student["document_list"][dIndex]["imageUploading"] = true;
        this.setState({ student });
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
            student["document_list"][dIndex].imagesPreview.push(temp);
            this.setState({
              student,
              image_name_list,
            });
          }
          student["document_list"][dIndex]["imageUploading"] = false;
          this.setState({
            student,
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

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  deleteUploadedImage = (dIndex, index) => {
    let { student } = this.state;
    student.document_list[dIndex].imagesPreview.splice(index, 1);
    this.setState({
      student,
    });
  };

  render() {
    let { studentData, student, largeImagePreview, is_application_amount_editable } = this.state;
    let { isFromLogin } = this.props;
    return (
      <div>
        {largeImagePreview && (
          <Box className="set-question-large-image-preview-box">
            <img
              src={largeImagePreview}
              alt="Image Preview"
              className="set-question-large-image-preview"
            />
            <Tooltip title="Close Image" placement="top-start">
              <Box
                className="set-question-large-image-remove-icon-box"
                onClick={this.handleCloseLargeImage}
              >
                <HighlightOffIcon className="set-question-large-image-remove-icon" />
              </Box>
            </Tooltip>
          </Box>
        )}
        <StudentReviewAndSubmit
          check={this.collectFees}
          disabled={this.props.payDisabled}
          student={studentData}
          heading="Review And Submission"
          isTerm={
            student.document_list && student.document_list.length > 0
              ? true
              : false
          }
        />
        {student.document_list && student.document_list.length > 0 && (
          <Paper className="paper-plain-background header-align mv-30 pb-20">
            <Box className="heading">Document Submitted</Box>

            {student.document_list.map((data, dIndex) => {
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
            <Box className="end-flex-prop ">
              <Button
                variant="contained"
                color="primary"
                onClick={this.collectFees}
                disabled={this.props.payDisabled}
                className="submit"
              >
                Submit
              </Button>
            </Box>
          </Paper>
        )}
        {this.state.openPaymentModal ? (
          isFromLogin ? (
            <PaymentGatewayModel
              payDisabled={this.props.payDisabled}
              amountDetails={this.state.amountDetails}
              closeFeePaymentModal={() => this.closeFeePaymentModal()}
              payFees={this.check}
              isTaxHide={true}
              student={student}
              paymentGatewayId={this.state.paymentGatewayId}
              application_plan={this.state.application_plan}
              createApplicationBeforePayment={this.props.createApplicationForPayment}
            />
          ) : (
            <PaymentModal
              payDisabled={this.props.payDisabled}
              amountDetails={this.state.amountDetails}
              closeFeePaymentModal={() => this.closeFeePaymentModal()}
              payFees={this.check}
              isTaxHide={true}
              isAmountCanEdit={is_application_amount_editable}
            />
          )
        ) : (
          ""
        )}
      </div>
    );
  }
}

import React, { Component } from "react";
import {
  Box,
  Checkbox,
  Button,
  Paper,
  FormControlLabel,
  MenuItem,
  Switch,
  Grid,
  ListItemText,
  CircularProgress,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@material-ui/core";
import Snackbar from "@material-ui/core/Snackbar";
import WarningIcon from "@material-ui/icons/Warning";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

import StudentReviewAndSubmit from "Components/FormReviewAndSubmit";
import PaymentModal from "Components/PaymentModalNew";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { dateFormat, getSettingValue, Alert } from "Includes/functions";
import loadingBar from "images/loading.gif";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import student from "Containers/Finance/FeeCollection/student";
import { supported_documet_submitted, maxFileSize } from "Constants";
import { image_formats } from "Containers/Expenses/Constants";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

const isResidential = parseInt(getSettingValue("is_residential"));
const isSubjectPresent = parseInt(
  getSettingValue("subject_assignment") == 2 ? 0 : 1
);
const number_of_language = parseInt(getSettingValue("number_of_language"));
const admission_in_reg = Boolean(parseInt(getSettingValue("admission_in_reg")));

export default class ApplicationStudentSubmission extends Component {
  constructor(props) {
    super(props);
    this.state = {
      student: { siblingList: [] },
      studentData: [],
      openPaymentModal: false,
      amountDetails: {},
      postData: {},
      paymentValue: "Cash",
      payeeName: "",
      refNo: "",
      totalAmount: 0,
      isEdit: 0,
      admissionAmount: {},
      isTerm: false,
      is_checkedAll: false,
      is_checked: [],
      standard_term: [{ fee_plan: "", amount_paid: "" }],
      featureList: [],
      loading: true,
      feature: {},
      allSubjectList: [],
      languageList: { first: [], second: [], third: [] },
      subjectList: [],
      one_language_list: [],
      language: { first: {}, second: {}, third: {} },
      selectedSubject: [],
      openSnackbar: false,
      alertData: "",
      image_name_list: [],
      selectAllPartA: false,
      selectAllPartB: false,
      isSibling: true,
      auto_login_create: isFormDefinitionEnabled(
        "student_configuration",
        "auto_login_create",
        1
      ),
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
    };
    this.onChangeTermValue = this.onChangeTermValue.bind(this);
  }
  reviewStudent(student, isEdit) {
    this.setState(
      {
        student,
        isEdit: isEdit,
      },
      () => {
        if (!isEdit) {
          this.getSubjects(
            student.entry_academic_year,
            student.current_standard
          );
          this.getFeature(
            student.entry_academic_year,
            student.current_standard,
            student.student_type
          );
        } else {
          this.setState({
            loading: false,
          });
        }
        this.updateStudentData();
      }
    );
  }

  scroll = () => {
    window.scrollTo(0, 0);
  };

  closeFeePaymentModal = () => {
    this.setState({ openPaymentModal: false });
  };

  getSubjects(yearId, standardId) {
    let { subjectList, languageList, one_language_list } = this.state;
    let feeApi = GET_URL.getAssignSubject.api;
    let params = {
      academic_year: yearId,
      standard: standardId,
      for_admission: 1,
    };
    getRequest(feeApi, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let resultData = response.data.data;
        this.setState(
          {
            allSubjectList: resultData,
          },
          () => {
            resultData.map((data) => {
              let found = false;
              if (data.subject_is_language) {
                if (data.subject_sequence === 1) {
                  languageList.first.map((first_data) => {
                    if (first_data.subject_id == data.subject_id) {
                      found = true;
                    }
                  });
                  if (!found) {
                    languageList["first"].push(data);
                  }
                } else if (data.subject_sequence === 2) {
                  languageList.second.map((second_data) => {
                    if (second_data.subject_id == data.subject_id) {
                      found = true;
                    }
                  });
                  if (!found) {
                    languageList["second"].push(data);
                  }
                } else if (data.subject_sequence === 3) {
                  languageList.third.map((third_data) => {
                    if (third_data.subject_id == data.subject_id) {
                      found = true;
                    }
                  });
                  if (!found) {
                    languageList["third"].push(data);
                  }
                }
                one_language_list.map((one_subject) => {
                  if (one_subject.subject_id == data.subject_id) {
                    found = true;
                  }
                });
                if (!found) {
                  data["enable"] = "";
                  one_language_list.push(data);
                }
              } else {
                subjectList.map((subject_data) => {
                  if (subject_data.subject_id == data.subject_id) {
                    found = true;
                  }
                });
                if (!found) {
                  data["enable"] = "";
                  subjectList.push(data);
                }
              }
            });
            this.setState({
              languageList,
              subjectList,
              one_language_list,
            });
          }
        );
      }
    });
  }

  getFeature = (yearId, standardId, student_type) => {
    let { featureList } = this.state;
    const feature = GET_URL.feature.api;
    let params = {
      academic_year: yearId,
      standard: standardId,
      is_mandatory: 0,
    };
    if (getSettingValue("is_residential") == 1) {
      let temp = {};
      temp["student_type"] = student_type === "Day Scholar" ? "D" : "R";
      params = { ...params, ...temp };
    }
    getRequest(feature, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let resultData = response.data.data;
        let temp;
        resultData.map((data) => {
          temp = {};
          temp["id"] = data.id;
          temp["name"] = data.fee_type_name;
          temp["enable"] = "no";
          temp["codename"] = data.codename;
          temp["standard_fee"] = data.standard_fee;
          if (data.codename === "store") {
            temp["store_list"] =
              data.fee_standard_mapping_item_selling_price_fee_standard_mapping;
            temp["standard_fee"] = data.standard_fee;
          }
          let found = false;
          featureList.map((child) => {
            if (child["id"] == data["id"]) {
              found = true;
            }
          });
          if (!found) {
            featureList.push(temp);
          }
        });
      }
      this.setState({
        featureList,
        loading: false,
      });
    });
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

  updateStudentData = () => {
    let { student, auto_login_create, is_google_places } = this.state;
    let { form_details } = this.props;

    let currentAddress = student["currentAddress"];
    let permanentAddress = student["permanentAddress"];
    let school = student["previous_school_details"];
    let studentMedical = student["medical"];
    let second_language = student["previous_school_details"]["language"]
      ? student["previous_school_details"]["language"]
      : {};
    let sslc = student["previous_school_details"]["sslc"]
      ? student["previous_school_details"]["sslc"]
      : {};
    let sslcMarks = student["previous_school_details"]["sslcMarks"]
      ? student["previous_school_details"]["sslcMarks"]
      : {};
    let puc = student["previous_school_details"]["puc"]
      ? student["previous_school_details"]["puc"]
      : {};
    let pucMarks = student["previous_school_details"]["pucMarks"]
      ? student["previous_school_details"]["pucMarks"]
      : {};
    let extraActivity = student["previous_school_details"]["extraActivity"]
      ? student["previous_school_details"]["extraActivity"]
      : {};

    let studentData = [];
    let student_basic = { sub_heading: "", data: [] };
    student_basic["sub_heading"] = form_details.student_details.label;
    let temp = {};
    form_details.student_details.list.map((field) => {
      if (!field.hidden) {
        if (field.name === "current_reg_num" && admission_in_reg) {
          return;
        }
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
        if (field.name === "student_type" && !isResidential) {
          return;
        } else if (field.name === "document_list" && student[field.name]) {
          value = this.getValuesSubmitted(student[field.name]);
        }
        if (field.view_className) {
          temp["className"] = field.view_className;
        }
        if (field.name === "is_new_student") {
          value = student[field.name] == "true" ? "New Student" : "Old Student";
        }
        temp["value"] = value;
        student_basic.data.push(temp);
      }
    });
    studentData.push(student_basic);
    if (!auto_login_create) {
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
      studentData.push(staff_user_login);
    }

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
            value = student.bank[field.name];
          }
          if (field.view_name) {
            value = student.bank[field.view_name];
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
      student_basic["sub_heading"] = form_details.pre_school_details.label;
      temp = {};
      form_details.pre_school_details.list.map((field) => {
        if (!field.hidden) {
          temp = {};
          temp["label"] = field.label;

          let value;
          if (field.isCustom) {
            value = student.custom_form_data?.[field.name] ?? "";
          } else {
            value = school[field.name];
          }
          if (field.view_name) {
            value = school[field.view_name];
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
    if (student["isSslcPucPresent"]) {
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
            if (field.view_name) {
              value = sslc[field.view_name];
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

      if (student["isPucPresent"]) {
        if (!form_details.puc_details.hidden) {
          student_basic = { sub_heading: "", data: [] };
          student_basic["sub_heading"] = form_details.puc_details.label;
          temp = {};

          form_details.puc_details.list.map((field) => {
            if (!field.hidden) {
              temp = {};
              temp["label"] = field.label;
              let value;
              if (field.isCustom) {
                value = student.custom_form_data?.[field.name] ?? "";
              } else {
                value = puc[field.name];
              }
              if (field.view_name) {
                value = puc[field.view_name];
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
            let value;
            if (field.isCustom) {
              value = student.custom_form_data?.[field.name] ?? "";
            } else {
              value = second_language[field.name];
            }
            if (field.view_name) {
              value = second_language[field.view_name];
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

      if (!form_details.medium_instruction_details.hidden) {
        student_basic = { sub_heading: "", data: [] };
        student_basic["sub_heading"] =
          form_details.medium_instruction_details.label;
        temp = {};

        form_details.medium_instruction_details.list.map((field) => {
          if (!field.hidden) {
            temp = {};
            temp["label"] = field.label;
            let value;
            if (field.isCustom) {
              value = student.custom_form_data?.[field.name] ?? "";
            } else {
              value = second_language[field.name];
            }
            if (field.view_name) {
              value = second_language[field.view_name];
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

      if (!form_details.sslc_mark_details.hidden) {
        student_basic = { sub_heading: "", data: [] };
        student_basic["sub_heading"] = form_details.sslc_mark_details.label;
        temp = {};

        form_details.sslc_mark_details.list.map((field) => {
          if (!field.hidden) {
            temp = {};
            temp["label"] = field.label;
            let value;
            if (field.isCustom) {
              value = student.custom_form_data?.[field.name] ?? "";
            } else {
              value = sslcMarks[field.name];
            }
            if (field.view_name) {
              value = sslcMarks[field.view_name];
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

      if (student["isPucPresent"] && !form_details.puc_mark_details.hidden) {
        student_basic = { sub_heading: "", data: [] };
        student_basic["sub_heading"] = form_details.puc_mark_details.label;
        temp = {};

        form_details.puc_mark_details.list.map((field) => {
          if (!field.hidden) {
            temp = {};
            temp["label"] = field.label;
            let value;
            if (field.isCustom) {
              value = student.custom_form_data?.[field.name] ?? "";
            } else {
              value = pucMarks[field.name];
            }
            if (field.view_name) {
              value = pucMarks[field.view_name];
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
    }

    if (is_google_places && !form_details.current_address_details.hidden) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = student["current_address_checked"]
        ? "Current and Permanent Address Details"
        : form_details.current_address_details.label;
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
        : form_details.current_address_details.label;
      temp = {};

      form_details.current_address_details.list.map((field) => {
        if (!field.hidden) {
          temp = {};
          temp["label"] = field.label;
          try {
            if (field.view_name) {
              temp["value"] = currentAddress[field.view_name];
            } else {
              temp["value"] = currentAddress[field.name];
            }
          } catch {
            temp["value"] = "";
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
          try {
            if (field.view_name) {
              temp["value"] = permanentAddress[field.view_name];
            } else {
              temp["value"] = permanentAddress[field.name];
            }
          } catch (error) {
            temp["value"] = "";
          }
          if (field.view_className) {
            temp["className"] = field.view_className;
          }
          student_basic.data.push(temp);
        }
      });

      studentData.push(student_basic);
    }

    if (!form_details.extra_activity_details.hidden) {
      student_basic = { sub_heading: "", data: [] };
      student_basic["sub_heading"] = form_details.extra_activity_details.label;
      temp = {};

      form_details.extra_activity_details.list.map((field) => {
        if (!field.hidden) {
          temp = {};
          temp["label"] = field.label;

          let value;
          if (field.isCustom) {
            value = student.custom_form_data?.[field.name] ?? "";
          } else {
            value = extraActivity[field.name];
          }
          if (field.view_name) {
            value = extraActivity[field.view_name];
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
          if (field.name === "f_profile_pic") {
            temp["value"] = student["f_profile_pic_details"]
              ? student["f_profile_pic_details"]["file"]
              : "";
          } else {
            temp["value"] = value;
          }
          temp["type"] = field.type;
          student_basic.data.push(temp);
        }
      });
      studentData.push(student_basic);
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
          if (field.name === "m_profile_pic") {
            temp["value"] = student["m_profile_pic_details"]
              ? student["m_profile_pic_details"]["file"]
              : "";
          } else {
            temp["value"] = value;
          }
          temp["type"] = field.type;
          student_basic.data.push(temp);
        }
      });
      studentData.push(student_basic);
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
          if (field.name === "g_profile_pic") {
            temp["value"] = student["g_profile_pic_details"]
              ? student["g_profile_pic_details"]["file"]
              : "";
          } else {
            temp["value"] = value;
          }
          temp["type"] = field.type;
          student_basic.data.push(temp);
        }
      });
      studentData.push(student_basic);
    }

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
    let { postData, admissionAmount, is_checked, student } = this.state;
    postData.mode_of_payment = data.paymentValue;
    postData.payment_ref_num = data.refNo;
    postData.standard_fee = [];
    let temp = [];
    if (this.state.isTerm === true) {
      admissionAmount.standard_fee.map((data, index) => {
        if (is_checked[index] === true) {
          temp = { fee_plan: data.id };
          postData.standard_fee.push(temp);
        }
      });
    } else {
      admissionAmount.standard_fee.map((data, index) => {
        temp = { fee_plan: data.id };
        postData.standard_fee.push(temp);
      });
    }
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

  collectFees = async () => {
    const {
      isEdit,
      student,
      totalAmount,
      language,
      subjectList,
      one_language_list,
    } = this.state;
    if (!isEdit) {
      student["subject_detail"] = [];
      if (Object.keys(language["first"]).length !== 0) {
        student["subject_detail"].push(language["first"]["id"]);
      }
      if (Object.keys(language["second"]).length !== 0) {
        student["subject_detail"].push(language["second"]["id"]);
      }
      if (Object.keys(language["third"]).length !== 0) {
        student["subject_detail"].push(language["third"]["id"]);
      }
      subjectList.map((data) => {
        if (Boolean(data.enable) && !data.subject_is_language) {
          student["subject_detail"].push(data.subject_id);
        }
      });
      one_language_list.map((data) => {
        if (
          Boolean(data.enable) &&
          data.subject_is_language &&
          number_of_language == 1
        ) {
          student["subject_detail"].push(data.subject_id);
        }
      });

      if (student["subject_detail"].length === 0 && isSubjectPresent) {
        this.setState({
          openSnackbar: true,
          alertData: "Please select atleast one subject",
        });
      } else {
        this.addFeature(student);
      }
    } else {
      this.addFeature(student);
    }
  };

  addFeature = (student) => {
    let { featureList } = this.state;
    let feature = [];
    let fee_plan_item_selling_mapping = {};
    let is_any_store_enabled = false;
    featureList.map((data) => {
      fee_plan_item_selling_mapping[data["id"]] = [];
      is_any_store_enabled = false;
      if (data.codename === "store") {
        data.store_list.map((storeData) => {
          if (storeData.is_checked) {
            is_any_store_enabled = true;
            fee_plan_item_selling_mapping[data["id"]].push({
              fee_standard_mapping_item_selling_price_id: parseInt(
                storeData["id"]
              ),
              feature_status: 1,
            });
          }
        });
        if (
          is_any_store_enabled &&
          fee_plan_item_selling_mapping[data["id"]].length > 0
        ) {
          feature.push(data["id"]);
        }
      } else {
        data.standard_fee.map((data) => {
          if (data.is_checked) {
            feature.push(data["id"]);
          }
        });
      }
    });
    student["feature"] = feature;
    student["fee_plan_item_selling_mapping"] = fee_plan_item_selling_mapping;
    this.props.check(student);
  };

  handleChange = (event) => {
    this.setState({ [event.target.name]: event.target.checked });
  };
  onChangeTermValue = (index, amount, termId) => {
    let { is_checked, totalAmount, standard_term } = this.state;
    is_checked[index] = !is_checked[index];
    if (is_checked[index]) {
      totalAmount = totalAmount + amount;
      standard_term.map((data, index) => {
        if (data.id === termId) {
          standard_term.amount = amount;
        }
      });
    } else {
      totalAmount = totalAmount - amount;
      standard_term.map((data, index) => {
        if (data.id === termId) {
          standard_term.amount = amount;
        }
      });
    }
    this.setState({
      standard_term,
      is_checked,
      is_checkedAll: false,
      totalAmount,
    });
  };
  checkAllTheValues = (total) => {
    if (!this.state.is_checkedAll) {
      const is_checked = Array(
        this.state.admissionAmount.standard_fee.length
      ).fill(true);
      this.setState({
        totalAmount: total,
        is_checked,
        is_checkedAll: !this.state.is_checkedAll,
      });
    } else {
      const is_checked = Array(
        this.state.admissionAmount.standard_fee.length
      ).fill(false);
      this.setState({
        totalAmount: 0,
        is_checkedAll: !this.state.is_checkedAll,
        is_checked,
      });
    }
  };

  onChangeFeature = (e, id) => {
    const { value } = e.target;
    let { featureList } = this.state;
    featureList.map((data) => {
      if (data["id"] === id) {
        data["enable"] = value;
      }
    });
    this.setState({
      featureList,
    });
  };

  onChangeSubject = (id) => {
    let { subjectList } = this.state;
    subjectList.map((data) => {
      if (data["id"] === id) {
        data["enable"] = !data["enable"];
      }
    });
    this.setState({
      subjectList,
    });
  };

  onChangeLanguageSubject = (id) => {
    let { one_language_list } = this.state;
    one_language_list.map((data) => {
      if (data["id"] === id) {
        data["enable"] = !data["enable"];
      }
    });
    this.setState({
      one_language_list,
    });
  };

  onChangeSelectAllLanguage = () => {
    let { one_language_list, selectAllPartA } = this.state;
    one_language_list.map((data) => {
      data["enable"] = !selectAllPartA;
    });
    this.setState({
      one_language_list,
      selectAllPartA: !selectAllPartA,
    });
  };

  onChangeSelectAllSubject = () => {
    let { subjectList, selectAllPartB } = this.state;
    subjectList.map((data) => {
      data["enable"] = !selectAllPartB;
    });
    this.setState({
      subjectList,
      selectAllPartB: !selectAllPartB,
    });
  };

  onChangeLanguage = (name, id, subject_codename) => {
    let { language } = this.state;

    if (name === "first") {
      if (language["second"]["name"] === subject_codename) {
        language["second"] = {};
      }
      if (language["third"]["name"] === subject_codename) {
        language["third"] = {};
      }
    }

    if (name === "second") {
      if (language["first"]["name"] === subject_codename) {
        language["first"] = {};
      }
      if (language["third"]["name"] === subject_codename) {
        language["third"] = {};
      }
    }

    if (name === "third") {
      if (language["second"]["name"] === subject_codename) {
        language["second"] = {};
      }
      if (language["first"]["name"] === subject_codename) {
        language["first"] = {};
      }
    }

    language[name]["id"] = id;
    language[name]["name"] = subject_codename;
    this.setState({
      language: { ...language },
    });
  };

  handleCloseSnackBar = () => {
    this.setState({
      openSnackbar: false,
    });
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

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  changeStoreParent = (value, feeIndex) => {
    let { featureList } = this.state;
    featureList[feeIndex].store_list.map((data) => {
      data["is_checked"] = value;
    });
    this.setState({
      featureList,
    });
  };

  enableStoreFeatureOnChange = (value, feeIndex, storeIndx) => {
    let { featureList } = this.state;
    featureList[feeIndex].store_list[storeIndx]["is_checked"] = value;
    this.setState({
      featureList,
    });
  };

  changeParent = (value, feeIndex) => {
    let { featureList } = this.state;
    featureList[feeIndex].standard_fee.map((data) => {
      data["is_checked"] = value;
    });
    this.setState({
      featureList,
    });
  };

  enableFeatureOnChange = (value, feeIndex, storeIndx) => {
    let { featureList } = this.state;
    featureList[feeIndex].standard_fee[storeIndx]["is_checked"] = value;
    this.setState({
      featureList,
    });
  };

  render() {
    let {
      studentData,
      isEdit,
      loading,
      featureList,
      one_language_list,
      subjectList,
      languageList,
      student,
      language,
      openSnackbar,
      alertData,
      isSibling,
      selectAllPartA,
      selectAllPartB,
    } = this.state;
    const { form_details } = this.props;
    let is_term = isEdit ? (isSibling ? true : false) : true;
    if (student.document_list && student.document_list.length > 0) {
      is_term = true;
    }
    return (
      <div>
        <Box className={!loading ? "display-none" : ""} display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
        <div className={loading ? "display-none" : ""}>
          <StudentReviewAndSubmit
            check={this.collectFees}
            disabled={this.props.payDisabled}
            student={studentData}
            heading="Review And Submission for Student"
            isTerm={is_term}
            sub_heading="Here you can find the complete Student Basic information, Parent Information and Contact Information"
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
                            data["imageUploading"]
                              ? "upload-icon-uploading"
                              : ""
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
                              <i
                                className="fa fa-upload"
                                aria-hidden="true"
                              ></i>
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
          {student.documents_not_uploaded &&
            student.documents_not_uploaded.length > 0 && (
              <Paper className="paper-plain-background header-align mv-30 pb-20">
                <Box className="text-bold fs-28 text-red">Document Not Listed</Box>
                <ul>
                {student.documents_not_uploaded.map((data, dIndex) => {
                  return <li key={dIndex} className="text-red">{data.name}</li>;
                })}
                </ul>
              </Paper>
            )
          }
          {!form_details.sibling_details.hidden && (
            <Paper className="paper-plain-background header-align">
              <Box className="heading pt-20">Sibling Details</Box>
              {student.siblingList.length === 0 && (
                <div className="no-feature-label pb-20">
                  Note: There are no siblings added
                </div>
              )}
              {student.siblingList.length > 0 && (
                <Grid container>
                  <Grid item md={7} xs={12}>
                    <TableContainer className="add-sibling-table header-align m-b-60px">
                      <Table
                        size="small"
                        aria-label="simple table"
                        className="exam-mark-row-table"
                      >
                        <TableHead>
                          <TableRow className="">
                            <TableCell className="selectable-table-head text-align-center">
                              Student
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Standard
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Section
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              DOB
                            </TableCell>
                            <TableCell className="selectable-table-head text-align-center">
                              Relation
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {student.siblingList.map((stdData, index) => {
                            return (
                              <TableRow className="">
                                <TableCell className="text-align-center">
                                  {stdData.full_name}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {stdData.current_standard_name}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {stdData.current_standard_section_name}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {dateFormat(stdData.dob, "DD-MM-YYYY")}
                                </TableCell>
                                <TableCell className="text-align-center">
                                  {stdData.relation_label}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              )}
            </Paper>
          )}
          {!isEdit && (
            <Paper className="paper-plain-background header-align">
              {!!isSubjectPresent && (
                <Box>
                  <Box className="heading">Subjects to be opted</Box>
                  <Grid container>
                    {number_of_language != 0 && (
                      <Grid item md={7} xs={12}>
                        <Box className="part-heading flex-justify-center ">
                          Part A
                        </Box>
                        {number_of_language != 1 && (
                          <Box>
                            {languageList.first.length > 0 && (
                              <Box className="language-list-outer-box">
                                <Box className="language-label-box">
                                  First Language
                                </Box>
                                <Box>
                                  {languageList.first.map((data) => {
                                    return (
                                      <label
                                        onChange={() =>
                                          this.onChangeLanguage(
                                            "first",
                                            data.subject_id,
                                            data.subject_codename
                                          )
                                        }
                                      >
                                        <input
                                          type="radio"
                                          value={language["first"]["id"]}
                                          name="first"
                                          checked={
                                            language["first"]["id"] ==
                                            data.subject_id
                                          }
                                        />{" "}
                                        {data.subject_name}
                                      </label>
                                    );
                                  })}
                                </Box>
                              </Box>
                            )}
                            {languageList.second.length > 0 && (
                              <Box className="language-list-outer-box">
                                <Box className="language-label-box">
                                  Second Language
                                </Box>
                                <Box>
                                  {languageList.second.map((data) => {
                                    return (
                                      <label
                                        onChange={() =>
                                          this.onChangeLanguage(
                                            "second",
                                            data.subject_id,
                                            data.subject_codename
                                          )
                                        }
                                      >
                                        <input
                                          type="radio"
                                          value={language["second"]["id"]}
                                          name="second"
                                          checked={
                                            language["second"]["id"] ==
                                            data.subject_id
                                          }
                                        />{" "}
                                        {data.subject_name}
                                      </label>
                                    );
                                  })}
                                </Box>
                              </Box>
                            )}
                            {languageList.third.length > 0 &&
                              number_of_language == 3 && (
                                <Box className="language-list-outer-box">
                                  <Box className="language-label-box">
                                    Third Language
                                  </Box>
                                  <Box>
                                    {languageList.third.map((data) => {
                                      return (
                                        <label
                                          onChange={() =>
                                            this.onChangeLanguage(
                                              "third",
                                              data.subject_id,
                                              data.subject_codename
                                            )
                                          }
                                        >
                                          <input
                                            type="radio"
                                            value={language["third"]["id"]}
                                            name="third"
                                            checked={
                                              language["third"]["id"] ==
                                              data.subject_id
                                            }
                                          />{" "}
                                          {data.subject_name}
                                        </label>
                                      );
                                    })}
                                  </Box>
                                </Box>
                              )}
                          </Box>
                        )}
                        {number_of_language == 1 && (
                          <MenuItem
                            value={selectAllPartA}
                            onClick={() => this.onChangeSelectAllLanguage()}
                            className="padding-0"
                          >
                            <Checkbox
                              color="secondary"
                              checked={selectAllPartA}
                            />
                            <Box className="text-capitalize">
                              <ListItemText primary={"Select All"} />
                            </Box>
                          </MenuItem>
                        )}
                        <Box>
                          {number_of_language == 1 &&
                            one_language_list.map((subject, index) => {
                              return (
                                <MenuItem
                                  key={index}
                                  value={subject.subject_name}
                                  onClick={() =>
                                    this.onChangeLanguageSubject(subject["id"])
                                  }
                                  className="padding-0"
                                >
                                  <Checkbox
                                    color="primary"
                                    checked={subject["enable"]}
                                  />
                                  <Box className="text-capitalize">
                                    <ListItemText
                                      primary={subject.subject_name}
                                    />
                                  </Box>
                                </MenuItem>
                              );
                            })}
                        </Box>
                      </Grid>
                    )}
                    <Grid item md={5} xs={12}>
                      {number_of_language != 0 && (
                        <Box className="part-heading flex-justify-center ">
                          Part B
                        </Box>
                      )}
                      <MenuItem
                        value={selectAllPartB}
                        onClick={() => this.onChangeSelectAllSubject()}
                        className="padding-0"
                      >
                        <Checkbox color="secondary" checked={selectAllPartB} />
                        <Box className="text-capitalize">
                          <ListItemText primary={"Select All"} />
                        </Box>
                      </MenuItem>
                      <Box>
                        {subjectList.map((subject, index) => {
                          return (
                            <MenuItem
                              key={index}
                              value={subject.subject_name}
                              onClick={() =>
                                this.onChangeSubject(subject["id"])
                              }
                              className="padding-0"
                            >
                              <Checkbox
                                color="primary"
                                checked={subject["enable"]}
                              />
                              <Box className="text-capitalize">
                                <ListItemText primary={subject.subject_name} />
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
              <Box>
                <Grid container className="margin-top-20">
                  <Grid item md={12} xs={12} className="">
                    <Box className="heading pt-20">
                      Enable Non Mandatory Fee
                    </Box>
                    {featureList.length !== 0 && (
                      <Box display="flex" m={1} className="warning-message">
                        {" "}
                        <WarningIcon style={{ color: "#f6c342" }} />
                        If you enable the Non Mandatory Fees it will reflects in
                        the student fee collection.
                      </Box>
                    )}
                    {featureList.map((feature, feeIndex) => {
                      if (feature.codename === "store") {
                        let isParentChecked = true;
                        feature.store_list.map((storeTemp) => {
                          if (!storeTemp["is_checked"]) {
                            isParentChecked = false;
                          }
                        });
                        return (
                          <table
                            className="width-50"
                            style={{
                              paddingLeft: "20px",
                              paddingRight: "20px",
                            }}
                          >
                            <tr>
                              <th className="feature-table-border">
                                <Checkbox
                                  color="primary"
                                  checked={isParentChecked}
                                  value={isParentChecked}
                                  onChange={(e) =>
                                    this.changeStoreParent(
                                      !isParentChecked,
                                      feeIndex
                                    )
                                  }
                                  size="small"
                                />
                              </th>
                              <th className="feature-table-border">
                                Item Name
                              </th>
                              <th className="feature-table-border">Amount</th>
                            </tr>
                            {feature.store_list.map((data, sIndex) => {
                              let is_checked = data?.is_checked ?? false;
                              return (
                                <tr>
                                  <td className="feature-table-border">
                                    <Checkbox
                                      onChange={(e) =>
                                        this.enableStoreFeatureOnChange(
                                          !is_checked,
                                          feeIndex,
                                          sIndex
                                        )
                                      }
                                      value={is_checked}
                                      checked={is_checked}
                                      color="primary"
                                      size="small"
                                    />
                                  </td>
                                  <td className="feature-table-border">
                                    {data["item_name"]}
                                  </td>
                                  <td className="feature-table-border">
                                    {data["selling_price"]}
                                  </td>
                                </tr>
                              );
                            })}
                          </table>
                        );
                      } else if (feature.standard_fee) {
                        let isParentChecked = true;
                        feature.standard_fee.map((standard) => {
                          if (!standard["is_checked"]) {
                            isParentChecked = false;
                          }
                        });
                        return (
                          <table
                            className="width-50 m-20"
                            style={{
                              paddingLeft: "20px",
                              paddingRight: "20px",
                            }}
                          >
                            <tr>
                              <th className="feature-table-border">
                                <Checkbox
                                  color="primary"
                                  checked={isParentChecked}
                                  value={isParentChecked}
                                  onChange={(e) =>
                                    this.changeParent(
                                      !isParentChecked,
                                      feeIndex
                                    )
                                  }
                                  size="small"
                                />
                              </th>
                              <th className="feature-table-border">
                                {feature.name}
                              </th>
                              <th className="feature-table-border">Amount</th>
                            </tr>
                            {feature.standard_fee.map((data, sIndex) => {
                              let is_checked = data?.is_checked ?? false;
                              return (
                                <tr>
                                  <td className="feature-table-border">
                                    <Checkbox
                                      onChange={(e) =>
                                        this.enableFeatureOnChange(
                                          !is_checked,
                                          feeIndex,
                                          sIndex
                                        )
                                      }
                                      value={is_checked}
                                      checked={is_checked}
                                      color="primary"
                                      size="small"
                                    />
                                  </td>
                                  <td className="feature-table-border">
                                    {data["terms"]}
                                  </td>
                                  <td className="feature-table-border">
                                    {data["rate"]}
                                  </td>
                                </tr>
                              );
                            })}
                          </table>
                        );
                      }
                    })}
                    {featureList.length === 0 && (
                      <Box className="no-feature-label">
                        Note: There is no features to show
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          )}
        </div>
        <Box className="end-flex-prop mb-20 pb-20 mt-20">
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
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={openSnackbar}
          autoHideDuration={2000}
          onClose={(e) => this.handleCloseSnackBar(e)}
        >
          <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </div>
    );
  }
}

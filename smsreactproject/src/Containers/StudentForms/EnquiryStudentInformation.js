import React, { Component } from "react";
import classNames from "classnames";
import {
  Grid,
  FormControlLabel,
  Switch,
  Box,
  Button,
  Divider,
} from "@material-ui/core";
import _ from "lodash";

import DynamicForm from "Components/DynamicForm";
import AddressFields from "Components/AddressFields";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { SetAcademicYear, validateDate, dateFormat } from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { validateMobileNumber, getSettingValue } from "Includes/functions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import AutoCompleteAddress from "Components/AutoCompleteAddress";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

// Age to Standard mapping based on provided age ranges
const getStandardFromAge = (age) => {
  if (!age || age === "") return null;
  
  const ageNum = parseFloat(age);
  if (isNaN(ageNum)) return null;

  // Age-based class mapping
  if (ageNum >= 2.5 && ageNum < 3) return "Playgroup";
  if (ageNum >= 3 && ageNum < 4) return "Nursery";
  if (ageNum >= 4 && ageNum < 5) return "LKG";
  if (ageNum >= 5 && ageNum < 6) return "UKG";
  if (ageNum >= 6 && ageNum < 7) return "Class 1";
  if (ageNum >= 7 && ageNum < 8) return "Class 2";
  if (ageNum >= 8 && ageNum < 9) return "Class 3";
  if (ageNum >= 9 && ageNum < 10) return "Class 4";
  if (ageNum >= 10 && ageNum < 11) return "Class 5";
  if (ageNum >= 11 && ageNum < 12) return "Class 6";
  if (ageNum >= 12 && ageNum < 13) return "Class 7";
  if (ageNum >= 13 && ageNum < 14) return "Class 8";
  if (ageNum >= 14 && ageNum < 15) return "Class 9";
  if (ageNum >= 15 && ageNum < 16) return "Class 10";
  
  return null;
};

// Find matching standard from standard list based on suggested standard name
const findMatchingStandard = (suggestedStandard, standardList) => {
  if (!suggestedStandard || !standardList || standardList.length === 0) {
    return null;
  }
  
  // Try exact match first
  let match = standardList.find(
    (std) => std.name === suggestedStandard
  );
  if (match) return match;
  
  // Try case-insensitive match
  match = standardList.find(
    (std) => std.name.toLowerCase() === suggestedStandard.toLowerCase()
  );
  if (match) return match;
  
  // Try partial match (e.g., "Class 1" matches "1" or "Standard 1")
  const suggestedLower = suggestedStandard.toLowerCase();
  match = standardList.find((std) => {
    const stdNameLower = std.name.toLowerCase();
    return stdNameLower.includes(suggestedLower) || suggestedLower.includes(stdNameLower);
  });
  if (match) return match;
  
  // Try extracting number from standard name (e.g., "1" from "Class 1")
  const suggestedNum = suggestedStandard.replace(/\D/g, "");
  if (suggestedNum) {
    match = standardList.find((std) => {
      const stdNum = std.name.replace(/\D/g, "");
      return stdNum === suggestedNum;
    });
    if (match) return match;
  }
  
  return null;
};

// Calculate age from date of birth
// referenceDate: Optional date to calculate age against (defaults to current date)
// If referenceDate is a string (YYYY-MM-DD), extracts year and uses June 1st of that year
const calculateAgeFromDOB = (dob, referenceDate = null) => {
  if (!dob) return null;
  
  try {
    // Ensure birthDate is a proper Date object
    let birthDate;
    if (dob instanceof Date) {
      birthDate = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    } else if (typeof dob === 'string') {
      birthDate = new Date(dob);
    } else {
      birthDate = new Date(dob);
    }
    
    // Validate birthDate
    if (isNaN(birthDate.getTime())) {
      console.error("Invalid birth date:", dob);
      return null;
    }
    
    let reference = new Date();
    
    // If referenceDate is provided, use it
    if (referenceDate) {
      if (typeof referenceDate === 'string') {
        // Extract year from start_date (e.g., "2025-05-01" -> year 2025)
        const yearMatch = referenceDate.match(/^(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1], 10);
          // Use June 1st of the academic year
          reference = new Date(year, 5, 1); // Month is 0-indexed, so 5 = June
        } else {
          reference = new Date(referenceDate);
        }
      } else if (referenceDate instanceof Date) {
        reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
      }
    }
    
    // Normalize to midnight to avoid timezone issues
    birthDate.setHours(0, 0, 0, 0);
    reference.setHours(0, 0, 0, 0);
    
    // Validate reference date
    if (isNaN(reference.getTime())) {
      console.error("Invalid reference date:", referenceDate);
      return null;
    }
    
    // Calculate the difference in milliseconds
    const diffMs = reference.getTime() - birthDate.getTime();
    
    // Calculate age in years (using 365.25 days per year to account for leap years)
    const ageInYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    
    return ageInYears.toFixed(1);
  } catch (error) {
    console.error("Error calculating age from DOB:", error);
    return null;
  }
};

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class EnquiryStudentInformation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      datalist: {},
      studentDetails: null,
      parentDetails: null,
      schoolDetails: null,
      examDetails: null,
      schoolValue: null,
      addressDetails: null,
      entry_academic_year: null,
      addressValue: {},
      student: {
        address: {},
        previous_school_details: {},
        isPreSchoolPresent: null,
        custom_form_data: {},
        exam_details: {},
      },
      open: false,
      alertData: "",
      isCurrentAddressEdit: false,
      is_google_places: isFormDefinitionEnabled(
        "student_configuration",
        "address_google_map",
        1
      ),
      isAutoSelectingStandard: false, // Flag to prevent infinite loops
      calculatedAge: null, // Store calculated age from DOB
    };
  }

  componentDidMount() {
    this.getYearList();
  }

  getYearList = () => {
    const { yearInformation, studentDetail, isEditForm } = this.props;
    const year_url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(year_url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            yearList: response.data.data,
            year_name: !isEditForm ? yearInformation.year_name : "",
          },
          () => {
            if (isEditForm) {
              this.getStandardList(studentDetail.entry_academic_year);
            } else {
              this.getStandardList(yearInformation.year);
            }
          }
        );
      }
    });
  };

  getStandardList = (year) => {
    let { student, isCurrentAddressEdit } = this.state;
    let { isEditForm } = this.props;
    const url = GET_URL.getstandard.api;
    const params = { academic_year: year , is_finance_page: true};
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            standardList: response.data.data,
            entry_academic_year: year,
          },
          () => {
            if (isEditForm) {
              student["student_id"] = this.props.studentDetail.id;
              student["student_details_id"] =
                this.props.studentDetail.student_details.id;
              if (this.props.studentDetail.student_details.country) {
                isCurrentAddressEdit = true;
              }
              this.updateStudentInf(this.props.studentDetail);
              this.updateParentInf(this.props.studentDetail);
              this.updateAddress(this.props.studentDetail.student_details);
              this.updatePreviousSchoolInf(this.props.studentDetail);
              this.updateExamDetails(this.props.studentDetail);
              this.setState({
                student,
                isCurrentAddressEdit,
                year_name: this.props.studentDetail.entry_academic_year_value,
              });
            } else {
              this.updateStudentInf();
              this.updateParentInf();
              this.updateAddress();
              this.updatePreviousSchoolInf();
              this.updateExamDetails();
              
              // Auto-select standard if DOB is already entered
              const dobValue = student.dob;
              if (dobValue) {
                setTimeout(() => {
                  this.autoSelectStandardFromDOB(dobValue);
                }, 100);
              }
            }
          }
        );
      }
    });
  };

  updateStudentInf = (studentInf) => {
    let { student, yearList, standardList, entry_academic_year, isEditForm } =
      this.state;
    let { form_details, yearInformation } = this.props;
    let fieldDetail = _.cloneDeep(form_details.student_details.list);
    let value;
    let dobValue = null;
    
    fieldDetail.forEach((field) => {
      if (studentInf) {
        if (field.isCustom) {
          value = studentInf.custom_form_data?.[field.name] ?? field.default;
        } else {
          value = studentInf?.[field["name"]] ?? field.default;
        }
        if (studentInf["enquiry_date"] && field["name"] === "enquiry_date") {
          field.disabled = true;
        }
        // Store DOB value for age calculation
        if (field.name === "dob") {
          dobValue = value;
        }
      } else {
        value = field.default;
        if (field.name === "enquiry_date" && !isEditForm) {
          field.maxDate = new Date();
        }
      }
      if (field.name === "entry_academic_year") {
        field["list"] = yearList;
        value = entry_academic_year;
        field.hidden = true;
      } else if (field.name === "current_standard") {
        field["list"] = standardList;
      }
      
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value;
      } else {
        student[field["name"]] = value;
      }
    });
    
    // Auto-select standard based on DOB if DOB is available and standard is not already selected
    let calculatedAge = null;
    const referenceDate = yearInformation?.start_date || null;
    
    if (dobValue && !student["current_standard"]) {
      calculatedAge = calculateAgeFromDOB(dobValue, referenceDate);
      if (calculatedAge) {
        const suggestedStandard = getStandardFromAge(calculatedAge);
        if (suggestedStandard) {
          const matchingStandard = findMatchingStandard(suggestedStandard, standardList);
          if (matchingStandard) {
            fieldDetail.forEach((field) => {
              if (field.name === "current_standard") {
                field.default = matchingStandard.id;
                student["current_standard"] = matchingStandard.id;
              }
            });
          }
        }
      }
    }
    
    // Set helperText for DOB field to show age (append to existing helperText)
    if (dobValue) {
      calculatedAge = calculateAgeFromDOB(dobValue, referenceDate);
      
      // Get reference date for display
      let referenceDateText = "";
      if (referenceDate) {
        if (typeof referenceDate === 'string') {
          const yearMatch = referenceDate.match(/^(\d{4})/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            const referenceDateObj = new Date(year, 5, 1); // June 1st
            const monthNames = ["January", "February", "March", "April", "May", "June", 
                               "July", "August", "September", "October", "November", "December"];
            referenceDateText = ` (as of ${monthNames[5]} 1, ${year})`;
          }
        }
      }
      
      fieldDetail.forEach((field) => {
        if (field.name === "dob") {
          const baseHelperText = "Standard will be auto-selected based on age";
          if (calculatedAge) {
            field.helperText = `${baseHelperText}${referenceDateText} - Age: ${calculatedAge} years`;
          } else {
            field.helperText = baseHelperText + (referenceDateText || "");
          }
        }
      });
    }
    
    this.setState({
      student,
      studentDetails: fieldDetail,
      calculatedAge: calculatedAge,
    });
  };

  updateParentInf = (students) => {
    let studentInf = students?.student_details ?? {};
    let { student } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.parent_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf[field["name"]]
          ? studentInf[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student[field["name"]] = value;
      }
    });
    this.setState({
      student,
      parentDetails: fieldDetail,
    });
  };

  updatePreviousSchoolInf = (students) => {
    let studentInf = students?.student_details?.previous_school_details ?? {};
    let { student, prevStandardList } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.pre_school_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf[field["name"]]
          ? studentInf[field["name"]]
          : field.default;
      }
      if (field.name === "left_standard") {
        field.list = prevStandardList;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["previous_school_details"][field["name"]] = value;
      }
    });
    this.setState({
      student,
      schoolDetails: fieldDetail,
    });
    if (form_details.address_details.hidden) {
      this.props.loadingFalse();
    }
  };

  updateExamDetails = (students) => {
    let studentInf = students?.student_details ?? {};
    let { student } = this.state;
    let { form_details } = this.props;
    let fieldDetail = _.cloneDeep(form_details.exam_details.list);
    let value;
    fieldDetail.forEach((field) => {
      if (field.isCustom) {
        value = students?.custom_form_data?.[field.name] ?? field.default;
      } else {
        value = studentInf[field["name"]]
          ? studentInf[field["name"]]
          : field.default;
      }
      field.default = value;
      if (field.isCustom) {
        student["custom_form_data"][field.name] = value ? value : "";
      } else {
        student["exam_details"][field["name"]] = value;
      }
    });
    this.setState({
      student,
      exam_details: fieldDetail,
    });
    if (form_details.exam_details.hidden) {
      this.props.loadingFalse();
    }
  };

  updateAddress = (addressInf) => {
    let { student, is_google_places } = this.state;
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
      student["address"] = address;
      this.setState(
        {
          student,
        },
        () => {
          this.props.loadingFalse();
        }
      );
    } else {
      let fieldDetail = _.cloneDeep(form_details.address_details.list);
      let value;
      fieldDetail.forEach((field) => {
        if (addressInf) {
          value = addressInf[field["name"]];
        } else {
          value = field.default;
        }
        field.default = value;
        student.address[field["name"]] = value;
      });
      this.setState({
        student,
        addressDetails: fieldDetail,
      });
    }
  };

  updateParentAddress = (address) => {
    let { student } = this.state;
    student["address"] = address;
    this.setState({
      student,
    });
  };

  updateList = (datalist) => {
    this.setState(
      {
        datalist: datalist,
      },
      () => {
        if (this.props.isEditForm && Object.keys(datalist).length === 4) {
          this.props.loadingFalse();
        } else if (Object.keys(datalist).length === 1) {
          this.props.loadingFalse();
        }
      }
    );
  };

  updateStudent = (name, value) => {
    let { student, studentDetails, standardList, isAutoSelectingStandard } = this.state;
    const { yearInformation } = this.props;
    const referenceDate = yearInformation?.start_date || null;
    
    if (name === "entry_academic_year") {
      SetAcademicYear(value);
    }
    
    // Update the field value first
    if (studentDetails) {
      studentDetails.some((field) => {
        if (field.name === name) {
          field.default = value;
          if (field.isCustom) {
            student["custom_form_data"][field.name] = value;
          } else {
            student[name] = value;
          }
        }
      });
    }
    
    // Handle DOB change - calculate age and auto-select standard
    // Skip if we're already auto-selecting to prevent infinite loops
    let calculatedAge = null;
    if (name === "dob" && value && !isAutoSelectingStandard) {
      // Calculate age from DOB
      let dateValue = value;
      if (typeof value === 'string') {
        if (value.includes('-')) {
          const parts = value.split('-');
          if (parts.length === 3) {
            // Check if it's DD-MM-YYYY format
            if (parts[0].length === 2 && parts[1].length === 2) {
              dateValue = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
              // Assume YYYY-MM-DD format
              dateValue = new Date(value);
            }
          } else {
            dateValue = new Date(value);
          }
        } else {
          dateValue = new Date(value);
        }
      } else if (value && typeof value.getMonth === 'function') {
        // It's already a Date object from Material-UI date picker
        dateValue = value;
      }
      
      if (dateValue && !isNaN(dateValue.getTime())) {
        calculatedAge = calculateAgeFromDOB(dateValue, referenceDate);
      }
      
      // Use setTimeout to ensure standardList is available and state is updated
      // Try multiple times with increasing delays to handle async loading
      let attempts = 0;
      const maxAttempts = 5;
      const tryAutoSelect = () => {
        attempts++;
        const { standardList: currentStandardList } = this.state;
        if (currentStandardList && currentStandardList.length > 0) {
          this.autoSelectStandardFromDOB(value);
        } else if (attempts < maxAttempts) {
          setTimeout(tryAutoSelect, 100 * attempts);
        } else {
          console.log("Standard list not loaded after", maxAttempts, "attempts");
        }
      };
      setTimeout(tryAutoSelect, 50);
    } else if (name === "dob" && !value) {
      // Clear age when DOB is cleared
      calculatedAge = null;
    }
    
    // Update helperText for DOB field to show age (append to existing helperText)
    if (name === "dob") {
      studentDetails.forEach((field) => {
        if (field.name === "dob") {
          const baseHelperText = "Standard will be auto-selected based on age";
          
          // Get reference date for display
          let referenceDateText = "";
          if (referenceDate) {
            if (typeof referenceDate === 'string') {
              const yearMatch = referenceDate.match(/^(\d{4})/);
              if (yearMatch) {
                const year = parseInt(yearMatch[1], 10);
                const referenceDateObj = new Date(year, 5, 1); // June 1st
                const monthNames = ["January", "February", "March", "April", "May", "June", 
                                   "July", "August", "September", "October", "November", "December"];
                referenceDateText = ` (as of ${monthNames[5]} 1, ${year})`;
              }
            }
          }
          
          if (calculatedAge) {
            field.helperText = `${baseHelperText}${referenceDateText} - Age: ${calculatedAge} years`;
          } else {
            field.helperText = baseHelperText + (referenceDateText || "");
          }
        }
      });
    }
    
    this.props.handlePrompt(true);
    this.setState({
      studentDetails,
      student,
      calculatedAge: calculatedAge !== null ? calculatedAge : this.state.calculatedAge,
    });
  };

  autoSelectStandardFromDOB = (dobValue) => {
    const { standardList, studentDetails, student } = this.state;
    const { yearInformation } = this.props;
    const referenceDate = yearInformation?.start_date || null;
    
    if (!dobValue) {
      return;
    }
    
    // If standardList is not loaded yet, return and wait
    if (!standardList || standardList.length === 0) {
      console.log("Standard list not loaded yet");
      return;
    }
    
    // Handle different date formats - Material-UI date picker passes Date object
    let dateValue = dobValue;
    if (typeof dobValue === 'string') {
      // If it's a string, try to parse it (handle DD-MM-YYYY format from display)
      if (dobValue.includes('-')) {
        const parts = dobValue.split('-');
        if (parts.length === 3) {
          // Check if it's DD-MM-YYYY format
          if (parts[0].length === 2 && parts[1].length === 2) {
            dateValue = new Date(parts[2], parts[1] - 1, parts[0]);
          } else {
            // Assume YYYY-MM-DD format
            dateValue = new Date(dobValue);
          }
        } else {
          dateValue = new Date(dobValue);
        }
      } else {
        dateValue = new Date(dobValue);
      }
    } else if (dobValue && typeof dobValue.getMonth === 'function') {
      // It's already a Date object from Material-UI date picker
      dateValue = dobValue;
    } else {
      console.log("Invalid date format:", dobValue);
      return;
    }
    
    // Validate the date
    if (isNaN(dateValue.getTime())) {
      console.log("Invalid date value");
      return;
    }
    
    const calculatedAge = calculateAgeFromDOB(dateValue, referenceDate);
    if (!calculatedAge) {
      console.log("Could not calculate age from DOB");
      return;
    }
    
    console.log("Calculated age:", calculatedAge);
    
    // Auto-select standard based on calculated age
    const suggestedStandard = getStandardFromAge(calculatedAge);
    if (!suggestedStandard) {
      console.log("No standard suggested for age:", calculatedAge);
      return;
    }
    
    console.log("Suggested standard:", suggestedStandard);
    
    const matchingStandard = findMatchingStandard(suggestedStandard, standardList);
    if (!matchingStandard) {
      console.log("No matching standard found for:", suggestedStandard, "Available standards:", standardList.map(s => s.name));
      return;
    }
    
    console.log("Matching standard found:", matchingStandard.name, "ID:", matchingStandard.id);
    
    // Update studentDetails first to ensure field.default is updated
    // Create a new array reference so React detects the change
    if (!studentDetails) {
      console.log("Student details not available");
      return;
    }
    
    const updatedStudentDetails = studentDetails.map((field) => {
      if (field.name === "current_standard") {
        return { ...field, default: matchingStandard.id };
      }
      return { ...field }; // Create new object reference for all fields
    });
    
    // Update student object
    const updatedStudent = {
      ...student,
      current_standard: matchingStandard.id
    };
    
    // Temporarily set flag to prevent DOB check when updating standard
    this.setState({ 
      isAutoSelectingStandard: true,
      studentDetails: updatedStudentDetails,
      student: updatedStudent
    }, () => {
      // Use updateStudent to trigger DynamicForm's updateParent callback
      // This ensures DynamicForm's internal state is also updated
      // Use setTimeout to ensure state is fully updated first
      setTimeout(() => {
        this.updateStudent("current_standard", matchingStandard.id);
        
        // Reset flag after update
        setTimeout(() => {
          this.setState({ isAutoSelectingStandard: false });
        }, 50);
      }, 50);
    });
  };

  updateParent = (name, value) => {
    let { student, parentDetails } = this.state;
    parentDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student[name] = value;
        }
      }
    });
    this.setState({
      parentDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updatePreviousSchool = (name, value) => {
    let { student, schoolDetails } = this.state;
    schoolDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["previous_school_details"][name] = value;
        }
      }
    });
    this.setState({
      schoolDetails,
      student,
    });
    this.props.handlePrompt(true);
  };

  updateExamInfo = (name, value) => {
    let { student, exam_details } = this.state;
    exam_details.some((field) => {
      if (field.name === name) {
        field.default = value;
        if (field.isCustom) {
          student["custom_form_data"][field.name] = value;
        } else {
          student["exam_details"][name] = value;
        }
      }
    });
    this.setState({
      exam_details,
      student,
    });
    this.props.handlePrompt(true);
  };

  validationFields = (fieldDetails, fieldErrors, student, mandatoryFields) => {
    let validate = true;
    let name, value, required;
    fieldDetails.forEach((field) => {
      value = field.default;
      name = field.name;
      required =
        mandatoryFields && mandatoryFields.includes(name)
          ? true
          : field.required;
      if (required && !Boolean(value)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        validate = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          validate = false;
        } else {
          value = returnValue.value;
        }
      } else if (field.type === "date") {
        let minDate = field.parentMinDate
          ? student[field.parentMinDate]
          : field.minDate;
        let maxDate = field.maxDate;
        let error = "";
        if (!field.disabled) {
          error = validateDate(value, minDate, maxDate);
        }
        if (value === "" && required) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          validate = false;
        } else {
          if (error !== "") {
            fieldErrors[name] = error;
            validate = false;
            if (value === "" && !required) {
              delete fieldErrors[name];
              validate = true;
            }
          }
        }
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldErrors[name] = field.regex.errorText;
        validate = false;
      }
    });
    this.setState({
      fieldErrors,
    });
    return validate;
  };

  submit = () => {
    let {
      student,
      studentDetails,
      parentDetails,
      addressDetails,
      fieldErrors,
      schoolDetails,
      is_google_places,
    } = this.state;
    const { form_details } = this.props;
    fieldErrors = {};
    this.refs.parent.updateErrors(fieldErrors);
    let studentTest = true;
    let parentTest = true;
    let addressTest = true;
    let schoolTest = true;

    let guardianRequired = false;
    let motherRequired = false;
    let fatherRequired = false;
    let parentManadatoryFields = [];
    student["isPreSchoolPresent"] = false;

    let showError = "";

    schoolDetails.map((data) => {
      if (Boolean(data.default)) {
        student["isPreSchoolPresent"] = true;
      }
    });
    // if (
    //   student["father_name"] !== "" ||
    //   student["f_mobile_num"] !== "" ||
    //   student["f_email"] !== ""
    // ) {
    //   fatherRequired = true;
    //   parentManadatoryFields.push("father_name");
    // }
    // if (
    //   student["mother_name"] !== "" ||
    //   student["m_mobile_num"] !== "" ||
    //   student["m_email"] !== ""
    // ) {
    //   motherRequired = true;
    //   parentManadatoryFields.push("mother_name");
    // }
    // if (
    //   student["guardian_name"] !== "" ||
    //   student["g_mobile_num"] !== "" ||
    //   student["g_email"] !== ""
    // ) {
    //   guardianRequired = true;
    //   parentManadatoryFields.push("guardian_name");
    // }
    // if (!fatherRequired && !motherRequired) {
    //   guardianRequired = true;
    //   parentManadatoryFields.push("guardian_name");
    // }
    studentTest = this.validationFields(studentDetails, fieldErrors, student);

    parentTest = this.validationFields(
      parentDetails,
      fieldErrors,
      student,
      parentManadatoryFields
    );

    if (is_google_places && !form_details.address_details.hidden) {
      if (!student["address"]["address_one_map"]) {
        fieldErrors["address_one_map"] = "This field is mandatory";
        addressTest = false;
      }
    } else if (!form_details.address_details.hidden) {
      addressTest = this.validationFields(
        addressDetails,
        fieldErrors,
        student["address"]
      );
    }
    if (!form_details.pre_school_details.hidden) {
      schoolDetails.forEach((field) => {
        let value = field.default;
        let name = field.name;
        if (field.required && !Boolean(value)) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          schoolTest = false;
        } else if (field.type === "date") {
          let minDate = field.parentMinDate
            ? student.previous_school_details[field.parentMinDate]
            : field.minDate;
          let maxDate = field.maxDate;
          let error = validateDate(value, minDate, maxDate);
          if (value === "" && field.required) {
            fieldErrors[name] = (
              <FormattedMessage {...commonMessages.fieldMandatoryError} />
            );
            schoolTest = false;
          } else {
            if (error !== "") {
              fieldErrors[name] = error;
              schoolTest = false;
              if (value === "" && !field.required) {
                delete fieldErrors[name];
                schoolTest = true;
              }
            }
          }
        } else if (
          field.regex &&
          !field.regex.value.test(value) &&
          value !== ""
        ) {
          fieldErrors[name] = field.regex.errorText;
          schoolTest = false;
        }
      });
      if (Object.keys(fieldErrors).length !== 0) {
        schoolTest = false;
      }
    }
    if (
      studentTest &&
      parentTest &&
      schoolTest &&
      addressTest &&
      Object.keys(fieldErrors).length === 0
    ) {
      this.props.submit(student);
    } else {
      this.setState({
        open: true,
        alertData: <FormattedMessage {...commonMessages.clearAllErrors} />,
      });
      this.refs.student.updateErrors(fieldErrors);
      this.refs.parent.updateErrors(fieldErrors);
      if (!form_details.address_details.hidden) {
        this.refs.AddressFields.updateErrors(fieldErrors);
      }
      if (
        student["isPreSchoolPresent"] &&
        !form_details.pre_school_details.hidden
      ) {
        this.refs.school.updateErrors(fieldErrors);
      }
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  onChangeStudent = (e) => {
    let { name, value } = e.target;
    let { student } = this.state;
    student[name] = value === "true";
    if (!student[name]) {
      student["previous_school_details"] = {};
      this.refs.school.setDefaultValues();
    }
    this.setState({
      student,
    });
  };

  render() {
    const {
      open,
      alertData,
      studentDetails,
      parentDetails,
      student,
      is_google_places,
      addressDetails,
      schoolDetails,
      exam_details,
      year_name,
      isCurrentAddressEdit,
    } = this.state;
    const { isEditForm, submitDisable, loading, form_details } = this.props;
    return (
      <Box>
        <Box className="md-down-justify-start md-up-justify-start mb-y-20">
          <Box className="year-std-box mr-40">
            <Box className="academic-std-head">
              <FormattedMessage {...commonMessages.academicYear} />
            </Box>
            <Box className=" exam-mark-add-heading-bg">{year_name}</Box>
          </Box>
        </Box>
        <Divider />
        {!form_details.student_details.hidden && (
          <>
            <Box className="form-left-heading m-t-20px m-b-20px">
              {form_details.student_details.label}
            </Box>
            {studentDetails && (
              <DynamicForm
                fieldDetails={studentDetails}
                updateParent={this.updateStudent}
                isEditForm={isEditForm}
                loading={loading}
                ref={"student"}
                idFormat={"enquiry_2022_08_11_01_23_pm_"}
              />
            )}
            <Box mt={3} mb={3}>
              <Divider />
            </Box>
          </>
        )}
        {!form_details.parent_details.hidden && (
          <>
            <Box className="form-left-heading m-t-20px m-b-20px">
              {form_details.parent_details.label}
            </Box>
            {parentDetails && (
              <DynamicForm
                fieldDetails={parentDetails}
                updateParent={this.updateParent}
                loading={loading}
                ref={"parent"}
                idFormat={"enquiry_2022_08_11_01_23_pm_"}
              />
            )}
            <Box mt={3} mb={3}>
              <Divider />
            </Box>
          </>
        )}
        {!form_details.address_details.hidden && (
          <>
            <Box className="form-left-heading m-t-20px m-b-20px">
              {form_details.address_details.label}
            </Box>
            {addressDetails && !is_google_places && (
              <AddressFields
                addressDetails={addressDetails}
                isEditForm={isCurrentAddressEdit}
                updateParentAddress={this.updateAddress}
                updateList={this.updateList}
                loadingCountry={loading}
                ref={"AddressFields"}
              />
            )}
            {!loading && is_google_places && (
              <AutoCompleteAddress
                addressDetails={student["address"]}
                updateParentAddress={this.updateParentAddress}
                isEditForm={isEditForm}
                ref={"AddressFields"}
                address_placeHolder={"Search place"}
              />
            )}
            <Box mt={3} mb={3}>
              <Divider />
            </Box>
          </>
        )}
        {!form_details.pre_school_details.hidden && (
          <>
            <Box className="form-left-heading m-t-20px m-b-20px">
              {form_details.pre_school_details.label}
            </Box>
            {schoolDetails && (
              <DynamicForm
                fieldDetails={schoolDetails}
                updateParent={this.updatePreviousSchool}
                loading={loading}
                ref={"school"}
                idFormat={"enquiry_2022_08_11_01_23_pm_"}
              />
            )}
            <Box mt={3} mb={3}>
              <Divider />
            </Box>
          </>
        )}

        {!form_details.exam_details.hidden && (
          <>
            <Box className="form-left-heading m-t-20px m-b-20px">
              {form_details.exam_details.label}
            </Box>
            {exam_details && (
              <DynamicForm
                fieldDetails={exam_details}
                updateParent={this.updateExamInfo}
                loading={loading}
                ref={"school"}
                idFormat={"enquiry_2022_08_11_01_23_pm_"}
              />
            )}
            <Box mt={3} mb={3}>
              <Divider />
            </Box>
          </>
        )}

        <Grid item md={12} xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.submit}
            >
              <FormattedMessage {...commonMessages.submit} />
            </Button>
          </Box>
        </Grid>
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
      </Box>
    );
  }
}

export default EnquiryStudentInformation;

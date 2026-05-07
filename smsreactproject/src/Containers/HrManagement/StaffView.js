import React, { Component } from "react";
import PersonIcon from "@material-ui/icons/Person";
import PagesIcon from "@material-ui/icons/Pages";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import { Box, Grid, Button } from "@material-ui/core";
import { withRouter } from "react-router-dom";

import ProfileFormInfo from "Components/Profile_View/ProfileFormInfo";
import HrProfileView from "Containers/HrManagement/components/HrProfileView";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { includeStaffSection } from "Constants";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  numberWithCommas,
  getSettingValue,
  getCommaSeperatedArrayOfObjects,
} from "Includes/functions";

import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
// const is_google_places = Boolean(parseInt(getSettingValue("google_places")));
const is_google_places = true;

class StaffView extends Component {
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
      },
      profile_info: [],
      tabs: [],
      profile_heading: {
        1: { value: "" },
        2: { value: "" },
        3: { value: "" },
        4: { value: "" },
        5: { value: "" },
      },
      profile_data: {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
      },
    };
  }

  onClicked = (key) => {
    this.setState({
      profile: key,
    });
  };

  componentDidMount() {
    let enabledAction = [];
    if (isUserHasPermission("staff_list", "update")) {
      enabledAction.push("edit");
    }
    this.setState({
      enabledAction: enabledAction,
    });
    this.setStaffView();
  }

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

  setStaffView = () => {
    if (this.props.location.state) {
      const id = this.props.location.state.detail;
      const g_url = GET_URL.staffalldetail.api;
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
          let staff = response.data.data;
          short_info[1].value = staff["profile_pic_details"]
            ? staff["profile_pic_details"]["file"]
            : "";
          short_info[2].value = staff["first_name"];
          short_info[3].value = staff["middle_name"];
          short_info[4].value = staff["last_name"];
          short_info[5].value =
            staff["users"] && staff["users"]["groups"][0]["name"];

          let staff_profile = { label: "Email", value: staff["email"] };
          profile_info.push(staff_profile);
          staff_profile = { label: "Mobile No", value: staff["mobile_num"] };
          profile_info.push(staff_profile);
          staff_profile = { label: "DOB", value: staff["dob"] };
          profile_info.push(staff_profile);

          let staff_tabs = {};

          let staff_basic = {
            sub_heading: "Personal Details",
            data: [
              { label: "First Name", value: staff["first_name"] },
              { label: "Middle Name", value: staff["middle_name"] },
              { label: "Last Name", value: staff["last_name"] },
              {
                label: "User Name",
                value: staff["users"]["username"],
                className: "text-transform-none",
              },
              {
                label: "Gender",
                value:
                  staff["gender"] === "M"
                    ? "Male"
                    : staff["gender"] === "F"
                    ? "Female"
                    : "Other",
              },
              {
                label: "Date Of Birth",
                value: dateFormat(staff["dob"], "DD-MM-YYYY"),
              },
              { label: "Mobile Number", value: staff["mobile_num"] },
              {
                label: "Alternative Number",
                value: staff["alternate_mobile_num"],
              },
              {
                label: "Email",
                value: staff["email"],
                className: "text-transform-none",
              },
              { label: "Aadhaar Number", value: staff["aadhar_num"] },
              {
                label: "Father/Husband Name",
                value: staff["father_or_husband_name"],
              },
              {
                label: "Experience in years",
                value: staff["experience_in_num"],
              },
              { label: "Qualification", value: staff["qualification"] },
              { label: "Marital Status", value: staff["marital_status"] },
              {
                label: "Job Type",
                value:
                  staff["employee_status"] === "F"
                    ? "Full Time"
                    : staff["employee_status"] === "P"
                    ? "Part Time"
                    : "Contract",
              },
              { label: "Salary", value: numberWithCommas(staff["salary"]) },
              (staff["employee_status"] === "P" ||
                staff["employee_status"] === "C") && {
                label: "Measure",
                value: staff["measure"],
              },
              { label: "Barcode Number",
                value: staff["barcode_number"]
              },
              staff["employee_status"] === "P" && {
                label: "Part Time Frequency",
                value:
                  staff["frequency"] === "M"
                    ? "Months"
                    : staff["frequency"] === "W"
                    ? "Weeks"
                    : staff["frequency"] === "D"
                    ? "Days"
                    : "Hours",
              },

              staff["employee_status"] === "C" && {
                label: "Contract Frequency",
                value: staff["frequency"] === "M" ? "Months" : "Days",
              },
              {
                label: `Expertise ${alias_names["standard"]}`,
                value: getCommaSeperatedArrayOfObjects(
                  staff["staff_standard_mapping_staff"]
                    ? staff["staff_standard_mapping_staff"]
                    : [],
                  "standard_name"
                ),
                md: 12,
              },
              {
                label: `Document List`,
                value: this.getValuesSubmitted(staff["document_list"]),
                list: true,
                md: 12
              },
            ],
          };
          profile_data[1].push(staff_basic);
          if (
            includeStaffSection["driver"].includes(
              staff.users["groups"][0]["id"]
            )
          ) {
            let preJob = staff.previous_job_details;
            staff_basic = {
              sub_heading: "Driver Details",
              data: [
                { label: "DL Number", value: staff["dl_number"] },
                {
                  label: "Previous Work Place",
                  value: preJob["prev_work_place_name"],
                },
              ],
            };
            profile_data[1].push(staff_basic);
          }
          staff_basic = {
            sub_heading: "Joining details",
            data: [
              { label: "Job Title", value: staff["job_title"] },
              {
                label: "Joining Date",
                value: dateFormat(staff["date_joined"], "DD-MM-YYYY"),
              },
              { label: "Designation", value: staff["designation"] },
              { label: "Employee ID", value: staff["employee_id"] },
            ],
          };
          profile_data[1].push(staff_basic);
          staff_basic = {
            sub_heading: "Job Leaving Details",
            data: [
              {
                label: "Last Working Day",
                value: dateFormat(staff["date_left"], "DD-MM-YYYY"),
              },
              { label: "Employee ID", value: staff["employee_id"] },
              {
                label: "Reason for Leaving",
                value: staff["reason_for_leaving"],
              },
            ],
          };

          profile_data[1].push(staff_basic);
          if (
            !includeStaffSection["driver"].includes(
              staff.users["groups"][0]["id"]
            )
          ) {
            let preJob = staff.previous_job_details;
            staff_basic = {
              sub_heading: "Previous Job Details",
              data: [
                {
                  label: "Institute Name",
                  value: preJob["prev_school_name"],
                  className: "text-transform-none",
                },
                {
                  label: "Date Joined",
                  value: dateFormat(preJob["prev_date_joined"], "DD-MM-YYYY"),
                },
                {
                  label: "Last Working Day",
                  value: dateFormat(preJob["prev_date_left"], "DD-MM-YYYY"),
                },
                { label: "Designation", value: preJob["prev_designation"] },
                {
                  label: "Reason For Leaving",
                  value: preJob["prev_reason_leaving"],
                },
              ],
            };
            profile_data[1].push(staff_basic);
          }

          let reportingDetails = staff.users;
          staff_basic = {
            sub_heading: "Role and Reporting Details",
            data: [
              {
                label: "Role",
                value: reportingDetails["groups"]
                  ? reportingDetails["groups"][0]["name"]
                  : "",
              },
              {
                label: "Reporting Role",
                value: reportingDetails?.["reporting_to"]?.["groups"]
                  ? reportingDetails["reporting_to"]["groups"][0]["name"]
                  : "",
              },
              {
                label: "Reporting to User",
                value: reportingDetails?.["reporting_to"]?.["staff"]
                  ? reportingDetails["reporting_to"]["staff"]["full_name"]
                  : "",
              },
            ],
          };
          profile_data[2].push(staff_basic);

          staff.nominee_detail = staff.nominee_detail
            ? staff.nominee_detail
            : [{}];
          staff.nominee_detail.map((data, index) => {
            if (
              staff.nominee_detail.length === 1 ||
              staff.nominee_detail.length === 0
            ) {
              staff_basic = {
                sub_heading: `Nominee`,
                data: [],
              };
            } else {
              staff_basic = {
                sub_heading: `Nominee ${index + 1}`,
                data: [],
              };
            }
            staff_basic.data.push(
              { label: "Name", value: data["name"] },
              { label: "DOB", value: dateFormat(data["dob"], "DD-MM-YYYY") },
              { label: "Relationship", value: data["relationship_name"] },
              { label: "Mobile Number", value: data["mobile_num"] },
              { label: "Email", value: data["email"] },
              { label: "Address", value: data["address"] }
            );
            profile_data[3].push(staff_basic);
          });

          let account = staff.accounts[0] ? staff.accounts[0] : {};
          staff_basic = {
            sub_heading: "Bank details",
            data: [
              { label: "Full Name", value: account["name"] },
              { label: "Bank Name", value: account["bank_name"] },
              { label: "Branch Name", value: account["branch_name"] },
              { label: "Account Number", value: account["account_num"] },
              { label: "IFSC Code", value: account["ifsc"] },
              { label: "Mobile", value: account["mobile_num"] },
              { label: "PAN Card", value: account["pan_num"] },
              { label: "PF Number", value: account["pf_num"] },
              { label: "ESI No", value: account["esi_num"] },
              { label: "UAN No", value: account["uan_num"] },
            ],
          };
          profile_data[4].push(staff_basic);

          if (is_google_places) {
            let currentAddress, permanentAddress;
            staff["current_address_checked"] = true;
            response.data.data.staff_address.map((field) => {
              if (field.type === "CP" || field.type === "C") {
                currentAddress = field["map_address_data"];
              } else {
                permanentAddress = field["map_address_data"];
                staff["current_address_checked"] = false;
              }
            });

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
            profile_data[5].push(staff_address);

            if (!staff["current_address_checked"]) {
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
              profile_data[5].push(staff_basic);
            }
          } else {
            let c_address = response.data.data.staff_address;
            let cp = [];
            c_address.map((data) => {
              if (data["type"] === "CP") {
                cp.push(
                  {
                    label: "Address Line",
                    value: data["address"],
                    className: "text-transform-none",
                  },
                  { label: "Country", value: data["country_name"] },
                  { label: "State", value: data["state_name"] },
                  { label: "District", value: data["district_name"] },
                  { label: "City", value: data["city_name"] },
                  { label: "Pincode", value: data["pincode"] }
                );
                staff_basic = {
                  sub_heading: "Current and Permanent Address",
                  data: cp,
                };
              } else {
                cp.push(
                  {
                    label: "Address Line",
                    value: data["address"],
                    className: "text-transform-none",
                  },
                  { label: "Country", value: data["country_name"] },
                  { label: "State", value: data["state_name"] },
                  { label: "District", value: data["district_name"] },
                  { label: "City", value: data["city_name"] },
                  { label: "Pincode", value: data["pincode"] }
                );
                staff_basic = {
                  sub_heading:
                    data["type"] === "C"
                      ? "Current Address"
                      : "Permanant Address",
                  data: cp,
                };
                cp = [];
              }
              profile_data[5].push(staff_basic);
            });
          }
          if (profile_data[1].length !== 0) {
            profile_heading[1].value = "Staff Details";
            staff_tabs = {
              icon: <PersonIcon />,
              value: "Staff Overview",
              key: 1,
            };
            tabs.push(staff_tabs);
          }
          if (profile_data[2].length !== 0) {
            profile_heading[2].value = "Reporting Details";
            staff_tabs = {
              icon: <PersonIcon />,
              value: "Reporting Overview",
              key: 2,
            };
            tabs.push(staff_tabs);
          }
          if (profile_data[3].length !== 0) {
            profile_heading[3].value = "Nominee Details";
            staff_tabs = {
              icon: <PersonIcon />,
              value: "Nominee Overview",
              key: 3,
            };
            tabs.push(staff_tabs);
          }
          if (profile_data[4].length !== 0) {
            profile_heading[4].value = "Bank Details";
            staff_tabs = {
              icon: <PagesIcon />,
              value: "Bank Overview",
              key: 4,
            };
            tabs.push(staff_tabs);
          }
          if (profile_data[5] && profile_data[4].length !== 0) {
            profile_heading[5].value = "Address";
            staff_tabs = {
              icon: <PagesIcon />,
              value: "Address Overview",
              key: 5,
            };
            tabs.push(staff_tabs);
          }
          this.setState({
            profile_heading,
            profile_data,
            profile_info,
            tabs,
            staff_id: response.data.data.id,
            loading: false,
          });
        }
      });
    }
  };

  render() {
    const { loading, enabledAction } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Box className="paper-background">
            <Box className="header-align end-flex-prop">
              {isUserHasPermission("staff_list", "view") && (
                <Button
                  variant="contained"
                  component={Link}
                  to={Actions.staff_list.view.url}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.staff_list.view.label}
                </Button>
              )}
            </Box>
            <Grid container>
              <Grid item lg={5} md={12} xs={12} className="header-align">
                <HrProfileView
                  short_info={this.state.short_info}
                  tabs={this.state.tabs}
                  change={this.onClicked}
                  enabledAction={enabledAction}
                  editURL={Actions.staff_list.update.url}
                  staffId={this.state.staff_id}
                />
              </Grid>
              <Grid item lg={7} md={12} xs={12} className="header-align">
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

export default withRouter(StaffView);

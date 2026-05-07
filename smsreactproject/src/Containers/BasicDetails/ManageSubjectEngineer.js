import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  Typography,
  Divider,
  TextField,
  MenuItem,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import loadingBar from "images/loading.gif";
import { GET_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import Swal from "sweetalert2";
import { Actions } from "Constants/permissions";
import {
  nameWithQuoteRegex,
  nameAndNumberAndHyphenRegex,
  numberRegex,
} from "Constants/regularExpression";
import { getSettingValue } from "Includes/functions";
import { getRequest, postRequest } from "Includes/api/apicall";
import { getUrlParam } from "Includes/functions";

const number_of_language = parseInt(
  getSettingValue("number_of_language") || 0,
  10
);

const SUBJECT_TYPE_DROPDOWN = [
  { id: "lab", name: "Lab", value: "lab" },
  { id: "elective", name: "Elective", value: "elective" },
];

class ManageSubjects extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fieldErrors: {},
      subjectSubjectCategoryList: [],
      branchList: [],
      subjects: {
        subject_data: {
          name: "",
          subject_code: "",
          subject_type: "",
        },
        subject_branch: null,
        subject_category: null,
        subject_teaching_hours: [
          { teaching_type_label: "Theory", value: "" },
          { teaching_type_label: "Tutorial", value: "" },
          { teaching_type_label: "Practical", value: "" },
        ],
        subject_type_details:{
          subject_type:''
        },
        exam_marks_details: [
          { exam_type_label: "exam_conduction_hour", value: "" },
          { exam_type_label: "cie_marks", value: "" },
          { exam_type_label: "see_marks", value: "" },
          { exam_type_label: "total_marks", value: "" },
        ],
        credit:'',
      },
      loading: false,
      submitDisable: false,
    };
  }

  handleChange = (section, field, value) => {
    const subjects = { ...this.state.subjects };
  
    if (section === "subject_data") {
      subjects.subject_data = {
        ...subjects.subject_data,
        [field]: value,
      };
    } 
    else if (field === "credit") {
      subjects.credit = value === "" ? "" : value;
    } else if (field === "subject_type") {
      subjects.subject_type = value; }
    else if (section === "exam_marks_details") {
      const details = subjects.exam_marks_details.map((d) =>
        d.exam_type_label === field ? { ...d, value } : d
      );
      if (field === "cie_marks" || field === "see_marks") {
        const cie = parseFloat(
          details.find((d) => d.exam_type_label === "cie_marks")?.value || 0
        );
        const see = parseFloat(
          details.find((d) => d.exam_type_label === "see_marks")?.value || 0
        );
        subjects.exam_marks_details = details.map((d) =>
          d.exam_type_label === "total_marks" ? { ...d, value: cie + see } : d
        );
        
      } 
      else if (section === "subject_type_details") {
        console.log(field,'field')
        console.log(value,'valuee')
        subjects.subject_type_details = {
          ...subjects.subject_type_details,
          [field]: value,
      }}
      else {
        subjects.exam_marks_details = details;
      }
    } else if (section === "subject_teaching_hours") {
      subjects.subject_teaching_hours = subjects.subject_teaching_hours.map((t) =>
        t.teaching_type_label === field ? { ...t, value } : t
      );
    } else {
      subjects[field] = value;
    }
  
    this.setState({ subjects });
  };
  
  componentDidMount = () => {
    let { subject_id } = getUrlParam();
    this.getSubjectCategoryList();
    this.getBranchList();

    if (subject_id) {
      if (this.props.location.pathname === Actions.subjects.update.url) {
        if (this.props.location.state && this.props.location.state.detail) {
          this.getSubjectDetails(this.props.location.state.detail);
        } else {
          this.props.history.push(Actions.subjects.view.url);
        }
      }
    }
  };

  getSubjectDetails = (id) => {
  const url = GET_URL.subjectdetails.api;
  getRequest(url, { subject_id: id }, this.props).then((response) => {
    if (response && response.status === 200) {
      const data = response.data.data[0];
      let subjectType = "";
      if (Array.isArray(data.subject_type_details)) {
        if (data.subject_type_details.some((t) => t.subject_type_label === "is_lab" && t.value)) {
          subjectType = "lab";
        } else if (data.subject_type_details.some((t) => t.subject_type_label === "is_elective" && t.value)) {
          subjectType = "elective";
        }
      }
      data.subject_type = subjectType;
      delete data.subject_type_details;  
      this.setState({
        subjects: data,
        isEdit:true,
      });
    }
  });
};

  getSubjectCategoryList = async () => {
    const url = GET_URL.subjectcategory.api;
    const param = { is_active: true };
    const resp = await getRequest(url, param, this.props);
    if (resp?.status === 200) {
      const subjectSubjectCategoryList = resp.data?.data.map((d) => ({
        id: d.id,
        name: d.name,
      }));
      this.setState({ subjectSubjectCategoryList });
    }
  };

  getBranchList = async () => {
    const url = GET_URL.branch.api;
    const param = { is_active: true };
    const resp = await getRequest(url, param, this.props);
    if (resp?.status === 200) {
      const branchList = resp.data?.data.map((d) => ({
        id: d.id,
        name: d.name,
      }));
      this.setState({ branchList });
    }
  };

  validate = () => {
    const { subjects } = this.state;
    let fieldErrors = {};
    let isValid = true;

    const stringRegex = /^[A-Za-z\s]+$/;
    const stringAndNumberRegex = /^[A-Za-z0-9\s-]+$/;
    const intRegex = /^[0-9]+$/;
    const floatRegex = /^[0-9]+(\.[0-9]+)?$/; 
    if (!subjects.subject_data?.name || subjects.subject_data.name.trim() === "") {
      fieldErrors[`name`] = "Name is required";
      isValid = false;
    } else if (!stringRegex.test(subjects.subject_data.name)) {
      fieldErrors[`name`] = "Name must be alphabets only";
      isValid = false;
    }
    if (!subjects.subject_data?.subject_code || subjects.subject_data.subject_code.trim() === "") {
      fieldErrors[`subject_code`] = "Code is required";
      isValid = false;
    } else if (!stringAndNumberRegex.test(subjects.subject_data.subject_code)) {
      fieldErrors[`subject_code`] = "Code must be letters/numbers only";
      isValid = false;
    }
    if (!subjects.subject_branch) {
      fieldErrors[`subject_branch`] = "Department is required";
      isValid = false;
    } 
    if (!subjects.subject_category) {
      fieldErrors[`subject_category`] = "Category is required";
      isValid = false;
    }
    const creditVal = subjects.credit;
    if (creditVal && creditVal.toString().trim() !== "") {
      if (!floatRegex.test(creditVal.toString())) {
        fieldErrors[`credit`] = "Credit must be a number (can be decimal)";
        isValid = false;
      }
    }
    ["Theory", "Tutorial", "Practical"].forEach((label) => {
      const val = subjects.subject_teaching_hours.find(
        (d) => d.teaching_type_label === label
      )?.value;
      if (val && val.toString().trim() !== "") {
        if (!intRegex.test(val.toString())) {
          fieldErrors[label] = `${label} hours must be an integer`;
          isValid = false;
        }
      }
    });

    ["exam_conduction_hour", "cie_marks", "see_marks"].forEach((label) => {
      const val = subjects.exam_marks_details.find(
        (d) => d.exam_type_label === label
      )?.value;
      if (val && val.toString().trim() !== "") {
        if (!intRegex.test(val.toString())) {
          fieldErrors[label] = `${label} must be an integer`;
          isValid = false;
        }
      }
    });

    this.setState({ fieldErrors });
    if (isValid) {
      this.postMethod();
    }
  };

  postMethod = () => {
    const { subjects } = this.state;
    const s = subjects;
    const post_data = {};
    if (s.subject_data?.id) {
      post_data.subject_id = s.subject_data.id;
    }
    if (s.subject_data?.name) {
      post_data.name = s.subject_data.name;
    }
    if (s.subject_data?.subject_code) {
      post_data.subject_code = s.subject_data.subject_code;
    }
    if (s.credit) {
      post_data.credit = parseFloat(s.credit); // ensure float
    }
    post_data.subject_part_type = 1;
    if (s.subject_branch) {
      post_data.branches = s.subject_branch.branch; // branch id
    }
    if (s.subject_category) {
      post_data.subject_category = s.subject_category;
    }
    const subject_teaching_details = {};
    if (Array.isArray(s.subject_teaching_hours)) {
      s.subject_teaching_hours.forEach((t) => {
        if (t.teaching_type_label === "Theory") {
          subject_teaching_details.theory_hour = t.value;
        }
        if (t.teaching_type_label === "Tutorial") {
          subject_teaching_details.tutorial_hour = t.value;
        }
        if (t.teaching_type_label === "Practical") {
          subject_teaching_details.practical_hour = t.value;
        }
      });
    }
    if (Object.keys(subject_teaching_details).length > 0) {
      post_data.subject_teaching_details = subject_teaching_details;
    }
    const exam_marks_details = {};
    if (Array.isArray(s.exam_marks_details)) {
      s.exam_marks_details.forEach((e) => {
        if (e.exam_type_label === "exam_conduction_hour") {
          exam_marks_details.exam_conduction_hour = e.value;
        }
        if (e.exam_type_label === "cie_marks") {
          exam_marks_details.cie_marks = e.value;
        }
        if (e.exam_type_label === "see_marks") {
          exam_marks_details.see_marks = e.value;
        }
        if (e.exam_type_label === "total_marks") {
          exam_marks_details.total_marks = e.value;
        }
      });
    }
    if (Object.keys(exam_marks_details).length > 0) {
      post_data.exam_marks_details = exam_marks_details;
    }
  
    // subject type flags (under subject_type_details object)
    const subject_type_details = {};
    if (s.subject_type === "lab") {
      subject_type_details.is_lab = true;
    }
    if (s.subject_type === "elective") {
      subject_type_details.is_elective = true;
    }
    if (Object.keys(subject_type_details).length > 0) {
      post_data.subject_type_details = subject_type_details;
    }
    const url = POST_URL.subjectdetails.api;
    postRequest(url, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: "Your Data has been saved",
          showConfirmButton: false,
          timer: 1500,
        });
        this.props.history.push(Actions.subjects.view.url);
      }
      this.setState({ submitDisable: false });
    });
  };
  

  render() {
    const {
      subjects,
      loading,
      submitDisable,
      subjectSubjectCategoryList,
      branchList,
      fieldErrors,
    } = this.state;

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    return (
      <Box>
        <Paper className={classNames("paper-background")} style={{ padding: 20 }}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                <FormattedMessage {...commonMessages.subjects} />
              </Box>
            </Grid>
          </Grid>
          <Box mb={4}>
            <Divider style={{ marginBottom: 12 }} />
            <Grid container spacing={2}>
              <Grid item md={6} xs={12}>
                <TextField
                  variant="outlined"
                  label="Name"
                  value={subjects.subject_data?.name || ""}
                  onChange={(e) =>
                    this.handleChange("subject_data", "name", e.target.value)
                  }
                  fullWidth
                  error={!!fieldErrors[`name`]}
                  helperText={fieldErrors[`name`]}
                  InputProps={{
                    readOnly: this.state.isEdit,   // 🔒 block in edit mode
                  }}
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  variant="outlined"
                  label="Code"
                  value={subjects.subject_data?.subject_code || ""}
                  onChange={(e) =>
                    this.handleChange("subject_data", "subject_code", e.target.value)
                  }
                  fullWidth
                  error={!!fieldErrors[`subject_code`]}
                  helperText={fieldErrors[`subject_code`]}
                  InputProps={{
                    readOnly: this.state.isEdit,   // 🔒 block in edit mode
                  }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" style={{ marginTop: 20, color: "blue" }}>
              Subject Details
            </Typography>
            <Divider style={{ marginBottom: 12 }} />
            <Grid container spacing={2}>
              <Grid item md={6} xs={12}>
                <Dropdown
                  data={subjectSubjectCategoryList}
                  name="subject_category"
                  value={subjects.subject_category || ""}
                  onChange={(e) =>
                    this.handleChange(null, "subject_category", e.target.value)
                  }
                  label="Subject Category"
                  error={!!fieldErrors[`subject_category`]}
                  helperText={fieldErrors[`subject_category`]}
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <Dropdown
                  data={branchList}
                  name="subject_branch"
                  value={subjects.subject_branch?.branch || ""}
                  onChange={(e) =>
                    this.handleChange(null, "subject_branch", {
                      ...subjects.subject_branch,
                      branch: e.target.value,
                    })
                  }
                  label="Subject Department"
                  error={!!fieldErrors[`subject_branch`]}
                  helperText={fieldErrors[`subject_branch`]}
                />
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField
                  variant="outlined"
                  label="Credit"
                  value={subjects.credit || ""}
                  onChange={(e) =>
                    this.handleChange(null, "credit", e.target.value)
                  }
                  fullWidth
                  error={!!fieldErrors[`credit`]}
                  helperText={fieldErrors[`credit`]}
                />
              </Grid>
              <Grid item md={6} xs={12}>
              <TextField
                  select
                  variant="outlined"
                  label="Subject Type"
                  value={subjects.subject_type || ""}
                  onChange={(e) => this.handleChange(null, "subject_type", e.target.value)}
                  fullWidth
                >
                  {SUBJECT_TYPE_DROPDOWN.map((opt) => (
                    <MenuItem key={opt.id} value={opt.value}>
                      {opt.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="h6" style={{ marginTop: 20, color: "blue" }}>
              Teaching Hours
            </Typography>
            <Divider style={{ marginBottom: 12 }} />
            <Grid container spacing={2}>
              {["Theory", "Tutorial", "Practical"].map((label) => (
                <Grid item md={4} xs={12} key={label}>
                  <TextField
                    variant="outlined"
                    label={`${label} Hours`}
                    value={
                      subjects.subject_teaching_hours.find(
                        (d) => d.teaching_type_label === label
                      )?.value || ""
                    }
                    onChange={(e) =>
                      this.handleChange(
                        "subject_teaching_hours",
                        label,
                        e.target.value
                      )
                    }
                    fullWidth
                  />
                </Grid>
              ))}
            </Grid>

            <Typography variant="h6" style={{ marginTop: 20, color: "blue" }}>
              Exam Details
            </Typography>
            <Divider style={{ marginBottom: 12 }} />
            <Grid container spacing={2}>
              {[
                { key: "exam_conduction_hour", label: "Exam Conduction Hours" },
                { key: "cie_marks", label: "CIE Marks" },
                { key: "see_marks", label: "SEE Marks" },
                { key: "total_marks", label: "Total Marks", readOnly: true },
              ].map((item) => (
                <Grid item md={3} xs={12} key={item.key}>
                  <TextField
                    variant="outlined"
                    label={item.label}
                    value={
                      subjects.exam_marks_details.find(
                        (d) => d.exam_type_label === item.key
                      )?.value || ""
                    }
                    onChange={(e) =>
                      this.handleChange(
                        "exam_marks_details",
                        item.key,
                        e.target.value
                      )
                    }
                    fullWidth
                    InputProps={{
                      readOnly: item.readOnly || false,
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          <Box className="submt-button-float-bottom" mt={3}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.validate}
            >
              <FormattedMessage {...commonMessages.submit} />
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}

export default withRouter(ManageSubjects);

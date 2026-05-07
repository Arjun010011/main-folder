import React, { Component } from "react";
import Swal from "sweetalert2";
import { withRouter, Link } from "react-router-dom";

import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { isObjectEmpty } from "Includes/functions";
import "./styles.scss";
import { Actions } from "Constants/permissions";
import { INVOICE_MAPPING } from "Constants/invoiceMappingList";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { Grid, Box, Button } from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

const header = "Add Invoice Mapping";

class AddInvoiceMapping extends Component {
  constructor(props) {
    super(props);

    this.state = {
      submitDisable: false,
      selectedTemplateType: {},
      selectedModule: {},
      selectedname: {},
      invoicetypeList: [],
      moduleList: [],
      invoiceTemplateList: [],
      restructuredData: {},
      snackbar: false,
      alertData: "",
      templateList: [],
      fieldError: {},
      standardList: [],
      academicYearList: [],
      selectedYear: {},
      selectedStandards: [],
      selectedFeeTypes: [],
      selectedExamTypes: [],
      financeTypeList: [],
      examTypeList: [],
    };
    this.viewUrl = Actions.invoice_mapping.view.url;
  }

  postMethod = () => {
    this.setState({ submitDisable: true });
    let postData = this.preparePostData();
    if (!!postData["Result"]) {
      let url = POST_URL.templatemapping.api;
      postRequest(url, postData["Postdata"], this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: "Your Data has been saved",
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.invoice_mapping.view.url);
        }
        this.setState({ submitDisable: false });
      });
    } else {
      this.setState({
        submitDisable: false,
        snackbar: true,
        alertData: postData["Reason"],
      });
    }
  };

  preparePostData = () => {
    let response = { Result: true, Postdata: { templates: [] }, Reason: "" };
    let {
      selectedname,
      selectedTemplateType,
      selectedModule,
      selectedYear,
      selectedStandards,
      selectedFeeTypes,
      selectedExamTypes,
    } = this.state;
    if (isObjectEmpty(selectedTemplateType)) {
      response["Result"] = false;
      response["Reason"] = "Please select Template Type";
    } else if (isObjectEmpty(selectedModule)) {
      response["Result"] = false;
    } else if (isObjectEmpty(selectedname)) {
      response["Result"] = false;
    } else {
      let temp = {
        name: selectedname["id"],
        template_type: selectedTemplateType["id"],
        module: selectedModule["id"],
      };
      if (selectedYear.id) {
        response["Postdata"]["academic_year"] = selectedYear.id;
      }
      if (selectedStandards.length > 0) {
        response["Postdata"]["standard_ids"] = this.getStandardIds();
      }
      if (selectedFeeTypes.length > 0) {
        response["Postdata"]["feetype_ids"] = this.getFeeIds();
      }
      if (selectedExamTypes.length > 0) {
        response["Postdata"]["examtype_ids"] = this.getExamTypeIds();
      }
      response["Postdata"]["templates"].push(temp);
    }
    return response;
  };

  getStandardIds = () => {
    let return_ids = [];
    this.state.selectedStandards.map((std) => {
      return_ids.push(std.id);
    });
    return return_ids.join(",");
  };

  getFeeIds = () => {
    let return_ids = [];
    this.state.selectedFeeTypes.map((std) => {
      return_ids.push(std.id);
    });
    return return_ids.join(",");
  };

  getExamTypeIds = () => {
    let return_ids = [];
    this.state.selectedExamTypes.map((std) => {
      return_ids.push(std.id);
    });
    return return_ids.join(",");
  };

  componentDidMount() {
    this.getYearList();
    this.getFinanceTypeList();
    this.restructureData();
    this.getExamTypeList();
  }

  getExamTypeList = () => {
    const url = GET_URL.examtypes.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          examTypeList: response.data.data,
        });
      }
    });
  };

  getFinanceTypeList = () => {
    const url = GET_URL.addFeeType.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          financeTypeList: response.data.data,
        });
      }
    });
  };

  getYearList = () => {
    getRequest(GET_URL.getacademicyear.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          academicYearList: response.data.data,
        });
      }
    });
  };

  handleDropDownSearchChange = (e, newValue, name, callBackFunction) => {
    this.setState({ [name]: newValue }, () => {
      if (callBackFunction) {
        callBackFunction();
      }
    });
  };

  restructureData = () => {
    getRequest(GET_URL.templatemappingfilterdatas.api, {}, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let result_data = response.data.data;
          let tempData = {};
          let templateTypeList = [];
          Object.keys(result_data).map((rest) => {
            for (const index in result_data[rest]) {
              const data = result_data[rest][index];
              if (
                templateTypeList.indexOf(data["template_type"]) === -1 &&
                data["template_type"]
              ) {
                templateTypeList.push(data["template_type"]);
              }
              if (!(data["template_type"] in tempData)) {
                tempData[data["template_type"]] = {};
              }
              if (!(data["module"] in tempData[data["template_type"]])) {
                tempData[data["template_type"]][data["module"]] = {};
              }
              if (
                !(
                  data["name"] in
                  tempData[data["template_type"]][data["module"]]
                )
              ) {
                tempData[data["template_type"]][data["module"]][data["name"]] =
                  {};
              }
            }
          });
          let typeList = templateTypeList.map((data) => {
            return { id: data, name: data };
          });
          this.setState(
            {
              invoicetypeList: typeList,
              restructuredData: tempData,
            },
            this.getModuleList()
          );
        }
      }
    );
  };

  getModuleList = () => {
    let { selectedTemplateType, restructuredData } = this.state;
    let moduleList = [];
    if (
      selectedTemplateType &&
      selectedTemplateType["id"] in restructuredData
    ) {
      for (const selectedModule in restructuredData[
        selectedTemplateType["id"]
      ]) {
        moduleList.push({ id: selectedModule, name: selectedModule });
      }
    }
    this.setState(
      {
        moduleList: moduleList,
        selectedModule: {},
      },
      this.getTemplateList()
    );
  };

  getTemplateList = () => {
    let { selectedTemplateType, selectedModule, restructuredData } = this.state;
    let templateTypeList = [];
    if (
      selectedTemplateType &&
      selectedTemplateType["id"] in restructuredData &&
      selectedModule &&
      selectedModule["id"] in restructuredData[selectedTemplateType["id"]]
    ) {
      for (const selectedType in restructuredData[selectedTemplateType["id"]][
        selectedModule["id"]
      ]) {
        templateTypeList.push({ id: selectedType, name: selectedType });
      }
    }
    this.setState({
      invoiceTemplateList: templateTypeList,
      selectedname: {},
    });
  };

  handleClose() {
    this.setState({
      snackbar: false,
    });
  }

  handleChangeYear = (e, newValue) => {
    this.setState(
      {
        selectedYear: newValue,
      },
      () => {
        this.getStandardList();
      }
    );
  };

  getStandardList = () => {
    let { selectedYear } = this.state;
    if (selectedYear.id) {
      const url = GET_URL.getstandard.api;
      const params = { is_active: true, academic_year: selectedYear.id };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          this.setState({
            standardList: response.data.data,
          });
        }
      });
    }
  };

  handleChangeStandard = (value) => {
    this.setState({
      selectedStandards: value,
    });
  };

  handleChangeFeeType = (value) => {
    this.setState({
      selectedFeeTypes: value,
    });
  };

  handleChangeExamType = (value) => {
    this.setState({
      selectedExamTypes: value,
    });
  };

  render() {
    const {
      submitDisable,
      snackbar,
      alertData,
      invoicetypeList,
      moduleList,
      invoiceTemplateList,
      selectedTemplateType,
      selectedModule,
      selectedname,
      fieldError,
      standardList,
      academicYearList,
      selectedStandards,
      selectedYear,
      selectedFeeTypes,
      financeTypeList,
      selectedExamTypes,
      examTypeList,
    } = this.state;
    return (
      <Box className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">Reciept Mapping</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className="header-align end-flex-prop">
              <Button
                variant="contained"
                component={Link}
                to={Actions.invoice_mapping.view.url}
                className="editbutton-view"
              >
                <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                {Actions.invoice_mapping.view.label}
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Box mt={4} className="width-300px">
          <DropDownWithSearch
            id="combo-box-demo"
            options={academicYearList}
            value={selectedYear}
            onChange={this.handleChangeYear}
            name="selectedTemplateType"
            getOptionLabel={(option) => (option ? option.name : "")}
            label="Academic Year"
            optionValue="name"
            className="width-300px"
            hideClearIcon={true}
          />
        </Box>
        <Box mt={4} className="width-300px">
          <MultipleSelectDropdown
            data_list={standardList}
            selected_list={selectedStandards}
            error={fieldError[`standards`] && fieldError[`standards`]}
            label={"Standard"}
            onChange={this.handleChangeStandard}
            // className="width-form-90"
          />
        </Box>
        <Box mt={4} className="width-300px">
          <MultipleSelectDropdown
            data_list={financeTypeList}
            selected_list={selectedFeeTypes}
            error={fieldError[`feetype`] && fieldError[`feetype`]}
            label={"Fee Type"}
            onChange={this.handleChangeFeeType}
            // className="width-form-90"
          />
        </Box>
        <Box mt={4} className="width-300px">
          <MultipleSelectDropdown
            data_list={examTypeList}
            selected_list={selectedExamTypes}
            error={fieldError[`examType`] && fieldError[`examType`]}
            label={"Exam Type"}
            onChange={this.handleChangeExamType}
            // className="width-form-90"
          />
        </Box>
        <Box mt={4} className="width-300px">
          <DropDownWithSearch
            id="combo-box-demo"
            options={invoicetypeList}
            value={selectedTemplateType}
            onChange={(e, newValue) =>
              this.handleDropDownSearchChange(
                e,
                newValue,
                "selectedTemplateType",
                this.getModuleList
              )
            }
            name="selectedTemplateType"
            getOptionLabel={(option) => (option ? option.name : "")}
            label="Template Type"
            optionValue="name"
            required={true}
            // className="width-form-90"
            className="width-300px"
            hideClearIcon={true}
          />
        </Box>
        <Box mt={4} className="width-300px">
          <DropDownWithSearch
            id="combo-box-demo"
            options={moduleList}
            value={selectedModule}
            onChange={(e, newValue) =>
              this.handleDropDownSearchChange(
                e,
                newValue,
                "selectedModule",
                this.getTemplateList
              )
            }
            name="selectedModule"
            getOptionLabel={(option) => (option ? option.name : "")}
            optionValue="name"
            label="Module"
            required={true}
            // className="width-form-90"
            className="width-300px"
            helperText={
              isObjectEmpty(selectedTemplateType)
                ? "Please select Template type"
                : ""
            }
            hideClearIcon={true}
          />
        </Box>
        <Box mt={4} className="width-300px">
          <DropDownWithSearch
            id="combo-box-demo"
            options={invoiceTemplateList}
            value={selectedname}
            onChange={(e, newValue) =>
              this.handleDropDownSearchChange(e, newValue, "selectedname")
            }
            name="selectedname"
            getOptionLabel={(option) => (option ? option.name : "")}
            optionValue="name"
            label="Template Name"
            required={true}
            // className="width-form-90"
            className="width-300px"
            helperText={
              isObjectEmpty(selectedModule) ? "Please select Module" : ""
            }
            hideClearIcon={true}
          />
        </Box>
        <Grid container style={{ textAlign: "end", paddingBottom: "10px" }}>
          <Grid item xs={12} sm={5} md={12}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.postMethod}
            >
              submit
            </Button>
          </Grid>
        </Grid>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={2000}
          onClose={this.handleClose}
        >
          <Alert severity="error">{alertData}</Alert>
        </Snackbar>
      </Box>
    );
  }
}

export default withRouter(AddInvoiceMapping);

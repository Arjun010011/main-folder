import React from "react";
import LoadingGif from "Components/LoadingGif";
import { withRouter } from "react-router-dom";
import "./styles.scss";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { getUrlParam } from "Includes/functions";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import InvoiceSelection from "Containers/Invoices/FinancePaymentInvoiceSelection";
import StudentUpdateFields from "./components/StudentUpdateFields";
import ReactToPrint from "react-to-print";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Actions } from "Constants/permissions";
import { Dropdown } from "Components/DropDown";

class StudyCertificateNew extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      loadingComponent: "",
      isOpenDialog: false,
      certificate_data: {},
      dynamicValuesData: [],
      certificateTypeList: [],
      certificate_no: "",
      is_multiple_study_certificate: false,
    };
  }

  componentDidMount() {
    let { is_multiple_study_certificate } = this.state;
    let certificate_config = JSON.parse(
      localStorage.getItem("certificate_configuration")
    )
      ? JSON.parse(localStorage.getItem("certificate_configuration"))
      : {};
    if (
      certificate_config?.is_multiple_study_certificate &&
      Number(certificate_config.is_multiple_study_certificate) &&
      Number(certificate_config.is_multiple_study_certificate > 1)
    ) {
      is_multiple_study_certificate = true;
    }
    if (is_multiple_study_certificate) {
      this.setState({
        is_multiple_study_certificate
      },()=>{
        this.getCertificateTypes();
      })
    } else {
      this.getAllInitialApis();
    }
  }

  getAllInitialApis = () => {
    this.getstudycertificate();
    this.getDynamicValues();
  };

  getCertificateTypes = () => {
    let { is_multiple_study_certificate } = this.state;
    const url = GET_URL.multiplestudycertificate.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            certificateTypeList: response.data.data.study_certificate_list,
            certificate_no:
              response.data.data?.study_certificate_list?.[0]?.["value"],
          },
          () => {
            if (is_multiple_study_certificate) {
              this.getAllInitialApis();
            }
          }
        );
      }
    });
  };

  getstudycertificate = () => {
    const { certificateTypeList, certificate_no } = this.state;
    let id = this.props.student || parseInt(getUrlParam().id); 
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "studycertificate",
      student: parseInt(id),
    };
    if (certificateTypeList.length > 1) {
      params["certificate_no"] = certificate_no;
    }
    let prop = { ...this.props };
    prop.responseType = "blob";
    postRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        this.setState({
          loading: false,
          fileURL,
        });
      }
    });
  };

  getDynamicValues = () => {
    const { certificateTypeList,certificate_no } = this.state
    let id = this.props.student || parseInt(getUrlParam().id); 
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "studycertificate",
      student: parseInt(id),
      get_dynamic_values: 1,
    };
    if (certificateTypeList.length > 1) {
      params["certificate_no"] = certificate_no;
    }
    postRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          loading: false,
          dynamicValuesData: response.data,
        });
      }
    });
  };

  handleDownloadPrint = () => {
    const { fileURL } = this.state;
    // let win = window.open(fileURL);
    // win.print();
    const height = (window.screen.height * 75) / 100;
    const width = (window.screen.width * 75) / 100;
    const mywindow = window.open(
      fileURL,
      "PRINT",
      "height=" + height + ",width=" + width + ""
    );
    mywindow.print();
  };

  handleClickFields = () => {
    this.setState({
      isOpenDialog: !this.state.isOpenDialog,
    });
  };

  saveUpdatedData = (updatedData) => {
    this.setState({ loading: true });
    const { certificateTypeList,certificate_no } = this.state
    let id = this.props.student || parseInt(getUrlParam().id); 
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "studycertificate",
      student: parseInt(id),
      dynamic_list: updatedData,
      get_dynamic_values: 0,
    };
    if (certificateTypeList.length > 1) {
      params["certificate_no"] = certificate_no;
    }
    let prop = { ...this.props };
    prop.responseType = "blob";
    postRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        this.setState({
          loading: false,
          fileURL,
        });
      }
    });
  };

  viewPage = () => {
    let { standard, section } = getUrlParam();
    let searchState = { standard: standard, section: section };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.study_certificate_list.view.url,
      search: searchParam,
    });
  };

  onChangeCertificate = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
        loading: true,
        fileURL: null,
      },
      () => {
        this.getAllInitialApis();
      }
    );
  };

  render() {
    let {
      isOpenDialog,
      loading,
      fileURL,
      certificate_data,
      dynamicValuesData,
      certificate_no,
      certificateTypeList,
    } = this.state;
    if (loading) {
      return (
        <Paper className="paper-background">
          <LoadingGif />
        </Paper>
      );
    } else {
      return (
        <div>
          <Grid container>
            <Grid container>
              <Grid item md={6} xs={12} className="header-align">
                <Box className="heading">Study Certificate</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                {!this.props.hideViewButton && (
                  <Box className="header-align end-flex-prop">
                    <Button
                      variant="contained"
                      onClick={() => this.viewPage()}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />
                      Study Certificate
                    </Button>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Grid>
          {certificateTypeList.length > 0 && (
            <div className="text-align-center">
              <Dropdown
                data={certificateTypeList}
                name="certificate_no"
                value={certificate_no}
                hideSelect={true}
                onChange={(e) => this.onChangeCertificate(e)}
                label="Certificate Type"
                size={"small"}
                customId="value"
                customName="lable"
              />
            </div>
          )}
          <div className="d-flex ">
            {fileURL && (
              <div>
                <Button
                  className="custom-button-approval align-self-center"
                  onClick={this.handleClickFields}
                >
                  Edit Student Details
                </Button>
              </div>
            )}
          </div>
          {fileURL && (
            <iframe
              style={{ width: "70%", height: "80vh" }}
              className="margin-auto"
              src={`${fileURL}#toolbar=0`}
              ref={(el) => (this.componentRef = el)}
            ></iframe>
          )}
          {isOpenDialog && (
            <StudentUpdateFields
              closeInParent={this.handleClickFields}
              certificate_data={certificate_data}
              saveUpdatedData={this.saveUpdatedData}
              dynamicValuesData={dynamicValuesData}
            />
          )}
          {fileURL && (
            <Box className="submt-button-float-bottom" mt={3}>
              <Button
                variant="contained"
                // className="submit"
                className="submit print"
                onClick={this.handleDownloadPrint}
              >
                <GetAppRoundedIcon />
                Print
              </Button>
            </Box>
          )}
        </div>
      );
    }
  }
}

export default withRouter(StudyCertificateNew);
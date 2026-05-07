import React, { Component } from "react";
import LoadingGif from "Components/LoadingGif";
import { withRouter } from "react-router-dom";
import "./styles.scss";
import { Paper, Grid, Button, Typography, Box } from "@material-ui/core";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { getUrlParam } from "Includes/functions";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import StudentUpdateFields from "./components/StudentUpdateFields";

class StaffCertificateNew extends Component {
  state = {
    loading: true,
    isOpenDialog: false,
    certificate_data: {},
    dynamicValuesData: [],
    fileURL: "",
    certificateType: "",
    certificateLabel: "",
  };

  componentDidMount() {
    const { certificateType, certificateLabel } = getUrlParam();
    if (certificateType) {
      this.setState({ certificateType, certificateLabel }, () => {
        this.getCertificate();
        this.getDynamicValues();
      });
    }
  }

  getCertificate = () => {
    const { id } = getUrlParam();
    const { certificateType } = this.state;

    if (!certificateType) {
      alert("No certificate type selected!");
      return;
    }

    postRequest(POST_URL.staffcertificate.api, {
      certificate_type: certificateType,
      staff: parseInt(id, 10),
    }, { responseType: "blob" })
    .then((response) => {
      if (response?.status === 200) {
        const fileURL = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        this.setState({ loading: false, fileURL });
      }
    });
  };

  getDynamicValues = () => {
    const { id } = getUrlParam();
    const { certificateType } = this.state;
    if (!certificateType) return;

    postRequest(POST_URL.staffcertificate.api, {
      certificate_type: certificateType,
      staff: parseInt(id, 10),
      get_dynamic_values: 1,
    }).then((response) => {
      if (response?.status === 200) {
        this.setState({ dynamicValuesData: response.data, loading: false });
      }
    });
  };

  handleDownloadPrint = () => {
    const { fileURL } = this.state;
    window.open(fileURL, "_blank").print();
  };
  handleClickFields = () => {
      this.setState((prevState) => ({ isOpenDialog: !prevState.isOpenDialog }));
    };
   saveUpdatedData = (updatedData) => {
       this.setState({ loading: true });
       const { id } = getUrlParam();
       const { certificateType } = this.state;
   
       if (!certificateType) return;
   
       const url = POST_URL.staffcertificate.api;
       const params = {
         certificate_type: certificateType,
         staff: parseInt(id, 10),
         dynamic_list: updatedData,
         get_dynamic_values: 0,
       };
   
       let prop = { ...this.props };
       prop.responseType = "blob";
   
       postRequest(url, params, prop).then((response) => {
         if (response && response.status === 200) {
           const data = new Blob([response.data], { type: "application/pdf" });
           const fileURL = URL.createObjectURL(data);
           this.setState({ loading: false, fileURL });
         }
       });
     };
  

  viewPage = () => {
    const {  certificateType } = getUrlParam();
    this.props.history.push({
      pathname: Actions.multiple_staff_certificate_list.view.url,
      search: `?${new URLSearchParams({ certificateType })}`,
    });
  };

  render() {
    const { loading, fileURL, certificateLabel ,isOpenDialog,certificate_data,dynamicValuesData} = this.state;

    if (loading) {
      return (
        <Paper className="paper-background">
          <LoadingGif />
        </Paper>
      );
    }

    return (
      <div>
        <Paper className="paper-background">
          <Grid container>
            <Grid container>
              <Grid item md={6} xs={12} className="header-align">
                <Box className="heading">{certificateLabel}</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  <Button
                    variant="contained"
                    onClick={this.viewPage}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />
                    {certificateLabel}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Grid>
           <div className="d-flex ">
                      {fileURL && (
                        <div>
                          <Button
                            className="custom-button-approval align-self-center"
                            onClick={this.handleClickFields}
                          >
                            Edit Staff Details
                          </Button>
                        </div>
                      )}
                    </div>
          {fileURL && (
            <iframe
              style={{ width: "60%", height: "60vh", margin: "20px auto", display: "block"}}
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
                className="submit print"
                onClick={this.handleDownloadPrint}
              >
                <GetAppRoundedIcon />
                Print
              </Button>
            </Box>
          )}
        </Paper>
      </div>
    );
  }
}

export default withRouter(StaffCertificateNew);
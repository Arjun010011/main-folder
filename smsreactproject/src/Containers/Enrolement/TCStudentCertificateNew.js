import React from "react";
import LoadingGif from "Components/LoadingGif";
import { withRouter } from "react-router-dom";
import "./styles.scss";
import { Paper, Grid, Button } from "@material-ui/core";
import {  POST_URL } from "Includes/urls";
import { postRequest } from "Includes/api/apicall";
import { getUrlParam } from "Includes/functions";
import StudentUpdateFields from "Containers/Certificates/components/StudentUpdateFields";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Actions } from "Constants/permissions";


class TCStudentCertificateNew extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      loadingComponent: "",
      isOpenDialog: false,
      certificate_data: {},
      dynamicValuesData: [],
    };
  }

  componentDidMount() {
    this.getstudycertificate();
    this.getDynamicValues();
  }

  getstudycertificate = () => {
    let { id } = getUrlParam();
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "transfercertificate",
      student: parseInt(id),
    };
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
    let { id } = getUrlParam();
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "transfercertificate",
      student: parseInt(id),
      get_dynamic_values: 1,
    };
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
    let { id } = getUrlParam();
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "transfercertificate",
      student: parseInt(id),
      dynamic_list: updatedData,
      get_dynamic_values: 0,
    };
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

  viewPage=()=>{
    this.props.history.push({
      pathname: Actions.tc_student.create.url,
    });
  }

  render() {
    let {
      isOpenDialog,
      loading,
      fileURL,
      certificate_data,
      dynamicValuesData,
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
            {fileURL && (
              <Button
                variant="contained"
                color="secondary"
                className="submit print"
                onClick={this.handleDownloadPrint}
              >
                <GetAppRoundedIcon />
                Print
              </Button>
            )}
            {fileURL && (
              <Button
                className="custom-button-approval align-self-center"
                onClick={this.handleClickFields}
              >
                Edit Student Details
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => this.viewPage()}
              className="editbutton-view"
            >
              <VisibilityOutlinedIcon className="visibility-icon" />
              Study Certificate
            </Button>
          </Grid>
          {fileURL && (
            <iframe
              style={{ width: "50%", height: "80vh" }}
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
        </div>
      );
    }
  }
}

export default withRouter(TCStudentCertificateNew);

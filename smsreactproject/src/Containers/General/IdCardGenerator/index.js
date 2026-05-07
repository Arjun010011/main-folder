import React, { Component } from "react";
import { Paper, Box, Button, Grid, CircularProgress } from "@material-ui/core";
import { Link } from "react-router-dom";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import Skeleton from "@material-ui/lab/Skeleton";
import ErrorHandler from "Components/ErrorHandler";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  dateFormat,
  timeFormat,
  Alert,
  getAcademicYear,
  SetAcademicYear,
  getKeyValueMap,
} from "Includes/functions";
import {
  getRequest,
  deleteRequest,
  putRequest,
  postRequest,
} from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import StudentHierarchy from "Components/StudentHierarchy";
import TemplatePreview from "./TemplatePreview";

class IdCardGenerator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yearList: [],
      examList: [],
      selectedYear: "",
      selectedExam: "",
      error: {},
      open: false,
      alertData: "",
      blank: true,
      loadingExam: false,
      isExpand: false,
      isExpanded: false,
      standardList: [],
      blankData: "Select academic year, Exam and expect the result",
      selectedTerm: "",
      loadingExamGet: false,
      loading: {},
      number_of_hites: 15,
    };
    this.StudentHierarchy = React.createRef();
    this.setTime = null;
    this.setTimeLimit = 0;
  }

  async componentDidMount() {
    this.getYearList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.setState({
          selectedYear: year,
        });
        this.getExamStandardList(year);
      }
    } else {
      this.setState({
        pageLoading: false,
        loading: false,
      });
    }
  }

  getYearList = async () => {
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        this.setState({
          yearList: response.data.data,
          loading: false,
        });
      }
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    let { error, blank, loadingExam } = this.state;
    this.setState({ [name]: value }, () => {
      if (value !== 0) {
        if (name === "selectedYear") {
          this.setState(
            {
              selectedExam: "",
              selectedTerm: "",
              standardList: [],
              blank: true,
              blankData: "Select Term, Exam and expect the result",
            },
            () => {
              this.StudentHierarchy.current.updateStandardList();
            }
          );
          SetAcademicYear(value);
        } else if (name === "selectedTerm") {
          this.setState(
            {
              loadingExamGet: true,
            },
            () => {
              this.getExamList();
            }
          );
        } else {
          this.getExamStandardList(value);
        }
        delete error[name];
        this.setState({
          [name]: value,
          blank,
          error,
          loadingExam,
        });
      }
    });
  };

  getExamStandardList = (selectedYear) => {
    let { blank, blankData } = this.state;
    this.setState(
      {
        loadingExam: true,
        standardList: [],
        blank: true,
      },
      () => {
        const url = GET_URL.getstandardandsection.api;
        const param = { is_active: true, academic_year: selectedYear };
        getRequest(url, param, this.props).then((response) => {
          if (response && response.status === 200) {
            this.setState(
              {
                standardList: response.data.data,
                loadingExam: false,
                blank: false,
                blankData,
              },
              () => {
                this.StudentHierarchy.current.updateStandardList();
              }
            );
          }
        });
      }
    );
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleHallTicketImageDownload = (
    name,
    id,
    standard_section_id,
    isconsolidate,
    file_name
  ) => {
    this.handleCheckIdCardReady(
      name,
      id,
      standard_section_id,
      isconsolidate,
      file_name,
      "img"
    );
  };

  handleCheckIdCardReady = (
    name,
    id,
    standard_section_id,
    isconsolidate,
    file_name,
    document_type = "pdf"
  ) => {
    clearInterval(this.setTime);
    let { selectedYear } = this.state;
    this.setState({
      loading: `${name}_${id}`,
    });
    let transaction_id = Date.now();
    const url =
      POST_URL.generateidcard.api +
      `?long_running_process=1&transaction_id=${transaction_id}`;
    let param = { academic_year: parseInt(selectedYear) };
    let extra_param = {};
    if (name === "standard") {
      extra_param = { standard_ids: [id] };
    }
    if (name === "section") {
      extra_param = { standard_section_ids: [id] };
    }
    if (name === "student") {
      extra_param = { student_ids: [id] };
    }
    extra_param["document_type"] = document_type;
    extra_param["file_name"] = file_name;
    param = { ...param, ...extra_param };
    let prop = { ...this.props };
    prop.responseType = "blob";
    prop.return_error_message = true;
    postRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        clearInterval(this.setTime);
        this.setState(
          {
            transaction_id: transaction_id,
            totalFeeLoading: true,
            count: 60,
          },
          () => {
            this.setIntervalTime();
          }
        );
      }
    });
  };

  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 5000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      clearInterval(this.setTime);
    }
  };

  getlongprocessingapiresult = () => {
    let { number_of_hites } = this.state;
    this.setState({
      number_of_hites: number_of_hites - 1,
    });
    if (number_of_hites === 0) {
      Swal.fire({
        type: "error",
        title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
        showConfirmButton: true,
      });
      clearInterval(this.setTime);
      return;
    }
    let params = {
      transaction_id: this.state.transaction_id,
      is_active: true,
    };
    let props = { ...this.props };
    props["return_error_message"] = true;

    if (this.state.count === 0) {
      clearInterval(this.setTime);
      this.setState({
        totalFeeLoading: false,
        totalFeeError: true,
      });
    }
    getRequest(GET_URL.longprocessingapiresult.api, params, props).then(
      (response) => {
        if (response && response.status === 200) {
          if (response?.data?.data?.is_process_running === false) {
            if (response.data.data.result_data.error) {
              ErrorHandler({
                response: {
                  status: 400,
                  data: response.data.data.result_data.error,
                },
              });
            } else {
              const height = (window.screen.height * 75) / 100;
              const width = (window.screen.width * 75) / 100;
              const mywindow = window.open(
                response.data.data.result_data.url,
                "_self"
                // "PRINT",
                // "height=" + height + ",width=" + width + ""
              );
            }
            this.setState({ loading: false });
            // mywindow.print();
            clearInterval(this.setTime);
          }
        } else {
          clearInterval(this.setTime);
          this.setState({
            totalFeeLoading: false,
            totalFeeError: true,
          });
        }
      }
    );
  };

  componentWillUnmount() {
    clearInterval(this.setTime);
  }

  handleHallTicketDownload = (name, id, file_name) => {
    let { selectedYear } = this.state;
    this.setState({
      loading: `${name}_${id}`,
    });
    const url = POST_URL.generateidcard.api;
    let param = { academic_year: parseInt(selectedYear) };
    let extra_param = {};
    if (name === "standard") {
      extra_param = { standard_ids: [id] };
    }
    if (name === "section") {
      extra_param = { standard_section_ids: [id] };
    }
    if (name === "student") {
      extra_param = { student_ids: [id] };
    }
    param = { ...param, ...extra_param };
    let prop = { ...this.props };
    prop.responseType = "blob";
    prop.return_error_message = true;
    postRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        const height = (window.screen.height * 75) / 100;
        const width = (window.screen.width * 75) / 100;
        const mywindow = window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
        mywindow.print();
        // window.open(fileURL);
      } else {
        Swal.fire({
          type: "error",
          title: "Error",
          text: "No Students Found To Print",
        });
      }
      this.setState({
        loading: "",
      });
    });
  };

  render() {
    let {
      yearList,
      selectedYear,
      open,
      alertData,
      error,
      blank,
      loadingExam,
      selectedExam,
      blankData,
      loading,
    } = this.state;
    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">ID Card Generator</Box>
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item md={3} xs={12} className="margin-top-20">
            <Dropdown
              data={yearList}
              name="selectedYear"
              style="width-100"
              value={selectedYear}
              onChange={this.onChange}
              label="Academic Year"
              error={error.selectedYear}
              hideSelect={true}
            />
          </Grid>
        </Grid>
        {blank && !loadingExam && <BlankPagewithIcon data={blankData} />}
        {loadingExam && (
          <Box display="flex">
            <CircularProgress className="loading" />
          </Box>
        )}
        <Grid container spacing={2}>
          <Grid item md={8}>
            <StudentHierarchy
              academicYear={selectedYear}
              // getStandardList={standardList}
              isDownload={true}
              // handleHallTicketDownload={this.handleHallTicketDownload}
              handleHallTicketDownload={this.handleCheckIdCardReady}
              handleHallTicketImageDownload={this.handleHallTicketImageDownload}
              selectedExam={selectedExam}
              ref={this.StudentHierarchy}
              blank={blank}
              blankData={blankData}
              loading={loading}
              isImageDownload={true}
            />
          </Grid>
          {/* {!loading && (
            <Grid item md={4}>
              <TemplatePreview />
            </Grid>
          )} */}
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
      </Paper>
    );
  }
}
export default withRouter(IdCardGenerator);

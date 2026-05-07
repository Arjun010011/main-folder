import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  CircularProgress,
  TableRow,
  TableBody,
  Tooltip,
  TextField,
} from "@material-ui/core";
import { Link } from "react-router-dom";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import Swal from "sweetalert2";
import Skeleton from "@material-ui/lab/Skeleton";

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
import { getRequest, deleteRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import StudentHierarchy from "Components/StudentHierarchy";

class HallTicketGenerator extends Component {
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
    };
    this.StudentHierarchy = React.createRef();
  }

  async componentDidMount() {
    this.getYearList();
    this.getTermList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.setState({
          selectedYear: year,
        });
        this.getExamList(year);
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
          data.name = fromYear[0] + "-" + ToYear[0];
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

  getExamList = () => {
    let { selectedYear, selectedTerm } = this.state;
    const url = GET_URL.exam.api;
    const params = {
      academic_year: selectedYear,
      term: selectedTerm,
      is_active: true,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data.name = data.exam_type_name;
        });
        this.setState(
          {
            examList: response.data.data,
            selectedExam: "",
            standardList: [],
            blank: true,
            blankData: "Select Exam and expect the result",
            loadingExamGet: false,
          },
          () => {
            this.StudentHierarchy.current.updateStandardList();
          }
        );
      }
    });
  };

  getExamStandardList = (selectedExam) => {
    let { blank, blankData } = this.state;
    this.setState(
      {
        loadingExam: true,
        standardList: [],
        blank: true,
      },
      () => {
        const url = GET_URL.exam.api + selectedExam + "/";
        const param = { is_active: true };
        getRequest(url, param, this.props).then((response) => {
          if (response && response.status === 200) {
            blank = false;
            if (response.data.data.approval_status.approval_status != 1) {
              blank = true;
              blankData =
                "Schedule is not approved, please approve to generate hall ticket";
            }
            this.setState(
              {
                standardList: response.data.data.standard_names,
                loadingExam: false,
                blank,
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

  getTermList = () => {
    const url = GET_URL.examterms.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          examTermList: response.data.data,
        });
      }
    });
  };

  handleHallTicketDownload = (name, id) => {
    let { selectedExam, selectedTerm } = this.state;
    this.setState({
      loading: `${name}_${id}`,
    });
    const url = GET_URL.hallticket.api;
    let param = { is_active: true, exam: selectedExam, term: selectedTerm };
    let extra_param = {};
    if (name === "standard") {
      extra_param = { standard: id };
    }
    if (name === "section") {
      extra_param = { standard_section: id };
    }
    if (name === "student") {
      extra_param = { student: id };
    }
    param = { ...param, ...extra_param };
    let prop = { ...this.props };
    prop.responseType = "blob";
    prop.return_error_message = true;
    getRequest(url, param, prop).then((response) => {
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
      examTermList,
      blank,
      loadingExam,
      examList,
      selectedExam,
      loadingExamGet,
      standardList,
      selectedTerm,
      blankData,
      loading,
    } = this.state;
    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">Hall Ticket</Box>
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
          <Grid item md={3} xs={12} className="margin-top-20">
            <Dropdown
              data={examTermList}
              name="selectedTerm"
              style="width-100"
              value={selectedTerm}
              onChange={this.onChange}
              label="Term"
              error={error.selectedTerm}
              disabled={selectedYear ? false : true}
              helperText={!selectedYear ? "Select Term" : ""}
              hideSelect={true}
            />
          </Grid>
          <Grid item md={3} xs={12} className="margin-top-20">
            {loadingExamGet ? (
              <Skeleton
                variant="rect"
                className="drop-down-skeleton m-t-10px"
              ></Skeleton>
            ) : (
              <Dropdown
                data={examList}
                name="selectedExam"
                style="width-100"
                value={selectedExam}
                onChange={this.onChange}
                label="Exam"
                error={error.selectedExam}
                disabled={selectedYear ? false : true}
                helperText={!selectedYear ? "Select Academic Year" : ""}
                hideSelect={true}
              />
            )}
          </Grid>
        </Grid>

        {blank && !loadingExam && <BlankPagewithIcon data={blankData} />}
        {loadingExam && (
          <Box display="flex">
            <CircularProgress className="loading" />
          </Box>
        )}
        <Grid container>
          <Grid item md={8}>
            <StudentHierarchy
              academicYear={selectedYear}
              getStandardList={standardList}
              isDownload={true}
              handleHallTicketDownload={this.handleHallTicketDownload}
              selectedExam={selectedExam}
              ref={this.StudentHierarchy}
              blank={blank}
              blankData={blankData}
              loading={loading}
            />
          </Grid>
        </Grid>
        {/* } */}
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
export default withRouter(HallTicketGenerator);

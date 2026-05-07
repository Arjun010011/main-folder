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
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Actions } from "Constants/permissions";
import {
  Alert,
  getAcademicYear,
  SetAcademicYear,
  getKeyValueMap,
} from "Includes/functions";
import { getRequest, deleteRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import StudentHierarchy from "Components/StudentHierarchy";
import ErrorHandler from "Components/ErrorHandler";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";


class MarksCardGenerator extends Component {
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
      typeWise: 1,
      currentTab: 1,
      number_of_hites:100,
      transaction_id:new Date(),
      is_longrunning :
            isFormDefinitionEnabled(
              "exam_configurations",
              "is_marks_card_longrunning",1)
    };
    this.StudentHierarchy = React.createRef();
  }

  componentDidMount() {
    this.getYearList();
    this.getTermList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.setState({
          selectedYear: year,
        });
        // this.getExamList(year);
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
    let { error, blank, loadingExam, typeWise } = this.state;
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
              [name]: value,
            },
            () => {
              this.getExamList();
            }
          );
        } else if (typeWise === 1) {
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
    let { selectedYear, selectedTerm, typeWise } = this.state;
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
            standardList:
              typeWise === 1 ? [] : response.data.data.standard_names,
            blank: typeWise === 1 ? true : false,
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
                "Schedule is not approved, please approve to generate marks card";
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

  handleHallTicketDownload = (name, id, standard_sec_id, isConsolidated) => {
    let { selectedExam, selectedTerm, typeWise, selectedYear, currentTab,transaction_id } =this.state;
    this.setState({
      loading: `${name}_${id}`,
    });
    let url = GET_URL.studentmark.api;
    transaction_id = Date.now();
    let param = {
      is_active: true,
      term: selectedTerm,
    };
    if (this.state.is_longrunning){
      param = { ...param, ...{ long_running_process : 1,transaction_id : transaction_id } };
    }

    let extra_param = {};
    if (name === "standard") {
      extra_param = { standard: id };
    }
    if (name === "section") {
      extra_param = { standard_section: id };
    }
    if (name === "student") {
      extra_param = { student_ids: id, standard_section: standard_sec_id };
    }
    if (currentTab === 2 && typeWise === 1) {
      url = GET_URL.announceexamresultconfig.api;
      extra_param = { ...extra_param, ...{ academic_year: selectedYear } };
    } else if (currentTab === 2 && typeWise === 2) {
      url = GET_URL.studentmarkresultconfig.api;
      extra_param = { ...extra_param, ...{ academic_year: selectedYear } };
    }
    else if (currentTab === 2 && typeWise === 3 ) {
      url = GET_URL.studentmarkresultfinalconfig.api;
      extra_param = { ...extra_param, ...{ academic_year: selectedYear , exam:selectedExam} };
    }
    if (isConsolidated) {
      if (typeWise === 3) {
        extra_param = { ...extra_param, consolidated_report: 1 ,exam: selectedExam};
      }
      else if (typeWise !== 1) {
        extra_param = { ...extra_param, consolidated_report: 1 };
      } else if (typeWise === 1) {
        extra_param = { ...extra_param, download_consolidated_marks: 1, exam: selectedExam };
      }
    } else {
      if (currentTab === 1 || (currentTab === 2 && typeWise === 3) || (currentTab === 2 && typeWise === 2)) {
        extra_param = { ...extra_param, ...{ print_marks_card: 1 } };
      } else {
        extra_param = { ...extra_param, ...{ print_config_marks_card: 1 } };
      }
    }
    if (typeWise == 1) {
      extra_param = { ...extra_param, ...{ exam: selectedExam } };
    }
    param = { ...param, ...extra_param };
    let prop = { ...this.props };
    prop.responseType = "blob";
    // prop.return_error_message = true;
    console.log('here',param)
    getRequest(url, param, prop).then((response) => {
      if (response && response.status === 200) {
        if (isConsolidated) {
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `Consolidated.xlsx`);
          document.body.appendChild(link);
          link.click();
        } else {
          if (this.state.is_longrunning){
            clearInterval(this.setTime);
            this.setState(
              {
                transaction_id: transaction_id,
                tableUpdating: true,
                count: 60,
                loading: `${name}_${id}`,
              },
              () => {
                this.setIntervalTime();
              }
            );
  
          }
          else{
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
        }}
        // window.open(fileURL);
      }
      else {
        Swal.fire({
          type: "error",
          title: "Error",
          text: `Invalid data, Please Contact ${process.env.REACT_APP_ENV} Team !!`,
        });
      }
      this.setState({
        loading: `${name}_${id}`,
      });
    });
  };

  setIntervalTime = () => {
    this.setTime = setInterval(() => {
      this.getlongprocessingapiresult();
    }, 5000);
    this.setTimeLimit += 1;
    if (this.setTimeLimit === 40) {
      this.setState({ tableUpdating: false })
      clearInterval(this.setTime);
    }
  };

  getlongprocessingapiresult = () => {
    let {number_of_hites,transaction_id} = this.state
    this.setState(prevState => ({
      number_of_hites: prevState.number_of_hites - 1
    }));    
    if (number_of_hites === 0) {
      Swal.fire({
        type: "error",
        title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
        showConfirmButton: true,
      });
      clearInterval(this.setTime);
      this.setState({
        loading: "",
      });
      return;
    }
    let params = {
      transaction_id: transaction_id,
      is_active: true,
    };
    getRequest(GET_URL.longprocessingapiresult.api, params, {}).then(
      (response) => {
        if (response && response.status === 200) {
          if (response?.data?.data?.is_process_running === false) {
            if (response.data.data.result_data?.error) {
              ErrorHandler({
                response: {
                  status: 400,
                  data: response.data.data.result_data.error,
                },
              });
              this.setState({
                loading: "",
              });
            } else {
              window.open(
                response.data.data.result_data.url,
                "_self"
              );
            }
            clearInterval(this.setTime);
            this.setState({
              loading: "",
            });
          }
        } else {
          clearInterval(this.setTime);
        }
      }
    );
  };

  setActiveTab = (value) => {
    const { selectedTerm, selectedYear } = this.state;
    if (value !== null) {
      this.setState(
        {
          typeWise: value,
        },
        () => {
          if (value === 2 && selectedTerm) {
            this.getExamList();
          } else if (value === 1 && selectedTerm) {
            this.setState({
              loadingExamGet: true,
              blank: true,
              blankData: "Select exam and get result",
            });
          } else if (value === 2) {
            if (selectedYear) {
              this.getExamList();
            } else {
              this.setState({
                loadingExamGet: true,
                blank: true,
                blankData: "Select year and get result",
              });
            }
          }
        }
      );
    }
  };

  changeTab = (value) => {
    if (this.state.currentTab !== value) {
      this.setState(
        {
          currentTab: value,
        },
        () => { }
      );
    }
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
      typeWise,
      currentTab,
    } = this.state;
    return (
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">Marks Card Generator</Box>
          </Grid>
          <Grid item md={6} xs={12} className="text-align-end">
            <ToggleButtonGroup
              size="small"
              className="header-align"
              value={typeWise}
              exclusive
              onChange={(e, val) => this.setActiveTab(val)}
            >
              <ToggleButton key={1} value={1}>
                Exam Wise
              </ToggleButton>

              <ToggleButton key={2} value={2}>
                Term Wise
              </ToggleButton>
              <ToggleButton key={3} value={3}>
                Final Result
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={8} xs={12} className="leave-manage-space-around">
            <Box
              className={
                currentTab === 1
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => this.changeTab(1)}
            >
              Marks Card
              {currentTab === 1 && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box>
            <Box
              className={
                currentTab === 2
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => this.changeTab(2)}
            >
              Configured Marks Card
              {currentTab === 2 && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box>
          </Grid>
        </Grid>
        <hr style={{ marginTop: "-4px" }} />
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
          {typeWise !== 4 && (
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
          )}
          {(typeWise === 1 || typeWise === 3) && (
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
          )}
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
              hideStandard={true}
              printLabel="Print Marks Card"
              isConsolidated={currentTab === 2}
            />
          </Grid>
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
export default withRouter(MarksCardGenerator);

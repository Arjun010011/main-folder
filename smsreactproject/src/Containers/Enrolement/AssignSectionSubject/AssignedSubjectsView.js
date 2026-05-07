import React, { PureComponent, forwardRef } from "react";
import { withRouter } from "react-router-dom";
import { Grid, 
  Paper, 
  Box, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Button
} from "@material-ui/core";
import { FormattedMessage } from "react-intl";

import { getRequest, postRequest } from "Includes/api/apicall";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { GET_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import {
  SetAcademicYear,
  checkLocalAcademicYear,
  getKeyValueInArray,
} from "Includes/functions";
import StandardSectionRowView from "../Components/StandardSectionRowView";
import loadingBar from "images/loading.gif";
import { getUrlParam } from "Includes/functions";
import commonMessages from "Constants/messages";
import messages from "./../messages";
import "./styles.scss";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import Swal from "sweetalert2";
import { SUCCESS_MSG_PROPS } from "Constants";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

class AssignedSubjectsView extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      year: '',
      yearList: [],
      standard: '',
      section: '',
      subjectList: [],
      subject: [],
      subjectListSelected: [],
      enrollmentDetails: [],
      openCopyAssignSubject: false,
      fromAcademicYear: 0,
      fromAcademicYearstandardList: [],
      selectedStandardFromAcademicYear : 0,
      isDisabled:false,
      standardList: [],
    };
  }

  componentDidMount() {
    let { expanded } = getUrlParam();
    this.setState({ expanded }, () => {
      this.getAcademicYear();
    });
  }

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = response.data.data;
          const year = checkLocalAcademicYear(yearList);
          let loading = false;
          if (year) {
            const yearName = getKeyValueInArray(yearList, "id", year, "name");
            loading = true;
            this.setState({ yearList, year, yearName, loading }, () => {
              if (year) {
                this.getEnrollmentDetails();
              }
            });
          }
          else{
            this.setState({loading, yearList})
          }
        }
      }
    );
  };

  getEnrollmentDetails = () => {
    const params = { academic_year: this.state.year };
    getRequest(GET_URL.assignsubject.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let standardList = []
          let enrollmentDetails = response.data.data.sort((a, b) =>
            a.name.toUpperCase() > b.name.toUpperCase() ? -1 : 1
          );
          enrollmentDetails = enrollmentDetails.sort(function (a, b) {
            let sortName = a.name.trim();
            let compareName = b.name.trim();
            return sortName.length > compareName.length ? 1 : -1;
          });
          enrollmentDetails.forEach((stdAssignedSub) => {
            standardList.push({'id': stdAssignedSub.id, 'name': stdAssignedSub.name})
            stdAssignedSub.sections = stdAssignedSub.sections.sort(
              (a, b) => a.id - b.id
            );
          });

          this.setState({ enrollmentDetails, loading: false, standardList: standardList });
        }
      }
    );
  };

  onChange = async (e) => {
    let value = e.target.value;
    if (value !== 0) {
      SetAcademicYear(value);
      const yearName = getKeyValueInArray(
        this.state.yearList,
        "id",
        value,
        "name"
      );
      this.setState({ year: value, yearName }, () => {
        this.getEnrollmentDetails();
      });
    }
  };

  selectfunction = (index, id) => {
    let { subjectList, subject } = this.state;
    let checksubjectPresent = subject.indexOf(id);
    if (checksubjectPresent === -1) {
      this.setState({
        subject: subject.concat(subjectList[index].subject),
      });
    } else {
      subject.splice(checksubjectPresent, 1);
      this.setState({ subject });
    }
  };

  addSubjects = () => {
    let { subjectList, subject } = this.state;
    let filterData = subjectList.filter((data) => {
      let test = subject.indexOf(data.subject);
      return test > -1;
    });
    let removeSelectedSubjects = subjectList.filter((data) => {
      let test = subject.indexOf(data.subject);
      return test === -1;
    });
    this.setState({
      subjectListSelected: this.state.subjectListSelected.concat(filterData),
      subjectList: removeSelectedSubjects,
    });
    if (filterData.length === 0) {
      alert("Please select subjects");
    }
  };

  deleteSubject = (index, id) => {
    let temp = this.state.subjectListSelected;
    let removedData = temp.splice(index, 1);
    let subject = this.state.subject;
    let removesubjectTest = subject.indexOf(id);
    if (removesubjectTest > -1) {
      subject.splice(removesubjectTest, 1);
    }
    this.setState({
      subjectListSelected: temp,
      subjectList: this.state.subjectList.concat(removedData),
    });
  };

  handleCopyAssignSubject = (status=true) =>{
    this.setState({
      openCopyAssignSubject : status,
      selectedStandardFromAcademicYear : 0,
      isDisabled: false
    })
  }

  onChangeFromAcademic = (e) => {
    this.setState({
      fromAcademicYear: e.target.value
    })
  }

  onChangeFromAcademicStandard = (e) => {
    this.setState({
      selectedStandardFromAcademicYear: e,
    });
  };

  submitCopyAssignSubject = () => {
    const { selectedStandardFromAcademicYear, fromAcademicYear, year } = this.state;
    let alertData = null;
    if (selectedStandardFromAcademicYear.length === 0) {
      alertData = 'Select From Standards'
    }
    if (!fromAcademicYear) {
      alertData = 'Select Acadmeic Year'
    }
    if (alertData) {
      this.setState({
        alertData,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    this.setState({ isDisabled: true });
    const payload = {
      'from_academic_year': fromAcademicYear,
      'standard_ids': selectedStandardFromAcademicYear.map((item) => item.id),
      'to_academic_year': year,
      'copy_subject_data': true
    };
    let url = POST_URL.assignsubject.api;
    postRequest(url, payload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            title: response.data.Reason,
            ...SUCCESS_MSG_PROPS,
          });
        }
        this.getEnrollmentDetails()
        this.setState({
          openCopyAssignSubject: false
        });
      })
      .catch(() => {
        this.setState({ isDisabled: false });
      });
  }

  render() {
    const { 
        loading, year, yearList, enrollmentDetails, yearName, expanded, 
        openCopyAssignSubject, fromAcademicYear, standardList,
        selectedStandardFromAcademicYear, isDisabled
    } =
      this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className={"loader"} alt="loading" />
        </Box>
      );
    } else {
      return (
        <>
          <Paper>
            <Box className="paper-background">
              <Grid container>
                <Grid item md={7} xs={12} sm={12}>
                  <Box className="header-align heading">
                    <FormattedMessage {...messages.assignSubjectsHead} />
                  </Box>
                </Grid>
                <Grid item md={12} xs={12} sm={12}>
                <Box className='staff-list-assigned-shift'>Note : If any subjects are newly added after students are enrolled into classes, Same subjects need to be modified/added under subject to students module. </Box>
                  <Box className="header-align">
                    <Dropdown
                      data={yearList}
                      name="year"
                      value={year}
                      onChange={this.onChange}
                      label={
                        <FormattedMessage {...commonMessages.academicYear} />
                      }
                      hideSelect={true}
                    />
                    {year &&
                      <Button onClick={this.handleCopyAssignSubject} color="primary">
                        Copy Previous Assign Subject 
                      </Button>
                    }
                  </Box>
                </Grid>
                <Grid item md={12} xs={12} sm={12}>
                  <Box mt={4}>
                    <StandardSectionRowView
                      enrollmentDetails={enrollmentDetails}
                      year={this.state.year}
                      yearName={yearName}
                      getEnrollmentDetails={this.getEnrollmentDetails}
                      expanded={expanded}
                    />
                  </Box>
                  {enrollmentDetails.length === 0 && (
                    <BlankPagewithIcon
                      data={
                        !year ? (
                          <FormattedMessage {...commonMessages.selectYear} />
                        ) : (
                          <FormattedMessage {...commonMessages.noDataForYear} />
                        )
                      }
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
          </Paper>

          <Dialog
              open={openCopyAssignSubject}
              onClose={()=>this.handleCopyAssignSubject(false)}
              keepMounted
              TransitionComponent={Transition}
              maxWidth="xs"
              fullWidth={true}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="form-dialog-title">
                Copy Other Academic Year Subject data to &nbsp;
                {yearList.map((data)=>{
                  if( data['id'] == year){
                    return data["start_date"].substr(0,4) + ' - ' +  data["end_date"].substr(0,4)
                  }
                })}
              </DialogTitle>
              <hr />
              <DialogContent>
                <Box>
                  <Box>
                    <Dropdown
                      data={yearList.filter((item) => item.id !== year)}
                      name="from_academic_year"
                      value={fromAcademicYear}
                      onChange={this.onChangeFromAcademic}
                      label="Copy From Academic Year"
                      hideSelect={true}
                    />
                  </Box>
                  <Box mt={4}>
                     <MultipleSelectDropdown
                      data_list={standardList}
                      selected_list={selectedStandardFromAcademicYear}
                      label={`Select Standard in ${
                        (() => {
                          const matched = yearList.find(data => data.id == year);
                          return matched ? `${matched.start_date.substr(0,4)} - ${matched.end_date.substr(0,4)}` : '';
                        })()
                      }`}
                      onChange={(e) => this.onChangeFromAcademicStandard(e)}
                    />
                  </Box>
                  { fromAcademicYear ? 
                    <Box mt={2} style={{color:'orange'}}>
                      Enrollment data will be copied from the selected academic year &nbsp;
                      {yearList.map((data)=>{
                        if( data['id'] == fromAcademicYear){
                          return data["start_date"].substr(0,4) + ' - ' +  data["end_date"].substr(0,4)
                        }
                      })}
                      &nbsp; to the chosen standards in the academic year  {yearList.map((data)=>{
                        if( data['id'] == year){
                          return data["start_date"].substr(0,4) + ' - ' +  data["end_date"].substr(0,4)
                        }
                      })} <br/>
                      Note : Only Unenrolled student data will be affected
                    </Box>
                  : <></>}
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={()=>this.handleCopyAssignSubject(false)} color="secondary">
                  {<FormattedMessage {...commonMessages.close} />}
                </Button>
                <Button
                  disabled={isDisabled}
                  onClick={this.submitCopyAssignSubject}
                  color="primary"
                >
                  {<FormattedMessage {...commonMessages.submit} />}
                </Button>
              </DialogActions>
            </Dialog>
        </>
      );
    }
  }
}

export default withRouter(AssignedSubjectsView);

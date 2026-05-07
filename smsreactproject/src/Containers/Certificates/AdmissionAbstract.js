import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import ReactToPrint from "react-to-print";
import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import moment from "moment";
import LoadingGif from "Components/LoadingGif";
import { getUrlParam } from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class Abstract extends Component {
  constructor(props) {
    super(props);
    this.state = {
      abstract_data: {},
      loading: true,
    };
  }

  componentDidMount() {
    this.getAdmissionAbstract();
  }

  getAdmissionAbstract = () => {
    let { id } = getUrlParam();
    const url = POST_URL.certificate.api;
    let params = {
      certificate_type: "admissionabstract",
      student: parseInt(id),
      get_dynamic_values: 1,
    };
    postRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let abstract_data = response.data.data;
        this.setState({
          abstract_data,
          loading: false,
        });
      }
    });
  };

  getFormattedAddress = (details) => {
    let return_result = "";
    if (details.map_address_data) {
      let map_address = details.map_address_data;
      return_result =
        map_address?.address_one_map + "  " + map_address?.address_two_map ??
        "" + "  " + map_address?.city_map ??
        "" + "," + " " + map_address?.district_map ??
        "" + "," + " " + map_address?.state_map ??
        "" + "," + " " + map_address?.country_map ??
        "" + "," + " " + map_address?.pincode_map ??
        "";
    } else if (details.address) {
      let map_address = details;
      return_result =
        map_address?.address ??
        "" + "  " + map_address?.city_name ??
        "" + "," + " " + map_address?.district_name ??
        "" + "," + " " + map_address?.state_name ??
        "" + "," + " " + map_address?.country_name ??
        "" + "," + " " + map_address?.pincode ??
        "";
    }
    return return_result;
  };

  render() {
    let { abstract_data, loading } = this.state;
    if (loading) {
      return (
        <Paper className="paper-background">
          <LoadingGif />
        </Paper>
      );
    } else {
      return (
        <Paper>
          <Paper className="paper-background-abstract ">
            <table className="table-bordered">
              <thead>
                <tr>
                  <th colSpan="11">
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      padding="10px"
                    >
                      <div className="small-text">
                        Govt. of Karnataka
                        <Box className="small-sub-text">Edu.No. 78</Box>
                      </div>
                      <div className="abstract-heading">Admission Abstract</div>
                      <div className="small-text-left-corner">
                        {" "}
                        Dept. of Education
                      </div>
                    </Box>
                    <Box className="admission-sub-heading">
                      {`Name of the ${alias_names["school"]}`}
                      <span className="school-name-indent">
                        {abstract_data.school_name}
                      </span>
                    </Box>
                    {/* <Box className="kannada-translated">ಶಾಲೆಯ ಹೆಸರು</Box> */}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="vertical-rotate table-bordered">
                    Admission No.
                    <div>ದಾಖಲೆ ನo.</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Cumulative Record No.
                    <div>with day of openning</div>
                    <div>ಕ್ಯುಮುಲೇಟಿವ್ ರೆಕಾರ್ಡ್ ನo.</div>
                    <div>(ಪ್ರಾರಂಭಿಸಿದ ದಿನಾಂಕ)</div>
                  </th>
                  <th className="horizontal-text table-bordered">
                    Name in full
                    <div>ಪೂರ್ಣ ಹೆಸರು</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Boy or Girl
                    <div>ಹುಡುಗ/ಹುಡುಗಿ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Date of birth age in years
                    <div>ಹುಟ್ಟಿದ ದಿನಾಂಕ ಮತ್ತು ವಯಸ್ಸು</div>
                    <div>(ವರ್ಷಗಳಲ್ಲಿ)</div>
                  </th>
                  <th className="horizontal-text table-bordered">
                    Father and Mother
                    <div>name</div>
                    <div>and occupation</div>
                    <div>ತಂದೆಯ ಹೆಸರು ಮತ್ತು ತಾಯಿಯ</div>
                    <div>ಹೆಸರು ಹಾಗು ಕಸಬು</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Parent annual income
                    <div>ತಂದೆ ತಾಯಿ ವಾರ್ಷಿಕ ವರಮಾನ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Number of dependents
                    <div>ಆಶ್ರಿತರ ಸಂಖ್ಯೆ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Nationality, religion and
                    <div>caste</div>
                    <div>ಜನಾಂಗ ಮತ ಮತ್ತು ಜಾತಿ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Mother tongue
                    <div>ಮಾತೃ ಭಾಷೆ</div>
                  </th>
                  <th className="horizontal-text table-bordered">
                    Guardian name
                    <div>and address</div>
                    <div>ಪೋಷಕರ ಹೆಸರು ಮತ್ತು ವಿಳಾಸ</div>
                  </th>
                </tr>
                <tr>
                  <td className="table-bordered-td">1</td>
                  <td className="table-bordered-td">2</td>
                  <td className="table-bordered-td">3</td>
                  <td className="table-bordered-td">4</td>
                  <td className="table-bordered-td">5</td>
                  <td className="table-bordered-td">6</td>
                  <td className="table-bordered-td">7</td>
                  <td className="table-bordered-td">8</td>
                  <td className="table-bordered-td">9</td>
                  <td className="table-bordered-td">10</td>
                  <td className="table-bordered-td">11</td>
                </tr>
                <tr>
                  <td className="table-bordered-td-data">
                    {abstract_data.admission_details.admission_num}
                  </td>
                  <td className="table-bordered-td-data"></td>
                  <td className="table-bordered-td-data">
                    {abstract_data.first_name}&nbsp;{abstract_data?.middle_name}
                    &nbsp;{abstract_data?.last_name}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.gender}
                  </td>
                  <td className="table-bordered-td-data">
                    {moment(abstract_data.dob).format("DD-MM-YYYY")}
                    <div>{abstract_data.age} Years</div>
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.father_name}
                    {abstract_data.father_occupation ? ", " : ""}
                    {abstract_data.father_occupation}
                    <div>
                      {abstract_data.mother_name}
                      {abstract_data.mother_occupation ? ", " : ""}
                      {abstract_data.mother_occupation}
                    </div>
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.parents_annual_income}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.dependents}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.nationality}
                    <div>{abstract_data.religion}</div>
                    <div>{abstract_data.caste}</div>
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.mother_tongue}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.guardian_name}
                    <div>{abstract_data.guardian_address}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </Paper>
          <div className="page-break"></div>
          <div className="page-break"></div>

          <Paper className="paper-background-abstract">
            <table className="table-bordered">
              <thead>
                <tr>
                  <th colSpan="12" className="table-bordered-th">
                    <Box className="small-text"> ಕರ್ನಾಟಕ ಸರ್ಕಾರ</Box>
                    <Box className="small-text">ಶಿಕ್ಷಣ ನo. 78</Box>
                    <Box className="abstract-heading-page-2">
                      ಶಾಲಾ ದಾಖಲಾತಿಯ ವಿವರ
                    </Box>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="horizontal-text bordered-page-2">
                    Permanent address of the pupil
                    <div>ವಿದ್ಯಾರ್ಥಿಯ ಖಾಯಂ ವಿಳಾಸ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Last School attended
                    <div>ಹೋಗುತಿದ್ದ ಹಿಂದಿನ ಪಾಠ ಶಾಲೆ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Standard last studied
                    <div>ಓದುತ್ತಿದ್ದ ಹಿಂದಿನ ತರಗತಿ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    No. and date of
                    <div>Transfer Certificate</div>
                    <div>ವರ್ಗಾವಣೆ ಚೀಟಿಯ ನಂ. ಮತ್ತು</div>
                    <div>ತಾರೀಖು</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Standard to which
                    <div>Admitied with section</div>
                    <div>ದಾಖಲು ಮಾಡಿದ ತರಗತಿ</div>
                    <div>ಮತ್ತು ವರ್ಗ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Date of Admission
                    <div>ದಾಖಲಾದ ತಾರೀಖು</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Subsequent progress of
                    <div>the pupil in school</div>
                    <div>every year from the</div>
                    <div>date of admissions</div>
                    <div>(class to be noted)</div>
                    <div>ದಾಖಲೆಯಾದಾಗಿನಿಂದ ಪ್ರತಿವರ್ಷದ</div>
                    <div>ವಿದ್ಯಾರ್ಥಿಗಳಿಸಿದ ಪ್ರಗತಿ</div>
                    <div>(ತರಗತಿಗಳನ್ನು ನಮೂದಿಸಿ)</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Class of leaving
                    <div>ಪಾಠಶಾಲೆಯನ್ನು ಬಿಟ್ಟಾಗ</div>
                    <div>ಓದುತ್ತಿದ್ದ ತರಗತಿ</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Date of leave the school
                    <div>ಪಾಠಶಾಲೆಯನ್ನು ಬಿಟ್ಟ ತಾರೀಖು</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    Reason for leaving
                    <div>ಪಾಠ ಶಾಲೆಯನ್ನು ಬಿಡಲು ಕಾರಣಗಳು</div>
                  </th>
                  <th className="vertical-rotate table-bordered">
                    No. and date of Transfer
                    <div>Certified issued</div>
                    <div>ಕೊಟ್ಟ ವರ್ಗಾವಣೆ ಚೀಟಿಯ ನಂ.</div>
                    <div>ಮತ್ತು ತಾರೀಖು</div>
                  </th>
                  <th className="horizontal-text table-bordered">
                    Remarks
                    <div>ಪರಾ</div>
                  </th>
                </tr>
                <tr>
                  <td className="table-bordered-td">12</td>
                  <td className="table-bordered-td">13</td>
                  <td className="table-bordered-td">14</td>
                  <td className="table-bordered-td">15</td>
                  <td className="table-bordered-td">16</td>
                  <td className="table-bordered-td">17</td>
                  <td className="table-bordered-td">18</td>
                  <td className="table-bordered-td">19</td>
                  <td className="table-bordered-td">20</td>
                  <td className="table-bordered-td">21</td>
                  <td className="table-bordered-td">22</td>
                  <td className="table-bordered-td">23</td>
                </tr>
                <tr>
                  <td className="table-bordered-td-data">
                    {this.getFormattedAddress(abstract_data.student_address)}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data?.previous_school_details?.school_name ?? ""}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data?.previous_school_details?.left_standard ??
                      ""}
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data?.previous_school_details?.school_tc_number ??
                      ""}
                    <div>
                      {abstract_data?.previous_school_details?.tc_issued_date &&
                        moment(
                          abstract_data.previous_school_details.tc_issued_date
                        ).format("DD-MM-YYYY")}
                    </div>
                  </td>
                  <td className="table-bordered-td-data">
                    {abstract_data.admitted_standard_name}
                    <div>{abstract_data.admitted_section_name}</div>
                  </td>
                  <td className="table-bordered-td-data">
                    {moment(
                      abstract_data.admission_details.admission_date
                    ).format("DD-MM-YYYY")}
                  </td>
                  <td className="table-bordered-td-data"></td>
                  <td className="table-bordered-td-data">
                    {abstract_data.class_of_leaving}
                  </td>
                  <td className="table-bordered-td-data"></td>
                  <td className="table-bordered-td-data"></td>
                  <td className="table-bordered-td-data"></td>
                  <td className="table-bordered-td-data"></td>
                </tr>
              </tbody>
            </table>
          </Paper>
        </Paper>
      );
    }
  }
}

class AdmissionAbstract extends React.Component {
  viewPage = () => {
    let { standard, section } = getUrlParam();
    let searchState = { standard: standard, section: section };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.admission_abstract_list.view.url,
      search: searchParam,
    });
  };
  render() {
    return (
      <div>
        <Grid container>
          <Grid container>
            <ReactToPrint
              trigger={() => (
                <Button
                  variant="contained"
                  color="secondary"
                  className="submit print"
                >
                  <GetAppRoundedIcon />
                  <FormattedMessage {...commonMessages.print} />
                </Button>
              )}
              content={() => this.componentRef}
            />
            <Button
              variant="contained"
              onClick={() => this.viewPage()}
              className="editbutton-view"
            >
              <VisibilityOutlinedIcon className="visibility-icon" />
              <FormattedMessage {...messages.admissionAbstract} />
            </Button>
          </Grid>
          <Abstract {...this.props} ref={(el) => (this.componentRef = el)} />
        </Grid>
      </div>
    );
  }
}

export default withRouter(AdmissionAbstract);

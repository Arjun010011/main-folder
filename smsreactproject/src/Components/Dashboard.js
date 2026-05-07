import React, { Component } from "react";
import "./Dashboard.scss";
import {
  BrowserRouter as Router,
  Route,
  Link,
  Switch,
  withRouter,
} from "react-router-dom";
import TimetableRow from "../Components/TimetableRow/TimetableRowComponent";
import ViewTimetable from "../Components/TimetableRow/ViewTimetable";

//Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

// import Drawer from './Drawer';
import DrawerNew from "./DrawerNew";
import DashboardView from "Containers/General/DashboardView";
// import SettingView from 'Containers/Setting/SettingView';
// import ThemeToggle from 'Components/ThemeToggle'
// import AddFeesType from 'Containers/Finance/AddFeesType'
// import AddFeeTypeAdd from 'Containers/Finance/AddFeeTypeAdd'
// import FeesType from 'Containers/Finance/FeesType'
// import FeesPlan from 'Containers/Finance/FeesPlan'
// import FeePlanView from 'Containers/Finance/FeePlanView';
// import CreateFeePlan from 'Containers/Finance/CreateFeePlan';
// import FeesCollection from 'Containers/Finance/FeesCollection'
// import FeesCollectionView from 'Containers/Finance/FeesCollectionView'
// import ViewFeesTypes from 'Containers/Finance/ViewFeesType'
// import AddApplicationFee from 'Containers/Finance/AddApplicationFee';
// import ApplicationFeeView from 'Containers/Finance/ApplicationFeeView';

// import ManageYear from 'Containers/BasicDetails/ManageYear';
// import AcademicYearList from 'Containers/BasicDetails/AcademicYearList';
// import FinancialYearList from 'Containers/BasicDetails/FinancialYearList'
// import ManageFinancialYear from 'Containers/BasicDetails/ManageFinancialYear'
// import ManageStandard from 'Containers/BasicDetails/ManageStandard';
// import ManageStandardView from 'Containers/BasicDetails/ManageStandardView';
// import ManageSection from 'Containers/BasicDetails/ManageSection';
// import ManageSectionView from 'Containers/BasicDetails/ManageSectionView';
// import ManageSubjects from 'Containers/BasicDetails/ManageSubjects';
// import ManageSubjectView from 'Containers/BasicDetails/ManageSubjectView';
// import BasicSchool from 'Containers/BasicDetails/Components/BasicSchool';
// import StrengthCards from 'Containers/BasicDetails/StrengthCards';
// import DynamicAcadamic from 'Containers/BasicDetails/DynamicAcadamic';

// import NewAddShift from 'Containers/HrManagement/NewAddShift';
// import ShiftsView from 'Containers/HrManagement/ShiftsView';

// import AddLeaveType from 'Containers/LeaveManagement/AddLeaveType';
// import ViewLeaveType from 'Containers/LeaveManagement/ViewLeaveType';
// import AssignedSubjectsView from 'Containers/Enrolement/AssignedSubjectsView';
// import FastEnrollment from 'Containers/Enrolement/FastEnrollment';
import TimetableContainer from "Containers/timetable/TimetableAddContainer";
import AssignTimetable from "Containers/timetable/AssignTimetable";
// import PromoteStudent from 'Containers/Enrolement/PromoteStudent';
// import ShuffleStudent from 'Containers/Enrolement/ShuffleStudent';
// import AssignSubjects from 'Containers/Enrolement/AssignSubjects';
// import HrSubjectAddModify from '../Containers/HrManagement/HrSubjectAddModify';
// import HrSubjectView from '../Containers/HrManagement/HrSubjectView';

// import ApplicationForm from '../Containers/StudentForms/Components/ApplicationForm';
// import AdmissionForm from '../Containers/StudentForms/Components/AdmissionForm'
// import EnquiryForm from 'Containers/StudentForms/Components/EnquiryForm'
// import EnqueryView from 'Containers/StudentForms/EnqueryView'
// import ApplicationView from 'Containers/StudentForms/ApplicationView';
// import AdmissionView from '../Containers/StudentForms/AdmissionView';
// import EnquiryStudentsList from 'Containers/StudentForms/EnquiryStudentsList';
// import ApplicationStudentList from 'Containers/StudentForms/ApplicationStudentList';
// import SchoolBasicView from 'Containers/BasicDetails/SchoolBasicView';
// import Help from './Help';

// import LeaveTypePlan from '../Containers/LeaveManagement/ViewLeaveType'
// import ApplyLeaveManagement from '../Containers/LeaveManagement/ApplyLeaveManagement';
// import AssignShift from './Shifts/AssignShift';
// import LeaveApprovalManagement from '../Containers/LeaveManagement/LeaveApprovalManagement';
import VehicleView from "Containers/Transport/VehicleView";
import AddVehicle from "Containers/Transport/AddVehicle";

import KilometerPriceAllDetail from "Containers/Transport/KilometerPriceAllDetail";
import AddKilometerPrice from "Containers/Transport/AddKilometerPrice";

// import StaffsList from 'Containers/HrManagement/StaffsList'
// import StaffView from 'Containers/HrManagement/StaffView'
// import HrAssignShift from 'Containers/HrManagement/HrAssignShift'
// import HrAssignShiftView from 'Containers/HrManagement/HrAssignShiftView'
// import HolidayCalenderView from 'Containers/General/HolidayCalenderView'
// import ManageHolidayCalender from 'Containers/General/ManageHolidayCalender'
// import HrStaffAttendanceView from 'Containers/HrManagement/HrStaffAttendanceView'
// import HrStaffAttendance from 'Containers/HrManagement/HrStaffAttendance'
// import ManageCountries from 'Containers/General/ManageCountries'
// import CountryView from 'Containers/General/CountryView'
// import ManageStates from 'Containers/General/ManageStates'
// import StateView from 'Containers/General/StateView'
// import ManageDistricts from 'Containers/General/ManageDistricts'
// import DistrictView from 'Containers/General/DistrictView'
// import ManageCities from 'Containers/General/ManageCities'
// import CityView from 'Containers/General/CityView'
// import ManageEventTypes from 'Containers/General/ManageEventTypes'
// import EventTypeView from 'Containers/General/EventTypeView'
// import ManageEvents from 'Containers/General/ManageEvents'
// import EventList from 'Containers/General/EventList'
// import CustomForm from 'Containers/General/CustomForm'
import { Actions, screenTypes } from "Constants/permissions";
// import AssignGroups from 'Containers/GroupsPermissions/AssignGroup';
import AddCustomizeMenu from "Containers/GroupsPermissions/AddCustomizeMenu";
import UploadVideo from "Containers/VideoTutorials/UploadVideo";
import TutorialsView from "Containers/VideoTutorials/TutorialsView";
import VideoList from "Containers/VideoTutorials/Components/VideosList";
import DocumentList from "Containers/VideoTutorials/Components/DocumentList";

import AssignPermissions from "Containers/GroupsPermissions/AssignPermissions";
import PermissionsView from "Containers/GroupsPermissions/PermissionsView";
// import BduUpload from './BDU/BduUpload';
import CommonComponent from "Components/CommonComponent";

import CompanyForm from "Containers/company/components/CompanyForm";
import StudentForm from "Containers/Student/Components/StudentForm";
import StudentList from "Containers/Student/StudentList";
import LeaderBoard from "Containers/LeaderBoard/LeaderBoard";
import PageNotFound from "./PageNotFound";
import DashBoardNew from "Containers/General/DashBoardNew";

var tempCount = 0;
class DashBoard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      urlHeaderMap: {},
      menu: [],
      loading: false,
    };
  }

  componentDidMount() {
    let menu = [];
    Object.keys(Actions).map((action) => {
      const actionValues = { ...Actions[action] };
      Object.keys(actionValues).map((screen, index) => {
        const actionScreen = actionValues[screen];
        if (screenTypes.includes(screen)) {
          if (actionScreen.hasOwnProperty("url") && actionScreen.url) {
            menu.push(
              <Route
                exact
                key={tempCount}
                path={actionScreen.url}
                render={() => actionScreen.component}
              />
            );
          }
        }
        tempCount++;
      });
    });
    this.setState({ menu });
  }

  updateComponent = () => {
    this.props.setAcademicYear(null);
    this.setState(
      {
        loading: true,
      },
      () => {
        this.setState({
          loading: false,
        });
      }
    );
  };

  render() {
    const { menu, loading } = this.state;
    const { props } = this;
    // window.location.reload();

    return (
      <Router>
        <DrawerNew {...props} updateComponent={this.updateComponent}>
          <CommonComponent />
          {/* <DrawerNew {...props}/> */}
          {!loading && (
            <Switch>
              {/* <Route path='/dashboard' render={() => <DashboardView {...props} />} /> */}
              <Route
                path="/dashboard"
                render={() => <DashBoardNew {...props} />}
              />
              {menu}
              <Route path="*" render={() => <PageNotFound {...props} />} />
            </Switch>
          )}
        </DrawerNew>
      </Router>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAcademicYearList: makeSelectAcademicYear(),
});
function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setAcademicYear }, dispatch);
}
export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(DashBoard)
);

// export default withRouter(DashBoard)
// <Route path="/" render={() => <SchoolBasicView {...props} />} />

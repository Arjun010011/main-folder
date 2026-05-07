import AddFeesType from 'Containers/Finance/AddFeesType';
import AddFeeTypeAdd from 'Containers/Finance/AddFeeTypeAdd';
import FeesType from 'Containers/Finance/FeesType';
import FeesPlan from 'Containers/Finance/FeesPlan';
import EnableStudentFeatures from 'Containers/Finance/EnableStudentFeatures';
import FeePlanView from 'Containers/Finance/FeePlanView';
import CreateFeePlan from 'Containers/Finance/CreateFeePlan';
import FeesCollection from 'Containers/Finance/FeesCollection';
import FeesCollectionView from 'Containers/Finance/FeesCollectionView';
import ViewFeesTypes from 'Containers/Finance/ViewFeesType';
import AddApplicationFee from 'Containers/Finance/AddApplicationFee';
import ApplicationFeeView from 'Containers/Finance/ApplicationFeeView';
import AssignPermissions from 'Containers/GroupsPermissions/AssignPermissions';
import PermissionsView from 'Containers/GroupsPermissions/PermissionsView';
import EnableFeaturePopup from 'Containers/Finance/Components/EnableFeaturePopup';

//basic details
import StrengthCards from 'Containers/BasicDetails/StrengthCards';
import DynamicAcadamic from 'Containers/BasicDetails/DynamicAcadamic';

import SchoolBasicView from 'Containers/BasicDetails/SchoolBasicView';
import ManageYear from 'Containers/BasicDetails/ManageYear';
import AcademicYearList from 'Containers/BasicDetails/AcademicYearList';
import FinancialYearList from 'Containers/BasicDetails/FinancialYearList'
import ManageFinancialYear from 'Containers/BasicDetails/ManageFinancialYear'
import ManageStandard from 'Containers/BasicDetails/ManageStandard';
import ManageStandardView from 'Containers/BasicDetails/ManageStandardView';
import ManageSection from 'Containers/BasicDetails/ManageSection';
import ManageSectionView from 'Containers/BasicDetails/ManageSectionView';
import ManageSubjects from 'Containers/BasicDetails/ManageSubjects';
import ManageSubjectView from 'Containers/BasicDetails/ManageSubjectView';
import BasicSchool from 'Containers/BasicDetails/Components/BasicSchool';


//Admin
import HrStaffForm from 'Containers/HrManagement/components/HrStaffForm';
import StaffView from 'Containers/HrManagement/StaffView';

// Student forms
import EnquiryStudentsList from 'Containers/StudentForms/EnquiryStudentsListWithPosterQr';
import EnquiryForm from 'Containers/StudentForms/Components/EnquiryForm';
import EnqueryView from 'Containers/StudentForms/EnqueryView';
import ApplicationStudentList from 'Containers/StudentForms/ApplicationStudentList';
import ApplicationForm from 'Containers/StudentForms/Components/ApplicationForm';
import ApplicationView from 'Containers/StudentForms/ApplicationView';
import AdmissionForm from 'Containers/StudentForms/Components/AdmissionForm';
import AdmissionView from 'Containers/StudentForms/AdmissionView';
import AdmissionStudentList from 'Containers/StudentForms/AdmissionStudentList';

//Student
import StudentForm from 'Containers/Student/Components/StudentForm';
import StudentList from 'Containers/Student/StudentList';
import StudentView from 'Containers/Student/StudentView';

//Enrollment
import AssignedSubjectsView from 'Containers/Enrolement/AssignSectionSubject/AssignedSubjectsView';
import FastEnrollment from 'Containers/Enrolement/FastEnrollment';
import PromoteStudent from 'Containers/Enrolement/PromoteStudent';
import ShuffleStudent from 'Containers/Enrolement/ShuffleStudent';
import AssignSubjects from 'Containers/Enrolement/AssignSubjects';


//HR management
import StaffsList from 'Containers/HrManagement/StaffsList';
import ShiftsView from 'Containers/HrManagement/ShiftsView';
import NewAddShift from 'Containers/HrManagement/NewAddShift';
import HrAssignShiftView from 'Containers/HrManagement/HrAssignShiftView';
import HrAssignShift from 'Containers/HrManagement/HrAssignShift';
import HrAssignCustomShift from 'Containers/HrManagement/HrAssignCustomShift';
import HrStaffAttendanceView from 'Containers/HrManagement/HrStaffAttendanceView';
import HrSubjectView from 'Containers/HrManagement/HrSubjectView';
import HrStaffAttendance from 'Containers/HrManagement/HrStaffAttendance';
import HrSubjectAddModify from 'Containers/HrManagement/HrSubjectAddModify';

//Leave management
import ViewLeaveType from 'Containers/LeaveManagement/ViewLeaveType';
import AddLeaveType from 'Containers/LeaveManagement/AddLeaveType';
import LeavePlan from 'Containers/LeaveManagement/LeavePlan';
import LeavePlanTable from 'Containers/LeaveManagement/LeavePlanTable';
import ApplyLeaveManagement from 'Containers/LeaveManagement/ApplyLeaveManagement';
import LeaveApprovalManagement from 'Containers/LeaveManagement/LeaveApprovalManagement';
import GatePassManagement from 'Containers/GatePass/GatePassManagement';
import AddGatePass from 'Containers/GatePass/AddGatePass';
import GatePassApproval from 'Containers/GatePass/GatePassApproval';


//General
import CountryView from 'Containers/General/CountryView';
import ManageCountries from 'Containers/General/ManageCountries';
import StateView from 'Containers/General/StateView';
import ManageStates from 'Containers/General/ManageStates';
import DistrictView from 'Containers/General/DistrictView';
import ManageDistricts from 'Containers/General/ManageDistricts';
import CityView from 'Containers/General/CityView';
import ManageCities from 'Containers/General/ManageCities';
import HolidayCalenderView from 'Containers/General/HolidayCalenderView';
import ManageHolidayCalender from 'Containers/General/ManageHolidayCalender';

//transport
import VehicleView from 'Containers/Transport/VehicleView';
import AddVehicle from 'Containers/Transport/AddVehicle';
import AddKilometerPrice from 'Containers/Transport/AddKilometerPrice';
import KilometerPriceAllDetail from 'Containers/Transport/KilometerPriceAllDetail';
import AssignVehicleToDriverView from 'Containers/Transport/AssignVehicleToDriverView';
import StudentLocationRegistrationView from 'Containers/Transport/StudentLocationRegistrationView';
import AddRouteArea from 'Containers/Transport/AddRouteArea';
import RouteAreaView from 'Containers/Transport/RouteAreaView';
import RoutePlanAdd from 'Containers/Transport/RoutePlanAdd';
import RouteViewList from 'Containers/Transport/RouteViewList';
import AddStudentLocationRegistration from 'Containers/Transport/AddStudentLocationRegistration';

//Tutorial
import UploadVideo from 'Containers/VideoTutorials/UploadVideo';
import TutorialsView from 'Containers/VideoTutorials/TutorialsView';
import VideosList from 'Containers/VideoTutorials/Components/VideosList';
import DocumentList from 'Containers/VideoTutorials/Components/DocumentList';

import AssignGroups from 'Containers/GroupsPermissions/AssignGroup';
import AddCustomizeMenu from 'Containers/GroupsPermissions/AddCustomizeMenu';
import HeatmapLayer from 'react-google-maps/lib/components/visualization/HeatmapLayer';
import Help from 'Components/Help';
import SettingView from 'Containers/Setting/SettingView';


//Payroll
import AddSalaryComponent from 'Containers/Payroll/AddSalaryComponent'
import ViewSalaryComponent from 'Containers/Payroll/ViewSalaryComponent'
import AddSalaryPlanHelper from 'Containers/Payroll/AddSalaryPlanHelper'
import ViewSalaryPlanHelper from 'Containers/Payroll/ViewSalaryPlanHelper'
import ViewSalaryPlan from 'Containers/Payroll/ViewSalaryPlan';
import AddSalaryPlan from 'Containers/Payroll/AddSalaryPlan';
import ViewSalaryPayment from 'Containers/Payroll/ViewSalaryPayment'
import AddSalaryPayment from 'Containers/Payroll/AddSalaryPayment'
import ViewPayslip from 'Containers/Payroll/ViewPayslip';
import PaySlip from 'Containers/Payroll/PaySlip';
import SalaryProfileView from 'Containers/Payroll/Components/SalaryProfileView'
import Payout from 'Containers/Payroll/Payout'

//certificates
import StudyCertificateList from 'Containers/Certificates/StudyCertificateList';
import StudyCertificate from 'Containers/Certificates/StudyCertificate';
import AdmissionAbstractList from 'Containers/Certificates/AdmissionAbstractList';
import AdmissionAbstract from 'Containers/Certificates/AdmissionAbstract';

//StudentAttendance
import StudentAttendanceRegister from 'Containers/StudentAttendance/StudentAttendanceRegister';
import StudentAttendance from 'Containers/StudentAttendance/StudentAttendance';
import StudentAttendanceReport from 'Containers/StudentAttendance/StudentAttendanceReport';

//Interview
import InterviewSetupList from 'Containers/Interview/InterviewSetupList';
import InterviewSetupForm from 'Containers/Interview/InterviewSetupForm';
import InterviewSetupView from 'Containers/Interview/InterviewSetupView';
import JobApplicationList from 'Containers/Interview/JobApplicationList';
import JobApplicationForm from 'Containers/Interview/JobApplicationForm';
import CandidateList from 'Containers/Interview/CandidateList';
import CandidateEvaluationPage from 'Containers/Interview/CandidateEvaluationPage';
import JobRoleList from 'Containers/Interview/JobRoleList';
import JobRoleForm from 'Containers/Interview/JobRoleForm';

export {
    AddFeesType,
    AddFeeTypeAdd,
    FeesType,
    FeesPlan,
    EnableStudentFeatures,
    FeePlanView,
    CreateFeePlan,
    FeesCollection,
    FeesCollectionView,
    ViewFeesTypes,
    AddApplicationFee,
    ApplicationFeeView,
    AssignPermissions,
    PermissionsView,
    EnableFeaturePopup,
    StrengthCards,
    DynamicAcadamic,
    SchoolBasicView,
    ManageYear,
    AcademicYearList,
    FinancialYearList,
    ManageFinancialYear,
    ManageStandard,
    ManageStandardView,
    ManageSection,
    ManageSectionView,
    ManageSubjects,
    ManageSubjectView,
    BasicSchool,
    HrStaffForm,
    StaffView,
    EnquiryStudentsList,
    EnquiryForm,
    EnqueryView,
    ApplicationStudentList,
    ApplicationForm,
    ApplicationView,
    AdmissionForm,
    AdmissionView,
    AdmissionStudentList,
    StudentForm,
    StudentList,
    StudentView,
    AssignedSubjectsView,
    FastEnrollment,
    PromoteStudent,
    ShuffleStudent,
    AssignSubjects,
    StaffsList,
    ShiftsView,
    NewAddShift,
    HrAssignShiftView,
    HrAssignShift,
    HrAssignCustomShift,
    HrStaffAttendanceView,
    HrSubjectView,
    HrStaffAttendance,
    HrSubjectAddModify,
    ViewLeaveType,
    AddLeaveType,
    LeavePlan,
    LeavePlanTable,
    ApplyLeaveManagement,
    CountryView,
    ManageCountries,
    StateView,
    ManageStates,
    DistrictView,
    ManageDistricts,
    CityView,
    ManageCities,
    HolidayCalenderView,
    ManageHolidayCalender,
    AssignGroups,
    AddCustomizeMenu,
    Help,
    LeaveApprovalManagement,
    GatePassManagement,
    AddGatePass,
    GatePassApproval,
    UploadVideo,
    TutorialsView,
    VideosList,
    DocumentList,
    VehicleView,
    AddVehicle,
    AddKilometerPrice,
    KilometerPriceAllDetail,
    AssignVehicleToDriverView,
    StudentLocationRegistrationView,
    AddRouteArea,
    RouteAreaView,
    RoutePlanAdd,
    RouteViewList,
    AddStudentLocationRegistration,
    SettingView,
    AddSalaryComponent,
    ViewSalaryComponent,
    ViewSalaryPlanHelper,
    AddSalaryPlanHelper,
    ViewSalaryPlan,
    AddSalaryPlan,
    ViewSalaryPayment,
    AddSalaryPayment,
    SalaryProfileView,
    PaySlip,
    ViewPayslip,
    Payout,
    StudyCertificateList,
    StudyCertificate,
    AdmissionAbstractList,
    AdmissionAbstract,
    StudentAttendanceRegister,
    StudentAttendance,
    StudentAttendanceReport,
    InterviewSetupList,
    InterviewSetupForm,
    InterviewSetupView,
    JobApplicationList,
    JobApplicationForm,
    CandidateList,
    CandidateEvaluationPage,
    JobRoleList,
    JobRoleForm,
}
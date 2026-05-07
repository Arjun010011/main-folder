import AdminActions from "./Admin";
import BasicDetailsActions from "./BasicDetails";
import BDUActions from "./BDU";
import CertificateActions from "./Certificate";
// import MDMActions from './MDM';
import DiaryActions from "./Diary";
import EnrollmentActions from "./Enrollment";
import ExamActions from "./Exam";
import ExpensesActions from "./Expenses";
import FinanceActions from "./Finance";
import GeneralActions from "./General";
import HostelsActions from "./Hostel";
import HrManageActions from "./HrManage";
import LeaveManageActions from "./LeaveManage";
import GatePassActions from "./GatePass";
import MiscellaneousActions from "./Miscellaneous";
import MobileApp from "./MobileApp";
import PayrollActions from "./Payroll";
import StoreActions from "./StoreManagement";
import StudentAttendanceActions from "./StudentAttendance";
import StudentFormsActions from "./StudentForms";
import TimeTable from "./TimeTable";
import TransportActions from "./Transport";
import TutorialActions from "./Tutorial";
import QuizActions from "./Quiz";
import SchoolVisitors from "./SchoolVisitors";
import LibraryActions from './Library';
import BiometricActions from './Biometric';
import ReportsActions from './Reports';
import SuperAdminActions from './SuperAdmin';
import DashboardActions from './Dashboard';
import AbacusAction from './Abacus'
import ExamEngineer from './Exam Engineer'
import SurveyForm from 'Constants/permissions/SurveyForm'
import FeedBackForm from 'Constants/permissions/FeedBackForm'
import Exam from './Exam'
import CustomDesignTemplateActions from './CustomDesignTemplate'
import Gallery from './Gallery'
import IdCard from './IdCard'
import Appointment from './Appointment'
import CanteenActions from './Canteen'
import InterviewActions from './Interview'
import LessonPlanningActions from './LessonPlanning'

export const Actions = {
  ...AdminActions,
  ...AbacusAction,
  ...BasicDetailsActions,
  ...CertificateActions,
  ...EnrollmentActions,
  ...FinanceActions,
  ...GeneralActions,
  ...BDUActions,
  ...HrManageActions,
  ...ExamActions,
  ...LeaveManageActions,
  ...GatePassActions,
  ...PayrollActions,
  ...StudentFormsActions,
  ...TransportActions,
  ...TutorialActions,
  ...StudentAttendanceActions,
  ...TimeTable,
  ...ExpensesActions,
  ...DiaryActions,
  ...MiscellaneousActions,
  ...HostelsActions,
  ...StoreActions,
  ...QuizActions,
  ...SchoolVisitors,
  ...LibraryActions,
  ...BiometricActions,
  ...ReportsActions,
  ...SuperAdminActions,
  ...DashboardActions,
  ...ExamEngineer,
  ...SurveyForm,
  ...FeedBackForm,
  ...Exam,
  ...CustomDesignTemplateActions,
  ...Gallery,
  ...IdCard,
  ...Appointment,
  ...CanteenActions,
  ...InterviewActions,
  ...LessonPlanningActions
};

export const MobileAppActions = { ...MobileApp };

export const screenTypes = ["view", "create", "update", "delete"];




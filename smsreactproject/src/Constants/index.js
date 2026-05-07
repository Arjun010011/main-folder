//Theme and Language
export const DEFAULT_LOCALE = "en";
// export const INTL_LANGUAGES = { en: "English", ka: "Kannada" };
export const INTL_LANGUAGES = { en: "English" };
export const DEFAULT_THEME = "blue";

//Token Expiry
export const TOKEN_EXPIRY_BUFFER_TIME = 600; //minutes
export const REFRESH_TOKEN_TIME = 585; //(60 * 9) + 45 -> 9hrs 45mins

export const AMOUNT_MAX_VALUE = 10000000000;
export const DATATABLEROWSPERPAGEOPT = [5, 10, 25, 50, 100];
export const DEFAULTROWSPERPAGEOPT = [10, 50, 100, 125, 200];
export const minDate = new Date("01:01:1900");
export const maxDate = new Date("01:01:2100");

export const lastYearDate = () => {
  let date = new Date();
  date.setMonth(date.getMonth() - 12);
  return date;
};

export const staffAttendanceMaxDate = new Date();
export const maxFileSize = {
  //size in bytes
  img: { size: 10000000, errorText: "Max Image size is 10MB" },
  file: { size: 150000000, errorText: "Max file size is 150MB" },
  video: { size: 150000000, errorText: "Max file size is 150MB" },
};

//Material ui table options
export const options = {
  filterType: "dropdown",
  responsive: "standard",
  filter: false,
  download: false,
  print: false,
  viewColumns: false,
  rowsPerPageOptions: [5, 10, 15, 50, 100],
  rowsPerPage: 15,
  selectableRows: "none",
};

export const USER_OPTIONS = {
  filterType: "dropdown",
  responsive: "standard",
  filter: false,
  download: true,
  print: false,
  viewColumns: false,
  rowsPerPageOptions: [5, 10, 15, 50, 100],
  rowsPerPage: 10,
  selectableRows: "none",
};

export const SORTOPTIONS = {
  filterType: "multiselect",
  responsive: "simple",
  filter: true,
  download: false,
  print: false,
  viewColumns: false,
  rowsPerPageOptions: [5, 10, 15],
  rowsPerPage: 5,
  selectableRows: "none",
};

export const LEAVEOPTIONS = {
  filterType: "dropdown",
  responsive: "simple",
  filter: false,
  download: false,
  print: false,
  viewColumns: false,
  rowsPerPageOptions: [10, 25, 50, 100],
  rowsPerPage: 100,
  selectableRows: "none",
};

export const multiOptions = {
  filterType: "multiselect",
  responsive: "standard",
  filter: true,
  download: true,
  print: true,
  viewColumns: true,
  rowsPerPageOptions: [5, 10, 15, 20, 50, 100],
  rowsPerPage: 10,
  selectableRows: "none",
  downloadOptions: { filename: "table_download.csv", filterOptions: {} },
  filterOptions: {
    useDisplayedColumnsOnly: true,
    useDisplayedRowsOnly: true,
  },
};

export const AWS_BUCKET_URL =
  "https://production-edubricz.s3.ap-south-1.amazonaws.com/";
export const menuImgType = "png";
export const SUCCESS_MSG_PROPS = {
  position: "top-end",
  type: "success",
  showConfirmButton: false,
  timer: 1500,
};
export const TRANSPORT_CODE = "transport";
export const TRANSPORT_ID_CODE = 2;
export const ADMISSION_CODE = "admission";
export const HOSTEL_CODE = "hostel";
export const STORE_CODE = "store";
export const CUSTOM_CODE = "custom";
export const APPROVAL_STATUS = {
  un_approved: "0",
  approved: "1",
  rejected: "2",
  pending: "3",
};
export const includeStaffSection = { driver: [8] };
export const excludeStaffSection = { previous: [8], createUser: [1] };
export const SERVERSIDE_SEARCH_BUFFER_TIME = 2000;
export const DEFAULT_PAGINATION_PROPS = {
  rowsPerPage: 10,
  page: 0,
  sortOrder: { name: "name", direction: "asc" },
};

export const DEFAULT_PAGINATION_WITHOUT_SORT_PROPS = {
  rowsPerPage: 10,
  page: 0,
};

export const DEFAULT_PAGINATION_PROPS_PERPAGE_5 = {
  rowsPerPage: 5,
  page: 0,
  sortOrder: { name: "name", direction: "asc" },
};

export const DEFAULT_PAGINATION_PROPS_STUDENT_LIST = {
  rowsPerPage: 10,
  page: 0,
  sortOrder: { name: "id", direction: "desc" },
};

export const minDateValue = new Date("01:01:1900");
export const maxDateValue = new Date("01:01:2100");
export const settings =
  localStorage.getItem("settings") != "undefined"
    ? JSON.parse(localStorage.getItem("settings"))
    : "";
export const roundOffDecimal = settings
  ? settings?.["decimal_round_off"]?.["value"]
  : 0;
export const DEFAULT_PAGINATION_PROPS_ID_LIST = {
  rowsPerPage: 10,
  page: 0,
  sortOrder: { name: "id", direction: "desc" },
};
export const DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST = {
  rowsPerPage: 10,
  page: 0,
  sortOrder: { name: "first_name", direction: "asc" },
};
export const DEFAULT_PAGINATION_PROPS_FIRST_NAME_LIST = {
  rowsPerPage: 200,
  page: 0,
  sortOrder: { name: "first_name", direction: "asc" },
};
export const DEFAULT_PAGINATION_PROPS_USERNAME_LIST = {
  rowsPerPage: 250,
  page: 0,
  sortOrder: { name: "first_name", direction: "asc" },
};
export const image_formats = {
  type: ["jpeg", "jpg", "png"],
  error: "Supported Images JPEG, JPG, PNG",
};
const SUPER_ADMIN_ID = 1;
const ADMIN_ID = 2;
const TEACHER_ID = 6;
export const ADMIN_IDS = [SUPER_ADMIN_ID, ADMIN_ID];
export { SUPER_ADMIN_ID, ADMIN_ID, TEACHER_ID };

export const support_docs_upload = {
  file_types: [
    "doc",
    "docx",
    "odt",
    "txt",
    "jpeg",
    "xls",
    "xlsx",
    "jpg",
    "pdf",
    "png",
    "pptx",
    "ppt",
    "mp4",
    "mov",
    "wmv",
  ],
  error:
    "Supported Documents doc, docx, odt, txt, xls, xlsx, jpeg, jpg, pdf, png, pptx, ppt, mp4, mov, wmv",
};

export const support_notification_upload = {
  file_types: [
    "doc",
    "docx",
    "odt",
    "mp3",
    "txt",
    "jpeg",
    "xls",
    "xlsx",
    "jpg",
    "pdf",
    "png",
    "pptx",
    "ppt",
    "mp4",
    "mov",
    "wmv",
    "webm",
  ],
  error:
    "Supported Documents doc, docx, odt, txt, xls, xlsx, jpeg, jpg, pdf, png, pptx, ppt, mp4, mov, wmv",
};

export const reasonType = {
  school: "school_visitor",
  hostel: "hostel_visitor",
  adjustment: "adjustment",
};

export const address_types = {
  address_one_type: ["street_number", "route", "sublocality_level_3"],
  address_two_type: [
    "neighborhood",
    "sublocality_level_1",
    "sublocality_level_2",
  ],
  city_type: ["locality"],
  district_type: ["administrative_area_level_2", "administrative_area_level_3"],
  state_type: ["administrative_area_level_1"],
  country_type: ["country"],
  pincode_type: ["postal_code"],
};

export const deposit_type = {
  1: "Deposite",
  2: "Withdraw",
  3: "Returned Back",
};

export const languageList = [
  { name: "English", id: "en", hide: false },
  { name: "Amharic", id: "am", hide: true },
  { name: "Arabic", id: "ar", hide: true },
  { name: "Bangla", id: "bn", hide: true },
  { name: "Belarusian", id: "be", hide: true },
  { name: "Bulgarian", id: "bg", hide: true },
  { name: "Chinese (Hong Kong)", id: "yue-hant", hide: true },
  { name: "Chinese (Simplified)", id: "zh", hide: true },
  { name: "Chinese (Traditional)", id: "zh-hant", hide: true },
  { name: "French", id: "fr", hide: true },
  { name: "German", id: "de", hide: true },
  { name: "Greek", id: "el", hide: true },
  { name: "Gujarati", id: "gu", hide: true },
  { name: "Hebrew", id: "he", hide: true },
  { name: "Hindi", id: "hi", hide: true },
  { name: "Italian", id: "it", hide: true },
  { name: "Japanese", id: "ja", hide: true },
  { name: "Kannada", id: "kn", hide: false },
  { name: "Malayalam", id: "ml", hide: true },
  { name: "Marathi", id: "mr", hide: true },
  { name: "Nepali", id: "ne", hide: true },
  { name: "Odia", id: "or", hide: true },
  { name: "Persian", id: "fa", hide: true },
  { name: "Portuguese (Brazil)", id: "pt", hide: true },
  { name: "Punjabi", id: "pa", hide: true },
  { name: "Russian", id: "ru", hide: true },
  { name: "Sanskrit", id: "sa", hide: true },
  { name: "Serbian", id: "sr", hide: true },
  { name: "Sinhala", id: "si", hide: true },
  { name: "Spanish", id: "es", hide: true },
  { name: "Tamil", id: "ta", hide: true },
  { name: "Telugu", id: "te", hide: false },
  { name: "Tigrinya", id: "ti", hide: true },
  { name: "Ukrainian", id: "uk", hide: true },
  { name: "Urdu", id: "ur", hide: true },
  { name: "Vietnamese", id: "vi", hide: true },
];

export const modules = {
  toolbar: [
    [{ font: [] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ["link"],
    ["clean"],
  ],
};

export const formats = [
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "align",
  "color",
  "background",
  "link",
];

export const supported_documet_submitted = {
  type: ["jpeg", "jpg", "png", "pdf"],
  error: "Supported Documents JPEG, JPG, PNG, PDF ",
};

export const supported_documet_bulk_upload = {
  type: [
    "aac",
    "doc",
    "docx",
    "odt",
    "mp3",
    "txt",
    "jpeg",
    "xls",
    "xlsx",
    "jpg",
    "pdf",
    "png",
    "pptx",
    "ppt",
    "mp4",
    "mov",
    "wmv",
    "webm",
  ],
  error:
    "Supported Documents aac, doc, docx, odt, txt, xls, xlsx, jpeg, jpg, pdf, png, pptx, ppt, mp4, mov, wmv",
  files:
    ".aac, .doc, .docx, .odt, .mp3, .txt, .jpeg, .xls, .xlsx, .jpg, .pdf, .png, .pptx, .ppt, .mp4, .mov, .wmv, .webm",
};

export const alphabet = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
];

export const relation_ship = {
  elderbrother: "Elder Brother",
  eldersister: "Elder Sister",
  youngerbrother: "Younger Brother",
  youngersister: "Younger Sister",
  twins: "Twins",
};

export const NOT_INCLUDE_FEE_LIST = ["transport"];

export const MODE_OF_PAYMENTS = [
  { id: "Cash", name: "Cash" },
  { id: "Netbanking", name: "Netbanking" },
  { id: "UPIPayments", name: "UPIPayments" },
  { id: "Cheque", name: "Cheque" },
  { id: "Online", name: "Online" },
  { id: "Debit", name: "Debit Card" },
  { id: "Credit", name: "Credit Card" },
];

export const STUDENT_TYPE = [
  { id: "new_student", name: "New Student" },
  { id: "old_student", name: "Old Student" },
];

export const HIDE_BRANCH = ["/dashboard"];

export const HIDE_BOARD = ["/dashboard"];

export const TERMS_LIST = [
  { id: "Term1", name: "Term1" },
  { id: "Term2", name: "Term2" },
  { id: "Term3", name: "Term3" },
  { id: "Term4", name: "Term4" },
  { id: "Term5", name: "Term5" },
  { id: "Term6", name: "Term6" },
  { id: "Term7", name: "Term7" },
  { id: "Term8", name: "Term8" },
  { id: "Term9", name: "Term9" },
  { id: "Term10", name: "Term10" },
  { id: "Term11", name: "Term11" },
  { id: "Term12", name: "Term12" },
  { id: "Term13", name: "Term13" },
  { id: "Term14", name: "Term14" },
  { id: "Term15", name: "Term15" },
  { id: "Term16", name: "Term16" },
  { id: "Term17", name: "Term17" },
  { id: "Term18", name: "Term18" },
  { id: "Term19", name: "Term19" },
  { id: "Term20", name: "Term20" },
];

export const DIVIDE_TERMS_LIST = [
  { id: 1, name: "Term1" },
  { id: 2, name: "Term2" },
  { id: 3, name: "Term3" },
  { id: 4, name: "Term4" },
  { id: 5, name: "Term5" },
  { id: 6, name: "Term6" },
  { id: 7, name: "Term7" },
  { id: 8, name: "Term8" },
  { id: 9, name: "Term9" },
  { id: 10, name: "Term10" },
  { id: 11, name: "Term11" },
  { id: 12, name: "Term12" },
  { id: 13, name: "Term13" },
  { id: 14, name: "Term14" },
  { id: 15, name: "Term15" },
  { id: 16, name: "Term16" },
  { id: 17, name: "Term17" },
  { id: 18, name: "Term18" },
  { id: 19, name: "Term19" },
  { id: 20, name: "Term20" },
];

export const IMPORT_CONFIGURATION_STUDENT_LIST = [
  { id: "Direct", name: "Direct" },
  { id: "admission_num", name: "admission_num" },
  { id: "full_name", name: "full_name" },
  { id: "first_name", name: "first_name" },
];

export const IMPORT_ADMISSION_CONFIGURATION_STUDENT_LIST = [
  { id: "Direct", name: "Direct" },
  { id: "username", name: "username" },
  { id: "full_name", name: "full_name" },
  { id: "first_name", name: "first_name" },
];

export const IMPORT_CONFIGURATION_STAFF_LIST = [
  { id: "Direct", name: "Direct" },
  { id: "full_name", name: "full_name" },
  { id: "first_name", name: "first_name" },
];

export const FROM_ACTIVE_USER_TYPE = [
  { id: "Today", name: "Today" },
  { id: "This Week", name: "This Week" },
  { id: "This Month", name: "This Month" },
  { id: "This Academic Year", name: "This Academic Year" },
];

export const FROM_ACTIVE_USER_STATUS = [
  { id: "All", name: "All" },
  { id: "Active Users", name: "Active Users" },
  { id: "In Active Users", name: "In Active Users" },
  { id: "Total Logged in Users", name: "Total Logged in Users" },
  { id: "Total Not Logged in Users", name: "Total Not Logged in Users" },
];

export const GRADE_TYPES = [
  { id: "0", name: "Marks" },
  { id: "1", name: "Percentage" },
  { id: "2", name: "Grade Only" },
];

export const GENDER_LIST = [
  { name: "Boy", id: "Boy" },
  { name: "Girl", id: "Girl" },
];

export const COLOR_MAP = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  yellow: "#FFFF00",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  gray: "#808080",
  lightgray: "#D3D3D3",
  darkgray: "#A9A9A9",
  brown: "#A52A2A",
  orange: "#FFA500",
  purple: "#800080",
  pink: "#FFC0CB",
  lightpink: "#FFB6C1",
  darkred: "#8B0000",
  lightblue: "#ADD8E6",
  skyblue: "#87CEEB",
  turquoise: "#40E0D0",
  lime: "#00FF00",
  gold: "#FFD700",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000",
  coral: "#FF7F50",
  slategray: "#708090",
  violet: "#EE82EE",
  salmon: "#FA8072",
  peachpuff: "#FFDAB9",
  khaki: "#F0E68C",
  wheat: "#F5DEB3",
  lawngreen: "#7CFC00",
  mediumseagreen: "#3CB371",
  seagreen: "#2E8B57",
  cadetblue: "#5F9EA0",
  darkorchid: "#9932CC",
  chocolate: "#D2691E",
  lightsalmon: "#FFA07A",
  mediumslateblue: "#7B68EE",
};

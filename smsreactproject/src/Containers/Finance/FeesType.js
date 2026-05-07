import React, { Component } from "react";
import { withRouter, Link } from "react-router-dom";
import { Grid, Paper, Box, Button, Snackbar, Tooltip, TextField, MenuItem } from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Swal from "sweetalert2";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import LoadingGif from "Components/LoadingGif";
import { amountRegex } from "Constants/regularExpression";
import AllMUIDataTable from "Components/AllMUIDataTable";
import {
  SUCCESS_MSG_PROPS,
  ADMISSION_CODE,
  TRANSPORT_CODE,
  HOSTEL_CODE,
  STORE_CODE,
  CUSTOM_CODE,
} from "Constants";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { getRequest, postRequest, putRequest, deleteRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import {
  getKeyValueInArray,
  Alert,
  getSettingValue,
  getUrlParam,
} from "Includes/functions";
import FeesTypesFields from "Containers/Finance/Components/FeesTypesFields";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const options = {
  selectableRows: "none",
  filterType: "dropdown",
  responsive: "standard",
  filter: false,
  download: false,
  print: false,
  viewColumns: false,
  rowsPerPageOptions: [],
  rowsPerPage: 5,
};

const isResidentail = parseInt(getSettingValue("is_residential"));
const fee_config = JSON.parse(localStorage.getItem("fee_configurations"))
  ? JSON.parse(localStorage.getItem("fee_configurations"))
  : {};
const is_fee_group_enabled = fee_config?.["is_fee_group_enabled"]
  ? fee_config?.["is_fee_group_enabled"] == 1
    ? true
    : false
  : false;
const fee_plan_types = fee_config?.["fee_plan_types"];

let feeTypeFieldDetails = [
  {
    label: "Is Mandatory",
    regex: null,
    name: "is_mandatory",
    md: 6,
    className: "fee-plan-width",
    required: true,
    lg: 6,
    hideSelect: true,
    id: "outlined-textarea",
    default: "1",
    rows: null,
    type: "radio",
    maxLength: 25,
    allowDuplicates: true,
    gridClassName: "width-250-px mb-20 margin-right-20 flex-full-width",
    allow_duplicates: true,
  },
];

const globalGroupField = [
  {
    label: "Fee Group",
    regex: null,
    name: "fee_group",
    md: 4,
    className: "fee-plan-width ",
    required: true,
    lg: 6,
    hideSelect: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "drop_down",
    maxLength: 100,
    allowDuplicates: true,
    gridClassName: "width-250-px mb-20 margin-right-20",
  },
];

const globalStudentGroupField = [
  {
    label: "Student Group",
    list: [],
    regex: null,
    name: "student_group",
    md: 4,
    className: "w-webkit-fill-available",
    required: true,
    lg: 6,
    hideSelect: true,
    id: "outlined-textarea",
    default: { name: "All", id: "all" },
    rows: null,
    type: "dropDownWithSearch",
    maxLength: 100,
    allowDuplicates: true,
    gridClassName: "width-250-px mb-20 margin-right-20",
  },
  {
    label: "Gender",
    regex: null,
    name: "gender",
    list: [
      { name: "All", id: "all" },
      { name: "Boy", id: "Boy" },
      { name: "Girl", id: "Girl" },
    ],
    md: 4,
    className: "w-webkit-fill-available",
    required: true,
    lg: 6,
    hideSelect: true,
    id: "outlined-textarea",
    default: { name: "All", id: "all" },
    rows: null,
    type: "dropDownWithSearch",
    maxLength: 100,
    allowDuplicates: true,
    gridClassName: "width-250-px mb-20 margin-right-20",
  },
  {
    label: "Is New Student",
    regex: null,
    name: "is_new_student",
    list: [
      { name: "All", id: "all" },
      { name: "Yes", id: 1 },
      { name: "No", id: 0 },
    ],
    md: 4,
    className: "w-webkit-fill-available",
    required: true,
    lg: 6,
    hideSelect: true,
    id: "outlined-textarea",
    default: { name: "All", id: "all" },
    rows: null,
    type: "dropDownWithSearch",
    maxLength: 100,
    allowDuplicates: true,
    gridClassName: "width-250-px mb-20 margin-right-20",
  },
];

let duplicateCombinationNames = ["fee_type"];
const feePlanTypesArrForDup = fee_plan_types ? fee_plan_types.split(",").map(s => s.trim()) : [];
if (feePlanTypesArrForDup.includes("1")) duplicateCombinationNames.push("student_group");
if (feePlanTypesArrForDup.includes("2")) duplicateCombinationNames.push("gender");
if (feePlanTypesArrForDup.includes("3")) duplicateCombinationNames.push("is_new_student");

let duplicateCombinations = [
  {
    names: duplicateCombinationNames,
    errorMessage: <FormattedMessage {...commonMessages.duplicateFoundLabel} />,
  },
];

feeTypeFieldDetails = [
  ...feeTypeFieldDetails,
  ...[
    {
      label: "Fee Type",
      regex: null,
      name: "fee_type",
      md: 4,
      className: "w-webkit-fill-available",
      required: true,
      lg: 6,
      hideSelect: true,
      id: "outlined-textarea",
      default: "",
      rows: null,
      type: "dropDownWithSearch",
      maxLength: 100,
      allowDuplicates: fee_plan_types ? true : false,
      gridClassName: "width-250-px mb-20 margin-right-20",
    },
    {
      label: "Amount",
      regex: amountRegex,
      name: "amount",
      md: 4,
      className: "fee-plan-width ",
      required: true,
      lg: 6,
      is_amount_field: true,
      id: "outlined-textarea",
      default: "",
      rows: null,
      type: "amount",
      maxLength: 15,
      allowDuplicates: true,
      gridClassName: "width-250-px mb-20 margin-right-20",
    },
  ],
];

class FeesType extends Component {
  constructor() {
    super();
    this.state = {
      standardids: [],
      yearid: null,
      year: 0,
      feesTypeList: [],
      availableFeeTypeList: [],
      fees: 0,
      transportFeeTypeId: null,
      selectedFeesType: [],
      table: [],
      loading: true,
      selectedStatndardFeeDetails: [],
      standardSelectedArray: [],
      stateFeeTypeFieldDetails: null,
      snackbar: { show: false, data: "" },
      submitDisabled: false,
      isBlankPage: false,
      isEdit: false,
      editMode: false,
      copyMode: false,
      copySourceYear: '',
      copySourceStandard: '',
      copyTargetYear: '',
      copyYearList: [],
      copyStandardList: [],
      copySourceLoading: false,
      existingFeeTypeIds: [],
      fieldDefaultValue: [],
      selectedFeesTypeTesting: [
        {
          fee_type: 0,
          amount: "",
          sub_fee_type: {},
        },
      ],
      studentType: <FormattedMessage {...commonMessages.dayScholar} />,
      columns: [
        {
          name: "fee_type_name_field",
          label: <FormattedMessage {...messages.viewFeeTermFeeType} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "amount",
          label: <FormattedMessage {...commonMessages.amount} />,
          options: {
            filter: false,
            sort: true,
          },
        },
      ],
    };
  }

  componentDidMount() {
    let { standardids, yearid, studentType, editMode, copyMode } = getUrlParam();
    let feeTypeDetails = [...feeTypeFieldDetails];
    editMode = editMode === 'true';
    copyMode = copyMode === 'true';

    if (copyMode) {
      // Copy mode: don't need standardids/yearid from URL
      if (is_fee_group_enabled) {
        feeTypeDetails = [...feeTypeDetails, ...globalGroupField];
      }
      const feePlanTypesArr = fee_plan_types ? fee_plan_types.split(",").map(s => s.trim()) : [];
      if (feePlanTypesArr.length > 0) {
        if (feePlanTypesArr.includes("1")) feeTypeDetails.unshift(globalStudentGroupField[0]);
        if (feePlanTypesArr.includes("2")) feeTypeDetails.unshift(globalStudentGroupField[1]);
        if (feePlanTypesArr.includes("3")) feeTypeDetails.unshift(globalStudentGroupField[2]);
      }
      this.setState({
        copyMode: true,
        stateFeeTypeFieldDetails: [...feeTypeDetails],
        studentType: studentType || 'Day Scholar',
      }, () => {
        this.loadCopyModeYearList();
      });
      return;
    }

    if (standardids && yearid) {
      standardids = standardids.split(",");
      if (is_fee_group_enabled) {
        feeTypeDetails = [...feeTypeDetails, ...globalGroupField];
      }
      const feePlanTypesArr = fee_plan_types ? fee_plan_types.split(",").map(s => s.trim()) : [];
      if (feePlanTypesArr.length > 0) {
        let existingFeeTypeDetails = [...feeTypeDetails];
        feeTypeDetails = [...existingFeeTypeDetails];

        if (feePlanTypesArr.includes("1")) {
          feeTypeDetails.unshift(globalStudentGroupField[0]);
        }

        if (feePlanTypesArr.includes("2")) {
          feeTypeDetails.unshift(globalStudentGroupField[1]);
        }

        if (feePlanTypesArr.includes("3")) {
          feeTypeDetails.unshift(globalStudentGroupField[2]);
        }
      }
      this.setState({
        stateFeeTypeFieldDetails: [...feeTypeDetails],
      });
      this.setState({ standardids, yearid, studentType, editMode }, () => {
        this.getYearList();
        this.getAddFeesTypeList();
      });
    } else {
      this.props.history.push(Actions.assigned_fee_types.view.url);
    }
  }

  getFeetypeList = () => {
    const { standardids, yearid } = this.state;
    let params = {
      academic_year: yearid,
      standard_id: standardids.toString(),
      is_active: true,
    };
    getRequest(GET_URL.getFeeTypes.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const resultData = { data: response.data.data.fee_types };
        let standardSelectedArray = resultData.data.map((t) => t.name);
        let selectedStatndardFeeDetails = [];
        for (let section = 0; section < resultData.data.length; section++) {
          if (
            standardSelectedArray.includes(resultData.data[section]["name"])
          ) {
            for (
              let sectionFeeType = 0;
              sectionFeeType < resultData.data[section]["fee_types"].length;
              sectionFeeType++
            ) {
              let data = resultData.data[section]["fee_types"][sectionFeeType];
              data["name"] = resultData.data[section]["name"];
              if (data.codename === TRANSPORT_CODE) {
                data.amount = <div>{data.amount}%</div>;
              }
              data.fee_type_name_field = (
                <div>
                  {data.fee_type_name}
                  {parseInt(data.is_mandatory) === 1 && (
                    <span className="madatory-field">*</span>
                  )}
                </div>
              );
              selectedStatndardFeeDetails.push(data);
            }
          }
        }
        let columns = [...this.state.columns];
        if (standardSelectedArray.length > 1) {
          let data = [
            {
              name: "name",
              label: "Standard",
              options: {
                filter: true,
                sort: true,
              },
            },
          ];
          columns = data.concat([...this.state.columns]);
        }
        this.setState(
          {
            table: resultData.data,
            standardSelectedArray,
            columns,
            selectedStatndardFeeDetails,
          },
          () => {
            this.getStudentGroup();
            if (is_fee_group_enabled) {
              this.getGroupList();
            } else {
              this.setAvailablefeeTypeList();
            }
          }
        );
      }
    });
  };

  getStudentGroup = () => {
    let { stateFeeTypeFieldDetails } = this.state;
    const url = GET_URL.getstudentgroups.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.unshift({ id: "all", name: "All" });
        stateFeeTypeFieldDetails.map((data) => {
          if (data.name === "student_group") {
            data.list = response.data.data;
          }
        });
        this.setState({
          stateFeeTypeFieldDetails,
        });
      }
    });
  };

  getGroupList = () => {
    let { stateFeeTypeFieldDetails } = this.state;
    const url = GET_URL.feegroup.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        stateFeeTypeFieldDetails.map((data) => {
          if (data.name === "fee_group") {
            data.list = response.data.data;
          }
        });
        this.setState(
          {
            stateFeeTypeFieldDetails,
          },
          () => {
            this.setAvailablefeeTypeList();
          }
        );
      }
    });
  };

  getAddFeesTypeList = () => {
    const params = { is_active: true };
    getRequest(GET_URL.addFeeType.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const feesTypeList = response.data;
        this.setState(
          {
            feesTypeList: feesTypeList.data,
            isBlankPage: feesTypeList.data.length === 0 ? true : false,
          },
          () => {
            this.getFeetypeList();
          }
        );
      }
    });
  };

  setFeeCollectionAcademicYear = (yearList) => {
    const { yearid } = this.state;
    let temp = yearList.filter((t) => t.id === parseInt(yearid));
    this.setState({ year: temp[0].name });
  };

  getYearList = () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      const url = GET_URL.getacademicyear.api;
      const params = { is_active: true, is_finance_page: true };
      getRequest(url, params, this.props).then((response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data;
          this.setFeeCollectionAcademicYear(yearList);
          this.props.setAcademicYear(yearList);
        }
      });
    } else {
      this.setFeeCollectionAcademicYear(storedYearList);
    }
  };

  // ── Copy Mode Methods ───────────────────────────────────

  loadCopyModeYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true, is_finance_page: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data.data;
        this.setState({ copyYearList: yearList });
        this.props.setAcademicYear(yearList);
        // Also load all fee types (needed for building defaults)
        this.loadCopyModeFeeTypes();
      }
    });
  };

  loadCopyModeFeeTypes = () => {
    const params = { is_active: true };
    getRequest(GET_URL.addFeeType.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const feesTypeList = response.data.data;
        let { stateFeeTypeFieldDetails } = this.state;
        stateFeeTypeFieldDetails.map((field) => {
          if (field.name === 'fee_type') field.list = feesTypeList;
          if (field.name === 'is_mandatory') {
            field.radioOptions = [{ id: '1', name: 'Yes' }, { id: '0', name: 'No' }];
            field.value = '1';
          }
          if (field.name === 'student_type') {
            field.list = [
              { id: 'Both', name: 'Both' },
              { id: 'Residential', name: 'Residential' },
              { id: 'Day Scholar', name: 'Day Scholar' },
            ];
          }
        });
        this.setState({ feesTypeList, stateFeeTypeFieldDetails, loading: false });
        // Also load student groups
        this.getStudentGroup();
        if (is_fee_group_enabled) this.getGroupList();
      }
    });
  };

  onCopySourceYearChange = (e) => {
    const copySourceYear = e.target.value;
    this.setState({ copySourceYear, copySourceStandard: '', copyStandardList: [], fieldDefaultValue: [] });
    // Fetch standards for this year
    const params = {
      academic_year: copySourceYear,
      is_active: true,
    };
    getRequest(GET_URL.getFeeTypes.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standards = response.data.data.fee_types || [];
        const copyStandardList = standards.map((s) => ({
          id: s.id,
          name: s.name,
          fee_types: s.fee_types || [],
        }));
        this.setState({ copyStandardList });
      }
    });
  };

  onCopySourceStandardChange = (e) => {
    const copySourceStandard = e.target.value;
    this.setState({ copySourceStandard, copySourceLoading: true }, () => {
      this.buildCopyModeDefaults();
    });
  };

  onCopyTargetYearChange = (e) => {
    this.setState({ copyTargetYear: e.target.value });
  };

  buildCopyModeDefaults = () => {
    const { copyStandardList, copySourceStandard, feesTypeList } = this.state;
    const feePlanTypesArr = fee_plan_types ? fee_plan_types.split(',').map(s => s.trim()) : [];
    let fieldDefaultValue = [];

    const stdData = copyStandardList.find(s => s.id === copySourceStandard);
    if (!stdData) {
      this.setState({ fieldDefaultValue: [], copySourceLoading: false });
      return;
    }

    (stdData.fee_types || []).forEach((ft) => {
      const feeTypeObj = feesTypeList.find(f => f.id === ft.fee_type);
      if (!feeTypeObj) return;

      let row = {
        fee_type: feeTypeObj,
        amount: ft.codename === TRANSPORT_CODE ? 1 : ft.amount,
        is_mandatory: String(ft.is_mandatory),
      };

      if (feePlanTypesArr.includes('1')) {
        row.student_group = ft.student_group
          ? { id: ft.student_group, name: ft.student_group_name || '' }
          : { id: 'all', name: 'All' };
      }
      if (feePlanTypesArr.includes('2')) {
        row.gender = ft.gender && ft.gender !== 'all'
          ? { id: ft.gender, name: ft.gender }
          : { id: 'all', name: 'All' };
      }
      if (feePlanTypesArr.includes('3')) {
        if (ft.is_new_student != null) {
          const isNewName = ft.is_new_student === 1 || ft.is_new_student === true ? 'Yes' : 'No';
          row.is_new_student = { id: ft.is_new_student, name: isNewName };
        } else {
          row.is_new_student = { id: 'all', name: 'All' };
        }
      }
      if (isResidentail) {
        row.student_type = ft.student_type || 'Both';
      }
      if (is_fee_group_enabled && ft.fee_group) {
        row.fee_group = ft.fee_group;
      }
      fieldDefaultValue.push(row);
    });

    this.setState({ fieldDefaultValue, copySourceLoading: false });
  };

  copyAllFeePlans = () => {
    const { copySourceYear, copyTargetYear, studentType, copyYearList } = this.state;
    if (!copySourceYear) {
      this.setState({ snackbar: { show: true, data: 'Please select a source academic year' } });
      return;
    }
    if (!copyTargetYear) {
      this.setState({ snackbar: { show: true, data: 'Please select a target academic year' } });
      return;
    }
    const sourceYearName = copyYearList.find(y => y.id === parseInt(copySourceYear))?.name || copySourceYear;
    const targetYearName = copyYearList.find(y => y.id === parseInt(copyTargetYear))?.name || copyTargetYear;

    Swal.fire({
      title: 'Copy All Fee Plans?',
      text: `This will copy ALL fee plans from ${sourceYearName} to ${targetYearName}. Standards that already have fee plans in the target year will be skipped.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Copy All',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.value) {
        this.setState({ submitDisabled: true });
        const payload = {
          source_academic_year: copySourceYear,
          target_academic_year: copyTargetYear,
        };
        postRequest(POST_URL.copyallfeeplan.api, payload, this.props).then(
          (response) => {
            if (response && response.status === 200) {
              let msg = response.data.Reason || 'Fee plans copied successfully';
              if (response.data.skipped_standards && response.data.skipped_standards.length > 0) {
                msg += `\nSkipped: ${response.data.skipped_standards.join(', ')}`;
              }
              const url = `${Actions.assigned_fee_types.view.url}?studentType=${studentType}`;
              this.props.history.push(url);
              Swal.fire({
                ...SUCCESS_MSG_PROPS,
                title: msg,
              });
            }
            this.setState({ submitDisabled: false });
          }
        );
      }
    });
  };
  updateFeeType = (selectedFeesTypeTesting) => {
    const { transportFeeTypeId } = this.state;
    selectedFeesTypeTesting.map((feeType) => {
      if (transportFeeTypeId === feeType.fee_type.id) {
        feeType.amount_disabled = true;
        feeType.amount = 1;
      } else {
        feeType.amount_disabled = false;
      }
    });
    this.setState({
      selectedFeesTypeTesting,
    });
  };

  checkFeetypeList = (value) => {
    if (isResidentail) {
      return this.checkFeetypeListForResidential(value);
    } else {
      const { selectedFeesTypeTesting } = this.state;
      let name = this.state.feesTypeList.filter((data) => {
        return data.id === value;
      });
      let test2 = selectedFeesTypeTesting.some((t) => t.fee_type === value);
      let test = this.state.table.some((data) => {
        return data.fee_types.some((t) => t.fee_type_name === name[0].name);
      });
      return test || test2;
    }
  };

  checkFeetypeListForResidential = (value) => {
    let studentTypeCount = 0;
    for (let index = 0; index < this.state.table.length; index++) {
      for (
        let feeIndex = 0;
        feeIndex < this.state.table[index].fee_types.length;
        feeIndex++
      ) {
        let feeType = this.state.table[index].fee_types[feeIndex];
        if (
          feeType.fee_type === value &&
          (feeType.student_type === "Both" || !feeType.student_type)
        ) {
          return true;
        } else if (
          feeType.fee_type === value &&
          (feeType.student_type !== "Both" || feeType.student_type)
        ) {
          studentTypeCount += 1;
        }
      }
    }
    if (studentTypeCount > 1) {
      return true;
    }
    return false;
  };

  setAvailablefeeTypeList = () => {
    const { feesTypeList, stateFeeTypeFieldDetails } = this.state;
    if (feesTypeList) {
      let availableFeeTypeList = [];
      let transportFeeTypeId = null;
      feesTypeList.some((feeType, index) => {
        if (fee_plan_types || !this.checkFeetypeList(feeType.id)) {
          availableFeeTypeList.push(feeType);
          if (feeType.codename === TRANSPORT_CODE) {
            transportFeeTypeId = feeType.id;
          }
        }
      });

      stateFeeTypeFieldDetails.map((field) => {
        if (field.name === "fee_type") {
          field.list = availableFeeTypeList;
        }
        if (field.name === "is_mandatory") {
          field.radioOptions = [
            { id: "1", name: "Yes" },
            { id: "0", name: "No" },
          ];
          field.value = "1";
        }
        if (field.name === "student_type") {
          field.list = [
            { id: "Both", name: "Both" },
            { id: "Residential", name: "Residential" },
            { id: "Day Scholar", name: "Day Scholar" },
          ];
        }
      });

      // Build edit mode defaults BEFORE setting loading to false
      // so FeesTypesFields mounts with pre-filled data
      let editDefaults = {};
      if (this.state.editMode) {
        editDefaults = this.buildEditModeDefaults();
      }

      this.setState({
        stateFeeTypeFieldDetails,
        transportFeeTypeId,
        isBlankPage: this.state.editMode ? false : (availableFeeTypeList.length === 0 ? true : false),
        loading: false,
        ...editDefaults,
      });
    }
  };

  buildEditModeDefaults = () => {
    const { table, feesTypeList, standardids } = this.state;
    const feePlanTypesArr = fee_plan_types ? fee_plan_types.split(",").map(s => s.trim()) : [];
    let fieldDefaultValue = [];
    let existingFeeTypeIds = [];

    table.forEach((stdData) => {
      if (standardids.includes(String(stdData.id))) {
        (stdData.fee_types || []).forEach((ft) => {
          // Find matching fee type object from feesTypeList
          const feeTypeObj = feesTypeList.find(f => f.id === ft.fee_type);
          if (!feeTypeObj) return;

          let row = {
            fee_type: feeTypeObj,
            amount: ft.codename === TRANSPORT_CODE ? 1 : ft.amount,
            is_mandatory: String(ft.is_mandatory),
            _existing_id: ft.id,  // track for update
          };

          // Student group
          if (feePlanTypesArr.includes("1")) {
            if (ft.student_group) {
              row.student_group = { id: ft.student_group, name: ft.student_group_name || '' };
            } else {
              row.student_group = { id: 'all', name: 'All' };
            }
          }

          // Gender
          if (feePlanTypesArr.includes("2")) {
            if (ft.gender && ft.gender !== 'all') {
              row.gender = { id: ft.gender, name: ft.gender };
            } else {
              row.gender = { id: 'all', name: 'All' };
            }
          }

          // Is new student
          if (feePlanTypesArr.includes("3")) {
            if (ft.is_new_student != null) {
              const isNewName = ft.is_new_student === 1 || ft.is_new_student === true ? 'Yes' : 'No';
              row.is_new_student = { id: ft.is_new_student, name: isNewName };
            } else {
              row.is_new_student = { id: 'all', name: 'All' };
            }
          }

          // Student type (residential)
          if (isResidentail) {
            row.student_type = ft.student_type || 'Both';
          }

          // Fee group
          if (is_fee_group_enabled && ft.fee_group) {
            row.fee_group = ft.fee_group;
          }

          existingFeeTypeIds.push(ft.id);
          fieldDefaultValue.push(row);
        });
      }
    });

    return {
      fieldDefaultValue,
      existingFeeTypeIds,
      selectedFeesTypeTesting: fieldDefaultValue.map(row => ({ ...row })),
    };
  };

  validate = () => {
    let { selectedFeesTypeTesting } = this.state;
    let feesTypeTest;
    let showError = "";
    feesTypeTest = this.refs.feesType.validateFields();
    if (feesTypeTest) {
      return true;
    } else {
      this.setState({
        submitDisabled: false,
        payload: false,
      });
      return false;
    }
  };
  getParameters = () => {
    const {
      standardids,
      yearid,
      selectedFeesTypeTesting,
      feesTypeList,
      studentType,
    } = this.state;
    let fee_types = [];
    let payload = {
      academic_year: yearid,
      standard: standardids,
    };
    selectedFeesTypeTesting.map((data) => {
      const codename = getKeyValueInArray(
        feesTypeList,
        "id",
        data.fee_type?.id,
        "codename"
      );
      let feeType = {
        fee_type: data.fee_type.id,
        sub_fee_type: {},
        amount: data.amount,
        is_mandatory:
          data.is_mandatory === "1" || data.is_mandatory === true ? 1 : 0,
        codename,
      };
      if (is_fee_group_enabled) {
        feeType["fee_group"] = data.fee_group;
      }
      if (ADMISSION_CODE === codename && feeType.is_mandatory === 0) {
        const snackbar = {
          data: <FormattedMessage {...messages.feestypeAdmissionMandatory} />,
          show: true,
        };
        this.setState({ snackbar });
        payload = false;
        return false;
      }
      if (TRANSPORT_CODE === codename && feeType.is_mandatory === 1) {
        const snackbar = {
          data: (
            <FormattedMessage {...messages.feestypeTransportNonMandatory} />
          ),
          show: true,
        };
        this.setState({ snackbar });
        payload = false;
        return false;
      }
      if (HOSTEL_CODE === codename && feeType.is_mandatory === 1) {
        const snackbar = {
          data: <FormattedMessage {...messages.feestypeHostelNonMandatory} />,
          show: true,
        };
        this.setState({ snackbar });
        payload = false;
        return false;
      }
      if (CUSTOM_CODE === codename && feeType.is_mandatory === 1) {
        const snackbar = {
          data: <FormattedMessage {...messages.feestypeCustomNonMandatory} />,
          show: true,
        };
        this.setState({ snackbar });
        payload = false;
        return false;
      }
      if (STORE_CODE === codename && feeType.is_mandatory === 1) {
        const snackbar = {
          data: <FormattedMessage {...messages.feestypeStoreNonMandatory} />,
          show: true,
        };
        this.setState({ snackbar });
        payload = false;
        return false;
      } else if (STORE_CODE === codename) {
        feeType["store_details"] = [];
        data.store_list.map((store_data) => {
          feeType["store_details"].push({
            stock: store_data.id,
            quantity: parseInt(store_data.quantity),
            selling_price: parseFloat(store_data.unit_price),
          });
        });
      }
      feeType["student_type"] = studentType;
      if (fee_plan_types) {
        // When fee_plan_types is enabled, always include these fields consistently
        // (backend requires same field set for all rows with the same fee_type)
        const feePlanTypesArrPayload = fee_plan_types.split(",").map(s => s.trim());
        if (feePlanTypesArrPayload.includes("1")) {
          feeType["student_group"] = data?.student_group?.id !== "all" ? data?.student_group?.id : null;
        }
        if (feePlanTypesArrPayload.includes("2")) {
          feeType["gender"] = data?.gender?.id && data?.gender?.id !== "all" ? data?.gender?.id : null;
        }
        if (feePlanTypesArrPayload.includes("3")) {
          feeType["is_new_student"] = data?.is_new_student?.id != null && data?.is_new_student?.id !== "all" ? data?.is_new_student?.id : null;
        }
      } else {
        if (data?.student_group?.id !== "all")
          feeType["student_group"] = data?.student_group?.id;
        if (data?.gender?.id && data?.gender?.id !== "all")
          feeType["gender"] = data?.gender?.id;
        if (data?.is_new_student?.id != null && data?.is_new_student?.id !== "all")
          feeType["is_new_student"] = data?.is_new_student?.id;
      }
      fee_types.push(feeType);
    });
    if (payload === false) {
      return false;
    }
    payload["fee_types"] = fee_types;
    return payload;
  };
  saveData = async () => {
    let validate = this.validate();
    if (validate) {
      this.setState({ submitDisabled: true });
    } else {
      this.setState({ submitDisabled: false });
    }
    const { selectedFeesTypeTesting, studentType, editMode, copyMode, standardids, yearid, copyTargetYear, copySourceStandard } = this.state;
    let index = selectedFeesTypeTesting.findIndex(
      (fee) => fee.fee_type === 0 || fee.amount === "" || fee.fee_type === ""
    );
    const payload = this.getParameters();
    if (index === -1 && payload !== false && validate === true) {
      if (copyMode) {
        // Copy mode: POST as new fee plan to target year
        if (!copyTargetYear) {
          this.setState({ snackbar: { show: true, data: 'Please select a target academic year' }, submitDisabled: false });
          return;
        }
        if (!copySourceStandard) {
          this.setState({ snackbar: { show: true, data: 'Please select a source standard' }, submitDisabled: false });
          return;
        }
        // Override payload with target year and source standard
        payload.academic_year = copyTargetYear;
        payload.standard = [copySourceStandard];
        postRequest(POST_URL.feetypes.api, payload, this.props).then(
          (response) => {
            if (response && response.status === 200) {
              const url = `${Actions.assigned_fee_types.view.url}?studentType=${studentType}`;
              this.props.history.push(url);
              Swal.fire({
                ...SUCCESS_MSG_PROPS,
                title: "Fee Plan has been copied successfully",
              });
            }
            this.setState({ submitDisabled: false });
          }
        );
      } else if (editMode) {
        // Edit mode: non-destructive edit in place (preserves existing payments)
        try {
          payload.is_edit = true;
          // Include existing FeeStandardMapping IDs so backend can match & update
          payload.fee_types = payload.fee_types.map((ft, idx) => {
            const existingId = selectedFeesTypeTesting[idx]?._existing_id;
            if (existingId) ft.id = existingId;
            return ft;
          });
          const response = await postRequest(POST_URL.feetypes.api, payload, this.props);
          if (response && response.status === 200) {
            const url = `${Actions.assigned_fee_types.view.url}?studentType=${studentType}`;
            this.props.history.push(url);
            Swal.fire({
              ...SUCCESS_MSG_PROPS,
              title: "Fee Plan has been updated",
            });
          }
        } catch (err) {
          // handle error silently
        }
        this.setState({ submitDisabled: false });
      } else {
        postRequest(POST_URL.feetypes.api, payload, this.props).then(
          (response) => {
            if (response && response.status === 200) {
              const url = `${Actions.assigned_fee_types.view.url}?studentType=${studentType}`;
              this.props.history.push(url);
              Swal.fire({
                ...SUCCESS_MSG_PROPS,
                title: "Your Data has been saved",
              });
            }
            this.setState({
              submitDisabled: false,
            });
          }
        );
      }
      this.setState({
        selectedFeesTypeTesting,
      });
    } else {
      this.setState({ submitDisabled: false });
    }
  };

  handleCloseSnackbar = () => {
    const snackbar = { show: false, data: "" };
    this.setState({ snackbar });
  };

  render() {
    const {
      loading,
      standardSelectedArray,
      selectedFeesTypeTesting,
      year,
      stateFeeTypeFieldDetails,
      snackbar,
      submitDisabled,
      studentType,
      isBlankPage,
      copyMode,
      copyYearList,
      copyStandardList,
      copySourceYear,
      copySourceStandard,
      copyTargetYear,
      copySourceLoading,
    } = this.state;
    const url = `${Actions.assigned_fee_types.view.url}?studentType=${studentType}`;
    const gridxl = isResidentail ? "8" : "10";
    const gridlg = isResidentail ? "10" : "10";
    if (loading) return <LoadingGif />;

    const pageTitle = copyMode ? 'Copy Fee Plan' : this.state.editMode ? 'Edit Fee Plan' : 'Fee Plan';

    return (
      <>
        <Paper className="paper-background">
          <Box>
            <Grid item container>
              <Grid item md={6} xs={12} className="header-align">
                <Box className="heading">{pageTitle}</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  <Button
                    variant="contained"
                    component={Link}
                    to={url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" /> View{" "}
                    {Actions.assigned_fee_types.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>

            {/* Copy mode: show source/target dropdowns */}
            {copyMode && (
              <Box mt={3} mb={2}>
                <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 16 }}>
                  <TextField
                    select
                    label="Source Academic Year"
                    value={copySourceYear}
                    onChange={this.onCopySourceYearChange}
                    variant="outlined"
                    size="small"
                    style={{ minWidth: 200 }}
                  >
                    {copyYearList.map((y) => (
                      <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Target Academic Year"
                    value={copyTargetYear}
                    onChange={this.onCopyTargetYearChange}
                    variant="outlined"
                    size="small"
                    style={{ minWidth: 200 }}
                    disabled={!copySourceYear}
                  >
                    {copyYearList.filter(y => y.id !== parseInt(copySourceYear)).map((y) => (
                      <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Source Standard"
                    value={copySourceStandard}
                    onChange={this.onCopySourceStandardChange}
                    variant="outlined"
                    size="small"
                    style={{ minWidth: 200 }}
                    disabled={!copySourceYear}
                  >
                    {copyStandardList.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </TextField>

                  {copySourceYear && copyTargetYear && (
                    <Button
                      variant="contained"
                      color="secondary"
                      disabled={submitDisabled}
                      onClick={this.copyAllFeePlans}
                    >
                      Copy All Standards
                    </Button>
                  )}
                </Box>
                {copySourceLoading && <Box mt={1}>Loading fee types...</Box>}
              </Box>
            )}

            {/* Standard info (non-copy modes) */}
            {!copyMode && (
              <Box>
                <Box className="md-up-justify-start md-down-justify-space-evenly mb-y-20">
                  <Box className="year-std-box" mr={2}>
                    <Box className="academic-std-head">
                      {" "}
                      <FormattedMessage {...commonMessages.academicYear} />{" "}
                    </Box>
                    <Box className="aca-std-white-background">{year}</Box>
                  </Box>

                  <Box className="year-std-box standards-create-fee" mr={2}>
                    <Box className="academic-std-head">
                      {standardSelectedArray.length > 1 ? (
                        <FormattedMessage {...commonMessages.standards} />
                      ) : (
                        <FormattedMessage {...commonMessages.standard} />
                      )}
                    </Box>
                    <Box className="academic-std-body">
                      {standardSelectedArray.map((std, index) => {
                        return (
                          <Box className="aca-std-white-background" key={index}>
                            {std}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                  {!!isResidentail && (
                    <Box className="year-std-box">
                      <Box className="academic-std-head">
                        {" "}
                        <FormattedMessage {...commonMessages.studentType} />{" "}
                      </Box>
                      <Box className="aca-std-white-background" mr={4}>
                        {studentType}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            <Grid item container>
              {isBlankPage ? (
                <Grid item xl={12} lg={12} xs={12}>
                  <BlankPagewithIcon data="There are no feetypes, please add" />
                </Grid>
              ) : (
                <Grid item xl={gridxl} lg={gridlg} xs={12}>
                  {stateFeeTypeFieldDetails && (!copyMode || (copySourceStandard && this.state.fieldDefaultValue.length > 0)) && (
                    <FeesTypesFields
                      key={copyMode ? `copy-${copySourceStandard}` : 'normal'}
                      fieldDefaultValue={(this.state.editMode || copyMode) ? this.state.fieldDefaultValue : []}
                      fieldDetails={stateFeeTypeFieldDetails}
                      required={["fee_type", "amount"]}
                      updateParent={this.updateFeeType}
                      ref={"feesType"}
                      duplicateCombinations={duplicateCombinations}
                    />
                  )}
                  {selectedFeesTypeTesting.length > 0 && (
                    <Box className="submt-button-float-bottom" mt={3}>
                      <Button
                        variant="contained"
                        color="primary"
                        className="submit"
                        disabled={submitDisabled}
                        onClick={this.saveData}
                      >
                        {copyMode ? 'Copy & Save' : 'submit'}
                      </Button>
                    </Box>
                  )}
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar.show}
          autoHideDuration={2000}
          onClose={this.handleCloseSnackbar}
        >
          <Alert onClose={this.handleCloseSnackbar} severity="error">
            {snackbar.data}
          </Alert>
        </Snackbar>
      </>
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
  connect(mapStateToProps, mapDispatchToProps)(FeesType)
);

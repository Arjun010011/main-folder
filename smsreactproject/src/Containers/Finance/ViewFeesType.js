import React, { Component } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Icon,
  Checkbox,
  Hidden,
  Snackbar,
  Tooltip,
  Tabs,
  Tab,
  Menu,
  MenuItem,
} from "@material-ui/core";
import GetAppIcon from '@material-ui/icons/GetApp';
import PrintIcon from '@material-ui/icons/Print';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import EditOutlinedIcon2 from '@material-ui/icons/EditOutlined';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import classNames from "classnames";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import _ from "lodash";
import { FormattedMessage } from 'react-intl';

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';

import { Dropdown } from "Components/DropDown";
import FeeTypeIndividualEditDialog from "Containers/Finance/Components/FeeTypeIndividualEditDialog";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import LoadingGif from "Components/LoadingGif";
import CircularProgress from '@material-ui/core/CircularProgress';
import Card from "Components/Card";
import {
  getRequest,
  deleteRequest,
  putRequest,
  postRequest,
} from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL, POST_URL } from "Includes/urls";
import {
  checkLocalAcademicYear,
  isUserHasPermission,
  Alert,
  SetAcademicYear,
  getSettingValue,
  numberWithCommas,
  getUrlParam,
  updatePermissions,
  getLocalStorageDetails,
  printPDFService,
} from "Includes/functions";
import { amountRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  SUCCESS_MSG_PROPS,
  APPROVAL_STATUS,
  TRANSPORT_CODE,
  ADMISSION_CODE,
} from "Constants";
import "./styles.scss";
import student from "./FeeCollection/student";
import messages from './messages';
import commonMessages from 'Constants/messages';
import FeePlanEditDialog from 'Containers/Finance/Components/FeePlanEditDialog';
import FeePlanTableView from 'Containers/Finance/Components/FeePlanTableView';

const isResidential = parseInt(getSettingValue('is_residential'));

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}
const fee_config = JSON.parse(localStorage.getItem('fee_configurations')) ? JSON.parse(localStorage.getItem('fee_configurations')) : {}
const is_fee_group_enabled = fee_config?.['is_fee_group_enabled'] ? fee_config?.['is_fee_group_enabled'] == 1 ? true : false : false

const fieldDetails = [
  {
    label: "Amount",
    regex: amountRegex,
    name: "amount",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "amount",
    autoFocus: true,
    maxLength: 15,
  },
];

const studentTypeList = [
  { id: 'Day Scholar', name: 'Day Scholar' },
  { id: 'Residential', name: 'Residential' }
];

if (isResidential) {
  fieldDetails.push(
    {
      label: "Student type",
      name: "student_type",
      md: 12,
      className: "width-100",
      required: true,
      id: "outlined-textarea",
      default: "",
      rows: null,
      type: "dropDown",
      autoFocus: true,
      maxLength: 6,
      list: studentTypeList,
      hideSelect: true
    }
  )
}

const columnsHeader = [
  { name: "fee_type_name_field", label: "Fee Type", className: "width-45 text-align-center font-weight-bold" },
  { name: "amount", label: "Amount", className: "width-45", "is_amount_field": true },
  { name: "enabledActions", label: "", className: "width-10" },
];

class ViewFeesType extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('assigned_fee_types', ['update', 'delete', 'create']);
    this.state = {
      selectedStandard: 'ALL',
      yearList: [],
      year: '',
      year_error: '',
      yearName: '',
      selectedStandardList: [],
      feesTypeList: [],
      feeTypeswithVariablePlans: {},
      totalFeeDetails: {},
      fieldValues: {},
      fullyApprovedFeeStdMap: [],
      snackbar: { show: false, data: "" },
      closeMenu: true,
      selectedStudentType: 'Day Scholar',
      cardLoading: true,
      totDaySchAmount: {},
      totResAmount: {},
      blankData: '',
      loading: true,
      handleEditDialog: false,
      selectedFeeTypes: {},
      viewTab: 0, // 0 = Card View, 1 = Table View
      downloadingPdf: false,
      editingFeeType: null,
      anchorElFeeType: null,
      menuFeeType: null,
    };
    this.updateFeeTypeData = this.updateFeeTypeData.bind(this);
  }

  onChange = (e) => {
    let name = e.target.name;
    let value = e.target.value;
    if (value === 0) {
      return false;
    }
    if (name == 'year') {
      SetAcademicYear(value);
      if (value != 0) {
        this.setState({
          year_error: ''
        })
      }
    }
    this.setState({ [name]: value, cardLoading: true }, () => {
      this.getFeeTypes(name);
    })
  };

  getFeeTypes = (name) => {
    const url = GET_URL.getFeeTypes.api;
    let params = { academic_year: this.state.year, is_active: true };
    const { selectedStudentType } = this.state;
    if (selectedStudentType == 'Residential') {
      params['student_type'] = 'R';
    }
    if (selectedStudentType === 'Day Scholar') {
      params['student_type'] = 'D'
    }
    this.setState({ cardLoading: true })
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let feesTypeList = response.data.data;
        this.setState({
          selectedStandardList: [],
          cardLoading: false,
          blankData: feesTypeList.fee_types.length === 0 ? <FormattedMessage {...messages.viewFeesTypeStandardNotFound} /> : ''
        });
        this.updateFeeTypeData(feesTypeList);
      } else {
        this.setState({
          cardLoading: false
        })
      }
    });
  };

  componentDidMount() {
    let { studentType } = getUrlParam();
    if (!!studentType) {
      this.setState({ selectedStudentType: studentType })
    }
    this.getYearsList();
  }

  updateFeeTypeData = (feeTypes) => {
    const { closeMenu } = this.state;
    let totalFeeDetails = {};
    let totResAmount = {};
    let totDaySchAmount = {};
    let fullyApprovedFeeStdMap = [];
    let feesTypeList = feeTypes.fee_types.map((val) => {
      let amount = 0;
      let is_approved = false;
      let residentialTotAmount = 0;
      let dayScholarTotAmount = 0;
      val.fee_types.forEach((stdFeeDetails) => {
        is_approved = stdFeeDetails.is_approved === APPROVAL_STATUS.approved;
        stdFeeDetails.standard = val.id;
        stdFeeDetails.stdName = val.name;
        stdFeeDetails.previousAmount = stdFeeDetails.amount;
        let actions = this.permission
        if (TRANSPORT_CODE === stdFeeDetails.codename) {
          stdFeeDetails.amount = `${stdFeeDetails.amount}`;
          actions = ["delete"];
        } else {
          amount = amount + stdFeeDetails.amount;
          if (isResidential) {
            residentialTotAmount += !(stdFeeDetails.student_type === 'Day Scholar') ? stdFeeDetails.amount : 0;
            dayScholarTotAmount += !(stdFeeDetails.student_type === 'Residential') ? stdFeeDetails.amount : 0;
          }
          stdFeeDetails.is_amount_field = true;
        }
        stdFeeDetails.tooltipData = {};
        if (feeTypes.hasOwnProperty(`${stdFeeDetails.codename}_plan_details`)) {
          let tooltipData = [];
          feeTypes[`${stdFeeDetails.codename}_plan_details`].forEach((plan) => {
            let data = "";
            for (let [key, value] of Object.entries(plan)) {
              if (!!data) {
                data += ", ";
              }
              if (value) {
                data += key + ": " + value;
              }
            }
            data = <div>{data}</div>;
            tooltipData.push(data);
            tooltipData.push(<br />);
          });
          stdFeeDetails.tooltipData = { amount: tooltipData };
        }
        if (stdFeeDetails.is_approved === APPROVAL_STATUS.approved) {
          actions = [];
        }
        stdFeeDetails.fee_type_name_field = (
          <div>
            <div>
              {stdFeeDetails.fee_type_name}
              {parseInt(stdFeeDetails.is_mandatory) === 1 && (
                <Tooltip
                  className="pointer"
                  title="Mandatory Fee type"
                  placement="top-start"
                  arrow
                >
                  <span className="madatory-field">*</span>
                </Tooltip>
              )}
            </div>
            {(stdFeeDetails.student_group_name || stdFeeDetails.gender || stdFeeDetails.is_new_student) && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                {stdFeeDetails.student_group_name && (
                  <span style={{
                    fontSize: '10px', background: '#e8f0fe', color: '#4986FF',
                    padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                  }}>
                    {stdFeeDetails.student_group_name}
                  </span>
                )}
                {stdFeeDetails.gender && stdFeeDetails.gender !== 'all' && (
                  <span style={{
                    fontSize: '10px', background: '#fce8f3', color: '#d63384',
                    padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                  }}>
                    {stdFeeDetails.gender}
                  </span>
                )}
                {stdFeeDetails.is_new_student && (
                  <span style={{
                    fontSize: '10px', background: '#e8f5e9', color: '#2e7d32',
                    padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                  }}>
                    {stdFeeDetails.is_new_student === 1 || stdFeeDetails.is_new_student === true ? 'New' : 'Old'}
                  </span>
                )}
              </div>
            )}
          </div>
        );
        if (stdFeeDetails.is_approved !== APPROVAL_STATUS.approved) {
          const feeRowData = { ...stdFeeDetails };
          stdFeeDetails.enabledActions = (
            <Box
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                this.setState({ anchorElFeeType: e.currentTarget, menuFeeType: feeRowData });
              }}
            >
              <MoreHorizIcon style={{ color: '#b5b5c3', fontSize: '20px' }} />
            </Box>
          );
        }
        else {
          stdFeeDetails.enabledActions = ''
        }
      });
      val.is_approved = is_approved;

      if (is_approved) {
        fullyApprovedFeeStdMap.push(val.id);
      }
      totalFeeDetails[val.name] = amount;
      totResAmount[val.name] = residentialTotAmount;
      totDaySchAmount[val.name] = dayScholarTotAmount;
      return val;
    });

    this.setState({
      feesTypeList,
      feeTypeswithVariablePlans: feeTypes,
      totalFeeDetails,
      totResAmount,
      totDaySchAmount,
      fullyApprovedFeeStdMap,
      loading: false,
    });
  };

  getYearsList = () => {
    let storedYearList = this.props.getAcademicYearList;
    if (!storedYearList) {
      let params = { is_active: true, is_finance_page: true };
      getRequest(GET_URL.getacademicyear.api, params, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const yearList = response.data.data;
            this.setFeeCollectionAcademicYear(yearList);
            this.props.setAcademicYear(yearList);
          }
        }
      );
    } else {
      this.setFeeCollectionAcademicYear(storedYearList);
    }
  };

  setFeeCollectionAcademicYear = (yearList) => {
    const year = checkLocalAcademicYear(yearList);
    this.setState({ yearList, year: year ? year : '', loading: year ? true : false }, () => {
      if (year) {
        this.setState({ year_error: '' })
        this.getFeeTypes(year, "year");
      } else {
        this.setState({ cardLoading: false, blankData: 'Select Year' })
      }
    });
  };

  deleteFeeType = (id, rowData) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete ${rowData?.fee_type_name || 'this fee type'}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (Boolean(result['value'])) {
        const url = DEL_URL.feetypes.api + id + "/";
        deleteRequest(url, {}, this.props).then((response) => {
          if (response && response.status === 200) {
            this.getFeeTypes(this.state.year, "year");
            Swal.fire({
              ...SUCCESS_MSG_PROPS,
              title: response.data.Reason,
            });
          }
        });
      }
    });
  };

  updateFeeType = (fieldValues, id, rowData) => {
    const { year, totalFeeDetails, selectedStudentType } = this.state;
    const total =
      totalFeeDetails[rowData.stdName] +
      parseFloat(fieldValues["amount"]) -
      rowData.previousAmount;
    let studentType = 'Day Scholar';
    if (isResidential) {
      studentType = fieldValues["student_type"]
    }
    let payload = {
      academic_year: year,
      codename: rowData.codename,
      amount: parseFloat(fieldValues["amount"]),
      sub_fee_type: {},
      standard: rowData.standard,
      fee_type: rowData['fee_type'],
      student_type: studentType
    };
    // standard,
    // academic_year,codename, amount
    const url = PUT_URL.feetypes.api + id + "/";
    putRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: 'top-end',
          type: 'success',
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500
        }).then(
          this.getFeeTypes(this.state.year, "year")
        );
      }
    });
  };

  deleteCard = (id) => {
    const url = POST_URL.feetypesdeleteall.api;
    const params = {
      academic_year: this.state.year,
      standard: id,
    };
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (Boolean(result['value'])) {
        postRequest(url, params, this.props).then((response) => {
          if (response && response.status === 200) {
            let feesTypeList = this.state.feesTypeList.map((feeType) => {
              if (feeType.id === id) {
                feeType.fee_types = [];
              }
              return feeType;
            });
            let feeTypeswithVariablePlans = {
              ...this.state.feeTypeswithVariablePlans,
            };
            feeTypeswithVariablePlans.fee_types = feesTypeList;
            this.updateFeeTypeData(feeTypeswithVariablePlans);
            Swal.fire({
              ...SUCCESS_MSG_PROPS,
              title: `FeesTypes for ${alias_names['standard']} have been deleted`,
            });
          }
        });
      }
    });
  };

  closeMenuAction = (closeMenu) => {
    this.setState({ closeMenu, errorContent: "" }, () => {
      let feeTypeswithVariablePlans = {
        ...this.state.feeTypeswithVariablePlans,
      };
      feeTypeswithVariablePlans.fee_types = this.state.feesTypeList;
      this.updateFeeTypeData(feeTypeswithVariablePlans);
    });
  };

  checkBoxFun = (id) => {
    var { selectedStandardList } = this.state;
    let index = selectedStandardList.indexOf(id);
    if (index === -1) {
      selectedStandardList.push(id);
      this.setState({
        selectedStandardList: selectedStandardList,
      });
    } else {
      selectedStandardList.splice(index, 1);
      this.setState({
        selectedStandardList: selectedStandardList,
      });
    }
  };

  addFeeType = () => {
    const { year, selectedStandardList, selectedStudentType } = this.state;
    if (!year) {
      const snackbar = {
        data: <FormattedMessage {...commonMessages.academicYearError} />,
        show: true,
      };
      this.setState({ snackbar });
    } else if (selectedStandardList.length < 1) {
      const snackbar = {
        data: <FormattedMessage {...messages.viewFeesTypeSelectOneStandardToEdit} />,
        show: true,
      };
      this.setState({ snackbar });
    } else {
      let searchState = { yearid: year, standardids: selectedStandardList.join(','), studentType: selectedStudentType }
      let searchParam = "?" + new URLSearchParams(searchState).toString()
      this.props.history.push({
        pathname: Actions.assigned_fee_types.create.url,
        search: searchParam,
      });
    }
  };

  copyFeeType = () => {
    this.props.history.push({
      pathname: Actions.assigned_fee_types.create.url,
      search: '?copyMode=true',
    });
  };

  handleCloseSnackbar = () => {
    const snackbar = { show: false, data: "" };
    this.setState({ snackbar });
  };

  getSubheader = (standardName) => {
    let { totalFeeDetails, totResAmount, totDaySchAmount, selectedStudentType } = this.state;
    if (!isResidential) {
      return <Box><FormattedMessage {...commonMessages.totalAmount} /> : {numberWithCommas(totalFeeDetails[standardName])}</Box>
    } else if (selectedStudentType === 'Residential') {
      return <Box><FormattedMessage {...commonMessages.totalAmount} /> : {numberWithCommas(totResAmount[standardName])}</Box>
    }
    else if (selectedStudentType === 'Day Scholar') {
      return <Box><FormattedMessage {...commonMessages.totalAmount} /> : {numberWithCommas(totDaySchAmount[standardName])}</Box>
    }
    else {
      if (totResAmount[standardName] === totDaySchAmount[standardName]) {
        return <Box><FormattedMessage {...commonMessages.totalAmount} /> : {numberWithCommas(totDaySchAmount[standardName])}</Box>
      } else {
        return <Box style={{ marginTop: '-10px' }}>
          <Box style={{ fontSize: '14px' }}>Residential <FormattedMessage {...commonMessages.totalAmount} /> - {numberWithCommas(totResAmount[standardName])}</Box>
          <Box style={{ fontSize: '14px' }}>DayScholar <FormattedMessage {...commonMessages.totalAmount} /> - {numberWithCommas(totDaySchAmount[standardName])}</Box>
        </Box>
      }
    }
  }

  editCard = (index) => {
    const { feesTypeList, handleEditDialog } = this.state;
    this.setState({
      selectedFeeTypes: feesTypeList[index],
      handleEditDialog: !handleEditDialog
    })
  }

  editAllFeeTypes = (standardFee) => {
    const { year, selectedStudentType } = this.state;
    let searchState = {
      yearid: year,
      standardids: String(standardFee.id),
      studentType: selectedStudentType,
      editMode: true,
    };
    let searchParam = '?' + new URLSearchParams(searchState).toString();
    this.props.history.push({
      pathname: Actions.assigned_fee_types.create.url,
      search: searchParam,
    });
  }

  handleEditClose = () => {
    this.setState({
      handleEditDialog: false
    })
  }

  updateParent = () => {
    this.getFeeTypes()
    this.setState({
      handleEditDialog: false
    })
  }

  buildGroupedFeeTypes = () => {
    const { feesTypeList } = this.state;
    const grouped = {};
    feesTypeList.forEach((standardFee) => {
      const feeTypes = standardFee.fee_types || [];
      // Build distinct groups from the data
      const groupMap = new Map();
      feeTypes.forEach((ft) => {
        // Build group key from student_group, gender, is_new_student
        const parts = [];
        const nameParts = [];
        if (ft.student_group_name) {
          parts.push(`sg_${ft.student_group}`);
          nameParts.push(ft.student_group_name);
        }
        if (ft.gender && ft.gender !== 'all') {
          parts.push(`g_${ft.gender}`);
          nameParts.push(ft.gender);
        }
        if (ft.is_new_student != null) {
          parts.push(`ns_${ft.is_new_student}`);
          nameParts.push(ft.is_new_student === 1 || ft.is_new_student === true ? 'New Student' : 'Old Student');
        }
        const groupId = parts.length > 0 ? parts.join('_') : 'all';
        const groupName = nameParts.length > 0 ? nameParts.join(' · ') : 'All';
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, { groupId, groupName, totalAmount: 0, feeTypes: [] });
        }
        const group = groupMap.get(groupId);
        const ftName = ft.fee_type_name || ft.fee_type_name_field?.props?.children?.[0]?.props?.children?.[0] || ft.fee_type_name_field?.props?.children?.[0] || '';
        group.feeTypes.push({ ...ft, fee_type_name: ftName });
        if (ft.codename !== 'transport') {
          group.totalAmount += parseFloat(ft.amount) || 0;
        }
      });
      // Sort: "all" first, then alphabetical
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.groupId === 'all') return -1;
        if (b.groupId === 'all') return 1;
        return a.groupName.localeCompare(b.groupName);
      });
      grouped[standardFee.id] = groups;
    });
    return grouped;
  }

  handleDownloadPdf = (standardId) => {

    const { year } = this.state;

    if (!year || !standardId) return;

    const url = `${GET_URL.getFeeTermPlan.api}?academic_year=${year}&standard=${standardId}&download_pdf=1`;

    const props = { ...this.props, url };

    printPDFService(props);

  };

  handleDownloadAllPdf = async () => {

    const { year } = this.state;

    if (!year) return;

    this.setState({ downloadingPdf: true });

    try {

      let url = `${GET_URL.getFeeTermPlan.api}?academic_year=${year}&download_all=1&download_pdf=1`;
      let props = { ...this.props };
      props.url = url;

      await printPDFService(props);

    } finally {
      this.setState({ downloadingPdf: false });
    }

  };

  render() {
    const {
      year,
      yearList,
      feesTypeList,
      selectedStandardList,
      fullyApprovedFeeStdMap,
      loading,
      snackbar,
      selectedStudentType,
      year_error,
      blankData,
      handleEditDialog,
      selectedFeeTypes,
      selectedStandard
    } = this.state;
    if (loading) return <LoadingGif />;
    
    // UI Filtering Safety
    const filteredFeesTypeList = selectedStandard === 'ALL' || !selectedStandard
      ? feesTypeList
      : feesTypeList.filter(fee => String(fee.id) === String(selectedStandard));

    return (
      <>
        <Paper className="paper-background">
          <Box>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading"> Fee Plan </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {getLocalStorageDetails('user', 'object')?.is_superuser && (
                    <Button
                      variant="contained"
                      onClick={() => this.copyFeeType()}
                      className="editbutton-view"
                    >
                      <FileCopyOutlinedIcon className="visibility-icon" />{" "}
                      Copy Fee Plan
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="submt-button-float-bottom">
              <Button
                variant="contained"
                onClick={() => this.addFeeType()}
                className="editbutton-view"
              >
                <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                {Actions.assigned_fee_types.create.label}
              </Button>
            </Box>
            <Grid container>
              <Box display='flex' flexWrap="wrap" mt={4}>
                <Box mb={2} mr={2}>
                  <Dropdown
                    data={yearList}
                    name="year"
                    value={year}
                    onChange={this.onChange}
                    label={<FormattedMessage {...commonMessages.academicYear} />}
                    hideSelect={true}
                    error={year_error}
                  />
                </Box>
                <Box mb={2} mr={2}>
                  <Dropdown
                    data={[
                      { id: "ALL", name: "All Standards" },
                      ...feesTypeList.map((std) => ({
                        id: std.id,
                        name: std.name,
                      }))
                    ]}
                    name="selectedStandard"
                    value={this.state.selectedStandard}
                    onChange={(e) =>
                      this.setState({ selectedStandard: e.target.value })
                    }
                    label="Standard"
                    hideSelect={true}
                  />
                </Box>
                {!!isResidential &&
                  <Box mb={2}>
                    <Dropdown
                      data={studentTypeList}
                      name="selectedStudentType"
                      value={selectedStudentType}
                      onChange={this.onChange}
                      label="Student Type"
                      hideSelect={true}
                    />
                  </Box>
                }
              </Box>
            </Grid>
            <Grid container>
              <Grid item xs={12} sm={12}>
                <Hidden mdUp>
                  {year &&
                    <Box display="flex" justifyContent="center" mt={4}>
                      <Button
                        onClick={() => this.addFeeType()}
                        style={{ background: "#f5faff", color: "blue" }}
                        size="large"
                        variant="contained"
                        color="primary"
                      >
                        {Actions.assigned_fee_types.create.label}
                      </Button>
                    </Box>
                  }
                </Hidden>
              </Grid>
            </Grid>
          </Box>
          {/* Tabs + Download */}
          {!this.state.cardLoading && feesTypeList.length > 0 && (
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} mt={1} px={1}>
              <Tabs
                value={this.state.viewTab}
                onChange={(event, newValue) => this.setState({ viewTab: newValue })}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="Card View" />
                <Tab label="Table View" />
              </Tabs>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudDownloadIcon />}
                onClick={this.handleDownloadAllPdf}
                disabled={this.state.downloadingPdf}
                style={{ borderRadius: 30 }}
              >
                {this.state.downloadingPdf ? 'Generating...' : 'Download All Standards PDF'}
              </Button>
            </Box>
          )}
          {!this.state.cardLoading ?
            <Box>
              {this.state.viewTab === 0 ? (
                <>
                  <Grid container spacing={0}>
                    <Grid item xs={12}>
                      <Box className="card-outer-box">
                        {filteredFeesTypeList.map((standardFee, index) => {
                          return (
                            <Card
                            key={`card-${index}`}
                              header={
                                <Box
                                  position="relative"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  width="100%"
                                >

                                  {/* Standard Name - Center */}
                                  <Box fontWeight={600} textAlign="center">
                                    {standardFee.name}
                                  </Box>

                                  {/* Download Icon - Top Right */}
                                  {standardFee.fee_types.length > 0 && (
                                    <Tooltip title="Download Fee Plan PDF" placement="top">
                                      <Box
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          this.handleDownloadPdf(standardFee.id);
                                        }}
                                        style={{
                                          position: "absolute",
                                          right: 0,
                                          top: 0,
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          width: 28,
                                          height: 28,
                                          borderRadius: "50%",
                                        }}
                                      >
                                        {
                                        this.state.downloadingStandard === standardFee.id
                                        ?
                                        <CircularProgress size={20} style={{color:"#fff"}} />
                                        :
                                        <CloudDownloadIcon style={{ fontSize: 28, color: "#fff", paddingRight: 5 }} />
                                        }
                                      </Box>
                                    </Tooltip>
                                  )}

                                </Box>
                              }
                              subHeader={this.getSubheader(standardFee.name)}
                              columnsHeader={columnsHeader}
                              columnsData={standardFee.fee_types}
                              columnError={
                                standardFee && !standardFee.is_approved && standardFee.fee_types.length === 0 &&
                                "Fee(s) is not yet planned"
                              }
                              action={
                                <Box display="flex" alignItems="center" justifyContent="center" gap={1.5}>

                                  {/* Edit/Delete only when NOT approved */}
                                  {!standardFee.is_approved && !fullyApprovedFeeStdMap.includes(standardFee.id) && (
                                    <>
                                      {standardFee.fee_types.length > 0 &&
                                        isUserHasPermission("assigned_fee_types", "delete") && (
                                          <Tooltip title="Delete fee types">
                                            <Box
                                              size="small"
                                              onClick={() => this.deleteCard(standardFee.id)}
                                              className="action-fab action-icon"
                                            >
                                              <Icon className={classNames("icon", "fa fa-trash delete-icon")} />
                                            </Box>
                                          </Tooltip>
                                        )}

                                      {isUserHasPermission("assigned_fee_types", "edit") &&
                                        standardFee.fee_types.length > 0 && (
                                          <Tooltip title="Edit all fee types">
                                            <Box
                                              size="small"
                                              onClick={() => this.editAllFeeTypes(standardFee)}
                                              className="action1-fab action-icon"
                                            >
                                              <EditOutlinedIcon2 style={{ fontSize: 20 }} />
                                            </Box>
                                          </Tooltip>
                                        )}
                                    </>
                                  )}

                                  {/* Approved tag */}
                                  {standardFee.is_approved && (
                                    <Box
                                      className="approved-button approved-tag"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Approved
                                    </Box>
                                  )}

                                </Box>
                              }
                            />
                          );
                        })}
                      </Box>
                    </Grid>
                  </Grid>
                  {feesTypeList.length !== 0 && (
                    <Hidden mdUp>
                      <Box className="flex-justify-center-flex-prop" mt={4}>
                        <Button
                          onClick={() => this.addFeeType()}
                          style={{ background: "#f5faff", color: "blue" }}
                          size="large"
                          variant="contained"
                          color="primary"
                        >
                          {Actions.assigned_fee_types.create.label}
                        </Button>
                      </Box>
                    </Hidden>
                  )}
                </>
              ) : (
              <FeePlanTableView
                feesTypeList={filteredFeesTypeList}
                groupedFeeTypesByStandard={this.buildGroupedFeeTypes()}
                selectedStandardList={selectedStandardList}
                fullyApprovedFeeStdMap={fullyApprovedFeeStdMap}
                onDeleteCard={this.deleteCard}
                onEditCard={this.editCard}
                onCheckboxChange={this.checkBoxFun}
                onDownloadPdf={this.handleDownloadPdf}
                downloadingStandard={this.state.downloadingStandard}
              />
              )}
            </Box>
            :
            <Box textAlign="center" style={{ height: '100vh' }}>
              <CircularProgress />
            </Box>
          }
          <Box>
            {feesTypeList.length === 0 && year !== 0 && !this.state.cardLoading && (
              <BlankPagewithIcon data={blankData} />
            )}
          </Box>
        </Paper>
        {handleEditDialog &&
          <FeePlanEditDialog
            selectedFeeTypes={selectedFeeTypes}
            academicYear={this.state.year}
            updateParent={this.updateParent}
            handleEditClose={this.handleEditClose}
          />
        }

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

        {/* 3-dot context menu for fee type actions */}
        <Menu
          anchorEl={this.state.anchorElFeeType}
          open={Boolean(this.state.anchorElFeeType)}
          onClose={() => this.setState({ anchorElFeeType: null, menuFeeType: null })}
          PaperProps={{ style: { borderRadius: '10px', minWidth: '140px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' } }}
        >
          {this.permission.includes('update') && (
            <MenuItem
              onClick={() => {
                const ft = this.state.menuFeeType;
                this.setState({ anchorElFeeType: null, menuFeeType: null, editingFeeType: ft });
              }}
              style={{ fontSize: '14px', gap: '8px', padding: '8px 16px' }}
            >
              <EditOutlinedIcon2 style={{ fontSize: '18px', color: '#4986FF' }} />
              Edit
            </MenuItem>
          )}
          {this.permission.includes('delete') && (
            <MenuItem
              onClick={() => {
                const ft = this.state.menuFeeType;
                this.setState({ anchorElFeeType: null, menuFeeType: null });
                if (ft) this.deleteFeeType(ft.id, ft);
              }}
              style={{ fontSize: '14px', gap: '8px', padding: '8px 16px', color: '#ef5350' }}
            >
              <DeleteOutlineIcon style={{ fontSize: '18px' }} />
              Delete
            </MenuItem>
          )}
        </Menu>

        {/* Individual fee type edit dialog */}
        {this.state.editingFeeType && (
          <FeeTypeIndividualEditDialog
            feeTypeData={this.state.editingFeeType}
            onClose={() => this.setState({ editingFeeType: null })}
            onUpdate={() => this.getFeeTypes(this.state.year, 'year')}
            props={this.props}
          />
        )}
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
  connect(mapStateToProps, mapDispatchToProps)(ViewFeesType)
);
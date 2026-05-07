// import React from "react";
import React, { useEffect, useState } from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Box,
  Dialog,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert, dateFormat } from "Includes/functions";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { TRANSPORT_CODE } from "Constants";
import get from "Components/actions/API_request/Get";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { Dropdown } from "Components/DropDown";
import { DateRange } from "Components/DateRange";
import moment from "moment";
import Swal from "sweetalert2";
import ErrorHandler from "Components/ErrorHandler";

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(1),
  },
}))(MuiDialogActions);

const header = "Download Custom Report";

const body = "";

const is_fee_group_enabled = isFormDefinitionEnabled(
  "fee_configurations",
  "is_fee_group_enabled",
  1
);

export default function FeeCollectionReportModal(props) {
  const [alertData, setAlertData] = React.useState("");
  const [dateRangeValue, setDateRangeValue] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reportDateRange, setReportDateRange] = React.useState({ start: null, end: null });
  const [reportDateRangeError, setReportDateRangeError] = React.useState("");
  const [downloadByDateRange, setDownloadByDateRange] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState(false);
  const [lodingApi, setLodingApi] = React.useState(false);
  const [fieldError, setFieldError] = React.useState({});
  const [transactionId, setTransactionId] = useState("");
  const [number_of_hites, set_number_of_hites] = useState(16);
  const [searchFields, setSearchFields] = React.useState({
    standards: [],
    sections: [],
    feeTypes: [],
    feeTerms: [],
    feeGroups: [],
    extraFields: [],
  });
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const [value, setValue] = React.useState(0);
  const [feeTypes, setFeeTypes] = React.useState([]);
  const [feeTerms, setFeeTerms] = React.useState([]);
  const [feeGroups, setFeeGroups] = React.useState([]);
  const [feeCategory, setFeeCategory] = React.useState([]);
  const [feeCategoryList, setFeeCategoryList] = React.useState([]);
  const [sectionList, setSectionList] = React.useState([]);
  const [extraFields, setExtraFieldsList] = React.useState([]);
  const [loadingApi, setLoadingApi] = useState(true);
  let intervalId = React.useRef(null);

  const handleClose = () => {
    props.closeInParent();
  };

  React.useEffect(() => {
    getFeeCategoryList();
    getStandardList();
  }, []);

  const getStandardList = () => {
    props.standardList.forEach((field) => {
      field.optionValue = `${field.id}${field.type}`;
    });
    props.standardList.unshift({
      optionValue: "Select All",
      name: "Select All",
      optionValue: "all",
      id: "all",
    });
  }

  const getFeeCategoryList = () => {
    const url = GET_URL.feecategory.api;
    const params = { is_active: true };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setFeeCategoryList(response.data.data);
      }
    });
  };

  const getSectionList = () => {
    const url = GET_URL.getsection.api;
    let params = {
      is_active: true,
      academic_year: props.year,
      standard_ids: getIds("standards"),
      student_type: "D",
      download_excel: 1,
    };
    getRequest(url, params, props).then((response) => {
      let sectionIds = [];
      if (response && response.status === 200) {
        let sections = response.data.data;
        let removeduplicateIds = [];
        sections.map((data) => {
          if (!sectionIds.includes(data.id)) {
            removeduplicateIds.push({
              id: data.id,
              name: data.name,
            });
            sectionIds.push(data.id);
          }
        });
        setSectionList(removeduplicateIds);
      }
    });
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const onchangeDropdown = (e, name) => {
    let tempDetails = { ...searchFields };
    let fieldErrorTemp = { ...fieldError };
    let is_all_option_selected = false;
    delete fieldErrorTemp[name];
    if (name === "feeCategory") {
      tempDetails["feeCategory"] = e.target.value;
    } else {
      tempDetails[name] = e;
    }
    if (name === "standards") {
      tempDetails["feeTypes"] = [];
      tempDetails["feeTerms"] = [];
      e.forEach((data) => {
        if (data.id === "all") {
          is_all_option_selected = true;
          return;
        }
      });
      if (is_all_option_selected) {
        props.standardList.splice(0, 1);
        tempDetails['standards'] = [...props.standardList];
      }
      setFeeTerms([]);
      setFeeTypes([]);
    }
    setFieldError(fieldErrorTemp);
    setSearchFields({ ...tempDetails });

    if (name === "group") {
      tempDetails["feeGroups"] = [];
      setFeeGroups([]);
    }
    setFieldError(fieldErrorTemp);
    setSearchFields({ ...tempDetails });

    if (name === "extrafields") {
      tempDetails["extrafields"] = [];
      setExtraFieldsList([]);
    }
    setFieldError(fieldErrorTemp);
    setSearchFields({ ...tempDetails });
  };

  const getIds = (name) => {
    let ids = [];
    searchFields[name].map((data) => {
      ids.push(data["id"]);
    });
    return ids.join(",");
  };

  const getExtraFieldIds = (name) => {
    let returnId = false;
    searchFields["extraFields"].map((data) => {
      if (name === data["name"]) returnId = 1;
    });
    return returnId;
  };

  const handleDownloadButton = (name) => {
    const params = {
      academic_year: props.year,
      is_active: 1,
      standard_ids: getIds("standards"),
    };
    let fieldError = {};
    let validation = true;

    if (downloadByDateRange && (!reportDateRange?.start || !reportDateRange?.end)) {
      setReportDateRangeError("From date and To date are required to download the report between the date range");
      setSnackbar(true);
      setAlertData("From date and To date are required to download the report between the date range");
      return;
    }
    setReportDateRangeError("");
    
    if (name === "standard") {
      if (searchFields.standards.length === 0) {
        setSnackbar(true);
        setAlertData("Select at least one standard");
        fieldError["standards"] = "Select standard";
        setFieldError(fieldError);
        return;
      }
      params["standard_ids"] = getIds("standards");
      params["section_ids"] = getIds("sections");
      params["download_standard_report"] = 1;
    } else if (name === "term") {
      if (searchFields.standards.length === 0) {
        setSnackbar(true);
        setAlertData("Select at least one standard");
        fieldError["standards"] = "Select standard";
        validation = false;
      }
      if (searchFields.feeTypes.length === 0) {
        setSnackbar(true);
        setAlertData("Select at least one fee type");
        fieldError["feeTypes"] = "Select fee type";
        validation = false;
      }
      if (searchFields.feeTerms.length === 0) {
        setSnackbar(true);
        setAlertData("Select at least one fee term");
        fieldError["feeTerms"] = "Select term";
        validation = false;
      }
      if (!validation) {
        setFieldError(fieldError);
        return;
      }
      params["standard_ids"] = getIds("standards");
      // Removed mandatory check for sections
      params["section_ids"] = getIds("sections"); // Section can be optional now
      params["fee_type_ids"] = getIds("feeTypes");
      params["fee_term_names"] = getIds("feeTerms");
      if (
        searchFields.feeTypes.length === 1 &&
        searchFields["feeTypes"][0]["codename"] == TRANSPORT_CODE
      ) {
        params["transport_download"] = 1;
      } else {
        params["term_wise_download"] = 1;
      }
      if (searchFields.extraFields.length > 0) {
        searchFields["extraFields"].map((data) => {
          params[data["name"]] = getExtraFieldIds(data["name"]);
        });
      }
    } else if (name === "group") {
      if (searchFields.standards.length === 0) {
        setSnackbar(true);
        setAlertData("Select at least one standard");
        fieldError["standards"] = "Select standard";
        validation = false;
      }
      if (searchFields.feeGroups.length === 0) {
        setSnackbar(true);
        setAlertData("Select at least one fee group");
        fieldError["feeTypes"] = "Select fee group";
        validation = false;
      }
      if (!validation) {
        setFieldError(fieldError);
        return;
      }
      params["standard_ids"] = getIds("standards");
      params["fee_group_ids"] = getIds("feeGroups");
      params["fee_group_wise_download"] = 1;
    }
  
    if (props.selected_group) {
      params.student_group = props.selected_group;
    }
    if (searchFields.feeCategory) {
      params.fee_category = searchFields.feeCategory;
    }
    if (dateRangeValue && dateRangeValue.start && dateRangeValue.end) {
      params.from_paid_date_range = moment(dateRangeValue.start).format(
        "YYYY-MM-DD"
      );
      params.to_paid_date_range = moment(dateRangeValue.end).format(
        "YYYY-MM-DD"
      );
    }
    if (downloadByDateRange && reportDateRange?.start && reportDateRange?.end) {
      params.from_date = moment(reportDateRange.start).format("YYYY-MM-DD");
      params.to_date = moment(reportDateRange.end).format("YYYY-MM-DD");
    }
    let transaction_id = Date.now();
    params.student_type = "B";
    params["download_excel"] = 1;
    params["long_running_process"] = 1;
    params["transaction_id"] = transaction_id;
    setLodingApi(true);
    setSubmitDisable(true);
    getRequest(GET_URL.feecollectionreport.api, params, props).then(
      (response) => {
        // if (!long_running_process) {
        //   setSubmitDisable(false);
        //   setLodingApi(false);
        // }
        if (response && response.status === 200) {
          // if (!long_running_process) {
          //   const url = window.URL.createObjectURL(new Blob([response.data]));
          //   const link = document.createElement("a");
          //   link.href = url;
          //   link.setAttribute("download", `Fee_Collection_Report.xlsx`);
          //   document.body.appendChild(link);
          //   link.click();
          //   return;
          // } else 
          if (response.data.Result) {
            clearInterval(intervalId.current);
            setTransactionId(transaction_id);
          }
        }
      }
    );
  };
  

  useEffect(() => {
    if (transactionId) {
      setIntervalTime();
    }
  }, [transactionId]);

  const setIntervalTime = () => {
    intervalId.current = setInterval(() => {
      getlongprocessingapiresult();
    }, 5000);
    // timeLimit += 1;
    // if (timeLimit === 40) {
    //   clearInterval(intervalId.current);
    // }
  };

  const getlongprocessingapiresult = () => {
    set_number_of_hites(number_of_hites - 1);
    if (number_of_hites === 0) {
      Swal.fire({
        type: "error",
        title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
        showConfirmButton: true,
      });
      clearInterval(intervalId.current);
      setLodingApi(false);
      setSubmitDisable(false);
      return;
    }
    let params = {
      transaction_id: transactionId,
      is_active: true,
    };
    getRequest(GET_URL.longprocessingapiresult.api, params, props).then(
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
            } else {
              window.open(
                response.data.data.result_data.url,
                "_self"
              );
            }
            clearInterval(intervalId.current);
            setLodingApi(false);
            setSubmitDisable(false);
          }
        } else {
          clearInterval(intervalId.current);
          setLodingApi(false);
          setSubmitDisable(false);
        }
      }
    );
  };

  useEffect(() => {
    const getExtraFieldsList = () => {
      const params = {};
      getRequest(GET_URL.feecollectionreportfilterdatas.api, params).then(
        (response) => {
          setLoadingApi(false);
          if (response && response.status === 200) {
            let tempList = [];
            response.data.data.extra_columns.map((data) => {
              tempList.push({
                label_name: data.label_name,
                name: data.name,
              });
            });
            tempList.push({
              label_name: "another transaction",
              name: "another_transaction",
            });
            setExtraFieldsList(tempList);
          }
        }
      );
    };
    getExtraFieldsList();
  }, []);

  const handleExtraFieldsChange = (selectedValues) => {
    let tempDetails = { ...searchFields };
    let fieldErrorTemp = { ...fieldError };
    delete fieldErrorTemp["extraFields"];
    tempDetails["extraFields"] = selectedValues;
    setFieldError(fieldErrorTemp);
    setSearchFields({ ...tempDetails });
  };

  const handleChange = (event, newValue) => {
    let tempDetails = { ...searchFields };
    tempDetails["standards"] = [];
    tempDetails["sections"] = [];
    tempDetails["feeGroups"] = [];
    tempDetails["feeTerms"] = [];
    tempDetails["feeTypes"] = [];
    tempDetails["extraFields"] = [];
    setSearchFields(tempDetails);
    setValue(newValue);
  };

  const handleChangeDateRange = (dateRangeValue) => {
    setDateRangeValue(dateRangeValue);
  };

  const handleReportDateRangeChange = (range) => {
    setReportDateRange(range || { start: null, end: null });
    if (reportDateRangeError) setReportDateRangeError("");
  };

  const handleNumberOfCopies = () => {
    return (
      <>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="Term Wise" {...a11yProps(0)} />
            <Tab label="Standard Wise" {...a11yProps(1)} />
            {is_fee_group_enabled && (
              <Tab label="Group wise" {...a11yProps(2)} />
            )}
          </Tabs>
        </Box>
        {feeCategoryList.length > 0 && (
          <div className="mv-20">
            <Dropdown
              data={feeCategoryList}
              name={"feeCategory"}
              value={searchFields.feeCategory}
              onChange={(e) => onchangeDropdown(e, "feeCategory")}
              label={"Fee Category"}
              size="small"
              className="width-300px"
            />
          </div>
        )}
        <div className="mv-20">
          <FormControlLabel
            control={
              <Checkbox
                checked={downloadByDateRange}
                onChange={(e) => {
                  setDownloadByDateRange(e.target.checked);
                  if (!e.target.checked) {
                    setReportDateRangeError("");
                    setReportDateRange({ start: null, end: null });
                  }
                }}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                Need to download the fee collection report between the date range
              </Typography>
            }
          />
          {downloadByDateRange && (
            <div className="mt-12">
              <DateRange
                className="width-300px"
                handleChange={handleReportDateRangeChange}
                startDate={reportDateRange?.start}
                endDate={reportDateRange?.end}
                size="small"
                label="Report Date Range"
              />
            </div>
          )}
          {reportDateRangeError && (
            <Typography variant="caption" color="error" display="block" className="mt-8">
              {reportDateRangeError}
            </Typography>
          )}
        </div>
        <div className="d-flex align-items-center mv-20">
          <div>
            <MultipleSelectDropdown
              data_list={props.standardList}
              selected_list={searchFields.standards}
              error={fieldError.standards}
              label={"Select Standards"}
              onChange={(e) => onchangeDropdown(e, "standards")}
              size="small"
              onClose={(e) => standardOncloseData(value)}
            />
          </div>
        </div>
        <div>
          <MultipleSelectDropdown
            data_list={sectionList}
            selected_list={searchFields.sections}
            error={fieldError.sections}
            label={"Select sections"}
            onChange={(e) => onchangeDropdown(e, "sections")}
            size="small"
            onClose={(e) => standardOncloseData(value)}
          />
        </div>
        {value === 0 && (
          <div className="align-items-center mv-20">
            <div className="mv-20">
              <MultipleSelectDropdown
                data_list={feeTypes}
                selected_list={searchFields.feeTypes}
                error={fieldError.feeTypes}
                label={"Select Fee Types"}
                onChange={(e) => onchangeDropdown(e, "feeTypes")}
                size="small"
              />
            </div>
            <div className="mv-20">
              <MultipleSelectDropdown
                data_list={feeTerms}
                selected_list={searchFields.feeTerms}
                error={fieldError.feeTerms}
                label={"Select Fee Terms"}
                onChange={(e) => onchangeDropdown(e, "feeTerms")}
                size="small"
              />
            </div>
            <div className="mv-20">
              <MultipleSelectDropdown
                customId="name"
                optionValue="label_name"
                data_list={extraFields}
                selected_list={searchFields.extraFields || ""}
                error={fieldError.extraFields}
                label={"Select Extra Fields"}
                onChange={(e) => handleExtraFieldsChange(e, "extraFields")}
                size="small"
              />
            </div>
            {getExtraFieldIds("paid_date_range") && (
              <div>
                <DateRange
                  className="width-300px"
                  handleChange={handleChangeDateRange}
                  minDate={props.yearInfo.start_date}
                  maxDate={props.yearInfo.end_date}
                  startDate={startDate}
                  endDate={endDate}
                  size={"small"}
                />
              </div>
            )}
          </div>
        )}
        {value === 2 && (
          <div className="align-items-center mv-20">
            <div className="mv-20">
              <MultipleSelectDropdown
                data_list={feeGroups}
                selected_list={searchFields.feeGroups}
                error={fieldError.feeGroups}
                label={"Select Groups"}
                onChange={(e) => onchangeDropdown(e, "feeGroups")}
                size="small"
              />
            </div>
          </div>
        )}
      </>
    );
  };

  const standardOncloseData = (value) => {
    if (value === 0) {
      getSectionList();
      getFeeTypeAndTerm();
    } else if (value === 2) {
      getFeeGroupForStandard();
    }
  };

  const getFeeGroupForStandard = () => {
    const { year } = props;
    if (searchFields.standards.length === 0) {
      let fieldErrorTemp = { ...fieldError };
      fieldErrorTemp["standads"] = "Select Standard(s)";
      setFieldError(fieldErrorTemp);
      return;
    }

    setLodingApi(true);
    let params = {
      academic_year: year,
      standard_ids: getIds("standards"),
      student_type: "D",
      download_excel: 1,
    };

    getRequest(GET_URL.feeplan.api, params, props).then((response) => {
      let feeGroups = [];
      let feeGroupIds = [];
      if (response && response.status === 200) {
        let fee_details = response.data.data;
        fee_details.fee_group_list.map((groupData) => {
          if (!feeGroupIds.includes(groupData.fee_group)) {
            feeGroups.push({
              id: groupData.fee_group,
              name: groupData.fee_group_name,
              codename: groupData.codename,
            });
            feeGroupIds.push(groupData.fee_group);
          }
        });
        let tempDetails = { ...searchFields };
        let fieldErrorTemp = { ...fieldError };
        delete fieldErrorTemp["feeGroups"];
        tempDetails["feeGroups"] = feeGroups;
        setSearchFields({ ...tempDetails });
        setFeeGroups(feeGroups);
        setFieldError(fieldErrorTemp);
      }
      setLodingApi(false);
      setSubmitDisable(false);
    });
  };

  const getFeeTypeAndTerm = () => {
    const { year } = props;
    if (searchFields.standards.length === 0) {
      let fieldErrorTemp = { ...fieldError };
      fieldErrorTemp["standads"] = "Select Standard(s)";
      setFieldError(fieldErrorTemp);
      return;
    }
    setLodingApi(true);
    let params = {
      academic_year: year,
      standard_ids: getIds("standards"),
      student_type: "D",
      download_excel: 1,
    };
    if (searchFields.feeCategory) {
      params["fee_category_ids"] = searchFields.feeCategory;
    }
    getRequest(GET_URL.feeplan.api, params, props).then((response) => {
      let feeTerms = [];
      let feeTermIds = [];
      let feeTypes = [];
      let feeTypeIds = [];
      if (response && response.status === 200) {
        let fee_details = response.data.data;
        fee_details.plan.map((planData) => {
          if (!feeTypeIds.includes(planData.fee_type)) {
            feeTypes.push({
              id: planData.fee_type,
              name: planData.fee_type_name,
              codename: planData.codename,
            });
            feeTypeIds.push(planData.fee_type);
          }
          planData.standard_fee.map((stdData) => {
            if (!feeTermIds.includes(stdData.terms)) {
              feeTerms.push({
                id: stdData.terms,
                name: stdData?.term_alias ?? stdData.terms,
              });
              feeTermIds.push(stdData.terms);
            }
          });
        });
        let tempDetails = { ...searchFields };
        let fieldErrorTemp = { ...fieldError };
        delete fieldErrorTemp["feeTypes"];
        delete fieldErrorTemp["feeTerms"];
        tempDetails["feeTypes"] = feeTypes;
        tempDetails["feeTerms"] = feeTerms;
        setSearchFields({ ...tempDetails });
        setFeeTerms(feeTerms);
        setFeeTypes(feeTypes);
        setFieldError(fieldErrorTemp);
      }
      setLodingApi(false);
      setSubmitDisable(false);
    });
  };

  return (
    <div>
      <Dialog
        className="custom-report-dialog"
        aria-labelledby="customized-dialog-title"
        open={true}
      >
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          {header}
        </DialogTitle>
        <DialogContent>
          {loading ? <CircularProgress /> : handleNumberOfCopies()}
        </DialogContent>
        {!loading && (
          <DialogActions>
            {lodingApi ? (
              <div>
                <CircularProgress />
              </div>
            ) : (
              ""
            )}
            {value === 0 && (
              <Button
                disabled={submitDisable}
                className="submit width-200-px"
                onClick={() => handleDownloadButton("term")}
              >
                Download Term Wise
              </Button>
            )}
            {value === 1 && (
              <Button
                disabled={submitDisable}
                className="submit"
                onClick={() => handleDownloadButton("standard")}
              >
                Download Standard Wise
              </Button>
            )}
            {value === 2 && (
              <Button
                disabled={submitDisable}
                className="submit"
                onClick={() => handleDownloadButton("group")}
              >
                Download Group Wise
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity="error">
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}

import React, { useEffect, useState, useRef } from "react";
import Swal from 'sweetalert2';
import { Box, Paper, Grid, Button, TextField, FormControl, FormHelperText, Typography, IconButton } from "@material-ui/core";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import PictureAsPdf from "@material-ui/icons/PictureAsPdf";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { CircularProgress } from "@material-ui/core";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { Dropdown } from "Components/DropDown";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { dateFormat, getPaginationProps } from "Includes/functions";
import { isUserHasPermission, getUrlParam } from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { DEFAULT_PAGINATION_WITHOUT_SORT_PROPS } from "Constants";
import ErrorHandler from "Components/ErrorHandler";
import NotificationPreviewDialog from "./components/NotificationPreviewDialog";

const ReportIndividualList = React.forwardRef((props, ref) => {
  const [tableUpdating, setTableUpdating] = useState(false);
  const [reportListData, setReportListData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [reportsId, setReportsId] = useState("");
  const [reportName, setReportName] = useState("");
  const [optionsLocal, setOptionsLocal] = useState([]);
  const [transactionId, setTransactionId] = useState("");
  const [notificationDialog, setNotificationDialog] = useState(null);
  const [number_of_hites, set_number_of_hites] = useState(50);
  const numberOfHitsRef = useRef(number_of_hites)
  const [printLoading, setPrintLoading] = useState(1);

  const [pagination, setPagination] = useState({
    ...DEFAULT_PAGINATION_WITHOUT_SORT_PROPS,
  });

  // Form state for group_wise_pending_report
  const [headings, setHeadings] = useState([
    {
      id: null,
      heading: "",
      heading_alias: "",
      group_names: [
        {
          id: null,
          group_name: "",
          group_alias: "",
          values_mapping: []
        }
      ]
    }
  ]);
  const [academicYearList, setAcademicYearList] = useState([]);
  const [standardList, setStandardList] = useState([]);
  const [feetypeList, setFeetypeList] = useState({}); // Store feetypes by standard_id
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [originalData, setOriginalData] = useState(null); // Store original data to track deletions

  let currentPagination = React.useRef(null);
  let intervalId = React.useRef(null);

  React.useEffect(() => {
    let { reportId, report_name } = getUrlParam();
    setReportsId(reportId);
    
    // Set report_name from URL if available
    if (report_name) {
      setReportName(report_name);
    }
    
    // If report_name is group_wise_pending_report, fetch form dropdown data instead of report list
    if (report_name === "group_wise_pending_report") {
      fetchFormDropdownData();
      fetchExistingData();
    } else if (reportId) {
      // Fetch report details to get report_name if not in URL
      getRequest(GET_URL.customreport.api, { id: reportId }, props).then((response) => {
        if (response && response.status === 200) {
          const reportData = response.data.data || response.data;
          if (reportData && reportData.report_name) {
            setReportName(reportData.report_name);
            if (reportData.report_name === 'group_wise_pending_report') {
              fetchFormDropdownData();
              fetchExistingData();
            } else {
              getReportDownloadList();
            }
          } else {
            getReportDownloadList();
          }
        } else {
          getReportDownloadList();
        }
      });
    } else {
      getReportDownloadList();
    }
    
    let columntemp = [
      {
        name: "id",
        label: "id",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "name",
        label: "Downloaded By",
        options: {
          filter: true,
          sort: true,
        },
      },
      {
        name: "downloaded_time",
        label: "Download Initiated",
        options: {
          filter: true,
          sort: true,
        },
      },
      {
        name: "status",
        label: "Download Status",
        options: {
          filter: true,
          sort: true,
        },
      },
      {
        name: "download_file",
        label: "Download File",
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return (
              <div>
                {value ? (
                  <Button
                    className="apply-leave-button height-width-25px"
                    onClick={() => printReciept(value)}
                  >
                    Download
                  </Button>
                ) : (
                  <div className="text-red">Not Available</div>
                )}
              </div>
            );
          },
        },
      },
    ];
    setColumns(columntemp);
    const options = {
      selectableRows: "none",
      // filterType: "dropdown",
      filterType: false,
      responsive: "simple",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 50, 100],
      selectToolbarPlacement: "none",
      rowsPerPage: 10,
      emptyRowsWhenAllPagesAreSelected: false,
      textLabels: {
        body: {
          noMatch: "No matching records found",
          toolTip: "Sort",
        },
      },
    };
    setOptionsLocal(options);
  }, []);

  const printReciept = (value) => {
    window.open(value, "_blank");
    getReportDownloadList();
  };

  const getReportDownloadList = (paginationProps) => {
    let { reportId: reportIdFromUrl, report_name: report_name } = getUrlParam();
    if (reportIdFromUrl) setReportsId(reportIdFromUrl);
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    currentPagination = pagination;
    if (paginationProps === "default" || paginationProps === "download") {
      currentPagination = { ...DEFAULT_PAGINATION_WITHOUT_SORT_PROPS };
      delete pagination_types.reportindividuallist;
      let temp_new = { ...pagination_types };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    } else if (paginationProps) {
      currentPagination = { ...paginationProps };
      let temp = { reportindividuallist: currentPagination };
      let temp_new = { ...pagination_types, ...temp };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      report_name: report_name,
    };
    setTableUpdating(true);
    let url = GET_URL.customreportdownloadedbyuser.api;
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.data_list.map((data) => {
          data.downloaded_time = dateFormat(
            data.long_processing_api__execution_started_date_time,
            "DD-MM-YYYY hh:mm A"
          );
          data.status = data.long_processing_api__is_process_running
            ? "In Progress"
            : data.is_downloaded_successfully
            ? "Success"
            : "Failed";
          data.download_file = data.long_processing_api__result_data.url;
        });
        // let response_data = { student_list: response.data.data };
        setReportListData(response.data.data);
      }
      setTableUpdating(false);
    });
  };

  const handleViewButton = () => {
    let url = Actions.reports.view.url;
    props.history.push({
      pathname: url,
    });
  };

  const handleDownload = (download_type='excel') => {
    setTableUpdating(true);
    let url = POST_URL.generatecustomreport.api;
    let transaction_id = Date.now();
    const params = {
      long_running_process: 1,
      transaction_id: transaction_id,
    };
    if( download_type == 'pdf' ){
      params['download_pdf'] = true
    }
    else{
      params['download_excel'] = true
    }
    
    // Always use numeric report_id from URL params, and include report_name for non-group_wise_pending_report
    let { reportId: reportIdFromUrl, report_name: reportNameFromUrl } = getUrlParam();
    const currentReportId = reportIdFromUrl || reportsId;
    const currentReportName = reportName || reportNameFromUrl;
    
    const post_data = {
      report_id: currentReportId
    };
    
    if (currentReportName && currentReportName !== 'group_wise_pending_report') {
      post_data.report_name = currentReportName;
    }
    
    postRequest(url, post_data, props, params).then((response) => {
      if (response && response.status === 200) {
        if (response.data.Result) {
          clearInterval(intervalId.current);
          setTransactionId(transaction_id);
        }
      }
    });
  };

  useEffect(() => {
    if (transactionId) {
      setIntervalTime();
    }
  }, [transactionId]);

  useEffect(() => {
    numberOfHitsRef.current = number_of_hites;
  }, [number_of_hites]);

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
    set_number_of_hites(numberOfHitsRef.current - 1);
    if (numberOfHitsRef.current === 0) {
      ErrorHandler({
        response: {
          status: 500,
          data: { detail: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!` }
        }
      }, props);
      clearInterval(intervalId.current);
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
            if (response?.data?.data?.result_data?.error) {
              ErrorHandler({
                response: {
                  status: 400,
                  data: response.data.data.result_data.error,
                },
              });
            } else {
              window.open(response.data.data.result_data.url, "_self");
            }
            clearInterval(intervalId.current);
            setTableUpdating(false);
          }
        } else {
          clearInterval(intervalId.current);
          setTableUpdating(false);
        }
      }
    );
  };

  const handleSendNotification = () => {
    setNotificationDialog(true);
  };

  const handleClose = () => {
    setNotificationDialog(false);
  };

  // Fetch dropdown data for group_wise_pending_report form
  const fetchFormDropdownData = () => {
    // Fetch Academic Year
    getRequest(GET_URL.getacademicyear.api, { is_active: true }, props).then((response) => {
      if (response && response.status === 200) {
        setAcademicYearList(response.data.data || []);
      }
    });

    // Fetch Standard
    getRequest(GET_URL.getstandard.api, { is_active: true }, props).then((response) => {
      if (response && response.status === 200) {
        setStandardList(response.data.data || []);
      }
    });
  };

  // Fetch Fee Type by standard_id
  const fetchFeeTypesByStandard = (standardIds) => {
    if (!standardIds || standardIds.length === 0) {
      return;
    }
    const standardIdKey = standardIds.sort().join(',');
    
    // Check if already fetched
    if (feetypeList[standardIdKey]) {
      return;
    }

    const params = {
      is_active: true,
      standard_id: standardIds.join(',')
    };
    
    getRequest(GET_URL.getonlyfeetype.api, params, props).then((response) => {
      if (response && response.status === 200) {
        setFeetypeList(prev => ({
          ...prev,
          [standardIdKey]: response.data.data || []
        }));
      }
    });
  };

  // Fetch existing data for editing
  const fetchExistingData = () => {
    setDataLoading(true);
    let { reportId } = getUrlParam();
    const params = {
      report_id: reportId || reportsId
    };
    
    getRequest(GET_URL.customreportgrouping.api, params, props).then((response) => {
      setDataLoading(false);
      if (response && response.status === 200 && response.data.data) {
        const existingData = response.data.data;
        
        // Check if data exists
        if (existingData.headings && existingData.headings.length > 0) {
          setIsEditMode(true);
          
          // Collect all standard IDs from values_mapping to fetch feetypes
          const allStandardIds = [];
          existingData.headings.forEach(heading => {
            heading.group_names.forEach(group => {
              group.values_mapping.forEach(mapping => {
                if (mapping.type === 'standard' && mapping.value) {
                  const ids = mapping.value.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
                  allStandardIds.push(...ids);
                }
              });
            });
          });
          
          // Fetch feetypes for all standards
          if (allStandardIds.length > 0) {
            const uniqueStandardIds = [...new Set(allStandardIds)];
            uniqueStandardIds.forEach(id => {
              fetchFeeTypesByStandard([id]);
            });
            // Also fetch for combined standards
            fetchFeeTypesByStandard(uniqueStandardIds);
          }
          
          // Store original data for tracking deletions
          setOriginalData(existingData);
          
          // Populate form with existing data (including IDs for editing)
          setHeadings(existingData.headings.map(heading => ({
            id: heading.id || null,
            heading: heading.heading || "",
            heading_alias: heading.heading_alias || heading.heading || "",
            group_names: heading.group_names.map(group => ({
              id: group.id || null,
              group_name: group.group_name || "",
              group_alias: group.group_alias || group.group_name || "",
              values_mapping: group.values_mapping.map(mapping => ({
                id: mapping.id || null,
                type: mapping.type || "",
                value: mapping.value || ""
              }))
            }))
          })));
        } else {
          setIsEditMode(false);
        }
      } else {
        setIsEditMode(false);
      }
    }).catch((error) => {
      setDataLoading(false);
      // If no data found, it's a new form (not an error)
      setIsEditMode(false);
    });
  };

  // Add new heading
  const addHeading = () => {
    setHeadings([
      ...headings,
      {
        id: null,
        heading: "",
        heading_alias: "",
        group_names: [
          {
            id: null,
            group_name: "",
            group_alias: "",
            values_mapping: []
          }
        ]
      }
    ]);
  };

  // Remove heading
  const removeHeading = (headingIndex) => {
    if (headings.length > 1) {
      const updatedHeadings = headings.filter((_, i) => i !== headingIndex);
      setHeadings(updatedHeadings);
      // Clear errors for removed heading
      const updatedErrors = { ...formErrors };
      Object.keys(updatedErrors).forEach(key => {
        if (key.startsWith(`heading_${headingIndex}_`)) {
          delete updatedErrors[key];
        }
      });
      setFormErrors(updatedErrors);
    }
  };

  // Update heading name
  const updateHeading = (headingIndex, field, value) => {
    const updatedHeadings = [...headings];
    updatedHeadings[headingIndex][field] = value;
    // If updating heading, also update heading_alias if it's empty
    if (field === 'heading' && !updatedHeadings[headingIndex].heading_alias) {
      updatedHeadings[headingIndex].heading_alias = value;
    }
    setHeadings(updatedHeadings);
    // Clear error
    if (formErrors[`heading_${headingIndex}_${field}`]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[`heading_${headingIndex}_${field}`];
      setFormErrors(updatedErrors);
    }
  };

  // Add new group name to a heading
  const addGroupName = (headingIndex) => {
    const updatedHeadings = [...headings];
    updatedHeadings[headingIndex].group_names.push({
      id: null,
      group_name: "",
      group_alias: "",
      values_mapping: []
    });
    setHeadings(updatedHeadings);
  };

  // Remove group name from a heading
  const removeGroupName = (headingIndex, groupIndex) => {
    const updatedHeadings = [...headings];
    if (updatedHeadings[headingIndex].group_names.length > 1) {
      updatedHeadings[headingIndex].group_names = updatedHeadings[headingIndex].group_names.filter((_, i) => i !== groupIndex);
      setHeadings(updatedHeadings);
      // Clear errors
      const updatedErrors = { ...formErrors };
      Object.keys(updatedErrors).forEach(key => {
        if (key.startsWith(`heading_${headingIndex}_group_${groupIndex}_`)) {
          delete updatedErrors[key];
        }
      });
      setFormErrors(updatedErrors);
    }
  };

  // Update group name
  const updateGroupName = (headingIndex, groupIndex, field, value) => {
    const updatedHeadings = [...headings];
    updatedHeadings[headingIndex].group_names[groupIndex][field] = value;
    // If updating group_name, also update group_alias if it's empty
    if (field === 'group_name' && !updatedHeadings[headingIndex].group_names[groupIndex].group_alias) {
      updatedHeadings[headingIndex].group_names[groupIndex].group_alias = value;
    }
    setHeadings(updatedHeadings);
    // Clear error
    if (formErrors[`heading_${headingIndex}_group_${groupIndex}_${field}`]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[`heading_${headingIndex}_group_${groupIndex}_${field}`];
      setFormErrors(updatedErrors);
    }
  };

  // Add values_mapping entry
  const addValuesMapping = (headingIndex, groupIndex) => {
    const updatedHeadings = [...headings];
    updatedHeadings[headingIndex].group_names[groupIndex].values_mapping.push({
      id: null,
      type: "",
      value: ""
    });
    setHeadings(updatedHeadings);
  };

  // Remove values_mapping entry
  const removeValuesMapping = (headingIndex, groupIndex, mappingIndex) => {
    const updatedHeadings = [...headings];
    updatedHeadings[headingIndex].group_names[groupIndex].values_mapping = 
      updatedHeadings[headingIndex].group_names[groupIndex].values_mapping.filter((_, i) => i !== mappingIndex);
    setHeadings(updatedHeadings);
    // Clear errors
    const updatedErrors = { ...formErrors };
    Object.keys(updatedErrors).forEach(key => {
      if (key.startsWith(`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_`)) {
        delete updatedErrors[key];
      }
    });
    setFormErrors(updatedErrors);
  };

  // Update values_mapping
  const updateValuesMapping = (headingIndex, groupIndex, mappingIndex, field, value) => {
    const updatedHeadings = [...headings];
    updatedHeadings[headingIndex].group_names[groupIndex].values_mapping[mappingIndex][field] = value;
    
    // If type changed, fetch feetypes if needed
    if (field === 'type' && value === 'feetype') {
      // Get all standard IDs from values_mapping of type 'standard' in this group
      const standardIds = updatedHeadings[headingIndex].group_names[groupIndex].values_mapping
        .filter(m => m.type === 'standard' && m.value)
        .map(m => m.value.split(','))
        .flat()
        .map(id => Number(id.trim()))
        .filter(id => !isNaN(id));
      
      if (standardIds.length > 0) {
        fetchFeeTypesByStandard(standardIds);
      }
    }
    
    setHeadings(updatedHeadings);
    // Clear error
    if (formErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_${field}`]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_${field}`];
      setFormErrors(updatedErrors);
    }
  };

  // Update values_mapping value (for multi-select dropdowns)
  const updateValuesMappingValue = (headingIndex, groupIndex, mappingIndex, selectedItems, type) => {
    const updatedHeadings = [...headings];
    const valueString = selectedItems.map(item => {
      const id = typeof item === 'object' ? item.id : item;
      return Number(id);
    }).join(',');
    
    updatedHeadings[headingIndex].group_names[groupIndex].values_mapping[mappingIndex].value = valueString;
    
    // If updating standards, fetch feetypes for all groups in this heading that have feetype mappings
    if (type === 'standard' && valueString) {
      const standardIds = valueString.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
      
      // Check all groups in this heading for feetype mappings
      updatedHeadings[headingIndex].group_names.forEach(group => {
        const hasFeetypeMapping = group.values_mapping.some(m => m.type === 'feetype');
        if (hasFeetypeMapping && standardIds.length > 0) {
          // Get all standard IDs from all standard mappings in this group
          const allStandardIds = group.values_mapping
            .filter(m => m.type === 'standard' && m.value)
            .map(m => m.value.split(','))
            .flat()
            .map(id => Number(id.trim()))
            .filter(id => !isNaN(id));
          
          if (allStandardIds.length > 0) {
            fetchFeeTypesByStandard(allStandardIds);
          }
        }
      });
    }
    
    setHeadings(updatedHeadings);
    // Clear error
    if (formErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_value`]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_value`];
      setFormErrors(updatedErrors);
    }
  };

  // Handle form submission for group_wise_pending_report
  const handleFormSubmit = () => {
    const errors = {};
    
    headings.forEach((heading, headingIndex) => {
      if (!heading.heading.trim()) {
        errors[`heading_${headingIndex}_heading`] = "Heading is required";
      }
      
      heading.group_names.forEach((group, groupIndex) => {
        if (!group.group_name.trim()) {
          errors[`heading_${headingIndex}_group_${groupIndex}_name`] = "Group name is required";
        }
        
        if (!group.values_mapping || group.values_mapping.length === 0) {
          errors[`heading_${headingIndex}_group_${groupIndex}_mapping`] = "At least one value mapping is required";
        }
        
        group.values_mapping.forEach((mapping, mappingIndex) => {
          if (!mapping.type) {
            errors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_type`] = "Type is required";
          }
          if (!mapping.value || !mapping.value.trim()) {
            errors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_value`] = "Value is required";
          }
        });
      });
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormLoading(true);
    setFormErrors({});

    // Get reportId from URL params if not in state
    let { reportId: reportIdParam } = getUrlParam();
    const reportIdToUse = reportIdParam || reportsId;
    
    if (!reportIdToUse) {
      setFormLoading(false);
      ErrorHandler({
        response: {
          status: 400,
          data: { non_field_errors: ["Report ID is missing"] }
        }
      }, props);
      return;
    }

    // Calculate deleted IDs if in edit mode
    let deletedHeadingIds = [];
    let deletedGroupIds = [];
    let deletedValuesIds = [];
    
    if (isEditMode && originalData) {
      // Find deleted headings
      const currentHeadingIds = headings.map(h => h.id).filter(id => id !== null);
      const originalHeadingIds = originalData.headings.map(h => h.id).filter(id => id !== null);
      deletedHeadingIds = originalHeadingIds.filter(id => !currentHeadingIds.includes(id));
      
      // Find deleted groups and values_mapping
      originalData.headings.forEach(originalHeading => {
        if (originalHeading.id && currentHeadingIds.includes(originalHeading.id)) {
          // Heading still exists, check groups
          const currentHeading = headings.find(h => h.id === originalHeading.id);
          if (currentHeading) {
            const currentGroupIds = currentHeading.group_names.map(g => g.id).filter(id => id !== null);
            const originalGroupIds = originalHeading.group_names.map(g => g.id).filter(id => id !== null);
            const deletedGroups = originalGroupIds.filter(id => !currentGroupIds.includes(id));
            deletedGroupIds.push(...deletedGroups);
            
            // Check values_mapping for each group
            originalHeading.group_names.forEach(originalGroup => {
              if (originalGroup.id && currentGroupIds.includes(originalGroup.id)) {
                // Group still exists, check values_mapping
                const currentGroup = currentHeading.group_names.find(g => g.id === originalGroup.id);
                if (currentGroup) {
                  const currentMappingIds = currentGroup.values_mapping.map(m => m.id).filter(id => id !== null);
                  const originalMappingIds = originalGroup.values_mapping.map(m => m.id).filter(id => id !== null);
                  const deletedMappings = originalMappingIds.filter(id => !currentMappingIds.includes(id));
                  deletedValuesIds.push(...deletedMappings);
                } else {
                  // Group was deleted, add all its values_mapping IDs
                  const allMappingIds = originalGroup.values_mapping.map(m => m.id).filter(id => id !== null);
                  deletedValuesIds.push(...allMappingIds);
                }
              } else if (originalGroup.id) {
                // Group was deleted, add all its values_mapping IDs
                const allMappingIds = originalGroup.values_mapping.map(m => m.id).filter(id => id !== null);
                deletedValuesIds.push(...allMappingIds);
              }
            });
          } else {
            // Heading was deleted, add all its groups and values_mapping IDs
            originalHeading.group_names.forEach(group => {
              if (group.id) {
                deletedGroupIds.push(group.id);
                const allMappingIds = group.values_mapping.map(m => m.id).filter(id => id !== null);
                deletedValuesIds.push(...allMappingIds);
              }
            });
          }
        } else if (originalHeading.id) {
          // Heading was deleted, add all its groups and values_mapping IDs
          originalHeading.group_names.forEach(group => {
            if (group.id) {
              deletedGroupIds.push(group.id);
              const allMappingIds = group.values_mapping.map(m => m.id).filter(id => id !== null);
              deletedValuesIds.push(...allMappingIds);
            }
          });
        }
      });
    }

    const post_data = {
      report_id: Number(reportIdToUse),
      headings: headings.map(heading => {
        const headingData = {
          heading: heading.heading.trim(),
          heading_alias: (heading.heading_alias || heading.heading).trim(),
          group_names: heading.group_names.map(group => {
            const groupData = {
              group_name: group.group_name.trim(),
              group_alias: (group.group_alias || group.group_name).trim(),
              values_mapping: group.values_mapping
                .filter(mapping => mapping.type && mapping.value && mapping.value.trim())
                .map(mapping => {
                  const mappingData = {
                    type: mapping.type,
                    value: mapping.value.trim()
                  };
                  // Include ID if editing
                  if (isEditMode && mapping.id) {
                    mappingData.id = mapping.id;
                  }
                  return mappingData;
                })
            };
            // Include ID if editing
            if (isEditMode && group.id) {
              groupData.id = group.id;
            }
            return groupData;
          }).filter(group => group.group_name && group.values_mapping.length > 0)
        };
        // Include ID if editing
        if (isEditMode && heading.id) {
          headingData.id = heading.id;
        }
        return headingData;
      }).filter(heading => heading.heading && heading.group_names.length > 0)
    };
    
    // Add deleted IDs if in edit mode and there are deletions
    if (isEditMode) {
      if (deletedHeadingIds.length > 0) {
        post_data.deleted_heading_ids = deletedHeadingIds;
      }
      if (deletedGroupIds.length > 0) {
        post_data.deleted_group_ids = deletedGroupIds;
      }
      if (deletedValuesIds.length > 0) {
        post_data.deleted_values_ids = deletedValuesIds;
      }
    }

    const url = POST_URL.customreportgrouping.api;
    
    // Check if data is valid before submitting
    if (!post_data.headings || post_data.headings.length === 0) {
      setFormLoading(false);
      ErrorHandler({
        response: {
          status: 400,
          data: { non_field_errors: ["Please add at least one heading with group names and value mappings."] }
        }
      }, props);
      return;
    }
    
    postRequest(url, post_data, props).then((response) => {
      setFormLoading(false);
      if (response && response.status === 200) {
        Swal.fire({
          position: 'top-end',
          type: 'success',
          title: 'Your Data has been saved',
          showConfirmButton: false,
          timer: 1500
        });
        // Fetch updated data if in edit mode
        if (isEditMode) {
          fetchExistingData();
        } else {
          // Reset form for new entry
          setHeadings([{
            id: null,
            heading: "",
            heading_alias: "",
            group_names: [
              {
                id: null,
                group_name: "",
                group_alias: "",
                values_mapping: []
              }
            ]
          }]);
          setIsEditMode(false);
          setOriginalData(null);
        }
        // Redirect to reports list page
        props.history.push(Actions.reports.view.url);
      }
    });
  };

  // Check if report_name is group_wise_pending_report
  const isGroupWisePendingReport = reportName === 'group_wise_pending_report';

  return (
    <div>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={8} xs={12} className="header-align">
            <Box className="heading">{Actions.reports_detail.view.label}</Box>
          </Grid>
          <Grid item md={4} xs={12}>
            <Box className="header-align end-flex-prop">
              {isUserHasPermission("reports", "view") && (
                <Button
                  variant="contained"
                  //   component={Link}
                  //   to={Actions.reports.view.url}
                  onClick={handleViewButton}
                  className="editbutton-view"
                >
                  <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.reports.view.label}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {isGroupWisePendingReport ? (
          // Form for group_wise_pending_report
          <Box className="mt-20">
            {dataLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
              </Box>
            ) : (
              <Paper className="paper-plain-background header-align p-b-20px">
                <Grid container spacing={3}>
                  <Grid item xs={12} className="header-align">
                    <Box className="heading">
                      Report Group Configuration
                    </Box>
                    {isEditMode && (
                      <Box className="mt-10" style={{ color: '#1976d2', fontWeight: 'bold' }}>
                        Edit Mode
                      </Box>
                    )}
                  </Grid>
                  
                  {/* Headings Section */}
                {headings.map((heading, headingIndex) => (
                  <Grid item xs={12} key={headingIndex}>
                    <Paper className="paper-plain-background header-align p-b-20px mt-20">
                      <Grid container spacing={2}>
                        {/* Heading Header */}
                        <Grid item xs={12} className="header-align">
                          <Box display="flex" alignItems="center" justifyContent="space-between" className="mb-20">
                            <Box className="heading" style={{ fontSize: '18px' }}>
                              Heading {headingIndex + 1}
                            </Box>
                            {headings.length > 1 && (
                              <IconButton
                                color="secondary"
                                onClick={() => removeHeading(headingIndex)}
                                aria-label="delete heading"
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            )}
                          </Box>
                        </Grid>

                        {/* Heading Name */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Heading"
                            variant="outlined"
                            value={heading.heading}
                            onChange={(e) => updateHeading(headingIndex, 'heading', e.target.value)}
                            error={!!formErrors[`heading_${headingIndex}_heading`]}
                            helperText={formErrors[`heading_${headingIndex}_heading`]}
                            required
                            className="width-100"
                          />
                        </Grid>

                        {/* Heading Alias */}
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Heading Alias"
                            variant="outlined"
                            value={heading.heading_alias}
                            onChange={(e) => updateHeading(headingIndex, 'heading_alias', e.target.value)}
                            className="width-100"
                          />
                        </Grid>

                        {/* Group Names */}
                        {heading.group_names.map((group, groupIndex) => {
                          // Get standard IDs from values_mapping for feetype fetching
                          const standardIds = group.values_mapping
                            .filter(m => m.type === 'standard' && m.value)
                            .map(m => m.value.split(','))
                            .flat()
                            .map(id => Number(id.trim()))
                            .filter(id => !isNaN(id));
                          
                          // Get feetype list for these standards
                          const standardIdKey = standardIds.sort().join(',');
                          const availableFeetypes = standardIdKey ? (feetypeList[standardIdKey] || []) : [];

                          return (
                            <Grid item xs={12} key={groupIndex}>
                              <Paper className="paper-plain-background header-align p-b-20px mt-20">
                                <Grid container spacing={2}>
                                  {/* Group Name Header */}
                                  <Grid item xs={12} className="header-align">
                                    <Box display="flex" alignItems="center" justifyContent="space-between" className="mb-20">
                                      <Box className="heading" style={{ fontSize: '16px' }}>
                                        Group {groupIndex + 1}
                                      </Box>
                                      {heading.group_names.length > 1 && (
                                        <IconButton
                                          color="secondary"
                                          size="small"
                                          onClick={() => removeGroupName(headingIndex, groupIndex)}
                                          aria-label="delete group"
                                        >
                                          <DeleteOutlineIcon />
                                        </IconButton>
                                      )}
                                    </Box>
                                  </Grid>

                                  {/* Group Name */}
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      label="Group Name"
                                      variant="outlined"
                                      value={group.group_name}
                                      onChange={(e) => updateGroupName(headingIndex, groupIndex, 'group_name', e.target.value)}
                                      error={!!formErrors[`heading_${headingIndex}_group_${groupIndex}_name`]}
                                      helperText={formErrors[`heading_${headingIndex}_group_${groupIndex}_name`]}
                                      required
                                      className="width-100"
                                    />
                                  </Grid>

                                  {/* Group Alias */}
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      label="Group Alias"
                                      variant="outlined"
                                      value={group.group_alias}
                                      onChange={(e) => updateGroupName(headingIndex, groupIndex, 'group_alias', e.target.value)}
                                      className="width-100"
                                    />
                                  </Grid>

                                  {/* Values Mapping */}
                                  {group.values_mapping.map((mapping, mappingIndex) => {
                                    // Parse selected values
                                    const selectedIds = mapping.value ? mapping.value.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id)) : [];
                                    
                                    let dataList = [];
                                    let selectedList = [];
                                    
                                    if (mapping.type === 'academic_year') {
                                      dataList = academicYearList;
                                      selectedList = academicYearList.filter(ay => selectedIds.includes(Number(ay.id)));
                                    } else if (mapping.type === 'standard') {
                                      dataList = standardList;
                                      selectedList = standardList.filter(std => selectedIds.includes(Number(std.id)));
                                    } else if (mapping.type === 'feetype') {
                                      dataList = availableFeetypes;
                                      selectedList = availableFeetypes.filter(ft => selectedIds.includes(Number(ft.id)));
                                    }

                                    return (
                                      <Grid item xs={12} key={mappingIndex}>
                                        <Paper className="paper-plain-background header-align p-b-20px mt-10">
                                          <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} md={3}>
                                              <Dropdown
                                                data={[
                                                  { id: 'academic_year', name: 'Academic Year' },
                                                  { id: 'standard', name: 'Standard' },
                                                  { id: 'feetype', name: 'Fee Type' }
                                                ]}
                                                name="type"
                                                value={mapping.type}
                                                onChange={(e) => {
                                                  updateValuesMapping(headingIndex, groupIndex, mappingIndex, 'type', e.target.value);
                                                  updateValuesMapping(headingIndex, groupIndex, mappingIndex, 'value', '');
                                                }}
                                                label="Type"
                                                error={formErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_type`]}
                                                hideSelect={true}
                                                customName="name"
                                                customId="id"
                                                required
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={8}>
                                              {mapping.type && (
                                                <FormControl fullWidth error={!!formErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_value`]} required>
                                                  <MultipleSelectDropdown
                                                    data_list={dataList}
                                                    selected_list={selectedList}
                                                    onChange={(selectedList) => updateValuesMappingValue(headingIndex, groupIndex, mappingIndex, selectedList, mapping.type)}
                                                    label={mapping.type === 'academic_year' ? 'Academic Year' : mapping.type === 'standard' ? 'Standard' : 'Fee Type'}
                                                    optionValue="name"
                                                    customId="id"
                                                    disabled={mapping.type === 'feetype' && standardIds.length === 0}
                                                  />
                                                  {mapping.type === 'feetype' && standardIds.length === 0 && (
                                                    <FormHelperText>Please select standards first</FormHelperText>
                                                  )}
                                                  {formErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_value`] && (
                                                    <FormHelperText>{formErrors[`heading_${headingIndex}_group_${groupIndex}_mapping_${mappingIndex}_value`]}</FormHelperText>
                                                  )}
                                                </FormControl>
                                              )}
                                            </Grid>
                                            <Grid item xs={12} md={1}>
                                              <IconButton
                                                color="secondary"
                                                size="small"
                                                onClick={() => removeValuesMapping(headingIndex, groupIndex, mappingIndex)}
                                                aria-label="delete mapping"
                                              >
                                                <DeleteOutlineIcon />
                                              </IconButton>
                                            </Grid>
                                          </Grid>
                                        </Paper>
                                      </Grid>
                                    );
                                  })}

                                  {/* Add Values Mapping Button */}
                                  <Grid item xs={12} className="mt-20">
                                    <Button
                                      variant="outlined"
                                      color="primary"
                                      startIcon={<AddCircleOutlineIcon />}
                                      onClick={() => addValuesMapping(headingIndex, groupIndex)}
                                    >
                                      Add Value Mapping
                                    </Button>
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>
                          );
                        })}

                        {/* Add Group Name Button */}
                        <Grid item xs={12} className="mt-20">
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => addGroupName(headingIndex)}
                          >
                            Add Group Name
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                ))}

                {/* Add Heading Button */}
                <Grid item xs={12} className="mt-20">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={addHeading}
                  >
                    Add Heading
                  </Button>
                </Grid>
                
                {/* Submit Button and Download PDF Button */}
                <Grid item xs={12} className="mt-20">
                  <Box display="flex" justifyContent="flex-end" className="header-align" style={{ gap: '10px' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PictureAsPdf />}
                      onClick={() => handleDownload('pdf')}
                      disabled={tableUpdating || !reportsId}
                    >
                      {tableUpdating ? <CircularProgress size={24} /> : "Download PDF"}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleFormSubmit}
                      disabled={formLoading}
                      className="submit"
                    >
                      {formLoading ? <CircularProgress size={24} /> : (isEditMode ? "Update" : "Submit")}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            )}
          </Box>
        ) : (
          // Original download buttons and table
          <>
            <div className="d-flex">
              <div>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={()=>handleDownload('excel')}
                >
                  Download Excel
                </Button>
              </div>
              <div className="margin-left-5">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={()=>handleDownload('pdf')}
                  >
                    Download Pdf
                  </Button>
              </div>
              {isUserHasPermission("reports_send_notification", "view") && (
                <div className="ml-20">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSendNotification}
                  >
                    Send Notification
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-20">
              <AllMUIDataTable
                title={
                  tableUpdating ? <CircularProgress className="white-text" /> : ""
                }
                key={reportListData?.data_list}
                data={reportListData?.data_list}
                columns={columns}
                options={optionsLocal}
                onTableChange={getReportDownloadList}
                serverSide={true}
                pagination={pagination}
                count={reportListData?.count}
              />
            </div>
          </>
        )}
        {notificationDialog && (
          <NotificationPreviewDialog
            handleClose={handleClose}
            report_id={reportsId}
          />
        )}
      </Paper>
    </div>
  );
});
export default withRouter(ReportIndividualList);

import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Button,
  MenuItem,
  Checkbox,
  ListItemText,
  TextField,
} from "@material-ui/core";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
  isUserHasPermission,
  getUrlParam,
  getFilterColumns,
} from "Includes/functions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import { Dropdown } from "Components/DropDown";
import { isArray } from "highcharts";

const ReportConfiguration = React.forwardRef((props, ref) => {
  const [reportDetails, setReportDetails] = useState({
    report_description: "",
  });
  const [columnList, setColumnList] = useState([]);
  const [filterList, setFilterList] = useState([]);
  const [dataList, setDataList] = useState({});
  const [fieldError, setFieldError] = useState({});
  const [lodingApi, setLodingApi] = React.useState(false);
  const [submitDisable, setSubmitDisable] = React.useState(false);
  const transactionId = new Date()

  const filter_data = [
    {
      name: "academic_year",
      label: "Academic Year",
      get_data_hard_coded: [],
      get_data_url: "academicyear",
      params: [
        {
          is_active: true,
        },
      ],
      get_data_list_access_key: "data",
      get_data_value_acceess_key: [{ id: "id", name: "name" }],
      referred_params: [],
      type: "dropDown",
      data_dependent_on: [],
      selected_list: [1],
    },
    {
      name: "standard",
      label: "Standard",
      get_data_hard_coded: [],
      get_data_url: "standard",
      params: [
        {
          is_active: true,
        },
      ],
      referred_params: [{ name: "academic_year", is_mandatory: true }],
      get_data_list_access_key: "data",
      get_data_value_acceess_key: [{ id: "id", name: "name" }],
      type: "multiSelect",
      data_dependent_on: ["academic_year"],
      selected_list: [1, 2],
    },
    {
      name: "fee_type",
      label: "Fee Type",
      get_data_hard_coded: [],
      get_data_url: "feeplan",
      params: [
        {
          is_active: true,
        },
      ],
      referred_params: [
        { name: "academic_year", is_mandatory: true },
        { name: "standard", is_mandatory: true },
      ],
      get_data_list_access_key: "data",
      get_data_value_acceess_key: [{ id: "id", name: "name" }],
      type: "multiSelect",
      data_dependent_on: ["academic_year", "standard"],
      selected_list: [1, 2],
    },
  ];

  React.useEffect(async () => {
    const { reportId } = getUrlParam();
    const params = { report: reportId };
    try {
      const res = await Promise.all([
        getRequest(GET_URL.customreportcolumn.api, params, props),
        getRequest(GET_URL.customreportfilter.api, params, props),
      ]);
      getColumnList(res[0]);
      getFilterList(res[1]);
    } catch {
      throw Error("Promise failed");
    }
  }, []);

  const getColumnList = (response) => {
    if (response && response.status === 200) {
      response.data.data.map((data) => {
        data.checked = data.is_selected;
      });
      setColumnList(response.data.data);
    }
  };

  const checkingCondition = (field) => {
    if (field.data_dependent_on.length === 0) return true;
    field.data_dependent_on.map((data) => {
      if (!reportDetails[data]) {
        return false;
      }
    });
  };

  const getFilterList = async (response) => {
    if (response && response.status === 200) {
      setFilterList(response.data.data);
      let dataListTemp = {};
      await Promise.all(
        response.data.data.map(async (field) => {
          try {
            if (checkingCondition(field)) {
              const result = await updateGetList(field);
              dataListTemp[field.name] = result.data.data;
            }
          } catch (error) {
            console.error("Error fetching data:", error);
          }
        })
      );
      setDataList(dataListTemp);
    }
  };

  const updateGetList = async (field) => {
    const response = getRequest(
      GET_URL[field.get_data_url]?.api,
      field.params,
      props
    );
    return response;
  };

  const handleViewButton = () => {
    let url = Actions.reports.view.url;
    props.history.push({
      pathname: url,
    });
  };

  const onChangeColumn = (index) => {
    let columnListTemp = [...columnList];
    columnListTemp[index]["checked"] = !columnListTemp[index]["checked"];
    setColumnList(columnListTemp);
  };

  const onchangeDropdown = async (e) => {
    const { name, value } = e.target;
    reportDetails[name] = value;
    setReportDetails(reportDetails);
    let dataListTemp = { ...dataList };
    await Promise.all(
      filterList.map(async (field) => {
        try {
          const params = checkingConditionParams(field, name, value);
          if (params) {
            field.params = params;
            const result = await updateGetList(field);
            dataListTemp[field.name] = result.data.data;
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      })
    );
    setDataList(dataListTemp);
  };

  const checkingConditionParams = (field, name, value) => {
    let params = {};
    if (field.referred_params.length === 0) return false;
    field.referred_params.map((data) => {
      if (data.name === name) {
        if (isArray(value)) {
          params[data.name] = value.map((item) => item.id).join(",");
        } else {
          params[data.name] = value;
        }
      } else if (reportDetails[data.name]) {
        if (isArray(reportDetails[data.name])) {
          params[data.name] = reportDetails[data.name]
            .map((item) => item.id)
            .join(",");
        } else {
          params[data.name] = reportDetails[data.name];
        }
      }
    });
    if (
      field.referred_params.every((p) =>
        Object.keys(params).includes(p.name)
      ) &&
      field.referred_params.length === Object.keys(params).length
    ) {
      return params;
    }
    return false;
  };

  const onchangeMultiSelect = async (name, value) => {
    reportDetails[name] = value;
    setReportDetails(reportDetails);
    let dataListTemp = { ...dataList };
    await Promise.all(
      filterList.map(async (field) => {
        const params = checkingConditionParams(field, name, value);
        if (params) {
          field.params = params;
          const result = await updateGetList(field);
          dataListTemp[field.name] = result.data.data;
        }
      })
    );
    setDataList(dataListTemp);
  };

  const getDependentList = (data_dependent_on) => {
    const data_list = data_dependent_on.join(", ");
    return `Select ${data_list}`;
  };

  const preparePostData = () => {
    const selectedColumns = columnList.filter((col) => col.checked);
    const filters = filterList.map((filter) => {
      let selectedValues = reportDetails[filter.name];
      if (Array.isArray(selectedValues)) {
        selectedValues = selectedValues.map((item) => item.id).join(",");
      }

      return {
        filter_name: filter.name,
        filter_alias: filter.label,
        is_mandatory: filter.is_mandatory || false,
        is_default_selected: filter.is_default_selected || false,
        filter_data_type: filter.type,
        filter_selected_values: selectedValues || null,
      };
    });
    const columns = selectedColumns.map((col) => ({
      column_name: col.column_name,
      column_alias: col.column_alias,
      format_type: col.format_type || null,
      is_default_selected: col.is_default_selected || false,
    }));
    const { reportId, transactionId } = getUrlParam();
    const params = {
      report_id: reportId,
      report_name: reportDetails.report_name || "",
      report_description: reportDetails.report_description || "",
      process_hook: reportDetails.process_hook || "",
      process_function: reportDetails.process_function || "",
      code_name: reportDetails.code_name || "",
      transaction_id: transactionId,
      category: reportDetails.category || "",
      subcategory: reportDetails.subcategory || "",
      filters: filters,
      columns: columns,
    };

    return params;
  };

  const handleSubmit = async () => {
    setSubmitDisable(true);
    const postData = preparePostData();
    const url = POST_URL.customreport.api;
    const response = await postRequest(url, postData);
    setSubmitDisable(false);
    if (response?.status === 200) {
      props.history.push(Actions.reports.view.url);
    }
  };

  const handleFieldTypes = (field) => {
    switch (field.type) {
      case "dropDown":
        return (
          <div>
            <Dropdown
              data={dataList?.[field.name] ?? []}
              disabled={dataList?.[field.name] ? false : true}
              name={field.name}
              value={reportDetails[field.name]}
              onChange={(e) => onchangeDropdown(e)}
              label={field.label}
              size="small"
              className="width-300px"
              helperText={
                !dataList?.[field.name] && `Select ${field.data_dependet_on}`
              }
            />
          </div>
        );
      case "multiSelect":
        return (
          <div>
            <MultipleSelectDropdown
              data_list={dataList?.[field.name] ?? []}
              disabled={dataList?.[field.name] ? false : true}
              selected_list={reportDetails[field.name]}
              error={fieldError[field.name]}
              helperText={
                dataList?.[field.name]
                  ? fieldError[field.name]
                  : getDependentList(field.data_dependent_on)
              }
              label={field.label}
              onChange={(e) => onchangeMultiSelect(field.name, e)}
              size="small"
            />
          </div>
        );
      default:
        return "";
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportDetails((prev) => ({ ...prev, [name]: value }));
  };


  return (
    <div>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={8} xs={12} className="header-align">
            <Box className="heading">{Actions.reports.create.label}</Box>
          </Grid>
          <Grid item md={4} xs={12}>
            <Box className="header-align end-flex-prop">
              {isUserHasPermission("reports", "view") && (
                <Button
                  variant="contained"
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
        <TextField
          name="report_description"
          label="Report Name"
          variant="outlined"
          value={reportDetails.report_description || ""}
          onChange={handleInputChange}
          size="medium"
          inputProps={{ maxLength: 50 }}
        />

        <Paper className="mt-30">
          <Grid container>
            <Grid item md={4} xs={12}>
              <Box className="display-flex">
                <Box className="add-exam-standard-list-label">Column List</Box>
              </Box>
              {columnList.map((column, index) => {
                return (
                  <MenuItem
                    className="padding-0"
                    key={index}
                    value={column.column_alias}
                    onClick={() => onChangeColumn(index)}
                  >
                    <Checkbox color="primary" checked={column["checked"]} />
                    <Box className="text-capitalize">
                      <ListItemText primary={column.column_alias} />
                    </Box>
                  </MenuItem>
                );
              })}
            </Grid>
            <Grid item md={8} xs={12}>
              <div className="place-items-center">
                {filterList.map((data) => {
                  return <div className="mv-20">{handleFieldTypes(data)}</div>;
                })}
              </div>
            </Grid>
          </Grid>
          <Box display="flex" justifyContent="flex-end" style={{ marginTop: "16px" }}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              onClick={handleSubmit}
            >
              submit
            </Button>
          </Box>
        </Paper>
      </Paper>
    </div>
  );
});
export default withRouter(ReportConfiguration);
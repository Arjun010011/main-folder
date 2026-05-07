import React, { useState } from "react";
import { Box, Paper, Grid, Button } from "@material-ui/core";
import { Actions } from "Constants/permissions";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { options } from "Constants";
import { CircularProgress } from "@material-ui/core";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { dateFormat } from "Includes/functions";

const ReportList = React.forwardRef((props, ref) => {
  const [categoryList, setCategoryList] = useState([]);
  const [subCategoryList, setSubCategoryList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [fieldError, setFieldError] = useState(false);
  const [tableUpdating, setTableUpdating] = useState(false);
  const [reportListData, setReportListData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [optionsLocal, setOptionsLocal] = useState([]);

  React.useEffect(() => {
    // getCategoryList();
    getReportList();
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
        name: "report_description",
        label: "Report Description",
        options: {
          filter: true,
          sort: true,
        },
      },
      {
        name: "created",
        label: "Report Created",
        options: {
          filter: true,
          sort: true,
          customBodyRender: (value) => {
            return <div>{dateFormat(value, "DD-MM-YYYY hh:mm A")}</div>;
          },
        },
      },
      {
        name: "Modify",
        label: "Modify",
        options: {
          display: true,
          download: false,
          filter: false,
          customBodyRender: (value, tableMeta) => {
            const reportId = tableMeta.rowData[0];
            const transactionId = tableMeta.rowData[5];
            return (
              <Button
                className="apply-leave-button height-width-25px"
                onClick={() => modifyList(reportId, transactionId)}
              >
                Modify
              </Button>
            );
          },
          customHeadRender: (columnMeta) => (
            <th className="mui-table-custom-header-report-left-align">
              {columnMeta.label}
            </th>
          ),
        },
      },
      {
        name: "Download",
        label: "Download List",
        options: {
          display: true,
          download: false,
          filter: false,
          customBodyRender: (value, tableMeta) => {
            const reportId = tableMeta.rowData[0];
            const transactionId = tableMeta.rowData[5];
            // Get report_name from rowData (index 6 if it's the 7th column)
            // Or access from the original data array
            const rowIndex = tableMeta.rowIndex;
            const reportName = reportListData[rowIndex]?.report_name || tableMeta.rowData[6] || '';
            return (
              <Button
                className="apply-leave-button height-width-25px"
                onClick={() => detailedList(reportId, transactionId, reportName)}
              >
                Download
              </Button>
            );
          },
          customHeadRender: (columnMeta) => (
            <th className="mui-table-custom-header-report-left-align">
              {columnMeta.label}
            </th>
          ),
        },
      },
      {
        name: "transaction_id",
        label: "Transaction ID",
        options: {
          filter: true,
          sort: true,
          display: false,
        },
      },
      {
        name: "report_name",
        label: "report_name",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
    ];
    setColumns(columntemp);
    setOptionsLocal(options);
  }, []);

  const modifyList = (id, transactionId) => {
    let currentSelectedList = {
      reportId: id,
      transactionId
    };
    let searchParam = "?" + new URLSearchParams(currentSelectedList).toString();
    let url = Actions.reports.update.url;
    props.history.push({
      pathname: url,
      search: searchParam,
    });
  };

  const detailedList = (id, transactionId, reportName) => {
    let currentSelectedList = {
      reportId: id, 
      transactionId
    };
    // Add report_name to URL params if available
    if (reportName) {
      currentSelectedList.report_name = reportName;
    }
    let searchParam = "?" + new URLSearchParams(currentSelectedList).toString();
    let url = Actions.reports_detail.view.url;
    props.history.push({
      pathname: url,
      search: searchParam,
    });
  };

  const getCategoryList = () => {
    const url = GET_URL.customreportcategory.api;
    const params = { is_active: 1 };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        let categoryList = response.data.data;
        let temp = {};
        if (response.data.data.length === 1) {
          temp = response.data.data[0];
        } else if (response.data.data.length > 1) {
          temp = { id: "all", name: "All" };
          categoryList.unshift(temp);
        }
        setSelectedCategory(temp);
        setCategoryList(categoryList);
      }
    });
  };

  const getSubCategoryList = (id) => {
    const url = GET_URL.customreportsubcategory.api;
    const params = { is_active: 1, category: id };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length > 0) {
          let subCategoryList = response.data.data;
          let temp = {};
          if (response.data.data.length === 1) {
            temp = response.data.data[0];
          } else if (response.data.data.length > 1) {
            temp = { id: "all", name: "All" };
            subCategoryList.unshift(temp);
          }
          setSubCategoryList(subCategoryList);
          setSelectedSubCategory(temp);
        }
      }
    });
  };

  const getReportList = () => {
    const url = GET_URL.customreport.api;
    let params = { is_active: 1 };
    if (selectedCategory) {
      params["category"] = selectedCategory;
    }
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        setReportListData(response.data.data);
      }
    });
  };

  const handleChange = (e) => {
    setCategoryList(e.target.value);
  };

  const handleCategoryDropDown = (newValue) => {
    setSelectedCategory(newValue);
    setSubCategoryList([]);
    setSelectedSubCategory("");
    if (newValue.id !== "all") {
      getSubCategoryList(newValue.id);
    }
  };

  const handleSubCategoryDropDown = (newValue) => {
    setSelectedSubCategory(newValue);
  };

  return (
    <div>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={8} xs={12} className="header-align">
            <Box className="heading">{Actions.reports.view.label}</Box>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item md={3} xs={12} className="margin-top-20">
            <DropDownWithSearch
              options={categoryList}
              name={"selectedCategory"}
              value={selectedCategory}
              onChange={(e, newValue) => handleCategoryDropDown(newValue)}
              label={"Category"}
              hideClearIcon={true}
              className="width-300px"
              size="small"
            />
          </Grid>
          {subCategoryList.length > 0 && (
            <Grid item md={3} xs={12} className="margin-top-20 ml-20">
              <DropDownWithSearch
                options={subCategoryList}
                name={"selectedSubCategory"}
                value={selectedSubCategory}
                onChange={(e, newValue) => handleSubCategoryDropDown(newValue)}
                label={"Sub Category"}
                hideClearIcon={true}
                className="width-300px"
                size="small"
              />
            </Grid>
          )}
        </Grid>
        <AllMUIDataTable
          title={
            tableUpdating ? <CircularProgress className="white-text" /> : ""
          }
          key={reportListData}
          data={reportListData}
          columns={columns}
          options={optionsLocal}
        />
      </Paper>
    </div>
  );
});
export default withRouter(ReportList);
import React from "react";
import { Paper, Box, Button, Grid } from "@material-ui/core";
import { Actions } from "Constants/permissions";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { withRouter } from "react-router-dom";
import { getKeyValueMap, getUrlParam } from "Includes/functions";
import TermWiseFinalResultConfignew from "./components/TermWiseFinalResultConfignew";
import FinalWiseFinalResultConfig from "./components/FinalWiseFinalResultConfig";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};
const exam_config = JSON.parse(localStorage.getItem("exam_configurations"))
  ? JSON.parse(localStorage.getItem("exam_configurations"))
  : {};
const is_cumulative = exam_config["cumulative_type"] == 1 ? true : false;
const is_grade_plan = exam_config["grade_plan"] == 1 ? true : false;
function AddFinalResultConfignew(props) {
  const [yearList, setYearList] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [selectedExam, setSelectedExam] = React.useState("");
  const [currentTab, setCurrentTab] = React.useState("term1");
  const [examInformation, setExamInformation] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [gradePlanList, setGradePlanList] = React.useState([]);

  const goToViewPage = () => {
    let yearName = getKeyValueMap(yearList, "id", "name");
    yearName = yearName[selectedYear];
    let yearInformation = {
      selectedYear,
      yearName: examInformation["year_name"],
    };
    let searchParam = "?" + new URLSearchParams(yearInformation).toString();
    props.history.push({
      pathname: Actions.final_result_config_new.view.url,
      search: searchParam,
    });
  };

  const changeTab = (value) => {
    if (currentTab !== value) {
      setLoading(() => true);
      setCurrentTab(() => value);
    }
  };

  React.useEffect(() => {
    setLoading(() => false);
  }, [currentTab]);

  React.useEffect(() => {
    const { year_name, standard_name, section_name, selectedYear, selectedExam } = getUrlParam();
    let examInformation = {
      year_name,
      standard_name,
      section_name,
      selectedExam
    };
    setExamInformation(() => examInformation);
    getGradePlanList();
    setSelectedExam(selectedExam);
    setSelectedYear(selectedYear);
  }, []);

  const getGradePlanList = () => {
    const url = GET_URL.studentgrade.api;
    const params = { is_active: true };
    getRequest(url, params, {}).then((response) => {
      if (response && response.status === 200) {
        setGradePlanList(() => response.data.data);
      }
    });
  };

  return (
    <>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">Final Result Configuration</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className="header-align end-flex-prop">
              <Button
                variant="contained"
                onClick={goToViewPage}
                className="editbutton-view"
              >
                <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                {Actions.final_result_config_new.view.label}
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Box className="md-down-justify-start md-up-justify-start">
          <Box className="year-std-box mr-40">
            <Box className="academic-std-head"> Academic Year</Box>
            <Box className=" exam-mark-add-heading-bg">
              {examInformation?.year_name}
            </Box>
            <Box className="exam-mark-heading-box">{`${alias_names["standard"]}`}</Box>
            <Box className=" exam-mark-add-heading-bg">
              {examInformation?.standard_name}
            </Box>
            <Box className=" exam-mark-add-heading-bg">
              {examInformation?.section_name}
            </Box>
          </Box>
        </Box>
        <Grid container>
          <Grid item md={8} xs={12} className="leave-manage-space-around">
            <Box
              className={
                currentTab === "term1"
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => changeTab("term1")}
            >
              Term 1
              {currentTab === "term1" && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box>
            <Box
              className={
                currentTab === "term2"
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => changeTab("term2")}
            >
              Term 2
              {currentTab === "term2" && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box>
            <Box
              className={
                currentTab === "term"
                  ? "leave-management-selected-heading"
                  : "leave-management-heading"
              }
              onClick={() => changeTab("term")}
            >
              Final Result
              {currentTab === "term" && (
                <Box className="leave-management-selected-heading-underline" />
              )}
            </Box>
          </Grid>
        </Grid>
        <hr style={{ marginTop: "-4px" }} />
        {!loading && (
          // {currentTab !== "term" && !loading && (
          <TermWiseFinalResultConfignew
            props={props}
            currentTab={currentTab}
            goToViewPage={goToViewPage}
            gradePlanList={gradePlanList}
          />
        )}
        {/* {currentTab === "term" && !loading && (
          <FinalWiseFinalResultConfig
            props={props}
            gradePlanList={gradePlanList}
            goToViewPage={goToViewPage}
          />
        )} */}
      </Paper>
    </>
  );
}

export default withRouter(AddFinalResultConfignew);

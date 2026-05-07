import React from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
} from "@material-ui/core";
import {
  SetAcademicYear,
  SetStandard,
  getAcademicYear,
  getStandard,
  isUserHasPermission,
  getKeyValueMap,
} from "Includes/functions";
import { Link } from "react-router-dom";
import { Actions } from "Constants/permissions";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { withRouter } from "react-router-dom";

function FeeCategoryPlanList(props) {
  const [year_list, set_year_list] = React.useState([]);
  const [standard_list, set_standard_list] = React.useState([]);
  const [selected_year, set_selected_year] = React.useState("");
  const [selected_standard, set_selected_standard] = React.useState("");
  const [field_error, set_field_error] = React.useState({});
  const [section_list, set_section_list] = React.useState([]);

  const onChangeYear = (e) => {
    const { value } = e.target;
    let field_error_temp = { ...field_error };
    delete field_error_temp["selected_year"];
    set_field_error(field_error_temp);
    set_selected_year(value);
    SetAcademicYear(value);
  };

  const onChangeStandard = (e) => {
    const { value } = e.target;
    let field_error_temp = { ...field_error };
    delete field_error_temp["selected_standard"];
    set_field_error(field_error_temp);
    set_selected_standard(value);
    SetStandard(value);
  };

  React.useEffect(() => {
    getAcademicYearList();
    let year = getAcademicYear();
    if (year) {
      set_selected_year(year);
    }
    let standard = getStandard();
    if (standard) {
      set_selected_standard(standard);
    }
  }, []);

  React.useEffect(() => {
    getStandardList();
  }, [selected_year]);

  React.useEffect(() => {
    getFeeCategoryList();
  }, [selected_standard]);

  const getFeeCategoryList = () => {
    if (selected_standard && selected_year) {
      const url =
        GET_URL.feecategorystandardsectionwise.api + selected_standard + "/";
      const params = { is_active: true, academic_year: selected_year };
      getRequest(url, params, props).then((response) => {
        if (response && response.status === 200) {
          set_section_list(response.data.data);
        }
      });
    }
  };

  const getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        set_year_list(response.data.data);
      }
    });
  };

  const getStandardList = () => {
    const params = { academic_year: selected_year, is_active: true };
    getRequest(GET_URL.getstandard.api, params, props).then((response) => {
      if (response && response.status === 200) {
        let standardList = response.data.data;
        set_standard_list(standardList);
      }
    });
  };

  const handleCreateFeeCategoryPlan = () => {
    let field_error_temp = {};
    let validate = true;
    if (!selected_year) {
      field_error_temp["selected_year"] = "Select Academic Year";
      validate = false;
    }
    if (!selected_standard) {
      field_error_temp["selected_standard"] = "Select Standard";
      validate = false;
    }
    if (validate) {
      let year_name = getKeyValueMap(year_list, "id", "name");
      let standard_name = getKeyValueMap(standard_list, "id", "name");
      let currentSelectedList = {
        academic_year: selected_year,
        selected_standard: selected_standard,
        year_name: year_name[selected_year],
        standard_name: standard_name[selected_standard],
      };
      let searchParam =
        "?" + new URLSearchParams(currentSelectedList).toString();
      props.history.push({
        pathname: Actions.fee_category_plan.create.url,
        search: searchParam,
      });
    } else {
      set_field_error(field_error_temp);
    }
  };

  return (
    <div>
      <Paper className="paper-background">
        <Grid container>
          <Grid item md={6} xs={12} className="header-align">
            <Box className="heading">Fee Category Plan</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className="header-align end-flex-prop">
              {isUserHasPermission("fee_category_plan", "create") && (
                <Button
                  variant="contained"
                  onClick={handleCreateFeeCategoryPlan}
                  className="editbutton-view"
                >
                  <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                  {Actions.fee_category_plan.create.label}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item md={3} xs={12} className="header-align">
            <Dropdown
              data={year_list}
              name="selected_year"
              value={selected_year}
              onChange={onChangeYear}
              label={<FormattedMessage {...commonMessages.academicYear} />}
              className="w-100"
              hideSelect={true}
              size={"small"}
              error={field_error["selected_year"]}
            />
          </Grid>
          <Grid item md={3} xs={12} className="header-align">
            <Dropdown
              data={standard_list}
              name="selected_standard"
              value={selected_standard}
              onChange={onChangeStandard}
              label={<FormattedMessage {...commonMessages.standard} />}
              className="w-100"
              hideSelect={true}
              size={"small"}
              error={field_error["selected_standard"]}
            />
          </Grid>
        </Grid>
        {section_list?.fee_term_data &&
          section_list.fee_term_data.map((section, secIndex) => {
            return (
              <div key={secIndex}>
                <div className="heading mt-20">Section - {section.section__name}</div>
                <Grid container spacing={1} className="mb-40">
                  {section.fee_plan_data.map((fee_type) => {
                    return (
                      <Grid item xl={8} md={12} xs={12}>
                        <Paper className="schedule-add-paper" elevation={2}>
                          <Box className="flex-justify-space-between">
                            <Box className="schedule-add-standard-outer-box">
                              <Box className="schedule-add-standard-name">
                                {fee_type.fee_type__name && (
                                  <Box className="text-capitalize">
                                    {`${fee_type.fee_type__name}`}
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Box>

                          <TableContainer className="schedule-exam-overflow">
                            <Table
                              size="small"
                              aria-label="simple table"
                              className=""
                            >
                              <TableHead>
                                <TableRow className="">
                                  <TableCell className="">
                                    <div>Terms</div>
                                  </TableCell>
                                  <TableCell className="">
                                    Fee Category
                                  </TableCell>
                                  <TableCell className=""> Amount</TableCell>
                                  <TableCell className="">
                                    Term Start Date
                                  </TableCell>
                                  <TableCell className="">
                                    Term End Date
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              {fee_type.standard_fee_data.map(
                                (term) => {
                                  return (
                                    <TableRow>
                                      <TableCell
                                        className=""
                                        component="th"
                                        scope="row"
                                      >
                                        {term?.term_alias ?? term.terms}
                                      </TableCell>
                                      <TableCell className="">
                                        {
                                          term
                                            ?.feecategoryfeestandardsectionmapping_sections
                                            ?.fee_category__name
                                        }
                                      </TableCell>
                                      <TableCell className="">
                                        {term.rate}
                                      </TableCell>
                                      <TableCell className="">
                                        {term.term_start_date}
                                      </TableCell>
                                      <TableCell className="">
                                        {term.term_end_date}
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                              )}
                            </Table>
                          </TableContainer>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </div>
            );
          })}
      </Paper>
    </div>
  );
}

export default withRouter(FeeCategoryPlanList);

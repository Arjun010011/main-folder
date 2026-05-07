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
  Tooltip,
} from "@material-ui/core";
import { isUserHasPermission, getUrlParam } from "Includes/functions";
import { Actions } from "Constants/permissions";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { withRouter } from "react-router-dom";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import InfoIcon from "@material-ui/icons/Info";
import { cloneDeep } from "lodash";
import Swal from "sweetalert2";
import LoadingGif from "Components/LoadingGif";

function FeeCategoryPlanAdd(props) {
  const [loading, set_loading] = React.useState(true);
  const [props_information, set_props_information] = React.useState({});
  const [fee_plan_details, set_fee_plan_details] = React.useState([]);
  const [fee_category_list, set_fee_category_list] = React.useState([]);
  const [field_error, set_field_error] = React.useState({});
  const [section_list, set_section_list] = React.useState([]);
  const [fee_category, set_fee_category] = React.useState("");
  const [submit_disable, set_submit_disable] = React.useState(false);
  const [selected_fee_plans, set_selected_fee_plans] = React.useState([]);
  const [updated_section, set_updated_section] = React.useState(false);

  React.useEffect(() => {
    getFeeCategoryList();
  }, []);

  const getFeeCategoryList = () => {
    const url = GET_URL.feecategory.api;
    const params = { is_active: true };
    getRequest(url, params, props).then((response) => {
      if (response && response.status === 200) {
        set_fee_category_list(response.data.data);
        getFeeTermList();
      }
    });
  };

  React.useEffect(() => {
    if (fee_plan_details.length > 0) {
      getSectionList();
    }
  }, [fee_plan_details]);

  React.useEffect(() => {
    if (updated_section && section_list.length > 0) {
      set_updated_section(false);
      getFeeCategoryPlanList();
    }
  }, [updated_section]);

  React.useEffect(() => {
    if (!updated_section && section_list.length > 0) {
      set_loading(false);
    }
  }, [section_list]);

  const getFeeCategoryPlanList = () => {
    if (
      props_information.academic_year &&
      props_information.selected_standard
    ) {
      const url =
        GET_URL.feecategorystandardsectionwise.api +
        props_information.selected_standard +
        "/";
      const params = {
        is_active: true,
        academic_year: props_information.academic_year,
      };
      getRequest(url, params, props).then((response) => {
        if (response && response.status === 200) {
          let updated_details = response.data.data;
          let section_temp = cloneDeep(section_list);
          if (updated_details.fee_term_data) {
            updated_details.fee_term_data.map((parentSection) => {
              section_temp.map((section, secIndex) => {
                if (parentSection.id === section.standard_section) {
                  parentSection.fee_plan_data.map((parent_fee_type) => {
                    section.fee_plan.map((fee_type) => {
                      if (parent_fee_type.fee_type === fee_type.fee_type) {
                        parent_fee_type.standard_fee_data.map(
                          (parent_fee_term) => {
                            fee_type.standard_fee.map((fee_term) => {
                              if (parent_fee_term.id === fee_term.id)
                                fee_term["fee_category"] =
                                  parent_fee_term
                                    ?.feecategoryfeestandardsectionmapping_sections
                                    ?.fee_category ?? "";
                              if (
                                parent_fee_term
                                  .feecategoryfeestandardsectionmapping_sections
                                  .fee_category &&
                                parent_fee_term
                                  .feecategoryfeestandardsectionmapping_sections
                                  .standard_section_id ===
                                  section.standard_section
                              ) {
                                fee_term["fee_category_id"] =
                                  parent_fee_term.feecategoryfeestandardsectionmapping_sections.id;
                              }
                            });
                          }
                        );
                      }
                    });
                  });
                }
              });
            });
          }
          set_section_list([...section_temp]);
        }
      });
    }
  };

  const getSectionList = () => {
    let { academic_year, selected_standard } = getUrlParam();
    const url = GET_URL.getsection.api;
    const param = {
      is_active: true,
      academic_year: academic_year,
      standard: selected_standard,
    };
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((section) => {
          section.fee_plan = cloneDeep(fee_plan_details);
        });
        set_section_list(response.data.data);
        set_updated_section(true);
      }
    });
  };

  const getFeeTermList = () => {
    let { academic_year, selected_standard, year_name, standard_name } =
      getUrlParam();
    const props_info = {
      academic_year: academic_year,
      selected_standard: selected_standard,
      year_name: year_name,
      standard_name: standard_name,
    };
    set_props_information(props_info);
    const params = {
      academic_year: academic_year,
      standard: selected_standard,
    };
    getRequest(GET_URL.feeplan.api, params, props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.plan.map((fee_type) => {
          fee_type["checked"] = false;
          fee_type.standard_fee.map((fee_term) => {
            fee_term["checked"] = false;
            fee_term["fee_category"] = null;
            fee_term["selected_sections"] = [];
          });
        });
        set_fee_plan_details(response.data.data.plan);
      }
    });
  };

  const handleViewFeeCategoryPlan = () => {
    props.history.push({
      pathname: Actions.fee_category_plan.view.url,
    });
  };

  const handleSelectAll = (secIndex, stIndex) => {
    let section_temp = [...section_list];
    section_temp[secIndex]["fee_plan"][stIndex]["checked"] =
      !section_temp[secIndex]["fee_plan"][stIndex]["checked"];
    section_temp[secIndex]["fee_plan"][stIndex]["standard_fee"].map((data) => {
      data["checked"] = section_temp[secIndex]["fee_plan"][stIndex]["checked"];
    });
    set_section_list([...section_temp]);
    handleSelectFeePlan();
  };

  const handleSectionAll = (secIndex) => {
    let section_temp = [...section_list];
    section_temp[secIndex]["checked"] = !section_temp[secIndex]["checked"];
    section_temp[secIndex]["fee_plan"].map((fee_type) => {
      fee_type.standard_fee.map((data) => {
        data["checked"] = section_temp[secIndex]["checked"];
      });
    });
    set_section_list([...section_temp]);
    handleSelectFeePlan();
  };

  const handleSelectFeePlan = () => {
    let fee_plan_select = [];
    let section_temp = [...section_list];
    section_temp.map((section, secIndex) => {
      section.fee_plan.map((fee_type) => {
        fee_type.standard_fee.map((fee_term) => {
          if (fee_term.checked) {
            fee_plan_select.push(`${secIndex}${fee_term.id}`);
          }
        });
      });
    });
    set_selected_fee_plans(fee_plan_select);
  };

  const handleCheckChange = (secIndex, stIndex, termIndex) => {
    let section_temp = [...section_list];
    section_temp[secIndex]["fee_plan"][stIndex]["standard_fee"][termIndex][
      "checked"
    ] =
      !section_temp[secIndex]["fee_plan"][stIndex]["standard_fee"][termIndex][
        "checked"
      ];
    set_section_list([...section_temp]);
    handleSelectFeePlan();
  };

  const handleFeeCategory = (e, secIndex, stIndex, termIndex) => {
    let section_temp = [...section_list];
    section_temp[secIndex]["fee_plan"][stIndex]["standard_fee"][termIndex][
      "fee_category"
    ] = e.target.value;
    set_section_list([...section_temp]);
  };

  const handleFeeCategoryAll = (e) => {
    set_fee_category(e.target.value);
  };

  const applyToAll = () => {
    let section_temp = [...section_list];
    section_temp.map((section) => {
      section.fee_plan.map((fee_type) => {
        fee_type.standard_fee.map((fee_term) => {
          if (fee_term.checked) {
            fee_term["fee_category"] = fee_category;
          }
        });
      });
    });
    set_section_list([...section_temp]);
  };

  const saveData = () => {
    const validate = validateAndGetPostData();
    if (validate) {
      let url = POST_URL.feecategorystandardsectionwise.api;
      postRequest(url, validate, props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          props.history.push(Actions.fee_category_plan.view.url);
        }
      });
    }
  };

  const validateAndGetPostData = () => {
    let field_error_temp = {};
    let validate = true;
    let post_data = {};
    let section_list_temp = [];
    let deletable_ids = [];
    let section_temp = {};
    section_list.map((section) => {
      section.fee_plan.map((feeType) => {
        feeType.standard_fee.map((term) => {
          if (term.fee_category) {
            section_temp = {
              standard_section: section.standard_section,
              fee_plan: term.id,
              fee_category: term.fee_category,
            };
            if (term.fee_category_id) {
              section_temp["id"] = term.fee_category_id;
            }
            section_list_temp.push(section_temp);
          } else if (
            term.fee_category_id &&
            !deletable_ids.includes(term.fee_category_id)
          ) {
            deletable_ids.push(term.fee_category_id);
          }
        });
      });
    });
    if (validate) {
      post_data["fee_term_standard_section_mapping"] = section_list_temp;
      post_data["deletable_ids"] = deletable_ids;
    } else {
      set_field_error(field_error_temp);
    }
    return post_data;
  };

  if (loading) {
    return (
      <>
        <LoadingGif />
      </>
    );
  } else
    return (
      <div>
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={6} xs={12} className="header-align">
              <Box className="heading">Fee Category Plan</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className="header-align end-flex-prop">
                {isUserHasPermission("fee_category_plan", "view") && (
                  <Button
                    variant="contained"
                    onClick={handleViewFeeCategoryPlan}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.fee_category_plan.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Box className="year-std-box mr-40">
              <Box className="academic-std-head">Academic Year</Box>
              <Box className=" exam-mark-add-heading-bg">
                {props_information.year_name}
              </Box>
              <Box className="academic-std-head">Standard</Box>
              <Box className=" exam-mark-add-heading-bg">
                {props_information.standard_name}
              </Box>
            </Box>
          </Grid>
          <Paper
            className={
              selected_fee_plans.length > 0
                ? "p-20 mt-20"
                : "p-20 mt-20 opacity-0-5"
            }
          >
            <div className="d-flex pointer">
              {selected_fee_plans.length === 0 && (
                <div>
                  <Tooltip
                    title={"Select Fee Plan To Enable"}
                    enterDelay={400}
                    enterNextDelay={400}
                    placement="top-start"
                    classes={{ tooltip: "tooltip-show-data" }}
                  >
                    <InfoIcon />
                  </Tooltip>
                </div>
              )}
              <div className="fs-20 text-blue">Apply To Selected Terms</div>
            </div>
            <Grid container spacing={1} className="mt-10">
              <Grid item md={4} xs={12}>
                <Dropdown
                  data={fee_category_list}
                  name={"fee_category"}
                  value={fee_category}
                  onChange={handleFeeCategoryAll}
                  error={field_error[`fee_category`]}
                  label={""}
                  size="small"
                  showErrorMessage={false}
                  disabled={selected_fee_plans.length === 0}
                />
              </Grid>
              <Grid item md={2} xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  onClick={applyToAll}
                  disabled={selected_fee_plans.length === 0}
                >
                  Apply All
                </Button>
              </Grid>
            </Grid>
          </Paper>
          {section_list.map((section, secIndex) => {
            return (
              <div key={secIndex}>
                <div
                  className="align-self-end display-flex pointer heading mt-20"
                  onClick={() => handleSectionAll(secIndex)}
                >
                  <input
                    type="checkbox"
                    className="pointer"
                    name={"isAllSubjectSelected"}
                    value={section.checked}
                    checked={section.checked}
                  ></input>
                  <div>Section - {section.name}</div>
                </div>
                <Grid container spacing={1} className="mb-40">
                  {section.fee_plan.map((fee_type, stIndex) => {
                    return (
                      <Grid item xl={8} md={12} xs={12}>
                        <Paper className="schedule-add-paper" elevation={2}>
                          <Box className="flex-justify-space-between">
                            <Box className="schedule-add-standard-outer-box">
                              <Box className="schedule-add-standard-name">
                                {fee_type.fee_type_name && (
                                  <Box className="text-capitalize">
                                    {`${fee_type.fee_type_name}`}
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
                                    <Tooltip
                                      title="Select All"
                                      enterDelay={400}
                                      enterNextDelay={400}
                                      placement="top-start"
                                      classes={{ tooltip: "tooltip-show-data" }}
                                    >
                                      <div
                                        className="align-self-end display-flex pointer"
                                        onClick={() =>
                                          handleSelectAll(secIndex, stIndex)
                                        }
                                      >
                                        <input
                                          type="checkbox"
                                          className="pointer"
                                          name={"isAllSubjectSelected"}
                                          value={fee_type.checked}
                                          checked={fee_type.checked}
                                        ></input>
                                        <div>Terms</div>
                                      </div>
                                    </Tooltip>
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
                              {fee_type.standard_fee.map((term, subIndex) => {
                                return (
                                  <TableRow>
                                    <TableCell
                                      className=""
                                      component="th"
                                      scope="row"
                                    >
                                      <div
                                        className="display-flex align-self-center pointer"
                                        onClick={() =>
                                          handleCheckChange(
                                            secIndex,
                                            stIndex,
                                            subIndex
                                          )
                                        }
                                      >
                                        <input
                                          type="checkbox"
                                          className="pointer"
                                          name={term.checked}
                                          value={term.checked}
                                          checked={term.checked}
                                        ></input>
                                        {term?.term_alias ?? term.terms}
                                      </div>
                                    </TableCell>
                                    <TableCell className="">
                                      {(term.fee_category ||
                                        term.fee_category !== null) && (
                                        <Dropdown
                                          data={fee_category_list}
                                          name={"fee_category"}
                                          value={term.fee_category}
                                          onChange={(e) =>
                                            handleFeeCategory(
                                              e,
                                              secIndex,
                                              stIndex,
                                              subIndex
                                            )
                                          }
                                          error={
                                            field_error[
                                              `${secIndex}${stIndex}${subIndex}fee_category`
                                            ]
                                          }
                                          label={""}
                                          size="small"
                                          showErrorMessage={false}
                                        />
                                      )}
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
                              })}
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
        <Box className="submt-button-float-bottom">
          <Button
            variant="contained"
            color="primary"
            className="submit"
            disabled={submit_disable}
            onClick={saveData}
          >
            submit
          </Button>
        </Box>
      </div>
    );
}

export default withRouter(FeeCategoryPlanAdd);

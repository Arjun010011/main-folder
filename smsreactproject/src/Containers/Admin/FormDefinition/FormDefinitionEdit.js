import React, { Component, Fragment } from "react";
import {
  Paper,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  Tooltip,
  Button,
  Collapse,
  Typography,
} from "@material-ui/core";
import LoadingGif from "Components/LoadingGif";
import { withRouter } from "react-router-dom";
import _ from "lodash";
import Swal from "sweetalert2";
import InfoIcon from "@material-ui/icons/Info";

import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Forms } from "Constants/FormDefinition";
import { Actions } from "Constants/permissions";
import { getUrlParam } from "Includes/functions";
import {
  updateFormFields,
  updateNewFormFields,
} from "Containers/Admin/FormDefinition/functions";
import { InputChange } from "Containers/Admin/FormDefinition/components/InputChange";
import "./styles.scss";
import { getFormDefiniationNames } from "Containers/Admin/FormDefinition/functions";
import { CustomForms } from "Constants/FormDefinition/CustomAdmissionForm";


let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

class FormDefinitionEdit extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      form_name: "",
      isEditable: false,
      form_details: null,
      backendFieldsValue: [],
      submitDisable: false,
    };
  }

  componentDidMount = () => {
    let { form_name, form_label, new_form } = getUrlParam();
    let form_details = _.cloneDeep(Forms);
    this.setState(
      {
        form_name,
        form_label,
        form_details,
        new_form,
      },
      () => {
        this.getCustomFormDetails();
      }
    );
  };

  getCustomFormDetails = () => {
    const { form_name, form_details } = this.state;
    const url = GET_URL.customform.api;
    const params = { form_for: form_name, is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let customDetails = response.data.data[0];
        let form_index = "";
        form_details.map((parentField, index) => {
          if (parentField["page_details"]["form_name"] === form_name) {
            form_index = index;
          }
          if (
            parentField.page_details.form_name === "admission_form" &&
            Object.keys(CustomForms).includes(user.institute_details.code)
          ) {
            parentField.page_details =
              CustomForms[user.institute_details.code]["page_details"];
          }
        });
        let index_temp = "";
        let section_temp = "";
        if (customDetails) {
          customDetails.field_structure.map((data) => {
            index_temp = "";
            if (
              form_details[form_index]["page_details"]["sub_sections"][
                data["sub_section"]
              ]
            ) {
              form_details[form_index]["page_details"]["sub_sections"][
                data["sub_section"]
              ].list.map((dataList, dataIndex) => {
                if (dataList && dataList.name === data["coming_after"]) {
                  index_temp = dataIndex;
                  section_temp = data["sub_section"];
                }
              });
            }
            if (index_temp !== "" && section_temp !== "") {
              form_details[form_index]["page_details"]["sub_sections"][
                section_temp
              ]["list"].splice(index_temp + 1, 0, data);
            }
          });
        }
        this.setState(
          {
            form_details,
          },
          () => {
            this.getFormDetails(form_name);
          }
        );
      }
    });
  };

  getFormDetails = (form_name) => {
    const url = GET_URL.formdefinition.api;
    const params = { form_name: form_name };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length !== 0) {
          this.updateFields(response.data.data);
        } else {
          this.setState({
            loading: false,
          });
        }
        this.setState({
          backendFieldsValue: response.data.data,
        });
      }
    });
  };

  updateFields = (backendFieldsValue) => {
    let { form_name, form_details, new_form } = this.state;
    let updated_form_details = [];
    if (new_form) {
      updated_form_details = updateNewFormFields(backendFieldsValue, form_name);
    } else {
      updated_form_details = updateFormFields(
        form_details,
        backendFieldsValue,
        form_name
      );
    }
    this.setState({
      form_details: updated_form_details,
      isEditable: true,
      loading: false,
    });
  };

  handleEditPage = (form_name) => {
    if (form_name) {
      let formInformation = {
        form_name: form_name,
      };
      let searchParam = "?" + new URLSearchParams(formInformation).toString();
      this.props.history.push({
        pathname: Actions.form_definition.update.url,
        search: searchParam,
      });
    }
  };

  handleCheckBox = (field, index, name) => {
    let { form_details, form_name } = this.state;
    form_details.map((parentField, pIndex) => {
      if (parentField["page_details"]["form_name"] === form_name) {
        parentField["page_details"]["sub_sections"][field]["list"][index][
          name
        ] =
          !parentField["page_details"]["sub_sections"][field]["list"][index][
            name
          ];
      }
    });
    this.setState({
      form_details,
    });
  };

  handleChangeText = (e, field, index) => {
    let { form_details, form_name } = this.state;
    let { name, value } = e.target;
    form_details.map((parentField) => {
      if (parentField["page_details"]["form_name"] === form_name) {
        parentField["page_details"]["sub_sections"][field]["list"][index][
          name
        ] = value;
      }
    });
    this.setState({
      form_details,
    });
  };

  handleSectionChangeText = (e, field) => {
    let { form_details, form_name } = this.state;
    let { name, value } = e.target;
    form_details.map((parentField) => {
      if (parentField["page_details"]["form_name"] === form_name) {
        parentField["page_details"]["sub_sections"][field][name] = value;
      }
    });
    this.setState({
      form_details,
    });
  };

  handleSectionCheckBox = (field, name) => {
    let { form_details, form_name } = this.state;
    form_details.map((parentField) => {
      if (parentField["page_details"]["form_name"] === form_name) {
        parentField["page_details"]["sub_sections"][field][name] =
          !parentField["page_details"]["sub_sections"][field][name];
      }
    });
    this.setState({
      form_details,
    });
  };

  handleTableBody = (parentField, field) => {
    return (
      <React.Fragment>
        <TableRow className="table-row display-flex">
          <TableCell
            component="th"
            scope="row"
            className="form-definition-table-label"
          >
            <Box className="section-outer-box">
              <Box>
                {parentField["page_details"]["sub_sections"][field]["label"]}
              </Box>
              <Box>
                {parentField["page_details"]["sub_sections"][field][
                  "can_hide"
                ] &&
                  !parentField["page_details"]["sub_sections"][field][
                    "only_alias"
                  ] && (
                    <Button
                      className="custom-button flex-justify-center margin-left-20"
                      color="secondary"
                      onClick={() =>
                        this.handleSectionCheckBox(field, "hidden")
                      }
                    >
                      {parentField["page_details"]["sub_sections"][field][
                        "hidden"
                      ]
                        ? " Show "
                        : " Hide "}
                    </Button>
                  )}
              </Box>
            </Box>
          </TableCell>
          {!parentField["page_details"]["sub_sections"][field][
            "only_alias"
          ] && (
            <TableCell component="th" scope="row">
              <Box className="mr-20">Alias Name</Box>
              <InputChange
                value={
                  parentField["page_details"]["sub_sections"][field].alias_name
                }
                name="alias_name"
                label="alias_name"
                onChange={(e) => this.handleSectionChangeText(e, field)}
              />
            </TableCell>
          )}
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={true} timeout="auto" unmountOnExit>
              <Box margin={1}>
                <Table size="small" aria-label="purchases">
                  <TableHead>
                    {!Boolean(
                      parentField["page_details"]["sub_sections"][field][
                        "hidden"
                      ]
                    ) && (
                      <TableRow>
                        {!parentField["page_details"]["sub_sections"][field][
                          "only_alias"
                        ] && <TableCell>Field Name</TableCell>}
                        {parentField["page_details"]["sub_sections"][field][
                          "only_alias"
                        ] && <TableCell>Default Name</TableCell>}
                        <TableCell>Alias Name</TableCell>
                        {!parentField["page_details"]["sub_sections"][field][
                          "only_alias"
                        ] && <TableCell align="center">Hide</TableCell>}
                        {!parentField["page_details"]["sub_sections"][field][
                          "only_alias"
                        ] && <TableCell align="center">Disable</TableCell>}
                        {!parentField["page_details"]["sub_sections"][field][
                          "only_alias"
                        ] && <TableCell align="center">Required</TableCell>}
                        {!parentField["page_details"]["sub_sections"][field][
                          "only_alias"
                        ] && <TableCell align="right">Default Value</TableCell>}
                      </TableRow>
                    )}
                  </TableHead>
                  <TableBody>
                    {parentField["page_details"]["sub_sections"][field][
                      "list"
                    ].map((data, index) => (
                      <>
                        {!Boolean(
                          parentField["page_details"]["sub_sections"][field][
                            "hidden"
                          ]
                        ) && (
                          <TableRow key={index}>
                            {data.description ? (
                              <Tooltip
                                title={data.description}
                                enterDelay={400}
                                enterNextDelay={400}
                                placement="top-start"
                                classes={{ tooltip: "tooltip-show-data" }}
                              >
                                <TableCell component="th" scope="row">
                                  <div className="d-flex align-self-center pointer">
                                    <InfoIcon />
                                    {data.label}
                                  </div>
                                </TableCell>
                              </Tooltip>
                            ) : (
                              <TableCell component="th" scope="row">
                                {data.label}
                              </TableCell>
                            )}
                            <TableCell component="th" scope="row">
                              <InputChange
                                value={data.alias_name}
                                name="alias_name"
                                onChange={(e) =>
                                  this.handleChangeText(e, field, index)
                                }
                                index={index}
                              />
                            </TableCell>

                            <TableCell align="center">
                              {!data.required &&
                                !parentField["page_details"]["sub_sections"][
                                  field
                                ]["only_alias"] &&
                                !data.avoid_hide && (
                                  <input
                                    type="checkbox"
                                    className="checkbox-style"
                                    onChange={() =>
                                      this.handleCheckBox(
                                        field,
                                        index,
                                        "hidden"
                                      )
                                    }
                                    name={data.hidden}
                                    value={data.hidden}
                                    defaultChecked={data.hidden}
                                  ></input>
                                )}
                            </TableCell>
                            <TableCell align="center">
                              {!data.hidden &&
                                !data.required &&
                                !parentField["page_details"]["sub_sections"][
                                  field
                                ]["only_alias"] && (
                                  <input
                                    type="checkbox"
                                    className="checkbox-style"
                                    onChange={() =>
                                      this.handleCheckBox(
                                        field,
                                        index,
                                        "disabled"
                                      )
                                    }
                                    name={data.disabled}
                                    value={data.disabled}
                                    defaultChecked={data.disabled}
                                  ></input>
                                )}
                            </TableCell>
                            <TableCell align="center">
                              {!data.hidden &&
                                !data.required &&
                                !parentField["page_details"]["sub_sections"][
                                  field
                                ]["only_alias"] && (
                                  <input
                                    type="checkbox"
                                    className="checkbox-style"
                                    onChange={() =>
                                      this.handleCheckBox(
                                        field,
                                        index,
                                        "required_temp"
                                      )
                                    }
                                    name={data.required_temp}
                                    value={data.required_temp}
                                    defaultChecked={data.required_temp}
                                  ></input>
                                )}
                              {!data.hidden &&
                                data.required &&
                                !parentField["page_details"]["sub_sections"][
                                  field
                                ]["only_alias"] && (
                                  <Tooltip
                                    title="Default Required True"
                                    enterDelay={400}
                                    enterNextDelay={100}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <input
                                      type="checkbox"
                                      className="checkbox-style"
                                      name={true}
                                      value={true}
                                      disabled={true}
                                      defaultChecked={true}
                                    ></input>
                                  </Tooltip>
                                )}
                            </TableCell>
                            <TableCell align="right">
                              {!data.hidden &&
                                !parentField["page_details"]["sub_sections"][
                                  field
                                ]["only_alias"] && (
                                  <InputChange
                                    value={data.default_value}
                                    name="default_value"
                                    onChange={(e) =>
                                      this.handleChangeText(e, field, index)
                                    }
                                    index={index}
                                  />
                                )}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow>
                          {Boolean(
                            parentField["page_details"]["sub_sections"][field][
                              "hidden"
                            ]
                          ) &&
                            index === 0 && (
                              <TableCell>Section will be hidden</TableCell>
                            )}
                        </TableRow>
                      </>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment>
    );
  };

  submit = () => {
    let { form_name, form_details, new_form } = this.state;
    let postForm = [];
    this.setState({ submitDisable: true });
    form_details.map((parentField) => {
      return (
        parentField["page_details"]["form_name"] === form_name &&
        Object.keys(parentField["page_details"]["sub_sections"]).map(
          (field) => {
            let temp = {};
            temp["form_name"] = form_name;
            temp["column_name"] =
              parentField["page_details"]["sub_sections"][field]["name"];
            temp["column_alias"] =
              parentField["page_details"]["sub_sections"][field]["alias_name"];
            temp["hidden"] =
              parentField["page_details"]["sub_sections"][field]["hidden"];
            if (
              parentField["page_details"]["sub_sections"][field]["backend_id"]
            ) {
              temp["id"] =
                parentField["page_details"]["sub_sections"][field][
                  "backend_id"
                ];
            }
            if (!new_form) {
              postForm.push(temp);
            }
            parentField["page_details"]["sub_sections"][field]["list"].map(
              (data) => {
                if (!field.hidden) {
                  temp = {};
                  temp["form_name"] = form_name;
                  temp["column_name"] = new_form
                    ? data.column_name
                    : `${parentField["page_details"]["sub_sections"][field]["name"]}_${data.name}`;
                  temp["column_alias"] = data.alias_name;
                  temp["column_label"] = data.label;
                  temp["hidden"] = data.hidden;
                  temp["required"] = data.required_temp == true;
                  temp["editable"] = !data.disabled;
                  temp["default_value"] =
                    !data.default_value || data.type !== "text"
                      ? ""
                      : data.default_value;
                  if (data.backend_id) {
                    temp["id"] = data.backend_id;
                  }
                  postForm.push(temp);
                }
              }
            );
          }
        )
      );
    });

    // let post_data = {
    //     form_name: form_name,
    //     data: postForm
    // }
    const url = POST_URL.formdefinition.api;
    postRequest(url, postForm, this.props).then((response) => {
      if (response && response.status === 200) {
        this.updateFormDefinition();
        this.setState({ submitDisable: false });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        }).then(this.props.history.push(Actions.form_definition.view.url));
      } else {
        this.setState({ submitDisable: false });
      }
    });
  };

  updateFormDefinition = async () => {
    await getFormDefiniationNames("alias_name");
    await getFormDefiniationNames("exam_configurations", true);
    await getFormDefiniationNames("dashboard_configuration", true);
    await getFormDefiniationNames("fee_configurations", true);
    await getFormDefiniationNames("student_configuration", true);
    await getFormDefiniationNames("student_attendance_configuration", true);
    await getFormDefiniationNames("expense_configuration", true);
    await getFormDefiniationNames("certificate_configuration", true);
    await getFormDefiniationNames("staff_configuration", true);
    await getFormDefiniationNames("library_configuration", true);
  };

  render() {
    let { loading, form_name, form_label, form_details, submitDisable } =
      this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className="paper-background">
          <Box className="heading" display="flex">
            <Typography variant="h5" color="primary">
              Update Form Definition for {form_label}
            </Typography>
            <Box ml="auto">
              <Button
                variant="contained"
                disabled={submitDisable}
                color="primary"
                className="submit"
                onClick={this.submit}
              >
                Submit
              </Button>
            </Box>
          </Box>
          <Paper className="paper-plan-background">
            <TableContainer>
              <Table size="large" aria-label="simple table">
                <TableBody>
                  {form_details.map((parentField) => {
                    return (
                      parentField["page_details"]["form_name"] === form_name &&
                      Object.keys(
                        parentField["page_details"]["sub_sections"]
                      ).map((field) => {
                        return this.handleTableBody(parentField, field);
                      })
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Paper>
      );
    }
  }
}

export default withRouter(FormDefinitionEdit);

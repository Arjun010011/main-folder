import React, { useEffect, useMemo, useState } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";

import AllMUIDataTable from "Components/AllMUIDataTable";
import ActionColumn from "Components/ActionColumnNew";
import loadingBar from "images/loading.gif";

import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { options as defaultMUIOptions } from "Constants";
import { isUserHasPermission } from "Includes/functions";
import { Actions } from "Constants/permissions";
import AddCourse from "Containers/Exam Engineer/AddCourseDesign"

// If you already have field config for editing, import it.
// For now we define a minimal inline version for the ActionColumn editor.
const courseDesignFieldDetails = [
  {
    label: "Subject Code",
    name: "subject_code",
    required: true,
    type: "text",
    size: "small",
  },
  {
    label: "Credit",
    name: "credit",
    required: true,
    type: "number",
    size: "small",
  },
  {
    label: "Teaching Pedagogy",
    name: "teaching_pedagogy",
    required: true,
    type: "text",
    size: "small",
  },
];

const ViewCourseDesign = (props) => {
  const [courseDesignList, setCourseDesignList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableUpdating, setTableUpdating] = useState(false);
  const [enabledActions, setEnabledActions] = useState([]);
  const [muiOptions, setMuiOptions] = useState(defaultMUIOptions);

  useEffect(() => {
    const canEdit = isUserHasPermission("course_design", "update") || isUserHasPermission("staffsubjectcoursedesign", "update");
    const canDelete = isUserHasPermission("course_design", "delete") || isUserHasPermission("staffsubjectcoursedesign", "delete");
    const actions = [];
    if (canEdit) actions.push("edit");
    if (canDelete) actions.push("delete");
    setEnabledActions(actions);
    getCourseDesign();
    setMuiOptions(defaultMUIOptions);
  }, []);


  const getCourseDesign = async () => {
      setLoading(true);
      const url = GET_URL.staffsubjectcoursedesign.api;
      const params = { is_active: true };
      const response = await getRequest(url, params, props);
      if (response && response.status === 200) {
console.log(response.data,"asdfghjkl")
        setCourseDesignList(response.data);
      }
      setLoading(false);
  };

  const fieldValues = (subject_code, credit, teaching_pedagogy) => {
    return [subject_code, credit, teaching_pedagogy];
  };

  const updatePostFormat = (newData) => {
    return {
      subject_code: newData.subject_code,
      credit: Number(newData.credit),
      teaching_pedagogy: newData.teaching_pedagogy,
    };
  };

  const updateType = (newData, id) => {
    setTableUpdating(true);
    setCourseDesignList((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              subject_code: newData.subject_code,
              credit: newData.credit,
              teaching_pedagogy: newData.teaching_pedagogy,
            }
          : row
      )
    );
    setTableUpdating(false);
    return true;
  };

  const deleteType = (id) => {
    setCourseDesignList((prev) => prev.filter((row) => row.id !== id));
  };

  const columns = useMemo(
    () => [
      {
        name: "id",
        label: "ID",
        options: { filter: true, sort: true, display: false },
      },
      {
        name: "subject_name",
        label: "Subject",
        options: { filter: true, sort: true },
      },
      {
        name: "subject_code",
        label: "Subject Code",
        options: { filter: true, sort: true },
      },
      {
        name: "no_of_cos",
        label: "No Of COS",
        options: { filter: true, sort: true },
      },
      {
        name: "Actions",
        label: "Actions",
        options: {
          filter: false,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            const subject = courseDesignList?.[tableMeta.rowIndex];
            console.log(courseDesignList,'coursee')
            return (
              <ActionColumn
                  id={tableMeta.rowData[0]}
                  fieldValues={[tableMeta.rowData[2]]}
                  fieldDetails={courseDesignFieldDetails}
                  baseClassName='action-basic-detail-width'
                  enabledActions={["edit"]}
                  newEditData={{
                      'redirectToUrl': Actions.course_design.create.url,
                      'params': {
                          subject_id:tableMeta.rowData[0],
                      }
                  }}
              />
            );
          }
          
        },
      }
    ],
    [enabledActions]
  );
  console.log(courseDesignList)

  // --- UI ---
  if (loading) {
    return (
      <Box display="flex">
        <img src={loadingBar} className="loading" alt="loading" />
      </Box>
    );
  }

  return (
    <Box>
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">Course Design</Box>
            <Box className="sub-heading">Manage subject code, credit and pedagogy for each design</Box>
          </Grid>

          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              {(isUserHasPermission("course_design", "create") ||
                isUserHasPermission("staffsubjectcoursedesign", "create")) && (
                <Button
                  variant="contained"
                  component={Link}
                  to={Actions.course_design.create.url}
                  className="editbutton-view"
                >
                  <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                  {Actions?.courses?.create?.label || "Add Course Design"}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        <Grid container className={classNames("header-align")}>
          <Grid item md={12} xs={12}>
            <Paper>
              <AllMUIDataTable
                key={courseDesignList?.length}
                title={tableUpdating ? <CircularProgress className="white-text" /> : ""}
                data={courseDesignList}
                columns={columns}
                options={muiOptions}
              />
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default withRouter(ViewCourseDesign);

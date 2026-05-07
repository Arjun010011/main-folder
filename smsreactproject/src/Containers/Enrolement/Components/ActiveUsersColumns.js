import React from "react";
import { Tooltip, Box } from "@material-ui/core";

import { dateFormat } from "Includes/functions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

export const studentColumns = [
  {
    name: "full_name",
    label: <FormattedMessage {...commonMessages.studentName} />,
    options: {
      filter: false,
      sort: true,
      search: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return (
          <Tooltip
            title={
              tableMeta.rowData[8] ? "Old Student" : "New Admission Student"
            }
            enterDelay={400}
            enterNextDelay={400}
            placement="top-start"
            classes={{ tooltip: "tooltip-show-data" }}
          >
            <Box display="flex">
              <Box
                className={
                  tableMeta.rowData[8]
                    ? "application-old-student-list-admitted"
                    : "application-student-list-admitted"
                }
              ></Box>
              <Box>{value}</Box>
            </Box>
          </Tooltip>
        );
      },
    },
  },
  {
    name: "current_standard_name",
    label: <FormattedMessage {...commonMessages.standard} />,
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: "admission_num",
    label: "Admission Num",
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: "dob",
    label: <FormattedMessage {...commonMessages.dob} />,
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return value && dateFormat(value, "DD-MM-YYYY");
      },
    },
  },
  {
    name: "username",
    label: "User Name",
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: "mobile_num",
    label: <FormattedMessage {...commonMessages.mobileNo} />,
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: "last_activity",
    label: "Last Activity",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return value && dateFormat(value, "DD-MM-YYYY hh:mm A");
      },
    },
  },
  {
    name: "id",
    label: "ID",
    options: {
      filter: false,
      sort: false,
      display: false,
      viewColumns: false,
      download: false,
    },
  },
  {
    name: "is_new_student",
    label: <FormattedMessage {...commonMessages.studentType} />,
    options: {
      filter: false,
      sort: true,
      display: false,
      download: false,
    },
  },
];

export const staffColumns = [
  {
    name: "full_name",
    label: "Staff Name",
    options: {
      filter: false,
      sort: true,
      search: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return <div className="mui-table-custom-value-left-align">{value}</div>;
      },
    },
  },
  {
    name: "group_name",
    label: "groups",
    options: {
      filter: true,
      sort: true,
      display: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return <Box>{value && value[0]}</Box>;
      },
    },
  },
  {
    name: "username",
    label: "User Name",
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: "email",
    label: "Email",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return (
          <div className="mui-table-custom-value-left-align text-transform-none">
            {value}
          </div>
        );
      },
    },
  },
  {
    name: "mobile_num",
    label: "Mobile No",
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: "last_activity",
    label: "Last Activity",
    options: {
      filter: false,
      sort: true,
      customBodyRender: (value, tableMeta, updateValue) => {
        return value && dateFormat(value, "DD-MM-YYYY hh:mm A");
      },
    },
  },
  {
    name: "id",
    label: "ID",
    options: {
      filter: false,
      sort: false,
      display: false,
      viewColumns: false,
      download: false,
    },
  },
];

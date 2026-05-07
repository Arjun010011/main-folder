import React from "react";
import { withRouter } from "react-router-dom";
import { Grid, Paper, Box, Tooltip, Checkbox } from "@material-ui/core";

import "./../styles.scss";

class AssignPermissionsTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  getTableRow = (data, index) => {
    const { checkValues, permissionNames, group } = this.props;
    const rowData = permissionNames[data];
    let isCheckedAll = true;
    if (
      (Array.isArray(rowData.view?.roles) &&
        !rowData.view.roles.includes(group)) ||
      (Array.isArray(rowData.view?.exclude_roles) &&
        rowData.view.exclude_roles.includes(group))) {
      rowData.view.isDisabled = true
    }
    if (
      (Array.isArray(rowData.create?.roles) &&
        !rowData.create.roles.includes(group)) ||
      (Array.isArray(rowData.create?.exclude_roles) &&
        rowData.create.exclude_roles.includes(group))) {
      rowData.create.isDisabled = true
    }
    if (
      (Array.isArray(rowData.update?.roles) &&
        !rowData.update.roles.includes(group)) ||
      (Array.isArray(rowData.update?.exclude_roles) &&
        rowData.update.exclude_roles.includes(group))) {
      rowData.update.isDisabled = true
    }
    if (
      (Array.isArray(rowData.delete?.roles) &&
        !rowData.delete.roles.includes(group)) ||
      (Array.isArray(rowData.delete?.exclude_roles) &&
        rowData.delete.exclude_roles.includes(group))) {
      rowData.delete.isDisabled = true
    }

    if (rowData.hasOwnProperty("view")) {
      isCheckedAll = !!rowData.view.checked;
    }
    if (rowData.hasOwnProperty("create")) {
      isCheckedAll = !!rowData.create.checked;
    }
    if (rowData.hasOwnProperty("delete")) {
      isCheckedAll = !!rowData.delete.checked;
    }
    if (rowData.hasOwnProperty("update")) {
      isCheckedAll = !!rowData.update.checked;
    }

    return (
      <tr key={index} className="group-perm-row">
        <td>
          <Box className="flex-justify-start perm-name">
            <Checkbox
              color="primary"
              checked={isCheckedAll}
              value={isCheckedAll}
              onChange={() => checkValues(rowData, "view", isCheckedAll)}
              className="text-center permission-check"
            />

            {rowData.hasOwnProperty("name") && (
              <Box className="ml-20">{rowData.name}</Box>
            )}
          </Box>
        </td>
        <td>
          {rowData.hasOwnProperty("view") && (
            <Tooltip title={`${rowData.view.name}`} placement="top-start" arrow>
              <Checkbox
                disabled={rowData.view.isDisabled}
                color="primary"
                checked={Boolean(Boolean(rowData.view.checked))}
                value={Boolean(rowData.view.checked)}
                onChange={() => checkValues(rowData, "view")}
                className="text-center item-center permission-check"
              />
            </Tooltip>
          )}
        </td>
        <td>
          {rowData.hasOwnProperty("create") && (
            <Tooltip
              title={`${rowData.create.name}`}
              placement="top-start"
              arrow
            >
              <Checkbox
                disabled={
                  (Array.isArray(rowData.create.roles) &&
                    !rowData.create.roles.includes(group)) ||
                  (Array.isArray(rowData.create.exclude_roles) &&
                    rowData.create.exclude_roles.includes(group))
                }
                color="primary"
                checked={Boolean(rowData.create.checked)}
                value={Boolean(rowData.create.checked)}
                onChange={() => checkValues(rowData, "create")}
                className="text-center item-center permission-check"
              />
            </Tooltip>
          )}
        </td>
        <td>
          {rowData.hasOwnProperty("update") && (
            <Tooltip
              title={`${rowData.update.name}`}
              placement="top-start"
              arrow
            >
              <Checkbox
                disabled={
                  (Array.isArray(rowData.update.roles) &&
                    !rowData.update.roles.includes(group)) ||
                  (Array.isArray(rowData.update.exclude_roles) &&
                    rowData.update.exclude_roles.includes(group))
                }
                color="primary"
                checked={Boolean(rowData.update.checked)}
                value={Boolean(rowData.update.checked)}
                onChange={() => checkValues(rowData, "update")}
                className="text-center item-center permission-check"
              />
            </Tooltip>
          )}
        </td>
        <td>
          {rowData.hasOwnProperty("delete") && (
            <Tooltip
              title={`${rowData.delete.name}`}
              placement="top-start"
              arrow
            >
              <Checkbox
                disabled={
                  (Array.isArray(rowData.delete.roles) &&
                    !rowData.delete.roles.includes(group)) ||
                  (Array.isArray(rowData.delete.exclude_roles) &&
                    rowData.delete.exclude_roles.includes(group))
                }
                color="primary"
                checked={Boolean(rowData.delete.checked)}
                value={Boolean(rowData.delete.checked)}
                onChange={() => checkValues(rowData, "delete")}
                className="text-center item-center permission-check"
              />
            </Tooltip>
          )}
        </td>
      </tr>
    );
  };

  handleCheckAllValues = (screen, index) => {
    const { checkAllValues} = this.props;
    checkAllValues(screen,index,!screen.checked)
  }

  render() {
    const { permissionNames, screens } = this.props;
    const bodyData = Object.keys(permissionNames);
    return (
      <>
        {" "}
        {screens &&
          screens.map((screen, index) => {
            return (
              <div key={index}>
                <div className="screen-name-perm display-flex align-items-center">
                  Screen: {screen.name.replace("_", " ")}
                  <Box className="flex-justify-start perm-name">
                    <Checkbox
                      color="primary"
                      checked={screen.checked}
                      value={screen.checked}
                      onChange={() => this.handleCheckAllValues(screen, index)}
                      className="text-center permission-check"
                    />
                  </Box>
                </div>
                <table width="100%" className="selectable-row-table">
                  <thead>
                    <tr>
                      <th
                        className={`text-center selectable-table-head permission-table-head`}
                      >
                        Name
                      </th>
                      <th
                        className={`text-center selectable-table-head permission-table-head`}
                      >
                        View
                      </th>
                      <th
                        className={`text-center selectable-table-head permission-table-head`}
                      >
                        Create
                      </th>
                      <th
                        className={`text-center selectable-table-head permission-table-head`}
                      >
                        Update
                      </th>
                      <th
                        className={`text-center selectable-table-head permission-table-head`}
                      >
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody className="selectable-row-table-body">
                    {bodyData.map((data, index) => {
                      const type = permissionNames[data].type;
                      if (screen.name === type) {
                        return this.getTableRow(data, index);
                      }
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
      </>
    );
  }
}
export default AssignPermissionsTable;

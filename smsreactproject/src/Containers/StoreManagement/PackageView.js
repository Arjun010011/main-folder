import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Button,
  Paper,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { useHistory } from "react-router-dom";
import InfoIcon from "@material-ui/icons/Info";

import AllMUIDataTable from "Components/AllMUIDataTable";
import ActionColumn from "Components/ActionColumnNew";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import loadingBar from "images/loading.gif";
import { Actions } from "Constants/permissions";
import { isUserHasPermission } from "Includes/functions";
import classNames from "classnames";

const PackageView = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [tableUpdating, setTableUpdating] = useState(false);
  const [enabledActions, setEnabledActions] = useState([]);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    getPackages();
    initPermissions();
  }, []);

  const initPermissions = () => {
    const canEdit = isUserHasPermission("store_inventory_package", "update");
    const canDelete = isUserHasPermission("store_inventory_package", "delete");

    let actions = [];
    if (canEdit) actions.push("edit");
    if (canDelete) actions.push("delete");
    setEnabledActions(actions);

    setColumns([
      {
        name: "id",
        label: "ID",
        options: { display: false },
      },
      {
        name: "name",
        label: "Package Name",
      },
      {
        name: "description",
        label: "Description",
      },
      {
        name: "is_active",
        label: "Active",
        options: {
          customBodyRender: (value) => (value ? "Yes" : "No"),
        },
      },
      {
        name: "Actions",
        label: "Action",
        options: {
          filter: false,
          sort: false,
          display: actions.length > 0,
          customBodyRender: (value, tableMeta) => {
            const id = tableMeta.rowData[0];
            const name = tableMeta.rowData[1];
            const description = tableMeta.rowData[2];

            return (
              <ActionColumn
                id={id}
                fieldValues={[name, description]}
                label="Edit Package"
                fieldDetails={[
                  { label: "Package Name", name: "name", required: true },
                  { label: "Description", name: "description" },
                ]}
                updateUrl={PUT_URL.package.api}
                updatePostFormat={(data) => ({
                  name: data.name,
                  description: data.description,
                })}
                updateType={(newData) => handleUpdate(id, newData)}
                deleteUrl={DEL_URL.package.api}
                deleteType={() => handleDelete(id)}
                enabledActions={actions}
              />
            );
          },
        },
      },
    ]);
  };

  const getPackages = () => {
    getRequest(GET_URL.package.api, {is_active:true}, null).then((res) => {
      if (res && res.status === 200) {
        setPackages(res.data.data || []);
        setLoading(false);
      }
    });
  };

  const handleUpdate = (id, newData) => {
    const updatedList = packages.map((pkg) =>
      pkg.id === id ? { ...pkg, ...newData } : pkg
    );
    setPackages(updatedList);
    return true;
  };

  const handleDelete = (id) => {
    const updatedList = packages.filter((pkg) => pkg.id !== id);
    setPackages(updatedList);
  };

  const handleAddPackage = () => {
    history.push(Actions.store_inventory_package.create.url);
  };

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
            <Box className="heading">Package List</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              {isUserHasPermission("store_inventory_package", "create") && (
                <Button
                  variant="contained"
                  onClick={handleAddPackage}
                  className="editbutton-view"
                >
                  <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                  {Actions.store_inventory_package.create.label}
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>

        <Grid container className={classNames("header-align")}>
          <Grid item md={12}>
            <Paper>
              <AllMUIDataTable
                key={packages}
                title={tableUpdating ? <CircularProgress /> : ""}
                data={packages}
                columns={columns}
                options={{ selectableRows: "none" }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PackageView;

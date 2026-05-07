import React, { useEffect, useMemo, useRef, useState } from "react";
import { withStyles } from "@material-ui/core/styles";
import {
  Box,
  Dialog,
  DialogActions,
  Button,
  CircularProgress,
} from "@material-ui/core";
import MuiDialogContent from "@material-ui/core/DialogContent";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getPaginationProps } from "Includes/functions";
import { POST_URL } from "Includes/urls";
import { postRequest } from "Includes/api/apicall";
import { DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST } from "Constants";

export default function NotificationRecieveUsers(props) {
  const [user_list, set_user_list] = useState({});
  const [columnList, setColumnList] = useState([]);
  const [optionsLocal, setOptionsLocal] = useState({});
  const [pagination, setPagination] = React.useState({
    ...DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST,
  });
  const [tableLoading, setTableUpdating] = useState(true);

  useEffect(() => {
    setColumnList([
      {
        name: "id", // replacing id index will impact onRowChange functionality also
        label: "id",
        options: {
          filter: false,
          sort: false,
          viewColumns: false,
          display: false,
        },
      },
      {
        name: "name",
        label: "Name",
      },
      {
        name: "standard",
        label: "Standard",
        options: {
          filter: false,
          sort: false,
          viewColumns: false,
          display: false,
        },
      },
    ]);
    setOptionsLocal({
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10,50,100],
      selectToolbarPlacement: "none", 
      rowsPerPage: 10,
    });
    getUsersList();
  }, []);

  const getUsersList = (paginationProps) => {
    setTableUpdating(true)
    let currentPagination = pagination;
    if (paginationProps) {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      notification: 1,
    };
    let post_data = {
      report_id: props.report_id,
      return_users_only: true,
    };
    const url = POST_URL.generatecustomreport.api;
    postRequest(url, post_data, props, params).then((response) => {
      if (response && response.status === 200) {
        response.data.data.data_list.map((data)=>{
            data["name"]=data["student"]["name"]
        })
        setPagination(currentPagination);
        set_user_list(response.data.data);
      }
      setTableUpdating(false);
    });
  };

  return (
    <div>
      <AllMUIDataTable
        key={user_list?.data_list}
        data={user_list?.data_list}
        columns={columnList}
        options={optionsLocal}
        onTableChange={getUsersList}
        serverSide={true}
        pagination={pagination}
        count={user_list?.count}
        title={
          tableLoading ? (
            <CircularProgress className="white-text" />
          ) : (
            `Total recievers ${user_list?.count}`
          )
        }
      />
    </div>
  );
}

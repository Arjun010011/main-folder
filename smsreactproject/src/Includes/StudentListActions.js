import React, { useEffect } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@material-ui/core";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import { withRouter } from "react-router-dom";
import { getRequest } from "Includes/api/apicall";

const ITEM_HEIGHT = 35;

function StudentListActions(props) {
  const {
    id,
    index,
    deleteStudent,
    viewURL,
    editURL,
    url,
    printId,
    enabledActions,
    handlePrintForm,
    print_form_label,
    delete_label,
    print_label,
    params,
  } = props;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [displayActions, setDisplayActions] = React.useState(false);
  const [showData, setShowData] = React.useState("");
  let [enabledActionsNew, setEnabledAction] = React.useState("");

  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    let { viewExtraParams } = props;
    let searchParam = "?" + new URLSearchParams(viewExtraParams).toString();
    props.history.push({
      pathname: viewURL,
      state: { detail: id, ...viewExtraParams },
      search: searchParam,
    });
  };
  const handleEdit = (extraParams = {}) => {
    let { editExtraParams } = props;
    let searchParam = "?" + new URLSearchParams(editExtraParams).toString();
    props.history.push({
      pathname: editURL,
      state: { detail: id, ...editExtraParams },
      search: searchParam,
    });
  };
  const handleDelete = () => {
    handleCloseMenu();
    deleteStudent(id, index);
  };

  const printForm = () => {
    handleCloseMenu();
    handlePrintForm(id);
  };

  const print = () => {
    let get_url = url + printId;
    if (params) {
      get_url += "?" + new URLSearchParams(params).toString();
    }
    let prop = {};
    prop = { ...prop, ...params };
    prop.responseType = "blob";
    getRequest(get_url, {}, prop).then((response) => {
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        // window.open(fileURL);
        const height = (window.screen.height * 75) / 100;
        const width = (window.screen.width * 75) / 100;
        const mywindow = window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
        mywindow.print();
      }
    });
    handleCloseMenu();
  };

  useEffect(() => {
    if (enabledActions.length > 0) {
      let showData;
      let arrData = enabledActions.map((data) => {
        if (data === "update") {
          return "edit";
        }
        return data;
      });
      enabledActionsNew = arrData;
      let temp_data_show = [];
      arrData.map((data) => {
        if (data === "delete") {
          data = delete_label ? delete_label : "delete";
        }
        temp_data_show.push(data);
      });
      showData = temp_data_show.join("/ ");
      setShowData(showData);
      setDisplayActions(true);
      setEnabledAction(enabledActionsNew);
    }
  }, [showData, delete_label]);

  const handleActive = (actioveOption) => {
    handleCloseMenu();
    props.handleActive(id, index, actioveOption);
  };

  return (
    <div>
      <Tooltip
        title={showData}
        enterDelay={400}
        enterNextDelay={400}
        placement="top-start"
        classes={{ tooltip: "tooltip-show-data" }}
      >
        <IconButton
          aria-label="more"
          aria-controls="long-menu"
          aria-haspopup="true"
          onClick={handleClick}
          className={displayActions ? "padding-0" : "display-none"}
        >
          <MoreHorizIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        keepMounted
        open={openMenu}
        onClose={handleCloseMenu}
        PaperProps={{
          style: {
            maxHeight: ITEM_HEIGHT * 7,
            width: 200,
          },
        }}
      >
        {enabledActionsNew.includes("view") && (
          <MenuItem onClick={handleView}>View</MenuItem>
        )}
        {enabledActionsNew.includes("print") && Boolean(printId) && (
          <MenuItem onClick={print}>
            {print_label ? print_label : "Print Receipt"}
          </MenuItem>
        )}
        {enabledActionsNew.includes("printForm") && (
          <MenuItem onClick={printForm}>
            {print_form_label ? print_form_label : "Print Form"}
          </MenuItem>
        )}
        {enabledActionsNew.includes("viewBooks") && (
          <MenuItem
            onClick={() => handleActive("viewBooks")}
            className="text-blue"
          >
            View Books
          </MenuItem>
        )}
        {enabledActionsNew.includes("edit") && (
          <MenuItem onClick={handleEdit}>Edit</MenuItem>
        )}
        {enabledActionsNew.includes("delete") && (
          <MenuItem onClick={handleDelete}>
            {delete_label ? delete_label : "Delete"}
          </MenuItem>
        )}
        {enabledActionsNew.includes("active") && (
          <MenuItem
            onClick={() => handleActive("active")}
            className="text-green"
          >
            Active
          </MenuItem>
        )}
        {enabledActionsNew.includes("inactive") && (
          <MenuItem
            onClick={() => handleActive("inactive")}
            className="text-red"
          >
            In Active
          </MenuItem>
        )}
        {enabledActionsNew.includes("issue") && (
          <MenuItem
            onClick={() => handleActive("issue")}
            className="text-green"
          >
            Issue
          </MenuItem>
        )}
        {enabledActionsNew.includes("return") && (
          <MenuItem onClick={() => handleActive("return")} className="text-red">
            Return
          </MenuItem>
        )}
        {enabledActionsNew.includes("renew") && (
          <MenuItem onClick={() => handleActive("renew")} className="text-blue">
            Renew
          </MenuItem>
        )}
        {enabledActionsNew.includes("sync") && (
          <MenuItem
            onClick={() => handleActive("sync")}
            className="text-green"
          >
            Sync
          </MenuItem>
        )}
        {enabledActionsNew.includes('copy') && (
            <MenuItem
            onClick={() => handleActive("copy")}
            className="text-green"
          >
            Copy
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}
export default withRouter(StudentListActions);

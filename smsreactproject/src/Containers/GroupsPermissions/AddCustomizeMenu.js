import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Grid,
  Paper,
  Box,
  Icon,
  IconButton,
  Modal,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  CircularProgress,
} from "@material-ui/core";
import Snackbar from "@material-ui/core/Snackbar";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";

import SortableTree from "react-sortable-tree";
import "react-sortable-tree/style.css";
import DeleteIcon from "@material-ui/icons/Delete";
import MuiAlert from "@material-ui/lab/Alert";
import { removeNodeAtPath } from "react-sortable-tree";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import {
  getRequest,
  postRequest,
  putRequest,
  deleteRequest,
} from "Includes/api/apicall";
import { getTreeStucturedMenus, getMenus } from "./functions";
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { AWS_BUCKET_URL, SUCCESS_MSG_PROPS } from "Constants";
import "./styles.scss";

import { nameRegex } from "Constants/regularExpression";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}
const unModifiebleMenus = [
  "Admin",
  "Customize Menu",
  "Permission View",
  "Permission add",
  "Assign groups",
];

class AddCustomizeMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      unAssignedUrlsMenu: [],
      menus: [],
      loadingUnassignedMenus: true,
      loadingAssignedMenus: true,
      treeStructuredMenus: [],
      treeStructuredUrls: [],
      module_name: "",
      module_name_error: "",
      edittingNode: {},
      open: false,
      canDrag: true,
      menu_name: "",
      menu_name_error: "",
      snackbar: false,
      alertData: "",
      severity: null,
      deletetable_ids: [],
      updatingMenu: false,
      description: "",
      checked: false,
      searchUnassignedUrlsData: "",
      menu_type: "web",
      awsMenuImgPathList: [],
    };
    this.sortTree = this.sortTree.bind(this);
    this.onChangeInUnassignedUrls = this.onChangeInUnassignedUrls.bind(this);
  }

  handleCloseEdit = () => {
    this.setState({ open: false, selectImgModalOpen: false });
  };

  onchange = (e) => {
    const { name, value } = e.target;
    const max_name_length = 25;
    const error_name = `${name}_error`;
    let { unAssignedUrlsMenu } = this.state;
    if (name === "menu_name" && value.length > max_name_length) {
      this.setState({
        [error_name]: `Menu name length cannot be greater than ${max_name_length}`,
      });
    } else if (name === "searchUnassignedUrlsData") {
      let treeStructuredUrls = this.getTreeStructuresUrls(
        unAssignedUrlsMenu,
        value
      );
      this.setState({ [name]: value, treeStructuredUrls });
    } else if (name !== "description" && !nameRegex.value.test(value)) {
      this.setState({ [error_name]: nameRegex.errorText });
    } else {
      this.setState({ [name]: value, [error_name]: "" });
    }
  };
  submitMenu = () => {
    let { menu_name, description, menu_type } = this.state;
    const data = {
      id: null,
      path: null,
      menu_name,
      description,
      menu_type: menu_type,
    };
    if (menu_name !== "") {
      postRequest(POST_URL.urlsmenu.api, data, this.props).then((response) => {
        this.getUnMappedMenus();
        this.setState({ menu_name: "", description: "", open: false });
        Swal.fire({
          ...SUCCESS_MSG_PROPS,
          title: response?.data?.Reason,
        });
        this.handleChange();
      });
    } else {
      this.setState({ menu_name_error: "menu name cannot be empty" });
    }
  };
  componentDidMount() {
    this.getMenuIcons();
    this.getUnMappedMenus();
    this.getMappedMenus();
  }

  getMenuIcons = () => {
    const params = {};
    if (this.state.menu_type) {
      params["app_type"] = this.state.menu_type;
    }
    const prop = { ...this.props };
    prop["return_error"] = true;
    this.setState({ updatingMenu: true, loadingAssignedMenus: true });
    getRequest(GET_URL.appassets.api, params, prop).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          awsMenuImgPathList: [...response.data],
        });
      }
      this.setState({ updatingMenu: false, loadingAssignedMenus: false });
    });
  };

  getMappedMenus = () => {
    const params = {};
    if (this.state.menu_type) {
      params["menu_type"] = this.state.menu_type;
    }
    this.setState({ updatingMenu: true, loadingAssignedMenus: true });
    getRequest(GET_URL.menu.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const menus = response.data.data;
        let mappedImages = this.getMappedImages(menus);
        const treeStructuredMenus = getTreeStucturedMenus(menus);
        this.setState({ menus, treeStructuredMenus, mappedImages });
      }
      this.setState({ updatingMenu: false, loadingAssignedMenus: false });
    });
  };

  getUnMappedMenus = () => {
    const params = { available_urls: 1 };
    if (this.state.menu_type) {
      params["menu_type"] = this.state.menu_type;
    }
    this.setState({ loadingUnassignedMenus: true });
    getRequest(GET_URL.urlsmenu.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const unAssignedUrlsMenu = response.data.data;
        let unmappedMenuImages = this.getMappedImages(unAssignedUrlsMenu);
        const treeStructuredUrls = this.getTreeStructuresUrls(
          unAssignedUrlsMenu,
          ""
        );
        this.setState({
          unAssignedUrlsMenu,
          treeStructuredUrls,
          loadingUnassignedMenus: false,
          searchUnassignedUrlsData: "",
          unmappedMenuImages,
        });
      }
    });
  };

  getMappedImages = (menus) => {
    let imageArray = [];
    menus.forEach((menu) => {
      if (menu.image_url) {
        imageArray.push(menu.image_url);
      }
    });
    return imageArray;
  };

  getTreeStructuresUrls = (unAssignedUrlsMenu, search) => {
    let searchStr = search.toLowerCase();
    let treeStructuredUrls = [];
    for (const url of unAssignedUrlsMenu) {
      if (
        (url.menu_name && url.menu_name.toLowerCase().includes(searchStr)) ||
        (url.title && url.title.toLowerCase().includes(searchStr))
      ) {
        let data = {
          title: url.menu_name,
          subtitle: url.path,
          data: url,
          inserting: true,
        };
        treeStructuredUrls.push(data);
      }
    }
    return treeStructuredUrls;
  };

  updateMenus = (data, payload) => {
    const url = `${PUT_URL.menu.api}${1}/`;
    putRequest(url, payload, this.props).then((response) => {
      if (response && response.status === 200) {
        const alertData = "Data updated successfully";
        this.setState({
          treeStructuredMenus: data,
          menus: payload.menus,
          open: false,
          snackbar: true,
          severity: "success",
          alertData,
          deletetable_ids: [],
        });
        if (payload.deletetable_ids.length > 0) this.getUnMappedMenus();
      } else {
        this.getMappedMenus();
        this.getUnMappedMenus();
      }
      this.setState({ updatingMenu: false });
    });
  };

  sortTree = (data) => {
    const treeStructuredMenus_duplicate = [...this.state.treeStructuredMenus];
    let for_update = true;
    let next_menu_ids = [];
    for (const menu of this.state.menus) {
      next_menu_ids.push(menu.next_menu);
    }
    for (const menus_index in data) {
      let menus = data[menus_index];
      if (menus.inserting) {
        for_update = false;
      }
      if (menus.data.path) {
        //for first index or submenu canot be added at the menu list
        this.setState({
          alertData: "Submenu item cannot be added to Menu section",
          snackbar: true,
          severity: "error",
          treeStructuredMenus: treeStructuredMenus_duplicate,
        });
        return;
      }
      if (
        (menus.data.parent !== 0 || next_menu_ids.includes(menus.data.id)) &&
        parseInt(menus_index) === 0
      ) {
        this.setState({
          alertData: "Cannot be placed at the 1st position",
          snackbar: true,
          severity: "error",
          treeStructuredMenus: treeStructuredMenus_duplicate,
        });
        return;
      }
      if (menus.children) {
        for (const subMenus of menus.children) {
          if (subMenus.inserting) {
            for_update = false;
          }
          if (!Boolean(subMenus.data.path)) {
            this.setState({
              alertData: "Menus cannot be added to submenu section",
              snackbar: true,
              severity: "error",
              treeStructuredMenus: treeStructuredMenus_duplicate,
            });
            return;
          }
        }
      }
    }
    if (
      getMenus(treeStructuredMenus_duplicate).length === getMenus(data).length
    ) {
      this.setState({ treeStructuredMenus: data });
    }

    if (!for_update) {
      let payload = this.getDataForInsert(data);
      payload["module"] = payload["module_num"];
      this.moveToMap(payload);
    }
    // else if(deletetable_ids){
    //     const payload = { deletetable_ids }
    //     payload['menus'] = getMenus(data)
    //     this.updateMenus(data, payload);
    // }
  };
  onChangeInUnassignedUrls = (data) => {
    if (this.state.treeStructuredUrls.length !== data.length) {
      Swal.fire({
        type: "error",
        title: "Error",
        text: "Assigned urls can not move directly!!",
      });
    }
  };
  getDataForInsert = (data) => {
    let alias_name = null;
    let module_num = 1;
    let main_module_after = 0;
    let sub_module_after = 0;
    let url = null;
    for (const menus_index in data) {
      let menus = data[menus_index];
      if (menus.inserting) {
        alias_name = menus.title;
        url = menus.data.id;
        if (menus_index === 0) {
          module_num = 0;
        } else {
          main_module_after = data[menus_index - 1].data["id"];
        }
      }
      if (menus.children) {
        for (const subMenus_index in menus.children) {
          let subMenus = menus.children[subMenus_index];
          if (subMenus.inserting) {
            alias_name = subMenus.title;
            url = subMenus.data.id;
            if (parseInt(subMenus_index) === 0) {
              module_num = 0;
              main_module_after = menus.data.id;
              sub_module_after = 0;
            } else {
              module_num = 0;
              main_module_after = menus.data.id;
              sub_module_after = menus.children[subMenus_index - 1].data.id;
            }
          }
        }
      }
    }
    return { alias_name, module_num, main_module_after, sub_module_after, url };
  };

  submit = () => {
    const { treeStructuredMenus, menu_type } = this.state;
    let payload = { menus: getMenus(treeStructuredMenus,menu_type) };
    payload["deletetable_ids"] = this.state.deletetable_ids;
    payload["menu_type"] = menu_type;
    this.updateMenus(treeStructuredMenus, payload);
  };

  moveToMap = (menu) => {
    const { menu_type } = this.state;
    this.setState({
      updatingMenu: true,
      loadingUnassignedMenus: true,
      menu_type: menu_type,
    });
    postRequest(POST_URL.menu.api, menu, this.props).then((response) => {
      // this.setState({ updatingMenu: false });
      this.getUnMappedMenus();
      this.getMappedMenus();
    });
  };

  deleteNode(rowInfo) {
    let { path, node } = rowInfo;
    const data = removeNodeAtPath({
      treeData: this.state.treeStructuredMenus,
      path: path,
      getNodeKey: ({ node: TreeNode, treeIndex: number }) => {
        return number;
      },
      ignoreCollapsed: true,
    });
    let payload = { deletetable_ids: [node.id] };
    const menuData = getMenus(data);
    if (node.hasOwnProperty("children") && Array.isArray(node["children"])) {
      for (const submenu of node["children"]) {
        payload["deletetable_ids"].push(submenu.id);
      }
    }

    const treeStructuredMenus = getTreeStucturedMenus(menuData);
    payload["menus"] = menuData;
    let deletetable_ids = [...this.state.deletetable_ids];
    deletetable_ids.push(node.id);

    let unAssignedUrlsMenu = [...this.state.unAssignedUrlsMenu];
    let node_data = node.data;
    node_data["menu_name"] = node_data.alias_name;
    unAssignedUrlsMenu.push(node_data);
    const treeStructuredUrls = this.getTreeStructuresUrls(
      unAssignedUrlsMenu,
      ""
    );
    this.setState({
      treeStructuredMenus,
      menus: menuData,
      deletetable_ids,
      treeStructuredUrls,
      unAssignedUrlsMenu,
      updatingMenu: true,
      searchUnassignedUrlsData: "",
    });
    payload["menu_type"]=this.state.menu_type
    this.updateMenus(treeStructuredMenus, payload);
  }

  editMenuName = (rowInfo) => {
    let { node } = rowInfo;
    const module_name = node.data.alias_name;
    this.setState({ module_name, open: true, edittingNode: node.data });
  };
  update_module_name = (e, key) => {
    if (key === "enter" && e.keyCode !== 13) {
      return;
    }
    const { module_name, edittingNode } = this.state;
    const menus = [...this.state.menus];
    menus.forEach((menu) => {
      if (menu.id === edittingNode.id) {
        menu.alias_name = module_name;
      }
    });
    const treeData = getTreeStucturedMenus(menus);
    this.setState(
      {
        treeStructuredMenus: treeData,
        menus,
        open: false,
        selectImgModalOpen: false,
      },
      () => {
        this.submit();
      }
    );
  };
  deleteUrlMenuNode = (rowInfo) => {
    let { node } = rowInfo;
    const url = `${DEL_URL.urlsmenu.api}${node.data.id}/`;
    deleteRequest(url, {}, this.props).then(() => {
      this.getUnMappedMenus();
    });
  };

  editUrlName = (rowInfo) => {
    let { node } = rowInfo;
    let isMenu = false;
    if (node.data.hasOwnProperty("menu_type")) {
      isMenu = true;
    }
    this.setState({
      selectImgModalOpen: true,
      edittingNode: node.data,
      isMenu,
    });
  };

  selectMenuImg = (path) => {
    let { edittingNode, isMenu, unmappedMenuImages, mappedImages, menu_type } =
      this.state;
    let previous_img_path = edittingNode["image_url"];
    edittingNode["image_url"] = path;
    let id = null;
    if (isMenu) {
      id = edittingNode.url;
      mappedImages = mappedImages.filter((img) => img !== previous_img_path);
      mappedImages.push(path);
    } else {
      id = edittingNode.id;
      unmappedMenuImages = unmappedMenuImages.filter(
        (img) => img !== previous_img_path
      );
      unmappedMenuImages.push(path);
    }
    edittingNode["menu_name"] = edittingNode.alias_name;
    edittingNode["menu_type"] = menu_type;
    const url = `${PUT_URL.urlsmenu.api}${id}/`;
    putRequest(url, edittingNode, this.props).then(() => {
      this.setState({
        selectImgModalOpen: false,
        unmappedMenuImages,
        mappedImages,
      });
    });
  };

  handleClose = () => {
    this.setState({ snackbar: false, alertData: "" });
  };
  handleChange = () => {
    const { checked } = this.state;
    this.setState({ checked: !checked, menu_name: "", description: "" });
  };
  changeToggle = (event, value) => {
    if (this.state.isChanged) {
      Swal.fire({
        title: `<strong>Are you sure want to change the tab</strong>`,
        text: "updated value will not save untill you submit!",
        type: "info",
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "OK",
        cancelButtonText: "Cancel",
        confirmButtonColor: "green",
        cancelButtonColor: "orange",
      }).then((result) => {
        if (result.value) {
          const { group, user } = this.state;
          if (value != null) {
            let formatedselectedToggle = value.replace(/\s/g, "");
            this.setState(
              { menu_type: formatedselectedToggle, isChanged: false },
              () => {
                this.getUnMappedMenus();
                this.getMappedMenus();
                this.getMenuIcons();
              }
            );
          }
        }
      });
    } else {
      const { group, user } = this.state;
      if (value != null) {
        let formatedselectedToggle = value.replace(/\s/g, "");
        this.setState({ menu_type: formatedselectedToggle }, () => {
          this.getUnMappedMenus();
          this.getMappedMenus();
          this.getMenuIcons();
        });
      }
    }
  };
  render() {
    const {
      module_name,
      open,
      treeStructuredMenus,
      treeStructuredUrls,
      canDrag,
      menu_name,
      module_name_error,
      description,
      searchUnassignedUrlsData,
      menu_name_error,
      alertData,
      snackbar,
      severity,
      checked,
      updatingMenu,
      selectImgModalOpen,
      loadingUnassignedMenus,
      mappedImages,
      unmappedMenuImages,
      menu_type,
      awsMenuImgPathList,
    } = this.state;
    const menu_area_length = 60;
    return (
      <Box>
        <Paper>
          <Box className="paper-background">
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading mb-20">
                  Customise Menus
                </Box>
              </Grid>
              <Grid item md={5} xs={false} sm={false}>
                {menu_type && (
                  <Box className="end-flex-prop">
                    <ToggleButtonGroup
                      size="small"
                      value={menu_type}
                      exclusive
                      onChange={this.changeToggle}
                    >
                      <ToggleButton key={1} value="web">
                        Web
                      </ToggleButton>
                      ,
                      <ToggleButton key={2} value="app">
                        Student App
                      </ToggleButton>
                      <ToggleButton key={3} value="staff_app">
                        Staff App
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}
              </Grid>
              <Box className="customize-menu">
                <Box
                  item
                  md={6}
                  xs={12}
                  sm={12}
                  className="white-background-shadow customize-menu-part"
                >
                  <Box
                    component="h2"
                    color="primary"
                    className="flex-justify-space-between padding-x-20 customize-head-part"
                  >
                    <Box>Unassigned Menus</Box>
                    <Box className="searchbar-customize-menu">
                      <TextField
                        id="outlined-name searchbar-customize-menu"
                        value={searchUnassignedUrlsData}
                        placeholder=""
                        label="Search Menus"
                        name="searchUnassignedUrlsData"
                        onChange={(e) => {
                          this.onchange(e);
                        }}
                      />
                    </Box>
                  </Box>
                  <Box
                    style={{ height: `${menu_area_length}vh` }}
                    className={`sortable-tree-section ${
                      loadingUnassignedMenus && "flex-justify-center-flex-prop"
                    }`}
                  >
                    {!loadingUnassignedMenus ? (
                      <SortableTree
                        treeData={treeStructuredUrls}
                        onChange={(data) => {
                          this.onChangeInUnassignedUrls(data);
                        }}
                        maxDepth={1}
                        shouldCopyOnOutsideDrop={false}
                        dndType="123"
                        canDrop={false}
                        generateNodeProps={(rowInfo, ind) => ({
                          buttons: [
                            <Box key={ind}>
                              {rowInfo.node.subtitle === null && (
                                <Box className="flex-justify-space-around action-customize-menu">
                                  {/* <IconButton edge="end" aria-label="delete" className='padding-0'> */}
                                  <Tooltip
                                    title={`Delete`}
                                    placement="top-start"
                                    arrow
                                  >
                                    <IconButton
                                      edge="end"
                                      aria-label="delete"
                                      className="padding-0 del-img"
                                    >
                                      <DeleteIcon
                                        className="delete-icon-hover1 padding-0 pointer"
                                        onClick={() =>
                                          !updatingMenu &&
                                          this.deleteUrlMenuNode(rowInfo)
                                        }
                                      />
                                    </IconButton>
                                  </Tooltip>
                                  {rowInfo.node.data.image_url ? (
                                    <Tooltip
                                      title={`Select Icon`}
                                      placement="top-start"
                                      arrow
                                    >
                                      <img
                                        src={`${rowInfo.node.data.image_url}`}
                                        className="menu-img pointer"
                                        width="40px"
                                        onClick={() =>
                                          !updatingMenu &&
                                          this.editUrlName(rowInfo)
                                        }
                                      />
                                    </Tooltip>
                                  ) : (
                                    <Tooltip
                                      title={`Select Icon`}
                                      placement="top-start"
                                      arrow
                                    >
                                      <Icon
                                        className={
                                          "fa fa-image edit-icon mt-20 pointer menu-img"
                                        }
                                        onClick={() =>
                                          !updatingMenu &&
                                          this.editUrlName(rowInfo)
                                        }
                                      />
                                    </Tooltip>
                                  )}
                                </Box>
                              )}
                            </Box>,
                          ],
                          style: {
                            height: "50px",
                          },
                        })}
                      />
                    ) : (
                      <CircularProgress />
                    )}
                  </Box>
                  <Box className="shuffle-submit-div">
                    <Button
                      variant="contained"
                      onClick={() => {
                        this.handleChange();
                      }}
                      className="add-menu-but"
                    >
                      Add Menu
                    </Button>
                  </Box>
                </Box>
                {/* <Grid item md={1}></Grid> */}
                <Box
                  item
                  md={6}
                  xs={12}
                  sm={12}
                  className="white-background-shadow customize-menu-part"
                >
                  <Box
                    component="h2"
                    color="primary"
                    className="flex-justify-space-between padding-x-20 customize-head-part"
                  >
                    <Box>Assigned Menus</Box>
                  </Box>
                  <Box
                    style={{ height: `${menu_area_length}vh` }}
                    className={`sortable-tree-section ${
                      updatingMenu && "flex-justify-center-flex-prop"
                    }`}
                  >
                    {!updatingMenu ? (
                      <SortableTree
                        treeData={treeStructuredMenus}
                        onChange={(data) =>
                          !updatingMenu && this.sortTree(data)
                        }
                        maxDepth={2}
                        shouldCopyOnOutsideDrop={false}
                        canDrag={!updatingMenu && canDrag}
                        dndType="123"
                        canDrop={!updatingMenu}
                        generateNodeProps={(rowInfo, index) => ({
                          buttons: [
                            <Box
                              className="justify-space-even action-customize-menu"
                              key={index}
                            >
                              {
                              // rowInfo.node.data.parent === 0 &&
                                rowInfo.node.data.image_url && (
                                  <Tooltip
                                    title={`Change Icon`}
                                    placement="top-start"
                                    arrow
                                  >
                                    <img
                                      src={`${rowInfo.node.data.image_url}`}
                                      className="menu-img pointer"
                                      width="40px"
                                      onClick={() =>
                                        !updatingMenu &&
                                        this.editUrlName(rowInfo)
                                      }
                                      alt={"menu-img"}
                                    />
                                  </Tooltip>
                                )}
                              {
                              // rowInfo.node.data.parent === 0 &&
                                !rowInfo.node.data.image_url && (
                                  <Tooltip
                                    title={`Select Icon`}
                                    placement="top-start"
                                    arrow
                                  >
                                    <Icon
                                      className={
                                        "fa fa-image edit-icon mt-20 pointer menu-img cus-action-icon"
                                      }
                                      onClick={() =>
                                        !updatingMenu &&
                                        this.editUrlName(rowInfo)
                                      }
                                    />
                                  </Tooltip>
                                )}
                              {!unModifiebleMenus.includes(
                                rowInfo.node.data.alias_name
                              ) && (
                                <Tooltip
                                  title={`Edit name`}
                                  placement="top-start"
                                  arrow
                                >
                                  <Icon
                                    className={
                                      "fa fa-pencil-square-o edit-icon mt-20 pointer"
                                    }
                                    onClick={() =>
                                      !updatingMenu &&
                                      this.editMenuName(rowInfo)
                                    }
                                  />
                                </Tooltip>
                              )}
                              {!(
                                rowInfo.path.length === 1 &&
                                rowInfo.path[0] === 0
                              ) &&
                                !unModifiebleMenus.includes(
                                  rowInfo.node.data.alias_name
                                ) && (
                                  <Tooltip
                                    title={`Delete`}
                                    placement="top-start"
                                    arrow
                                  >
                                    <IconButton
                                      edge="end"
                                      aria-label="delete"
                                      className="padding-0 del-img"
                                    >
                                      <DeleteIcon
                                        className="delete-icon-hover1 padding-0 pointer"
                                        onClick={() =>
                                          !updatingMenu &&
                                          this.deleteNode(rowInfo)
                                        }
                                      />
                                    </IconButton>
                                  </Tooltip>
                                )}
                            </Box>,
                          ],
                          style: {
                            height: "50px",
                          },
                        })}
                      />
                    ) : (
                      <CircularProgress />
                    )}
                  </Box>
                  {treeStructuredMenus.length !== 0 && (
                    <Box className="shuffle-submit-div">
                      <Button
                        variant="contained"
                        color="primary"
                        className="submit shuffle-menu-submit"
                        onClick={() => this.submit()}
                      >
                        Submit
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Box>

          <Dialog
            open={open}
            onClose={this.handleCloseEdit}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title"></DialogTitle>
            <DialogContent>
              <DialogContentText>Update module name</DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="name"
                name="module_name"
                label="Update"
                type="name"
                value={module_name}
                onChange={this.onchange}
                fullWidth
                helperText={module_name_error}
                error={module_name_error === "" ? false : true}
                inputProps={{ maxLength: 30 }}
                onKeyDown={(e) => this.update_module_name(e, "enter")}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleCloseEdit} color="primary">
                Close
              </Button>
              <Button
                disabled={module_name === ""}
                onClick={() => this.update_module_name()}
                color="primary"
              >
                Update
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={checked}
            onClose={this.handleChange}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title"></DialogTitle>
            <DialogContent>
              <DialogContentText className="text-center">
                Enter Module Name
              </DialogContentText>
              {/* <Box className='md-up-justify-space-between md-down-flex-column add-menu-block'> */}
              <Box>
                <TextField
                  id="outlined-name"
                  label="Menu Name"
                  value={menu_name}
                  onChange={(e) => {
                    this.onchange(e);
                  }}
                  name="menu_name"
                  autoComplete="off"
                  margin="normal"
                  variant="outlined"
                  className="menu-text-box"
                  helperText={menu_name_error}
                  error={menu_name_error === "" ? false : true}
                  inputProps={{ maxLength: 30 }}
                />
              </Box>
              <Box>
                <TextField
                  id="outlined-name"
                  value={description}
                  placeholder="Description"
                  label="Description"
                  name="description"
                  autoComplete="off"
                  margin="normal"
                  variant="outlined"
                  className="menu-text-box"
                  onChange={(e) => {
                    this.onchange(e);
                  }}
                />
              </Box>
              {/* </Box> */}
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleChange} color="primary">
                Close
              </Button>
              <Button
                disabled={menu_name === ""}
                onClick={() => this.submitMenu()}
                color="primary"
              >
                Submit
              </Button>
            </DialogActions>
          </Dialog>
          <Modal
            open={selectImgModalOpen}
            onClose={this.handleCloseEdit}
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
          >
            <Box className="menu-select-img-modal">
              <HighlightOffIcon
                className="cross-btn-nominee"
                onClick={() => this.handleCloseEdit()}
                style={{ position: "absolute", top: "2px", right: "4px" }}
              />
              {/* <Button
                color="secondary"
                className="min-max-w-0"
                onClick={() => this.selectMenuImg("")}
              >
                <DeleteOutlineIcon className="add-icon-stock-item" />
              </Button> */}
              {awsMenuImgPathList.map((path) => {
                if (
                  mappedImages &&
                  !mappedImages.includes(path) &&
                  unmappedMenuImages &&
                  !unmappedMenuImages.includes(path)
                ) {
                  return (
                    <img
                      src={`${path}`}
                      height="40px"
                      onClick={() => this.selectMenuImg(path)}
                      className="pointer menu-img-select"
                      key={path}
                    />
                  );
                }
              })}
            </Box>
          </Modal>
        </Paper>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={4000}
          onClose={this.handleClose}
        >
          <Alert onClose={this.handleClose} severity={severity}>
            {alertData}
          </Alert>
        </Snackbar>
      </Box>
    );
  }
}

export default withRouter(AddCustomizeMenu);

import React, { useRef, useState } from "react";
import { createTheme, MuiThemeProvider } from "@material-ui/core/styles";
import MUIDataTable from "mui-datatables";
import PropTypes from "prop-types";
import _ from "lodash";
import { Button, CircularProgress, Tooltip } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

import variables from "styles/variables.scss";
import { DEFAULT_THEME } from "Constants";
import DefaultViewColumnSettings from "Constants/DefaultViewColumnSettings";
import { THEME_COLORS_SETTINGS } from "Constants/styleVariable";
import { getServerSideProps } from "Includes/functions";
import "./styles.scss";

function AllMUIDataTable(props) {
  const theme = localStorage.getItem("theme")
    ? localStorage.getItem("theme")
    : DEFAULT_THEME;

  const rowColor = props.highlighRow ? "#eaf6ff" : "white";
  let viewColumnSettings = _.cloneDeep(DefaultViewColumnSettings);
  let storedViewColumnSettings = localStorage.getItem("viewColumnSettings");
  if (storedViewColumnSettings) {
    storedViewColumnSettings = JSON.parse(storedViewColumnSettings);
  }
  const tableFooterColor =
    THEME_COLORS_SETTINGS[theme] &&
    THEME_COLORS_SETTINGS[theme]["tableFooterColor"]
      ? THEME_COLORS_SETTINGS[theme]["tableFooterColor"]
      : "";
  const {
    data,
    columns,
    customTableHeaderBackground,
    viewSetting,
    CustomCheckbox,
    CustomExpandButton,
    hideTextTransform,
    autoFocus = true,
  } = props;
  const [columnState, setcolumnState] = useState(columns);
  const [width, setWidth] = useState(window.innerWidth);
  const [resize, setResize] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  let searchText = React.useRef(props?.pagination?.searchText);

  const getMuiTheme = () =>
    createTheme({
      overrides: {
        MuiTable: {
          root: {
            zIndex: 1,
          },
        },
        MuiPaper: {
          root: {
            zIndex: 1,
          },
        },
        MuiTableRow: {
          // hover: {
          root: {
            "&:hover": {
              // border: "2px solid #b2caff!important",
              backgroundColor: "#9ad8ff29!important",
            },
          },
          head: {
            opacity: "0.9",
          },
          // },
        },
        MuiToolbar: {
          regular: {
            minHeight: "48px!important",
          },
          root: {
            position: "initial",
          },
        },
        MUIDataTable: {
          responsiveScroll: {
            maxHeight: "max-content!important",
            overflowX: "auto",
          },
          responsiveBase: {
            overflowY: "hidden",
            overflowX: "auto",
          },
        },
        MUIDataTableToolbar: {
          root: {
            backgroundColor: "var(--table-header-background)",
            color: "#ffffff",
          },
          icon: {
            color: "white",
            "&:hover": {
              color: "white",
            },
          },
          iconActive: {
            color: "white",
          },
          filterPaper: {
            right: "50px",
            left: "initial!important",
          },
        },
        MUIDataTablePagination: {
          root: {
            color: "black",
            backgroundColor: tableFooterColor,
          },
        },
        MUIDataTableSelectCell: {
          headerCell: {
            backgroundColor: tableFooterColor,
          },
          root: {
            zIndex: "3!important",
            backgroundColor: rowColor,
          },
        },
        MUIDataTableToolbarSelect: {
          root: {
            paddingBottom: "1px 1px!important",
          },
        },
        MUIDataTableBodyCell: {
          root: {
            backgroundColor: "transparent",
            textAlign: "left",
            fontSize: "0.800rem",
            padding: "3px 3px!important",
            // "&:hover": {
            //   backgroundColor:"red!important"
            // },
          },
        },
        MuiInput: {
          root: {
            color: "white",
          },
          underline: {
            borderBottom: "1px solid rgba(255,255,255,255)",
            "&:hover": {
              borderBottom: "1px solid rgba(255,255,255,255)",
            },
          },
        },
        MUIDataTableHeadCell: {
          root: {
            padding: "0px 5px!important",
            textAlign: "center",
            justifyContent: "left",
            // zIndex: "2 !important",
            backgroundColor: tableFooterColor,
          },
          fixedHeader: {
            backgroundColor: tableFooterColor,
            color: "black",
            fontSize: "0.875rem",
            textAlign: "left",
            justifyContent: "left",
          },
          toolButton: {
            justifyContent: "left",
          },
        },
        MUIDataTableSearch: {
          searchIcon: {
            color: "white",
          },
          clearIcon: {
            color: "white",
          },
        },
        MuiTableCell: {
          root: {
            padding: "7px",
          },
          footer: {
            backgroundColor: tableFooterColor,
          },
        },
        MUIDataTableFilter: {
          root: {
            minWidth: "300px",
          },
        },
      },
    });

  const updateWidthAndHeight = () => {
    let newWidth = window.innerWidth - 10;
    if (width !== newWidth) {
      if (newWidth < 980) {
        setResize(true);
      } else {
        setResize(false);
      }
      setWidth(newWidth);
    }
  };

  const onSearchClick = () => {
    let prop_temp = { ...props.pagination };
    prop_temp["searchText"] = searchText.current.value;
    if (props.onTableChange) {
      // searchText.current.value = ''
      props.onTableChange(prop_temp, "search");
    }
  };

  const onSearchChange = (e) => {
    searchText.current.value = e.target.value;
    // if(!searchText.current.value) {
    //     onResetClick()
    // }
  };

  const onResetClick = () => {
    let prop_temp = { ...props.pagination };
    prop_temp["searchText"] = "";
    if (props.onTableChange) {
      searchText.current.value = "";
      props.onTableChange(prop_temp, "search");
    }
  };

  const onSearchKeyClick = (e) => {
    if (e.key === "Enter") {
      onSearchClick();
    }
  };

  const getOptions = () => {
    let serversideOptions = {};
    if (props.serverSide) {
      let serversideOptionProps = getServerSideProps(props.pagination);
      serversideOptions = {
        ...serversideOptionProps,
        count: props.count,
        searchAlwaysOpen: true,
        jumpToPage: true,
        customSearchRender: () => {
          return (
            <div className="d-flex align-items-center">
              {props.title && (
                <div className=" fs-20 font-weight-bold mr-20">
                  {props.title}
                </div>
              )}
              <input
                autoFocus={autoFocus}
                ref={searchText}
                className="text-field width-250-px height-30px"
                onChange={onSearchChange}
                onKeyPress={() => onSearchKeyClick(searchText)}
                onKeyDown={onSearchKeyClick}
              />
              {/* <div className='pointer'> */}
              <Tooltip
                title={"Clear Search"}
                enterDelay={400}
                enterNextDelay={400}
                placement="top-start"
                classes={{ tooltip: "tooltip-show-data" }}
              >
                <CloseIcon className="pointer ml-10" onClick={onResetClick} />
              </Tooltip>
              {/* </div> */}
              <Button className="search-button ml-20" onClick={onSearchClick}>
                Search{" "}
              </Button>
              {/* <Button className='reset-button ml-20' onClick={onResetClick}>Clear </Button> */}
              {props.loading && (
                <div className="ml-20">
                  <CircularProgress className="white-text height-width-25px" />
                </div>
              )}
            </div>
          );
        },
        onTableChange: (action, tableState) => {
          let availableactions = [
            // "search",
            "sort",
            "changePage",
            "changeRowsPerPage",
            "filterChange",
          ];
          if (availableactions.includes(action)) {
            if (tableState["page"] !== 0 && action === "changeRowsPerPage") {
              tableState["page"] = 0;
            }
            if (props.onTableChange) {
              props.onTableChange(tableState, action);
            }
          } else if (action === "viewColumnsChange") {
            setColumnVisibilityInStorage(tableState.columns);
            if (props.onTableChange && props.viewColumns) {
              props.onTableChange(tableState, action);
            }
          } else if (
            action === "rowSelectionChange" &&
            props.rowSelectionChange
          ) {
            props.rowSelectionChange(tableState);
          }
        },
      };
    } else {
      serversideOptions = {
        jumpToPage: true,
        onTableChange: (action, tableState) => {
          if (props.onTableChange) {
            props.onTableChange(tableState);
          }
          if (action === "viewColumnsChange") {
            setColumnVisibilityInStorage(tableState.columns);
          }
        },
      };
    }

    return { ...serversideOptions, ...props.options };
  };
  const [muiOptions, setMuiOptions] = React.useState(getOptions());

  const setColumnVisibilityInStorage = (viewColumnChangeData) => {
    if (
      viewColumnChangeData &&
      viewSetting &&
      viewColumnSettings[viewSetting]
    ) {
      const newColSettings = [];
      for (const col of viewColumnChangeData) {
        if (col.display === "true" || col.display === true) {
          newColSettings.push(col.name);
        }
      }
      const storageData = storedViewColumnSettings
        ? storedViewColumnSettings
        : {};
      storageData[viewSetting] = newColSettings;
      localStorage.setItem("viewColumnSettings", JSON.stringify(storageData));
    }
  };

  const setColumnVisibility = () => {
    if (
      viewSetting &&
      viewColumnSettings[viewSetting] &&
      muiOptions.viewColumns !== false
    ) {
      let showableColums = viewColumnSettings[viewSetting];
      if (storedViewColumnSettings && storedViewColumnSettings[viewSetting]) {
        showableColums = storedViewColumnSettings[viewSetting];
      }
      let updatedCols = [];
      const propColumns = [...columns];
      for (const col of propColumns) {
        if (
          col.viewColumns !== false &&
          col.options.display !== false &&
          !showableColums.includes(col.name)
        ) {
          col.options.display = false;
        }
        updatedCols.push(col);
      }
      setcolumnState(() => updatedCols);
    }
  };

  React.useEffect(() => {
    let options = getOptions();
    let tempMuiOptions = _.cloneDeep(muiOptions);
    if (tempMuiOptions["tableId"]) {
      delete tempMuiOptions["tableId"];
    }
    if (JSON.stringify(options) !== JSON.stringify(tempMuiOptions)) {
      setMuiOptions(options);
    }
    if (props?.pagination?.searchText && searchText?.current) {
      searchText.current.value = props?.pagination?.searchText;
    }
    setColumnVisibility();
    window.addEventListener("resize", updateWidthAndHeight);
    return () => window.removeEventListener("resize", updateWidthAndHeight);
  }, [props]);

  React.useEffect(() => {
    let options = getOptions();
    let tempMuiOptions = _.cloneDeep(muiOptions);
    if (tempMuiOptions["tableId"]) {
      delete tempMuiOptions["tableId"];
    }
    setMuiOptions(options);
  }, [props.title]);

  return (
    <div className={!hideTextTransform ? "text-capitalize" : ""}>
      <MuiThemeProvider theme={getMuiTheme()}>
        <MUIDataTable
          title={props.title}
          key={props.key}
          data={data || []}
          columns={columnState}
          options={muiOptions}
          components={{
            Checkbox: CustomCheckbox,
            ExpandButton: CustomExpandButton,
          }}
          className="my-tooltip-table"
        />
      </MuiThemeProvider>
    </div>
  );
}

AllMUIDataTable.propTypes = {
  count: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  customTableHeaderBackground: PropTypes.string,
  onTableChange: PropTypes.func,
  rowSelectionChange: PropTypes.func,
  options: PropTypes.object,
  pagination: PropTypes.object,
  serverSide: PropTypes.bool,
  viewSetting: PropTypes.string,
  key: PropTypes.string
};
export default AllMUIDataTable;

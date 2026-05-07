import React, { useState } from 'react'
import {
    createTheme,
    MuiThemeProvider,
} from "@material-ui/core/styles";
import MUIDataTable from "mui-datatables";
import PropTypes from "prop-types";
import _ from 'lodash';

import variables from 'styles/variables.scss';
import { DEFAULT_THEME } from 'Constants';
import DefaultViewColumnSettings from 'Constants/DefaultViewColumnSettings';
import { THEME_COLORS_SETTINGS } from 'Constants/styleVariable';
import { getServerSideProps } from 'Includes/functions'

function AllMUIDataTable(props) {
    const theme = localStorage.getItem('theme') ? localStorage.getItem('theme') : DEFAULT_THEME;
    let viewColumnSettings = _.cloneDeep(DefaultViewColumnSettings);
    let storedViewColumnSettings = localStorage.getItem('viewColumnSettings')
    if (storedViewColumnSettings) {
        storedViewColumnSettings = JSON.parse(storedViewColumnSettings);
    }
    const tableFooterColor = THEME_COLORS_SETTINGS[theme] && THEME_COLORS_SETTINGS[theme]['tableFooterColor'] ? THEME_COLORS_SETTINGS[theme]['tableFooterColor'] : ''
    const { title, data, columns, customTableHeaderBackground, viewSetting } = props;
    const [columnState, setcolumnState] = useState(columns);
    const [width, setWidth] = useState(window.innerWidth);
    const [resize, setResize] = useState(false);
    const getMuiTheme = () => createTheme({
        overrides: {
            MuiToolbar: {
                regular: {
                    minHeight: '48px!important',
                }
            },
            MUIDataTable: {
                responsiveScroll: {
                    // minHeight: "340px",
                    overflowX: 'auto'
                },
            },
            MUIDataTableToolbar: {
                root: {
                    backgroundColor: (customTableHeaderBackground ? customTableHeaderBackground : variables.tableHeaderBackground),
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
                    left: "initial!important"
                }
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
                    backgroundColor: "white",
                },
            },
            MUIDataTableToolbarSelect: {
                root: {
                    paddingBottom: "0px!important",
                },
            },
            MUIDataTableBodyCell: {
                root: {
                    backgroundColor: "white",
                    textAlign: "left",
                    fontSize: "0.875rem",
                },
            },
            MuiInput: {
                root: {
                    color: "white",
                },
                underline: {
                    borderBottom: '1px solid rgba(255,255,255,255)',
                    "&:hover": {
                        borderBottom: '1px solid rgba(255,255,255,255)',
                    },
                }
            },
            MUIDataTableHeadCell: {
                root: {
                    textAlign: "center",
                    justifyContent: "left",
                    zIndex: "2 !important",
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
                    color: 'white',
                }
            },
            MuiTableCell: {
                root: {
                    padding: '7px'
                },
                footer: {
                    backgroundColor: tableFooterColor,
                },
            },
            MUIDataTableFilter: {
                root: {
                    minWidth: '300px'
                }
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

    const getOptions = () => {
        let serversideOptions = {};
        if (props.serverSide) {
            let serversideOptionProps = getServerSideProps(props.pagination);
            serversideOptions = {
                ...serversideOptionProps,
                count: props.count,
                onTableChange: (action, tableState) => {
                    let availableactions = [
                        "search",
                        "sort",
                        "changePage",
                        "changeRowsPerPage",
                        "filterChange",
                    ];
                    if (availableactions.includes(action)) {
                        props.onTableChange(tableState, action);
                    } else if (action === 'viewColumnsChange') {
                        setColumnVisibilityInStorage(tableState.columns);
                    } else if (action === 'rowSelectionChange' && props.rowSelectionChange) {
                        props.rowSelectionChange(tableState)
                    }
                },
            };
        } else {
            serversideOptions = {
                onTableChange: (action, tableState) => {
                    if (action === 'viewColumnsChange') {
                        setColumnVisibilityInStorage(tableState.columns);
                    }
                }
            }
        }

        return { ...serversideOptions, ...props.options };
    }
    const [muiOptions, setMuiOptions] = React.useState(getOptions());

    const setColumnVisibilityInStorage = (viewColumnChangeData) => {
        if (viewColumnChangeData && viewSetting && viewColumnSettings[viewSetting]) {
            const newColSettings = [];
            for (const col of viewColumnChangeData) {
                if (col.display === "true" || col.display === true) {
                    newColSettings.push(col.name);
                }
            }
            const storageData = storedViewColumnSettings ? storedViewColumnSettings : {};
            storageData[viewSetting] = newColSettings;
            localStorage.setItem('viewColumnSettings', JSON.stringify(storageData));
        }
    }

    const setColumnVisibility = () => {
        if (viewSetting && viewColumnSettings[viewSetting] && muiOptions.viewColumns !== false) {
            let showableColums = viewColumnSettings[viewSetting];
            if (storedViewColumnSettings && storedViewColumnSettings[viewSetting]) {
                showableColums = storedViewColumnSettings[viewSetting];
            }
            let updatedCols = [];
            const propColumns = [...columns];
            for (const col of propColumns) {
                if (col.viewColumns !== false && col.options.display !== false && !showableColums.includes(col.name)) {
                    col.options.display = false;
                }
                updatedCols.push(col)
            }
            setcolumnState(() => updatedCols);
        }
    }

    React.useEffect(() => {
        let options = getOptions();
        if (JSON.stringify(options) !== JSON.stringify(muiOptions)) {
            setMuiOptions(options);
        }
        setColumnVisibility()
        window.addEventListener("resize", updateWidthAndHeight);
        return () => window.removeEventListener("resize", updateWidthAndHeight);
    }, [props]);

    React.useEffect(() => {
        setcolumnState(props.columns)
    }, [props.columns])

    return (
        <div className='text-capitalize'>
            <MuiThemeProvider theme={getMuiTheme()}>
                <MUIDataTable
                    title={title}
                    data={data || []}
                    columns={columnState}
                    options={muiOptions}
                />
            </MuiThemeProvider>
        </div>
    )
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
    viewSetting: PropTypes.string
};
export default AllMUIDataTable;
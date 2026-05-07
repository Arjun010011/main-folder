import React, { Component } from "react";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import { Grid, Button, Paper, Box, CircularProgress } from "@material-ui/core/";
import Chip from '@material-ui/core/Chip';
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import AllMUIDataTable from "Components/AllMUIDataTable";

import { getRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { DATATABLEROWSPERPAGEOPT, DEFAULT_PAGINATION_PROPS } from "Constants";
import {
    checkLocalAcademicYear, SetAcademicYear, getSettingValue,
    isUserHasPermission, updatePermissions, getPaginationProps, getUrlParam
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import { Dropdown } from "Components/DropDown";
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import Swal from 'sweetalert2';
import ActionColumn from 'Components/ActionColumnNew';


const isPriceOnArea = getSettingValue('price_on_area') === '0' ? false : true;

class KilometerPriceViewList extends Component {
    constructor(props) {
        super(props);
        this.permission = updatePermissions('transport_price', ['create']);
        this.state = {
            loading: true,
            enabledActions: [],
            errorContent: "",
            year: "",
            planList: [],
            selectedPlan: '',
            standardList: [],
            planStandardMapping: {},
            snackbar: false,
            alertData: '',
            tableData: [],
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            isApproved: false,
            columns: isPriceOnArea ? [
                {
                    name: "area_details",
                    label: "Area",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value) => {
                            if (value && 'name' in value) {
                                return (
                                    value['name']
                                )
                            }
                        }
                    },
                },
                {
                    name: "rate",
                    label: "Price",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "id",
                    options: {
                        display: false
                    }
                },
                {
                    name: "Actions",
                    label: "Action",
                    options: {
                        filter: true,
                        download: false,
                        sort: false,
                        customBodyRender: (value, tableMeta) => {
                            const id = tableMeta.rowData[2];
                            if (!this.state.isApproved) {
                                return (<div>
                                    <ActionColumn
                                        id={id}
                                        fieldValues={[id]}
                                        deleteUrl={DEL_URL.routePrice.api}
                                        baseClassName='action-basic-detail-width'
                                        enabledActions={['delete']}
                                        deleteType={this.deleteType}
                                    />
                                </div>
                                );
                            } else {
                                return <> - </>
                            }
                        }
                    }
                }
            ] :
                [
                    {
                        name: "km",
                        label: "Upto Km",
                        options: {
                            filter: true,
                            sort: true,
                        },
                    },
                    {
                        name: "rate",
                        label: "Price",
                        options: {
                            filter: true,
                            sort: true,
                        }
                    },
                    {
                        name: "Actions",
                        label: "Action",
                        options: {
                            filter: true,
                            sort: false,
                            download: false,
                            customBodyRender: (value, tableMeta) => {
                                const id = tableMeta.rowData[2];
                                if (!this.state.isApproved) {
                                    return (<div>
                                        <ActionColumn
                                            id={id}
                                            fieldValues={[id]}
                                            deleteUrl={DEL_URL.routePrice.api}
                                            baseClassName='action-basic-detail-width'
                                            enabledActions={['delete']}
                                            deleteType={this.deleteType}
                                        />
                                    </div>
                                    );
                                } else {
                                    return <> - </>
                                }
                            }
                        }
                    }
                ],
        };
    }

    validatePlan = () => {
        let { tableData } = this.state;
        if (tableData.data_list.length <= 0) {
            this.setState({
                alertData: 'Add atleast one data to approve',
                snackbar: true
            })
            return false;
        }
        return true
    }

    deleteType = async (id) => {
        let { tableData } = this.state;
        tableData.data_list.map((data, index) => {
            if (data.id === id) {
                tableData['data_list'].splice(index, 1)
            }
        })
        this.setState({
            tableData
        })
    }

    approvePlan = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Approve it!'
        }).then(async (result) => {
            if (result.value) {
                if (this.validatePlan()) {
                    let url = PUT_URL.routepriceplanapprove.api + this.state.selectedPlan + '/';
                    const post_data = {
                        "approval_status": "1"
                    }
                    putRequest(url, post_data, { return_error_message: true }).then(response => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: response.data.Reason,
                                showConfirmButton: false,
                                timer: 1500
                            });
                            this.setState({
                                isApproved: true
                            })
                        }
                        else {
                            this.setState({
                                alertData: response,
                                snackbar: true
                            })
                        }
                    })
                }
            }
        })
    }

    options = {
        filterType: "dropdown",
        responsive: "scroll",
        filter: false,
        download: true,
        search: isPriceOnArea ? true : false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
        rowsPerPage: 10,
        selectableRows: "none",
        downloadOptions: {
            filename: "kilometerprice.csv",
            filterOptions: {
                useDisplayedColumnsOnly: true,
                useDisplayedRowsOnly: true,
            },
        },
        onDownload: (buildHead, buildBody, columns, data) => {
            const bodyData = data.map((student) => {
                return student;
            });
            return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
        },
    };

    fieldValues = (...data) => {
        return data;
    };

    closeMenuAction = (status) => {
        let { tableData, columns } = this.state;
        this.setState({
            tableData: [...tableData],
            closeMenu: status,
            errorContent: "",
            columns: columns,
        });
    };

    componentDidMount = () => {
        let { plan_id, plan_name } = getUrlParam()
        this.getYearsList(plan_id);
    };

    getYearsList = (defaultselectedPlan = '') => {
        const params = {};
        getRequest(GET_URL.getacademicyear.api, params, {}).then(
            (response) => {
                if (response && response.status === 200) {
                    const yearList = response.data.data;
                    const year = checkLocalAcademicYear(yearList);
                    let loading = false;
                    if (year) {
                        loading = true;
                    }
                    this.setState({ yearList, year: year ? year : '', loading }, () => {
                        if (year && isPriceOnArea === false) {
                            this.getRoutePricePlan(defaultselectedPlan)
                        }
                        else if (year && isPriceOnArea === true) {
                            this.getRoutePricePlan(defaultselectedPlan)
                        }
                    });
                }
            }
        );
    };

    getRoutePricePlan = (defaultselectedPlan = '') => {
        let url = GET_URL.routepriceplan.api
        let params = { is_active: 1, academic_year: this.state.year };
        let planList = []
        let planStandardMapping = {}
        getRequest(url, params, {}).then((response) => {
            let priceplan = []
            if (response && response.status === 200) {
                priceplan = response.data.data;
                priceplan.map((data) => {
                    let planData = {
                        id: data.id,
                        name: data.name
                    }
                    planList.push(planData)
                    planStandardMapping[data.id] = data['standard_detail'];
                })
            }
            this.setState({
                loading: false,
                tableLoading: false,
                planList: planList,
                tableData: priceplan,
                standardList: [],
                isApproved: false,
                selectedPlan: defaultselectedPlan,
                planStandardMapping: planStandardMapping
            }, () => {
                if (this.state.selectedPlan) {
                    this.getRouteData();
                }
            });
        })
    }

    getRouteData = (paginationProps) => {
        let { selectedPlan, pagination } = this.state
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params, is_active: 1, academic_year: this.state.year,
            price_plan: selectedPlan, pagination: true
        };
        getRequest(GET_URL.routePrice.api, params, params).then((response) => {
            if (response && response.status === 200) {
                const routeData = response.data.data;
                this.setState({
                    routeNames: routeData,
                    isApproved: routeData.is_approved,
                    loading: false,
                    tableLoading: false,
                    tableData: routeData,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                }, () => {
                    this.setStandardForPlan()
                });
            }
        })
    }

    onChange = (e) => {
        let name = e.target.name;
        let value = e.target.value;
        if (value !== 0) {
            this.setState({ [name]: value, loading: true }, async () => {
                if (name === "year") {
                    this.getRoutePricePlan();
                    SetAcademicYear(value)
                }
                if (name === 'selectedPlan') {
                    this.getRouteData();
                }
            });
        }
    };

    setStandardForPlan = () => {
        let { selectedPlan, planStandardMapping } = this.state;
        if (selectedPlan) {
            this.setState({
                standardList: planStandardMapping[selectedPlan]
            })
        }
    }

    getTitle = () => {
        if (this.state.loading) {
            return <CircularProgress className="white-text" />;
        }
        return "";
    };

    getYearName = () => {
        let { yearList, year } = this.state;
        let yearName = '';
        for (const academicYearData of yearList) {
            if (academicYearData['id'] === year) {
                yearName = academicYearData['name'];
                break;
            }
        }
        return yearName
    }

    getSelectedPlanName = () => {
        let { planList, selectedPlan } = this.state
        let planName = '';
        for (const planData of planList) {
            if (parseInt(planData['id']) === parseInt(selectedPlan)) {
                planName = planData['name'];
                break;
            }
        }
        return planName;
    }

    addPrice = () => {
        let { selectedPlan, year, standardList } = this.state
        let planStandardList = standardList.map((data) => {
            return { 'id': data['id'], 'name': data['name'] }
        })
        let planName = this.getSelectedPlanName();
        let yearName = this.getYearName();

        if (!!selectedPlan) {
            let searchState = {
                year: year, plan_id: selectedPlan, yearName: yearName,
                planName: planName, planStandardList: planStandardList
            }
            let searchParam = "?" + new URLSearchParams(searchState).toString()
            this.props.history.push({
                pathname: Actions.transport_price.create.url,
                search: searchParam
            })
        } else {
            this.setState({
                snackbar: true,
                alertData: 'Select Price Plan'
            })
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }

    render() {
        const { year, yearList, tableData, columns,
            loading, planList, selectedPlan, standardList,
            pagination, snackbar, alertData, isApproved
        } = this.state;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: true,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
        }
        return (
            <div>
                <Paper className={"paper-background"}>
                    <Grid container>
                        <Grid item md={7} xs={12} sm={12}>
                            <Box className="header-align heading">Kilometers and Price</Box>
                            <Box className="sub-header-align" mt={4} display='flex'>
                                <Box>
                                    <Dropdown
                                        data={yearList}
                                        name="year"
                                        value={year}
                                        onChange={this.onChange}
                                        hideSelect={true}
                                        label={<FormattedMessage {...commonMessages.academicYear} />}
                                        helperText={(!year && !loading) ? 'Select Academic Year' : ''}
                                    />
                                </Box>
                                <Box ml={2}>
                                    <Dropdown
                                        data={planList}
                                        name="selectedPlan"
                                        value={selectedPlan}
                                        onChange={this.onChange}
                                        hideSelect={true}
                                        label='Price Plan'
                                        helperText={(!selectedPlan && !loading) ? 'Select Plan' : ''}
                                    />
                                </Box>
                                {((selectedPlan && !loading) &&
                                    (!isApproved ?
                                        <Box ml={2} alignSelf='center'>
                                            <Button color='primary' variant='contained' onClick={() => {
                                                this.approvePlan();
                                            }}>
                                                Approve
                                            </Button>
                                        </Box> :
                                        <Box ml={2} alignSelf='center'>
                                            <Box className='schedule-exam-approved-box'>
                                                Approved
                                            </Box>
                                        </Box>
                                    )
                                )
                                }
                            </Box>
                        </Grid>
                        <Grid item md={5} xs={12} sm={12}>
                            {(selectedPlan && !isApproved && !loading) &&
                                <Box className="end-flex-prop header-align">
                                    {isUserHasPermission("application_fees", "create") && (
                                        <Button
                                            variant="contained"
                                            onClick={() => {
                                                this.addPrice();
                                            }}
                                            className="editbutton-view"
                                        >
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                                            {Actions.transport_price.create.label}
                                        </Button>
                                    )}
                                </Box>
                            }
                        </Grid>
                        <Grid item xs={12}>
                            {selectedPlan &&
                                standardList.map((data, index) => {
                                    return (
                                        < Chip className='selectedStandards mb-20' label={data.name} key={index} />
                                    )
                                })
                            }
                        </Grid>
                        <Grid item md={8} xs={12}>
                            <AllMUIDataTable
                                key={tableData.data_list}
                                title={this.getTitle}
                                data={tableData.data_list}
                                columns={columns}
                                options={options}
                                serverSide={true}
                                pagination={pagination}
                                count={tableData.count}
                                onTableChange={this.getRouteData}
                            />
                        </Grid>
                    </Grid>
                </Paper>
                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    open={snackbar}
                    autoHideDuration={4000}
                    onClose={this.handleClose}
                >
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </div>
        );
    }
}

export default withRouter(KilometerPriceViewList);

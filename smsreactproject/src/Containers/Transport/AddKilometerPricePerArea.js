import React, { Component } from 'react'
import { Link, withRouter } from 'react-router-dom';
import { Paper, Box, Button, Grid, CircularProgress } from '@material-ui/core';
import classNames from 'classnames';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getPaginationProps } from 'Includes/functions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AllMUIDataTable from 'Components/AllMUIDataTableInput.js';
import './styles.scss'
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import _ from 'lodash';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import LoadingGif from 'Components/LoadingGif';
import Swal from 'sweetalert2';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';


const header = 'Add Price on Area'
const subheader = ' Here You can add kilometer price for the distance'

class AddKilometerPricePerArea extends Component {
    constructor(props) {
        super(props)
        this.state = {
            year: '',
            yearName: '',
            tableLoading: false,
            areaPrinceList: [],
            updatedPriceList: [],
            isReview: '',
            open: '',
            existingAllUpdatedPriceList: [],
            postUpdatedPrice: [],
            snackbar: '',
            errors: '',
            error_status: false,
            loading: true,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            AllUpdatedPriceList: [],
            columns: [
                {
                    name: "id",
                    label: "Area id",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    }
                },
                {
                    name: "name",
                    label: "Area Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box width="150px" textAlign="left" marginLeft="150px">
                                    {tableMeta.rowData[1]}
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "error",
                    label: "error",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "rate",
                    label: "Price",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box height='50px' width="200px">
                                    <Box  >
                                        <input
                                            type='number'
                                            value={tableMeta.rowData[3]}
                                            name='rate'
                                            className={'edit-amount-input-salary-plan '}
                                            max='8'
                                            onChange={e => this.onChangeRate(e, tableMeta.rowData[0])}
                                        />
                                    </Box>
                                    <Box>
                                        {tableMeta.rowData[2].length > 1 &&
                                            < Box className="error-message">
                                                {tableMeta.rowData[2]}
                                            </Box >
                                        }
                                    </Box>
                                </Box>
                            )
                        }
                    }
                },
            ]
        }
    }

    componentDidMount() {

        let { year, yearName, plan_id, planName } = this.props
        if (!year) {
            this.props.history.push(Actions.transport_price.view.url)
        } else {
            this.setState({
                year: year,
                yearName: yearName,
                plan_id: plan_id,
                planName: planName,
            }, () => {
                this.getareaPrinceList()
            })
        }
    }

    onChangeRate = (e, index) => {
        let value = e.target.value
        let { areaPrinceList, updatedPriceList, AllUpdatedPriceList, existingAllUpdatedPriceList } = this.state
        areaPrinceList.map((data) => {
            if (data.id === index) {
                data.rate = value
                data.error = ''
            }
        })
        updatedPriceList = _.cloneDeep(areaPrinceList)
        if (AllUpdatedPriceList.length > 0) {
            updatedPriceList.map((data) => {
                for (let i = 0; i < AllUpdatedPriceList.length; i++) {
                    if (AllUpdatedPriceList[i].id === data.id) {
                        AllUpdatedPriceList[i].rate = data.rate
                    }
                }
            })
        }
        else {
            updatedPriceList.map((data) => {
                AllUpdatedPriceList.push(data)
            })
        }

        this.setState({
            areaPrinceList,
            updatedPriceList,
            AllUpdatedPriceList,
            existingAllUpdatedPriceList,
            columns: [...this.state.columns]
        })
    }

    ReviewPriceList = () => {
        let { isReview, AllUpdatedPriceList, postUpdatedPrice, snackbar, open, error_status, existingAllUpdatedPriceList } = this.state
        let errors = []
        AllUpdatedPriceList.map((data) => {
            if (data.error.length >= 1) {
                errors.push(data.id)
            }
        })
        if (errors.length != 0) {
            snackbar = true
            isReview = false
            open = false
            error_status = true
        }
        else {
            AllUpdatedPriceList.map((data) => {
                if (data.rate > 0) {
                    postUpdatedPrice.push(data)
                }
            })
            if (postUpdatedPrice.length < 1) {
                snackbar = true
                isReview = false
                open = false
                error_status = false
            }
            else {
                snackbar = false
                isReview = true
                open = true
                error_status = false
            }
        }
        this.setState({
            isReview,
            open,
            postUpdatedPrice,
            snackbar,
            error_status
        })
    }

    handleClose = () => {
        this.setState({
            open: false,
            isReview: false,
            postUpdatedPrice: []
        })
    }

    handleCloseAlert = () => {
        this.setState({
            snackbar: false
        })
    }

    getAlertMessage = () => {
        let { error_status, alertData } = this.state
        alertData = (error_status === true) ? "Please Clears Errors" : "No changes Detected"
        return alertData
    }

    saveData = () => {
        let { postUpdatedPrice, plan_id } = this.state
        let url = POST_URL.routePrice.api
        let area_price = []
        postUpdatedPrice.map((data) => {
            let price = {
                "area": data.id,
                "rate": data.rate
            }
            area_price.push(price)
        })
        let postData = {
            "price_plan": plan_id,
            "rate": area_price
        }
        postRequest(url, postData).then(response => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                }).then(
                    this.setState({
                        open: false
                    }, () => {
                        let searchState = { plan_id: this.state.plan_id, plan_name: this.state.planName }
                        let searchParam = "?" + new URLSearchParams(searchState).toString()
                        this.props.history.push({
                            pathname: Actions.transport_price.view.url,
                            search: searchParam,
                        });
                    })
                )
            }
            else {
                this.setState({
                    open: false
                })
            }
        });
    }

    getareaPrinceList = (paginationProps) => {
        let { pagination, year, AllUpdatedPriceList, plan_id } = this.state;
        this.currentPagination = _.cloneDeep(pagination);
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const url = GET_URL.area.api
        let params = {
            limit: pagination_params.limit, pageno: pagination_params.pageno,
            ordering: "name", academic_year: year, price_plan: plan_id
        };
        getRequest(url, params, this.props).then((response) => {
            let areaPrinceList = []
            if (response && response.status === 200) {
                this.callApi = true
                let areaList = response.data.data;
                let area_details = areaList.data_list
                area_details.map((data) => {
                    let areadata = {
                        "id": data.id,
                        "name": data.name,
                        "rate": 0,
                        "error": ''
                    }
                    areaPrinceList.push(areadata)
                })

                if (AllUpdatedPriceList.length > 0) {
                    areaPrinceList.map((data) => {
                        let isValueExisit = false
                        for (let i = 0; i < AllUpdatedPriceList.length; i++) {
                            if (AllUpdatedPriceList[i].name === data.name) {
                                data.rate = AllUpdatedPriceList[i].rate
                                isValueExisit = true
                            }
                        }
                        if (!isValueExisit) {
                            AllUpdatedPriceList.push(data)
                        }
                    })
                }
                this.setState({
                    areaPrinceList: areaPrinceList,
                    loading: false,
                    areaList: areaList,
                    tableUpdating: false,
                    pagination: this.currentPagination,
                    AllUpdatedPriceList
                })
            }
        });
    }

    ViewPage = () => {
        let searchState = { plan_id: this.state.plan_id, plan_name: this.state.planName }
        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.transport_price.view.url,
            search: searchParam,
        });
    }

    render() {
        let { yearName, tableLoading, areaPrinceList, isReview, open, pagination,
            postUpdatedPrice, snackbar, alertData, loading, areaList
            , planName } = this.state
        alertData = this.getAlertMessage()
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
        // let options = _.cloneDeep(multiOptions)
        // let pagination = { ...DEFAULT_PAGINATION_PROPS_ID_LIST }
        // pagination['sortOrder']['name'] = 'name'
        // pagination['sortOrder']['direction'] = 'asc'
        // options['selectableRows'] = 'none' 
        if (loading)
            return <LoadingGif />

        return (
            <Paper className={classNames('paper-background')}>
                <Box>
                    <Grid container >
                        <Grid item md={6} xs={12} sm={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                {header}
                            </Box>
                            <Box className='sub-heading margin-bottom-30'>
                                Here we can set KM Price for area
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('transport_price', 'view') && <Button
                                    variant="contained"
                                    onClick={() => this.ViewPage()}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' />  {Actions.transport_price.view.label}</Button>}
                            </Box>
                        </Grid>
                        <Box className='priceplan'>
                            <Box className="year-std-box mr-40 ">
                                <Box className="academic-std-head "> For Academic Year</Box>
                                <Box className="aca-std-white-background">{yearName}</Box>
                            </Box>
                            <Box className="year-std-box mr-40 ">
                                <Box className="academic-std-head "> Plan</Box>
                                <Box className="aca-std-white-background">{planName}</Box>
                            </Box>
                        </Box>
                    </Grid>
                </Box>
                <Box className="md-up-width-80 margin-top-20" >
                    <Grid item md={12} xs={12} sm={12}>
                        <AllMUIDataTable
                            data={areaPrinceList}
                            title={tableLoading ? <CircularProgress className='white-text' /> : 'KM Price'}
                            columns={this.state.columns}
                            options={options}
                            onTableChange={this.getareaPrinceList}
                            serverSide={true}
                            pagination={pagination}
                            count={areaList.count}
                        />
                    </Grid>
                </Box>
                <Dialog fullWidth={true} maxWidth={'sm'} aria-labelledby="max-width-dialog-title" onClose={() => this.handleClose()} open={open}>
                    <DialogTitle divider id="customized-dialog-title" onClose={() => this.handleClose()}>
                        Area Price
                    </DialogTitle>
                    <Box className="updated-priceList price-list-heading updated-price-heading-alignment">
                        <Box>Area</Box>
                        <Box>Price</Box>
                    </Box>
                    {isReview === true &&
                        postUpdatedPrice.map((data) => {
                            return (
                                <Box>
                                    <DialogContent className='price-data'>
                                        <Box className="updated-priceList updated-price-alignment">
                                            <Box>
                                                {data.name}
                                            </Box>
                                            <Box >
                                                {data.rate}
                                            </Box>
                                        </Box>
                                    </DialogContent>
                                </Box>
                            )
                        })
                    }
                    <Box>
                        <DialogActions>
                            <Button autoFocus onClick={() => this.handleClose()} color="primary">
                                Cancel
                            </Button>
                            <Button autoFocus onClick={() => this.saveData()} color="primary">
                                Submit
                            </Button>
                        </DialogActions>
                    </Box>
                </Dialog>
                {areaPrinceList && areaPrinceList.length > 0 &&
                    < Box className="submit-button" >
                        <Button variant='contained'
                            className='submit '
                            //disabled={submitDisable}
                            onClick={() => this.ReviewPriceList()}>
                            Review And Submit
                        </Button>
                    </Box >
                }

                <Box>
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={snackbar}
                        autoHideDuration={1000}
                        onClose={this.handleCloseAlert}
                    >
                        <Alert severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Box>
            </Paper>
        )
    }
}

export default withRouter(AddKilometerPricePerArea)
import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, CircularProgress } from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import ActionColumn from 'Components/ActionColumnNew';
import { numberRegex } from 'Constants/regularExpression'
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import _ from 'lodash';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { isUserHasPermission, getPaginationProps, getSettingValue } from 'Includes/functions';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';

const fieldDetails = [
    {
        label: 'Area Price', regex: numberRegex, name: 'price', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'text', autoFocus: true, maxLength: '8'
    },
]

const isPriceOnArea = getSettingValue('price_on_area') === '0' ? false : true;

class KilometerPricePerArea extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tableLoading: false,
            routeNamesData: [],
            year: '',
            pagination: '',
            options: '',
            routePrice: []
        }
    }

    componentDidMount() {
        let options = _.cloneDeep(multiOptions)
        let pagination = { ...DEFAULT_PAGINATION_PROPS_ID_LIST }
        pagination['sortOrder']['name'] = 'name'
        pagination['sortOrder']['direction'] = 'asc'
        options['selectableRows'] = 'none'

        this.setState({
            options: options,
            pagination: pagination,
            year: this.props.year,
        }, () => {
            if (Boolean(this.props.year) && isPriceOnArea) {

            }else if(Boolean(this.props.year) && !isPriceOnArea){
                this.getRouteData()
            }
        })
    }

    fieldValues(componentType) {
        let fieldValues = []
        fieldValues.push(componentType)
        return fieldValues
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('payroll_managesalaryview', 'update')
        const hasDeletePermission = isUserHasPermission('payroll_managesalaryview', 'delete')
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                columns: this.state.columns
            })
        }
    }

    getRouteData = (paginationProps) => {
        let { year, plan_id } = this.props
        let { pagination, routeNamesData } = this.state;
        this.currentPagination = _.cloneDeep(pagination);
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);

        let url = GET_URL.routePrice.api
        let params = { limit: pagination_params.limit, pageno: pagination_params.pageno, ordering: "name", is_active: 1, price_plan: plan_id }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                let routePrice = response.data.data
                let areaPriceData = routePrice.data_list
                routeNamesData = []
                areaPriceData.map((data) => {
                    if (data.area != null) {
                        let areaPriceDetails = {
                            "id": data.id,
                            "area": data.area_details.name,
                            "rate": data.rate,
                            "area_id": data.area
                        }
                        routeNamesData.push(areaPriceDetails)
                    }
                })
                this.setState({
                    routeNamesData: routeNamesData,
                    year: year,
                    routePrice: routePrice,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }


        })
    }

    updatePostFormat = (newData, id) => {
        let { routeNamesData, year } = this.state
        let payload
        routeNamesData.map((data) => {
            if (data.id === id) {
                payload = {
                    academic_year: this.state.year,
                    area: data.area_id,
                    rate: newData.price
                }
            }
        })
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let { routeNamesData } = this.state
        routeNamesData.map((data) => {
            if (data.id === id) {
                data.rate = parseInt(newData.price)
            }
        })
        this.setState({
            routeNamesData,

            columns: this.state.columns,
            tableUpdating: false,
        })
        return true
    }

    deleteType = async (id, index) => {
        let { routeNamesData } = this.state
        routeNamesData.map((data, index) => {
            if (data.id === id) {
                routeNamesData.splice(index, 1)
            }
        })
        this.setState({
            routeNamesData
        })
    }


    render() {
        let { tableLoading, routeNamesData, columns, options, pagination, routePrice, year } = this.state
        columns = [
            {
                name: "id",
                label: "id",
                options: {
                    filter: true,
                    sort: true,
                    display: false
                },
            },
            {
                name: "area",
                label: "area name",
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (
                            <Box>
                                {tableMeta.rowData[1]}
                            </Box>
                        )
                    },
                },
            },
            {
                name: "rate",
                label: "Price",
                options: {
                    filter: true,
                    sort: true,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (

                            <Box>
                                {tableMeta.rowData[2]}
                            </Box>
                        )
                    },
                }
            },
            {
                name: "Actions",
                label: "Actions",
                options: {
                    //  display: this.updatePermissions('display'),
                    display: true,
                    filter: true,
                    sort: true,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<Box>
                            <ActionColumn
                                id={tableMeta.rowData[0]}
                                fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                label='Please Update Area Price'
                                fieldDetails={fieldDetails}
                                baseClassName='action-basic-detail-width'
                                updateUrl={PUT_URL.routePrice.api}
                                updatePostFormat={this.updatePostFormat}
                                updateType={this.updateType}
                                deleteUrl={DEL_URL.routePrice.api}
                                deleteType={this.deleteType}
                                enabledActions={['edit', 'delete']}
                            />
                        </Box>
                        );
                    },
                }
            }
        ]
        return (
            <Box>
                <Box className="md-up-width-80 margin-top-20" >
                    {year > 0 &&
                        <Grid item md={12} xs={12} sm={12}>
                            <AllMUIDataTable
                                data={routeNamesData}
                                title={tableLoading ? <CircularProgress className='white-text' /> : 'KM Price'}
                                columns={columns}
                                options={options}
                                onTableChange={this.getRouteData}
                                serverSide={true}
                                pagination={pagination}
                                count={routePrice.count}
                            />
                        </Grid>
                    }
                </Box>
                {!Boolean(year) &&
                    <Box className='blank-page-width'>
                        <Paper className="margin-top-20 ">
                            <BlankPagewithIcon data="Km price not found for this Academic Year" />
                        </Paper>
                    </Box>
                }
            </Box>
        )
    }
}

export default withRouter(KilometerPricePerArea)

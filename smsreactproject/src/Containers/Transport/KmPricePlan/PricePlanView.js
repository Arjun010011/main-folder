import React, { Component } from 'react';
import { Paper, Box, Button, Grid, CircularProgress } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from "classnames";
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import { SetAcademicYear, getKeyValueInArray, checkLocalAcademicYear, isUserHasPermission } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew';
import { getSettingValue } from 'Includes/functions'
import { FormattedMessage } from 'react-intl';
import messages from '../messages';
import commonMessages from 'Constants/messages';

const isPriceOnArea = parseInt(getSettingValue("price_on_area")) === 1 ? true : false

const options = {
    selectableRows: 'none',
    filterType: "dropdown",
    responsive: false,
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 15],
    rowsPerPage: 5
};

class PricePlanView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            yearList: [],
            year: '',
            yearName: '',
            tableLoading: false,
            onChangeYear: false,
            price: 0,
            priceplan: []
        }
        this.columns = [
            {
                name: "id",
                label: "Plan id",
                options: {
                    search: false,
                    sort: false,
                    display: false
                },
            },
            {
                name: "name",
                label: <FormattedMessage {...messages.planname} />,
                options: {
                    filter: true,
                    sort: true,
                },
            },
            {
                name: "standard_detail",
                label: <FormattedMessage {...messages.mappedStandards} />,
                options: {
                    search: false,
                    sort: false,
                    display: false
                }
            },
            {
                name: "standard_names",
                label: <FormattedMessage {...messages.mappedStandards} />,
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "Actions",
                label: <FormattedMessage {...commonMessages.actions} />,
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<Box className=''>
                            <ActionColumn
                                id={tableMeta.rowData[0]}
                                updateDeleteData={this.getRouteData}
                                deleteUrl={DEL_URL.routepriceplan.api}
                                deleteType={this.deleteType}
                                enabledActions={['delete', 'edit']}
                                options={options}
                                selectedStandards={tableMeta.rowData[2]}
                                isPricePlan={true}
                                yearName={this.state.yearName}
                                year={this.state.year}
                                planname={tableMeta.rowData[1]}
                                isEdit={true}
                                planid={tableMeta.rowData[0]}
                            />
                        </Box>
                        );
                    }
                }
            }
        ]
    }


    deleteType = (id, index) => {
        let { priceplan } = this.state
        priceplan.map((data, index) => {
            if (data.id === id) {
                priceplan.splice(index, 1)
            }
        })
        this.setState({
            priceplan
        }, () => {
            this.getPricePlan()
        })
    }

    componentDidMount() {
        this.getYearsList();
        //  this.getSettingValue("price_on_area")
    }

    getSettingValue = (name) => {
        const settings = JSON.parse(localStorage.getItem('settings'));
        if (name in settings) {
            let value = settings[name]['value'];
            isPriceOnArea = (value === "0") ? false : true
        }
        this.setState({
            isPriceOnArea,
            loading: true
        })
    }

    getYearsList = () => {
        let params = {};
        getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let { loading } = this.state
                const yearList = response.data.data;
                let year = checkLocalAcademicYear(yearList);
                const yearName = getKeyValueInArray(yearList, 'id', year, 'name')
                if (year) {
                    loading = true;
                }
                else {
                    loading = false
                }
                this.setState({ yearList, year: year ? year : '', yearName, loading, }, () => {
                    if (year) {
                        this.getPricePlan();
                    }
                });
            }
        });
    }

    getPricePlan = () => {
        let url = GET_URL.routepriceplan.api
        let params = { is_active: 1, academic_year: this.state.year };
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let priceplan = response.data.data;
                let standard_names = []
                priceplan.map((data) => {
                    standard_names = []
                    data.standard_detail.map((std) => {
                        standard_names.push(std.name)
                    })
                    data['standard_names'] = standard_names.join(` ,`)
                })
                this.setState({
                    loading: false,
                    tableLoading: false,
                    priceplan: priceplan
                });
            }
        })
    }

    onChangeAcademicYearDropDown = async (e) => {
        let value = e.target.value;
        if (value !== 0 && isPriceOnArea === false) {
            SetAcademicYear(value);
            const yearName = getKeyValueInArray(this.state.yearList, 'id', value, 'name');
            this.setState({ year: value, tableLoading: true, yearName }, () => {
                this.getPricePlan();
            })
        }
        else if (value != 0 && isPriceOnArea === true) {
            let { onChangeYear } = this.state
            SetAcademicYear(value)
            const yearName = getKeyValueInArray(this.state.yearList, 'id', value, 'name')
            onChangeYear = onChangeYear === true ? false : true
            this.setState({
                year: value, yearName, onChangeYear
            }, () => {
                this.getPricePlan();
            })
        }
    }

    getBlankPageMessage = () => {
        let { year } = this.state;
        let message = "";
        if (!year) {
            message =
                "Select the Academic year to view Price Plans";
        }
        return message;
    };

    AddPricePlanforstandard = () => {
        let { yearName, year } = this.state
        this.props.history.push({
            pathname: Actions.transport_priceplan.create.url,
            state: {
                detail: {
                    yearName: yearName, year: year
                }
            }
        })
    }

    render() {
        const { classes } = this.props;
        let { loading, yearList, year, tableLoading, price, priceplan } = this.state;
        let blankPageMessage = this.getBlankPageMessage();
        if (loading)
            return <LoadingGif />
        return (
            <>
                <Paper>
                    <Box className="paper-background">
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Price Plan
                                </Box>
                                <Box className='sub-heading'>

                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                {price === 0 && year &&
                                    <Box className='header-align end-flex-prop'>
                                        {isUserHasPermission('transport_price', 'create') && <Button
                                            variant="contained"
                                            onClick={() => this.AddPricePlanforstandard()}
                                            className='editbutton-view'
                                        ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {'Price Plan'}</Button>}
                                    </Box>
                                }
                            </Grid>
                        </Grid>
                        <Grid container className='mt-20 margin-bottom-30'>
                            <Grid className='marign-right-30' item md={3} xs={12}>
                                <Dropdown
                                    data={yearList}
                                    name="year"
                                    value={year}
                                    onChange={this.onChangeAcademicYearDropDown}
                                    label="Academic year"
                                    hideSelect={true}
                                />
                            </Grid>
                        </Grid>
                        {year &&
                            <Box className="md-up-width-80 margin-top-20" >
                                <Grid item md={12} xs={12} sm={12}>
                                    <AllMUIDataTable
                                        title={tableLoading ? <CircularProgress className='white-text' /> : ''}
                                        data={priceplan}
                                        columns={this.columns}
                                        options={options}
                                    />
                                </Grid>
                            </Box>
                        }
                        {!year &&
                            <BlankPagewithIcon className='mt-20' data={blankPageMessage} />
                        }
                    </Box>
                </Paper>
            </>
        )
    }
}

export default withRouter(PricePlanView)
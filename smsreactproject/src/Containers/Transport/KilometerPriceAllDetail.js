import React, { Component } from 'react';
import { Paper, Box, Button, Grid, CircularProgress } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import classNames from "classnames";
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest } from 'Includes/api/apicall';
import { BUTTONCOLOR } from 'Constants/styleVariable';
import { GET_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import backgroundSchoolView from 'images/backgroundSchoolView.png';
import { Actions } from 'Constants/permissions';
import { SetAcademicYear, getKeyValueInArray, checkLocalAcademicYear, 
         isUserHasPermission, getSettingValue } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import KilometerPricePerArea from 'Containers/Transport/KilometerPricePerArea'
import { getUrlParam } from 'Includes/functions';
import Chip from '@material-ui/core/Chip';
import _ from 'lodash';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import { withRouter } from 'react-router-dom';

const isPriceOnArea = getSettingValue('price_on_area') === '0' ? false : true;

const useStyles = {
    paperBakcground: {
        width: '100%',
        // height: '100vh',
        backgroundImage: `url(${backgroundSchoolView})`,
        backgroundSize: '105%',
        backgroundRepeat: "no-repeat",
        minHeight: "90vh",
    },
    addmore: {
        margin: 15,
        padding: "5px 0px 5px 10px",
        background: BUTTONCOLOR,
        '&:hover': {
            background: BUTTONCOLOR
        }
    },
    extendedIcon: {
        marginRight: (1),
    }, button: {
        margin: (1),
    },
    deleteIcon: {
        marginLeft: 20
    },
    chip: {
        height: "43px",
        padding: "9px",
        background: "#F8F8F8",
        boxShadow: "2px 2px 2px rgba(0, 0, 0, 0.25)",
        borderRadius: "30px",
        position: "relative"
    },
    "@global": {
        ".MuiChip-deleteIcon": {
        },
        ".AddFeesType-chip-146 > span": {
            fontFamily: "roboto",
            fontSize: "20px",
        }
    },
    manageYearImage: {
        width: '100%'
    },
};

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

class AddFeesType extends Component {
    constructor(props) {
        super(props);
        this.state = {
            routeNames: [],
            newrouteNames: [],
            textFiledError: "",
            loading: true,
            routeNameMap: {},
            yearList: [],
            year: '',
            yearName: '',
            tableLoading: false,
            onChangePlan: false,
            plan: '',
            priceplan: [],
            planList: [],
            planName: '',
            planStandardList: [],
            snackbar: false,
            alertData: '',
        }
        this.columns = [
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
            }
        ];
        this.getRouteData = this.getRouteData.bind(this);
    }

    async componentDidMount() {
        this.getYearsList();
    }

    getRoutePricePlan = () => {
        let url = GET_URL.routepriceplan.api
        let params = { is_active: 1, academic_year: this.state.year };
        let { planName } = this.state
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let priceplan = response.data.data;
                let planList = []
                priceplan.map((data) => {
                    let planData = {
                        id: data.id,
                        name: data.name
                    }
                    planList.push(planData)
                })
                this.setState({
                    loading: false,
                    tableLoading: false,
                    priceplan: priceplan,
                    planList: planList,
                    planName,
                });
            }
        })
    }

    async getRouteData() {
        // let data = await get(GET_URL.routeNames.api, "?is_active=1");
        let params = { is_active: 1, academic_year: this.state.year };
        getRequest(GET_URL.routePrice.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const routeData = response.data.data;
                let routeNameMap = {};
                for (let type = 0; type < routeData.length; type++) {
                    routeNameMap[routeData[type]['name']] = routeData[type]['id'];
                }
                this.setState({
                    routeNames: routeData,
                    loading: false,
                    routeNameMap,
                    tableLoading: false
                });
            }
        })
    }

    getYearsList = async () => {
        let params = {};
        getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let { loading } = this.state
                const yearList = response.data.data;
                const year = checkLocalAcademicYear(yearList);
                const yearName = getKeyValueInArray(yearList, 'id', year, 'name')
                if (year && isPriceOnArea === false) {
                    loading = true;
                }
                else {
                    loading = false
                }
                this.setState({ yearList, year:year?year:'', yearName, loading }, () => {
                    if (year && isPriceOnArea === false) {
                        this.getRouteData();
                        this.getRoutePricePlan()
                    }
                    else if (year && isPriceOnArea === true) {
                        this.getRoutePricePlan()
                    }
                });
            }
        });
    }

    onChangeAcademicYearDropDown = async (e) => {
        let value = e.target.value;
        if( value !== 0 ){
            if( isPriceOnArea === true || isPriceOnArea === 'true' ){
                SetAcademicYear(value);
                const yearName = getKeyValueInArray(this.state.yearList, 'id', value, 'name');
                this.setState({ year: value, tableLoading: true, yearName }, () => {
                    this.getRouteData();
                })
            }else{
                SetAcademicYear(value)
                const yearName = getKeyValueInArray(this.state.yearList, 'id', value, 'name')
                this.setState({
                    year: value, yearName, plan: ''
                }, () => {
                    this.getRoutePricePlan();
                })
            }
        }
    }

    onChangePricePlan = (e) => {
        let { plan, onChangePlan, planName, planList, priceplan, planStandardList } = this.state
        let standardplan = []
        onChangePlan = onChangePlan === true ? false : true
        let value = e.target.value
        if (value != 0) {
            plan = value
            planList.map((data) => {
                if (data.id === plan) {
                    planName = data.name

                }
            })
            priceplan.map((data) => {
                if (data.id === plan) {
                    planName = data.name
                    data.standard_detail.map((standard) => {
                        standardplan.push(standard.name)
                    })
                }
            })
            planStandardList = _.cloneDeep(standardplan)
        }
        this.setState({
            plan,
            onChangePlan,
            planName,
            planStandardList: planStandardList
        })
    }

    AddPrice = () => {
        let { plan, yearName, year, } = this.state
        if (plan === 0) {
            this.setState({
                snackbar: true,
                alertData: 'Select Price Plan'
            })
        }
        else if (plan !== 0) {
            this.props.history.push({
                pathname: Actions.transport_price.create.url,
                state: {
                    'yearName': yearName, 'year': year, plan_id: this.state.plan, planName: this.state.planName, planStandardList: this.state.planStandardList
                }
            })
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }

    render() {
        let {   routeNames, loading, yearList, year, tableLoading,
                onChangePlan, plan, planList, planStandardList, 
                alertData, snackbar 
            } = this.state;
        let blankPageError = "";
        if( !year ){
            blankPageError = 'Select the Academic year to view Km price'
        }else if( !plan ){
            if( planList.length === 0 ){
                blankPageError = 'Price Plan Does Not Exist for the Academic Year'
            }else{
                blankPageError = 'Select Price Plan To View Km Price'
            }
        }
        if (loading)
            return <LoadingGif />
        return (
            <>
                <Paper>
                    <Box className="paper-background">
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Kilometers and Price
                                    </Box>
                                <Box className='sub-heading'>

                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('transport_price', 'create') && <Button
                                        variant="contained"
                                        //component={Link} to={{ pathname: Actions.transport_price.create.url, state: { 'yearName': yearName, 'year': year, plan_id: this.state.plan, planName: this.state.planName, planStandardList: this.state.planStandardList } }}
                                        onClick={() => this.AddPrice()}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.transport_price.create.label}</Button>}
                                </Box>

                                {/* {isPriceOnArea === true &&
                                    <Box className='header-align end-flex-prop'>
                                        {isUserHasPermission('transport_price', 'create') && <Button
                                            variant="contained"
                                            component={Link} to={{ pathname: Actions.transport_price.create.url, state: { 'yearName': yearName, 'year': this.state.year, plan_id: this.state.plan, planName: this.state.planName, planStandardList: this.state.planStandardList } }}
                                            className='editbutton-view'
                                        ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.transport_price.create.label}</Button>}
                                    </Box>
                                } */}
                            </Grid>
                        </Grid>
                        <Box display='flex'>
                            <Box>
                                <Dropdown
                                    data={yearList}
                                    name="year"
                                    value={year}
                                    onChange={this.onChangeAcademicYearDropDown}
                                    label="Academic year"
                                    hideSelect={true}
                                />
                            </Box>
                            <Box ml={2}>
                                <Dropdown
                                    data={planList}
                                    name="plan"
                                    value={plan}
                                    onChange={this.onChangePricePlan}
                                    label="Price Plan"
                                    hideSelect={true}
                                />
                            </Box>
                        </Box>
                        {plan != 0 &&
                            planStandardList.map((data, index) => {
                                return (
                                    < Chip className='selectedStandards mt-20' label={data} key={index}/>
                                )
                            })
                        }

                        {isPriceOnArea != true && plan !== 0 &&
                            <Box>
                                {routeNames.length > 0 ?
                                    <Box className="md-up-width-80 margin-top-20" >
                                        <Grid item md={12} xs={12} sm={12}>
                                            <AllMUIDataTable
                                                key={routeNames}
                                                title={tableLoading ? <CircularProgress className='white-text' /> : 'KM Price'}
                                                data={routeNames}
                                                columns={this.columns}
                                                options={options}
                                            />
                                        </Grid>
                                    </Box>
                                    :
                                    <Paper className="margin-top-20">
                                        <BlankPagewithIcon data="Km price not found for this Academic Year" />
                                    </Paper>
                                }
                            </Box>
                        }

                        {isPriceOnArea === true && onChangePlan === false && plan !== 0 &&
                            <KilometerPricePerArea
                                year={this.state.year}
                                plan_id={this.state.plan}
                            />
                        }

                        {isPriceOnArea === true && onChangePlan === true && plan !== 0 &&
                            <KilometerPricePerArea
                                year={this.state.year}
                                plan_id={this.state.plan} />
                        }

                        {plan === 0 &&
                            <Box mt={2}>
                                <BlankPagewithIcon data={blankPageError} />
                            </Box>
                        }
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
                    </Box>
                </Paper>
            </>
        )
    }
}

export default withRouter(AddFeesType)
import React, { Component } from 'react';
import { Paper, Box, Button, Grid, Typography } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { withStyles } from '@material-ui/core/styles';
import classNames from "classnames";
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import ActionColumn from 'Components/ActionColumn';
import { getRequest } from 'Includes/api/apicall';
import { BUTTONCOLOR } from 'Constants/styleVariable';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import backgroundSchoolView from 'images/backgroundSchoolView.png';

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
            routeNameMap: {}
        }
        this.columns = [
            {
                name: "name",
                label: "Fee Type",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "Actions",
                label: "Actions",
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        const name = tableMeta.rowData[0];
                        const id = this.state.routeNameMap[name];
                        const index = tableMeta.rowIndex;
                        return (<div>
                            <ActionColumn
                                id={id}
                                name={name}
                                index={index}
                                updatePutData={this.getRouteData}
                                updateDeleteData={this.getRouteData}
                                put_url={PUT_URL.routeNames.api}
                                del_url={DEL_URL.routeNames.api}
                                enabledActions={['edit', 'delete']}

                            />
                        </div>
                        );
                    }
                }
            }
        ];
        this.getRouteData = this.getRouteData.bind(this);
    }

    async componentDidMount() {
        this.getRouteData();
    }
    async getRouteData() {
        // let data = await get(GET_URL.routeNames.api, "?is_active=1");
        let params = { is_active: 1 };
        getRequest(GET_URL.routeNames.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const routeData = response.data.data;
                let routeNameMap = {};
                for (let type = 0; type < routeData.length; type++) {
                    routeNameMap[routeData[type]['name']] = routeData[type]['id'];
                }
                this.setState({
                    routeNames: routeData,
                    loading: false,
                    routeNameMap
                });
            }
        })
    }

    render() {
        const { classes } = this.props;
        const { routeNames, loading } = this.state;
        if (loading)
            return <LoadingGif />
        return (
            <>
                <Paper>
                    <Box className="paper-background">
                        <Grid container>
                            <Grid item md={6} xs={12} sm={12} >
                                <Box  className="heading">
                                    <Typography variant="h5" color="primary">
                                        List of Route Names
                                    </Typography>

                                    <Box    mr={10} 
                                            className='mx-0-on-600'>
                                        Names of Routes
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} sm={12}>
                                <Box mx="auto">
                                    <Box display='flex' justifyContent='flex-end'>
                                        <Button
                                            variant="contained"
                                            component={Link} to={`/dashboard/routenames/add`}
                                            className='addbutton-view'>
                                            <AddCircleOutlineOutlinedIcon className="visibility-icon" /> ADD Route Names
                                        </Button>
                                    </Box>
                                    <br />
                                    <br />
                                    <Box className={classNames("md-up-width-80")} >
                                        {
                                            routeNames.length > 0 ?
                                                <Grid item md={12} xs={12} sm={12}>
                                                    <AllMUIDataTable
                                                        key={routeNames}
                                                        title={"Route List"}
                                                        data={routeNames}
                                                        columns={this.columns}
                                                        options={options}
                                                    />
                                                </Grid>
                                                :
                                                <Paper>
                                                    <BlankPagewithIcon data="No Route names added to this view  please add the new Route Names" />
                                                </Paper>
                                        }
                                    </Box>
                                </Box>
                            </Grid>

                        </Grid>
                    </Box>
                </Paper>
            </>
        )
    }
}

export default withStyles(useStyles)(AddFeesType)
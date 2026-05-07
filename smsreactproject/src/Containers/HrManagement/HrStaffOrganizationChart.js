import React, { Component } from 'react'
import { Paper, Box, Grid } from '@material-ui/core';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import OrganizationChart from 'Components/OrganizationChart';

function getBase64Image(imgUrl, callback) {

    var img = new Image();

    // onload fires when the image is fully loadded, and has width and height

    img.onload = function () {

        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        var dataURL = canvas.toDataURL("image/png"),
            dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");

        callback(dataURL); // the base64 string

    };

    // set attributes and src 
    img.setAttribute('crossOrigin', 'anonymous'); //
    img.src = imgUrl;

}

class HrStaffOrganizationChart extends Component {
    constructor() {
        super()
        this.state = {
            bannerList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            treeDetails: {},
            updatedChart: false,
            treeDetailsKeyValue: {},
            userId: ''
        }
    }

    componentDidMount = () => {
        this.updateChartDetails()
    }

    updateChartDetails = () => {
        let { treeDetailsKeyValue } = this.state;
        const user = JSON.parse(localStorage.getItem('user'));
        const url = GET_URL.usertreestructure.api
        const params = { user_ids: user.id }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let responseDetails = response.data.user_details[user.id]
                let tree = {
                    id: responseDetails.id,
                    person: {
                        id: responseDetails.id,
                        avatar: getBase64Image(responseDetails?.staff?.profile_pic_details?.file),
                        department: '',
                        name: responseDetails?.staff?.full_name,
                        title: responseDetails?.groups[0]?.name,
                        totalReports: responseDetails?.my_reporters.length,
                    },
                    hasChild: true,
                    hasImage: true,
                    hasParent: responseDetails.reporting_to ? true : false,
                    children: [],
                }
                treeDetailsKeyValue[user.id] = tree
                treeDetailsKeyValue[user.id]['parentId'] = responseDetails.reporting_to
                treeDetailsKeyValue[user.id]['childrenIds'] = responseDetails?.my_reporters
                this.setState({
                    treeDetails: tree,
                    treeDetailsKeyValue,
                    updatedChart: true,
                    loading: false,
                    userId: user.id
                })
            }
        })
    }

    getOrganizationChart = (upDownFormat) => {
        const url = GET_URL.usertreestructure.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    bannerList: response.data.data,
                    loading: false
                })
            }
        })
    }

    updateChildTree = (responseDetails) => {
        let { treeDetailsKeyValue } = this.state;
        let return_tree = []
        let tree = {}
        Object.keys(responseDetails).map((data) => {
            tree = {}
            tree = {
                id: responseDetails[data].id,
                person: {
                    id: responseDetails[data].id,
                    avatar: getBase64Image(responseDetails[data]?.staff?.profile_pic_details?.file),
                    department: '',
                    name: responseDetails[data]?.staff?.full_name,
                    title: responseDetails[data]?.groups[0]?.name,
                    totalReports: responseDetails[data]?.my_reporters.length,
                },
                hasChild: responseDetails[data]?.my_reporters ? true : false,
                hasParent: responseDetails[data]?.reporting_to ? true : false,
            }
            treeDetailsKeyValue[responseDetails[data].id] = tree
            treeDetailsKeyValue[responseDetails[data].id]['parentId'] = responseDetails[data].reporting_to
            treeDetailsKeyValue[responseDetails[data].id]['childrenIds'] = responseDetails[data]?.my_reporters
            return_tree.push(tree)
        })
        this.setState({
            treeDetailsKeyValue
        })
        return return_tree
    }

    getChild = async (d) => {
        let { treeDetailsKeyValue } = this.state;
        if (treeDetailsKeyValue[d.id].childrenIds.length > 0) {
            const url = GET_URL.usertreestructure.api
            const params = { user_ids: treeDetailsKeyValue[d.id].childrenIds.toString() }
            let response = await getRequest(url, params, this.props)
            if (response && response.status === 200) {
                let responseDetails = response.data.user_details
                return await this.updateChildTree(responseDetails)
            }
        }
    }

    updateParentTree = (responseDetails, d) => {
        let { treeDetailsKeyValue } = this.state;
        let tree = {
            id: responseDetails.id,
            person: {
                id: responseDetails.id,
                avatar: getBase64Image(responseDetails?.staff?.profile_pic_details?.file),
                department: '',
                name: responseDetails?.staff?.full_name,
                title: responseDetails?.groups[0]?.name,
                totalReports: responseDetails?.my_reporters.length,
            },
            hasChild: responseDetails?.my_reporters ? true : false,
            hasParent: responseDetails?.reporting_to ? true : false,
            children: [d],
        }
        treeDetailsKeyValue[responseDetails.id] = tree
        treeDetailsKeyValue[responseDetails.id]['parentId'] = responseDetails.reporting_to
        treeDetailsKeyValue[responseDetails.id]['childrenIds'] = responseDetails?.my_reporters
        this.setState({
            treeDetailsKeyValue
        })
        return tree
    }

    getParent = async (d) => {
        let { treeDetailsKeyValue } = this.state;
        const url = GET_URL.usertreestructure.api
        const params = { user_ids: treeDetailsKeyValue[d.id].parentId }
        let response = await getRequest(url, params, this.props)
        if (response && response.status === 200) {
            let responseDetails = response.data.user_details[treeDetailsKeyValue[d.id].parentId]
            return await this.updateParentTree(responseDetails, d)
        }
    }

    render() {
        const { loading, treeDetails, updatedChart, userId } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Organization Chart
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={'mt-30'}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    {updatedChart &&
                                        <OrganizationChart
                                            treeDetails={treeDetails}
                                            getParent={this.getParent}
                                            getChild={this.getChild}
                                            userId={userId}
                                        />
                                    }
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default HrStaffOrganizationChart

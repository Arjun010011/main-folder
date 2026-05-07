import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { getRequest } from "Includes/api/apicall";
import { getYearLabel } from 'Includes/functions';
import { GET_URL } from "Includes/urls";
import {
    Box, Checkbox, List, ListItem, ListItemIcon, ListItemSecondaryAction, ListItemText, CircularProgress,
    Button, IconButton, Collapse, Grid, Tooltip
} from "@material-ui/core";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import { Dropdown } from 'Components/DropDown';
import { cloneDeep } from "lodash";
import Skeleton from '@material-ui/lab/Skeleton';
import InfoIcon from "@material-ui/icons/Info";

// import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import { TreeItem, TreeView } from "@material-ui/lab";

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class SectionPermission extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            standardList: [],
            loading: true,
            selectedYear: '',
            error: {},
            isEnableForAllYears: false,
            isApiCalled: false,
            groupReset: false,
            appliedPermissions: []
        }
    }

    componentDidUpdate = () => {
        if (this.props.tabValue === 3 && !this.state.isApiCalled) {
            this.getAcademicYearList()
            this.getAppliedPermissions()
            this.setState({ isApiCalled: true })
        }
    }

    getAcademicYearList = () => {
        const url = GET_URL.getacademicyear.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    academicYearList: response.data.data,
                    loading: false
                })
            }
        })
    }

    getAppliedPermissions = () => {
        const url = GET_URL.tutorialstandardsectionpermission.api
        const params = { is_active: true, tree_item: this.props.treeId, get_academic_years: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    appliedPermissions: response.data.data,
                    loading: false
                })
            }
        })
    }

    getStandardList = () => {
        const { selectedYear } = this.state;
        const url = GET_URL.tutorialstandardsectionpermission.api
        const params = { is_active: true, academic_year: selectedYear, tree_item: this.props.treeId }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data.expanded = false
                    data.sections.map((section) => {
                        section['read'] = false
                        section['write'] = false
                        section['allpermission'] = false
                        section['modified'] = false
                        if (section['permission_data']['permission_mode']) {
                            if (section['permission_data']['permission_mode'] == 1) {
                                section['read'] = true
                            }
                            else if (section['permission_data']['permission_mode'] == 2) {
                                section['write'] = true
                            }
                            else if (section['permission_data']['permission_mode'] == 3) {
                                section['read'] = true
                                section['write'] = true
                            }
                            else if (section['permission_data']['permission_mode'] == 4) {
                                section['read'] = true
                                section['write'] = true
                                section['allpermission'] = true
                            }
                        }
                    })
                })
                this.setState({
                    standardList: response.data.data,
                    loading: false
                })
            }
        })
    }

    updateParent = () => {
        const { standardList, groupReset } = this.state;
        const { treeId, status, tree_ids} = this.props;
        let standard_list = []
        let standard_temp = {}
        let deletable_list = []
        standardList.map((std) => {
            std.sections.map((data) => {
                if (data['modified']) {
                    if (data['read'] || data['write'] || data['allpermission']) {
                        standard_temp = {}
                        standard_temp['standard_section'] = data['standard_section']
                        standard_temp['permission_mode'] = this.getPermissionMode(data)
                        if (data['permission_data']['id']) {
                            standard_temp['id'] = data['permission_data']['id']
                        }
                        standard_list.push(standard_temp)
                    }
                    if (data['permission_data']['id'] && !data['read'] && !data['write'] && !data['allpermission']) {
                        deletable_list.push(data['permission_data']['id'])
                    }
                }
            })
        })
        let post_data = {
            tree_item_list: status==='multiple'?tree_ids:[treeId],
            standard_section_data: standard_list,
            is_delete_existing_permission: groupReset,
            deletable_ids: deletable_list
        }
        this.props.updateToParent(post_data)
    }

    getPermissionMode = (data) => {
        let returnPermission = ''
        if (data['allpermission']) {
            returnPermission = 4
        }
        else if (data['read'] && data['write']) {
            returnPermission = 3
        }
        else if (data['read']) {
            returnPermission = 1
        }
        else if (data['write']) {
            returnPermission = 2
        }
        return returnPermission
    }

    handleExpandClick = (index) => {
        let { standardList } = this.state;
        standardList[index]['expanded'] = !standardList[index]['expanded']
        this.setState({
            standardList
        })
    };

    handleCheckClick = (parentIndex, childIndex, type) => {
        let { standardList } = this.state;
        const standardListDup = cloneDeep(standardList);
        standardListDup[parentIndex]['sections'][childIndex][type] = !standardListDup[parentIndex]['sections'][childIndex][type];
        standardListDup[parentIndex]['sections'][childIndex]['modified'] = true
        if (type === 'allpermission' && standardListDup[parentIndex]['sections'][childIndex][type]) {
            standardListDup[parentIndex]['sections'][childIndex]['read'] = standardListDup[parentIndex]['sections'][childIndex][type]
            standardListDup[parentIndex]['sections'][childIndex]['write'] = standardListDup[parentIndex]['sections'][childIndex][type]
        }
        else if (type === 'write' && standardListDup[parentIndex]['sections'][childIndex][type]) {
            standardListDup[parentIndex]['sections'][childIndex]['read'] = standardListDup[parentIndex]['sections'][childIndex][type]
        }
        this.setState({
            standardList: standardListDup
        }, () => {
            this.updateParent()
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value,
        }, () => {
            this.getStandardList()
        })
    }

    // onChangeEnableAll = () => {
    //     this.setState({
    //         isEnableForAllYears: !this.state.isEnableForAllYears
    //     })
    // }


    handleResetstandard = () => {
        Swal.fire({
            title: "Are you sure?",
            text: "You want to remove all the permission!",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Reset",
        }).then(async (result) => {
            if (result.value) {
                const { standardList } = this.state;
                const { treeId, status, tree_ids } = this.props;
                standardList.map((std) => {
                    std.sections.map((data) => {
                        data['read'] = false
                        data['write'] = false
                        data['allpermission'] = false
                        delete data['permission_data']['id']
                    })
                })
                let post_data = {
                    tree_item_list: status==='multiple'?tree_ids:[treeId],
                    standard_section_data: [],
                    is_delete_existing_permission: true,
                    deletable_ids: [],
                }
                this.props.updateToParent(post_data)
                this.setState({
                    standardList,
                    groupReset: true
                })
            }
        })
    }

    handleToggle = (index) => {
        let { appliedPermissions } = this.state;
        // if(!appliedPermissions[index]['standard_list']){
        appliedPermissions[index]['loading'] = true
        this.getAppliedPermissionStandardList(index)
        this.setState({
            appliedPermissions
        })
        // }
    }

    getAppliedPermissionStandardList = (index) => {
        const { appliedPermissions } = this.state;
        const url = GET_URL.tutorialstandardsectionpermission.api
        const params = {
            is_active: true, academic_year: appliedPermissions[index]['standard_section__academic_year'],
            tree_item: this.props.treeId
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let is_section_data_exist = false
                let stadard_list = []
                let section_list = []
                response.data.data.map((data) => {
                    is_section_data_exist = false
                    section_list = []
                    data.sections.map((section) => {
                        if (section['permission_data']['permission_mode']) {
                            is_section_data_exist = true
                            if (section['permission_data']['permission_mode'] == 1) {
                                section['label'] = `${section.name} - Read`
                            }
                            else if (section['permission_data']['permission_mode'] == 3) {
                                section['label'] = `${section.name} - Write`
                            }
                            else if (section['permission_data']['permission_mode'] == 4) {
                                section['label'] = `${section.name} - Delete`
                            }
                            section_list.push(section)
                        }
                    })
                    if (is_section_data_exist) {
                        stadard_list.push({ id: data.id, name: data.name, sections: section_list })
                    }
                })
                appliedPermissions[index]['standard_list'] = stadard_list
                appliedPermissions[index]['loading'] = false
                this.setState({
                    appliedPermissions
                })
            }
        })
    }


    render() {
        const { standardList, loading, selectedYear, error, academicYearList, appliedPermissions } = this.state;
        const { user_permission } = this.props;
        if (loading) {
            return (
                <Box className='loading'>
                    <CircularProgress />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Grid container spacing={4}>
                        <Grid item md={8} xs={12}>
                            <Grid container spacing={4} className='align-items-center'>
                                <Grid item md={6} xs={12}>
                                    <Dropdown
                                        data={academicYearList}
                                        name='selectedYear'
                                        value={selectedYear}
                                        onChange={this.onChange}
                                        label='Academic Year'
                                        hideSelect={true}
                                        error={error.year}
                                    />
                                </Grid>
                                <Grid item md={6} xs={12}>
                                    <Tooltip title={'Remove all the permissions'} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Button
                                            className={'exam-mark-absent-button'}
                                            onClick={this.handleResetstandard}
                                        >
                                            <Box>Reset</Box>
                                        </Button>
                                    </Tooltip>
                                </Grid>
                            </Grid>
                            {standardList.length > 0 &&
                                < div className='d-flex justify-content-space-between padding-15 text-bold'>
                                    <div>
                                        {`${alias_names['standard']}`}
                                    </div>
                                    <Tooltip title={`Expand to apply the permission for ${alias_names['section']}`} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <div className='d-flex pointer'>
                                            Expand <InfoIcon />
                                        </div>
                                    </Tooltip>
                                </div>
                            }
                            <Box className='section-set-height'>
                                <List component="nav">
                                    {standardList.length > 0 && standardList.map((standard, parentIndex) => (
                                        <div key={parentIndex}>
                                            <ListItem dense>
                                                <ListItemIcon>
                                                    <Button
                                                        disableFocusRipple
                                                        disableRipple
                                                        variant="outlined"
                                                        size="small"
                                                    >
                                                        {standard.name.toUpperCase()}
                                                    </Button>
                                                </ListItemIcon>
                                                <ListItemSecondaryAction>
                                                    {standard.id !== 0 &&
                                                        <IconButton
                                                            onClick={() =>
                                                                this.handleExpandClick(parentIndex)
                                                            }
                                                        >
                                                            {standard.expanded ? <ExpandLess /> : <ExpandMore />}
                                                        </IconButton>
                                                    }
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                            <Collapse
                                                unmountOnExit
                                                in={standard.expanded || false}
                                                timeout="auto"
                                            >
                                                <List disablePadding component="div">
                                                    {standard.sections.map((section, childIndex) => (
                                                        <ListItem
                                                            key={section.id}
                                                            dense
                                                            className='exam-list-tem-left-padding'
                                                        >
                                                            <ListItemText
                                                                primary={section.name}
                                                            />
                                                            <ListItemIcon className='exam-list-item-icon align-items-center'>
                                                                Read
                                                                <Tooltip title={section.write ? 'Read is mandatory' : ''} enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                                    <Checkbox
                                                                        // edge="end"
                                                                        onChange={section.write ? '' : () => this.handleCheckClick(parentIndex, childIndex, "read")}
                                                                        checked={section.read}
                                                                        className={section.write ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                                                    />
                                                                </Tooltip>
                                                            </ListItemIcon>
                                                            <ListItemIcon className='exam-list-item-icon align-items-center'>
                                                                Write
                                                                <Tooltip title={section.allpermission ? 'Write is mandatory' : ''} enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                                    <Checkbox
                                                                        onChange={section.allpermission ? '' : () => this.handleCheckClick(parentIndex, childIndex, "write")}
                                                                        checked={section.write}
                                                                        className={section.allpermission ? 'cursor-not-allowed opacity-0-5 padding-0' : 'padding-0'}
                                                                    />
                                                                </Tooltip>
                                                            </ListItemIcon>
                                                            {user_permission === 4 &&
                                                                <ListItemIcon className='exam-list-item-icon align-items-center'>
                                                                    Delete
                                                                    <Checkbox
                                                                        checked={section.allpermission}
                                                                        defaultChecked={section.allpermission}
                                                                        onClick={() =>
                                                                            this.handleCheckClick(
                                                                                parentIndex,
                                                                                childIndex,
                                                                                'allpermission'
                                                                            )
                                                                        }
                                                                    />
                                                                </ListItemIcon>
                                                            }

                                                        </ListItem>
                                                    ))}
                                                </List>
                                            </Collapse>
                                        </div>
                                    ))}
                                </List>
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} className='height-50vh'>
                            <Box className='staff-list-assigned-shift'>Existing permission list</Box>
                            <TreeView
                                aria-label="controlled"
                                defaultCollapseIcon={<ExpandMoreIcon />}
                                defaultExpandIcon={<ChevronRightIcon />}

                            >
                                {appliedPermissions.map((yearData, index) => {
                                    const year_id = yearData.standard_section__academic_year
                                    const start_date = yearData.standard_section__academic_year__start_date
                                    const end_date = yearData.standard_section__academic_year__end_date
                                    return (
                                        <TreeItem nodeId={`${year_id}-year`}
                                            onClick={yearData.standard_list ? '' : () => this.handleToggle(index)}
                                            label={getYearLabel(start_date, end_date)}>
                                            {yearData.loading &&
                                                <Skeleton variant="rect" className='tree-skeleton m-t-10px'></Skeleton>
                                            }
                                            {yearData.standard_list && yearData.standard_list.map((stdData) => {
                                                return <TreeItem nodeId={`${year_id}-${stdData.id}-standard`} label={stdData.name}>
                                                    {stdData.sections.map((sectionData) => {
                                                        return <TreeItem nodeId={`${year_id}-${stdData.id}-${sectionData.id}-section`} label={sectionData.label} />
                                                    })
                                                    }
                                                </TreeItem>
                                            })
                                            }
                                        </TreeItem>
                                    )
                                })
                                }

                            </TreeView>
                        </Grid>
                    </Grid>
                </div >
            )
        }
    }
}

export default withRouter(SectionPermission)
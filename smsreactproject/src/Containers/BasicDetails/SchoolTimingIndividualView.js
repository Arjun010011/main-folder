import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Grid, Button, Tooltip, withStyles } from '@material-ui/core'
import Box from '@material-ui/core/Box';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import EditTwoToneIcon from '@material-ui/icons/EditTwoTone';
import _ from 'lodash';

import loadingBar from 'images/loading.gif'
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls';
import { timeFormat, isUserHasPermission } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { image_formats } from 'Containers/Expenses/Constants';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


const Styles = theme => ({

    studentLabel: {
        color: '#00000',
        fontSize: '12px',
        lineHeight: '23px',
        padding: '5px',
        wordBreak: 'break-word',

    },
    studentValue: {
        color: '#00000',
        fontSize: '16px',
        lineHeight: '25px',
        padding: '5px',
        textTransform: 'capitalize',
        wordBreak: 'break-word',

    },
    studentValueEmpty: {
        padding: '5px',
        width: '40px'
    },
    header: {
        padding: '10px 25px',
    },
    innerBorder: {
        width: '2px',
        height: '80%',
        background: '#E4E7EB',
        // marginLeft: 'auto',
        marginRight: '5%',
    },
    displayFlex: {
        display: 'flex',
        padding: '5px 5px'
    },
})


class SchoolTimingIndividualView extends Component {

    constructor(props) {
        super(props)

        this.state = {
            building_details: [],
            largeImagePreview: '',
            loading: true,
            buildingId: '',
            shift_schedules: []
        }
    }


    componentDidMount = () => {
        this.getWorkingDays();
    }

    getWorkingDays = () => {
        getRequest(GET_URL.days.api, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let tempList = []
                response.data.data.map((field) => {
                    let tempObject = {}
                    tempObject['id'] = field.id
                    tempObject['enable'] = false
                    tempList.push(tempObject)
                })
                this.setState({
                    workingDays: response.data.data,
                    shiftWorkingDays: tempList,
                }, () => {
                    this.getbuildingDetails();
                })
            }
        })
    }

    getbuildingDetails = () => {
        if (this.props.location.state) {
            const { shiftWorkingDays, workingDays } = this.state;
            const id = this.props.location.state.detail;
            const url = GET_URL.schooltimings.api + id + '/';
            getRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    let data = response.data.data
                    let standard_name = []
                    let section_names = []
                    let section_names_temp = []
                    let is_all_selected = false
                    standard_name = []
                    section_names = []
                    section_names_temp = []
                    is_all_selected = false
                    data.standard_section_data.map((stData) => {
                        section_names_temp = []
                        standard_name.push(stData.standard_name)
                        stData.section_list.map((secData) => {
                            section_names_temp.push(secData.section__name)
                        })
                        if (section_names_temp.length > 0) {
                            section_names.push([`${stData.standard_name}[${section_names_temp.join(`, `)}]`])
                        }
                        is_all_selected = stData.total_sections === stData.section_list.length
                        stData['is_all_selected'] = is_all_selected
                    })
                    standard_name = standard_name.length > 0 ? standard_name.join(`, `) : ''
                    data['standard_name'] = standard_name
                    data['section_names'] = section_names.join(`, `)
                    data['standard_label'] = section_names.join(`, `)
                    if (is_all_selected) {
                        data['standard_label'] = standard_name
                    }

                    let w_index = ''
                    let formatShiftDetails = {}
                    data.school_timing_school_timing_parent.map((field) => {
                        let shiftWorkingDaysTemp = _.cloneDeep(shiftWorkingDays)
                        let tempObject = {}
                        tempObject['id'] = field['id']
                        tempObject['start_time'] = field['start_time']
                        tempObject['half_day_time'] = field['half_day_time']
                        tempObject['end_time'] = field['end_time']
                        tempObject['late_buffer_time'] = field['allowable_late_minutes'] === 0 ? '' : field['allowable_late_minutes']
                        tempObject['working_days'] = shiftWorkingDaysTemp
                        formatShiftDetails[`${tempObject.start_time}_${tempObject.end_time}_${tempObject.half_day_time}_${tempObject.late_buffer_time}`] = tempObject
                        Object.keys(formatShiftDetails).map((data, form_index) => {
                            if (formatShiftDetails[`${tempObject.start_time}_${tempObject.end_time}_${tempObject.half_day_time}_${tempObject.late_buffer_time}`]) {
                                w_index = formatShiftDetails[data]['working_days'].findIndex(data => data['id'] === field.day);
                                workingDays[w_index]['is_enable'] = form_index
                                workingDays[w_index]['day_id'] = field['id']
                            }
                        })
                    })
                    let updated_format = []
                    Object.keys(formatShiftDetails).map((shift, sIndex) => {
                        workingDays.map((wDay, wIndex) => {
                            if (wDay['is_enable'] === sIndex) {
                                formatShiftDetails[shift]['working_days'][wIndex]['day_id'] = wDay['day_id']
                                formatShiftDetails[shift]['working_days'][wIndex]['day_name'] = wDay['name']
                                formatShiftDetails[shift]['working_days'][wIndex]['enable'] = true
                            }
                            else {
                                formatShiftDetails[shift]['working_days'][wIndex]['day_id'] = wDay['day_id']
                                formatShiftDetails[shift]['working_days'][wIndex]['day_name'] = wDay['name']
                                formatShiftDetails[shift]['working_days'][wIndex]['enable'] = false
                            }
                        })
                        updated_format.push(formatShiftDetails[shift])
                    })
                    this.setState({
                        buildingDetails: data,
                        shift_schedules: [...updated_format],
                        pageLoading: false,
                        buildingId: id
                    }, () => {
                        this.updateExpenseView();
                    })
                }
            })
        }
        else {
            this.props.history.push(Actions.school_timing.view.url)
        }
    }

    updateExpenseView = () => {
        let { buildingDetails, shift_schedules } = this.state;
        let building_details = []
        let standard_details = {
            'sub_heading': 'Plan Details',
            'data':
                [
                    { label: 'Plan Name', value: buildingDetails['name'], md: 6 },
                    { label: 'Year Name', value: buildingDetails['academic_year_name'], md: 6 },
                    { label: `${alias_names['standard']}s`, value: buildingDetails['standard_label'], md: 12 },
                ]
        }
        building_details.push(standard_details);
        let schedule = {}
        shift_schedules.map((data, index) => {
            let names = []
            data.working_days.map((item, index) => {
                if (item.enable) {
                    names.push(item['day_name']);
                } 
            });
            names = names.join(', ')
            if (shift_schedules.length === 1 || shift_schedules.length === 0) {
                schedule = {
                    'sub_heading': `Time set`,
                    'data': []
                }
            }
            else {
                schedule = {
                    'sub_heading':`Time set ${index + 1}`,
                    'data': []
                }
            }
            schedule.data.push({ label: 'Start time', value: timeFormat(data['start_time']) }, { label: 'Half Day time', value: timeFormat(data['half_day_time']) },
            { label: 'End time', value: timeFormat(data['end_time']) },
            { label: 'Minutes to consider as late', value: data['late_buffer_time'] ? data['late_buffer_time'] : '' },
            { label: 'Week Days', value: names})
            building_details.push(schedule);
        })

        this.setState({
            building_details,
            loading: false
        })

    }

    handleViewImage = (image) => {
        let file_extension = `${image.slice((Math.max(0, image.lastIndexOf(".")) || Infinity) + 1)}`;
        if (image_formats.includes(file_extension)) {
            this.setState({
                largeImagePreview: image
            })
        }
        else {
            window.open(image);
        }
    }


    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleEdit = () => {
        let { buildingId } = this.state;
        this.props.history.push({
            pathname: Actions.school_timing.update.url,
            state: { detail: buildingId }
        })
    }

    render() {
        let { building_details, loading } = this.state;
        let { classes } = this.props;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                            {`${alias_names['school']} Timing Individual`}
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('school_timing', 'view') &&
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.school_timing.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.school_timing.view.label}</Button>
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper className='header-align expense-individual-paper-background'>
                        <Grid container className='margin-top-30'>
                            {building_details.map((headingData, index) => {
                                return (
                                    <Grid item md={12} xs={12} sm={12} key={index} className={classes.displayFlex}>
                                        <Grid container>
                                            {headingData.sub_heading &&
                                                <Box className='form-left-heading'>{headingData.sub_heading}</Box>
                                            }
                                            {headingData.data.map((data, index) => {
                                                return (
                                                    <Grid item md={6} xs={12} sm={12} key={index} className={classes.header}>
                                                        <Box className='dataLabel break-word'>{data.label}</Box>
                                                        {(!data.value && data !== false) && <Box className={classes.studentValueEmpty}><hr /></Box>}
                                                        {(data.value !== "") &&
                                                            <Box className={data.className ? data.className : 'view-expenses-data-value break-word'}>{data.value}</Box>
                                                        }
                                                    </Grid>
                                                )
                                            })
                                            }
                                        </Grid>
                                    </Grid>
                                )
                            })
                            }
                        </Grid>
                        {isUserHasPermission('school_timing', 'edit') &&
                            <Tooltip title='Edit' placement='top-start'>
                                <Box className='expense-individual-view-edit'>
                                    <EditTwoToneIcon onClick={this.handleEdit} className='expense-individual-edit-icon' />
                                </Box>
                            </Tooltip>
                        }
                    </Paper>
                </Paper>
            )
        }
    }
}

export default withRouter(withStyles(Styles)(SchoolTimingIndividualView));
import React, { Component } from 'react'
import {
    Fab, Box, Grid, Icon, ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary,
    Button, Dialog, DialogTitle,
    DialogActions, DialogContent,
    TextField, FormControl, InputLabel, Select,
    MenuItem, FormHelperText
} from '@material-ui/core';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { withStyles } from '@material-ui/core/styles';
import { Dropdown } from 'Components/DropDown';
import _ from 'lodash';

const Styles = theme => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 200,
        maxWidth: 200,
    },
    tableSelects: {
        margin: theme.spacing(1),
        minWidth: 150,
        maxWidth: 200,
    },
});
const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class StandardSectionDialog extends Component {

    constructor(props) {
        super(props);
        this.state = {
            standardList: [],
            sectionList: [],
            selectedStandard: '',
            selectedSection: '',
            standardSectionId: '',
            'standardName': '',
            'sectionName': '',
            'timeTableName': '',
            'errors': {},
            isPeriodPlanOpen: false,
            periodPlanList: [],
            selectedPlan: '',
            disableSubmit: false,
            selectedPlanName: '',
            isStandardPlanNotSet: false,
            dialogOpen: false,
            isApiCalled: false,
            errorContent: 'Period plan is not set for standard'
        }
    }

    handleOpen = (assigned_classes) => {
        const { isApiCalled } = this.state;
        this.setState({
            dialogOpen: true
        })
        if (!isApiCalled) {
            let { year } = this.props;
            let params = { academic_year: year }
            getRequest(GET_URL.getstandardandsection.api, params).then((response) => {
                if (response && response.status === 200) {
                    let standardList = []
                    let temp = {}
                    let temp_sections = []
                    let temp_section = {}
                    if (!assigned_classes || (assigned_classes && assigned_classes.length === 0)) {
                        standardList=response.data.data
                    }
                    else {
                        outer: for (let i = 0; i < response.data.data.length; i++) {
                            temp = {}
                            temp_sections = []
                            for (let j = 0; j < assigned_classes.length; j++) {
                                if (response.data.data[i]['id'] == assigned_classes[j]['standard'] && (response.data.data[i]['sections'].length === assigned_classes[j].section_list.length)) {
                                    continue outer
                                }
                                temp_sections = []
                                outersection: for (let sectioni = 0; sectioni < response.data.data[i]['sections'].length; sectioni++) {
                                    temp_section = {}
                                    for (let sectionj = 0; sectionj < assigned_classes[j].section_list.length; sectionj++) {
                                        if (response.data.data[i]['sections'][sectioni]['standard_section'] == assigned_classes[j]['section_list'][sectionj]['standard_section']) {
                                            continue outersection
                                        }
                                    }
                                    temp_section = response.data.data[i]['sections'][sectioni]
                                    temp_sections.push(temp_section)
                                }
                                temp = response.data.data[i]
                                temp['sections'] = temp_sections
                            }
                            standardList.push(temp)
                        }
                    }
                    this.setState({ standardList, isApiCalled: true });
                }
            });
        }

    }

    standardChange = (e) => {
        let { standardList, selectedStandard, sectionList, errors } = this.state
        let selectedStandardName = e.currentTarget.textContent;
        selectedStandard = e.target.value;
        if (selectedStandard != 0) {
            delete errors['selectedStandard']
            this.setState({ selectedStandard, selectedSection: '', disableSubmit: true }, () => {
                this.getPeriodPlan()
                sectionList = [];
                standardList.map((data) => {
                    if (data.id == selectedStandard) {
                        sectionList = sectionList.concat(data.sections)
                    }
                })
                this.setState({ sectionList, standardName: selectedStandardName })
            })
        }
    }

    getPeriodPlan = () => {
        const { selectedStandard, } = this.state;
        let { year } = this.props;
        const url = GET_URL.period.api
        const params = { is_active: true, academic_year: year, standard: selectedStandard }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    periodPlanList: response.data.data,
                    disableSubmit: false,
                    isPeriodPlanOpen: response.data.data.length > 1,
                    isStandardPlanNotSet: response.data.data.length === 0 ? true : false,
                    selectedPlan: response.data.data.length === 1 ? response.data.data[0]['id'] : '',
                    selectedPlanName: response.data.data.length === 1 ? response.data.data[0]['name'] : ''
                })
            }
        })
    }

    sectionChange = async (e) => {
        if (e.target.value != 0) {
            let { sectionList, selectedStandard, errors } = _.cloneDeep(this.state);
            let selectedSectionName = e.currentTarget.textContent;
            let { year } = this.props;
            let selectedSectionId = e.target.value;
            let params = {
                'academic_year': year,
                'standard': selectedStandard
            }
            delete errors['selectedSection']
            let standardSectionId = sectionList.filter(section => section.id == selectedSectionId)[0].standard_section;
            this.setState({ selectedSection: selectedSectionId, standardSectionId, sectionName: selectedSectionName, errors });
        }
    }

    redirectToTimetableForCreation = (e) => {
        let { selectedStandard, selectedSection, standardSectionId, standardName, sectionName,
            errors, selectedPlan, periodPlanList, selectedPlanName } = this.state;
        let { year, selectedTimetableId, passToTimetableComponent, timetableName, year_name } = this.props;
        errors = {};
        if (!selectedStandard) {
            errors['selectedStandard'] = 'Select Standard';
        }
        if (!selectedSection) {
            errors['selectedSection'] = `Select  ${alias_names['section']}`;
        }
        if (!selectedPlan && periodPlanList.length > 1) {
            errors['selectedPlan'] = 'Select Period Plan';
        }
        if (Object.keys(errors).length === 0) {
            let currentSelectedList = {
                'academic_year': year,
                'year_name': year_name,
                'timetable_id': selectedTimetableId,
                'standard': selectedStandard,
                'section': selectedSection,
                'standard_section_id': standardSectionId,
                'standardName': standardName,
                'sectionName': sectionName,
                'timeTableName': timetableName,
                'selectedPlan': selectedPlan,
                'selectedPlanName': selectedPlanName,

            };
            passToTimetableComponent(currentSelectedList, 'create');
        } else {
            this.setState({ errors })
        }
    }

    handleSelectedPlan = (e) => {
        let { name, value } = e.target
        let { errors, periodPlanList, selectedPlanName } = this.state;
        periodPlanList.map((data) => {
            if (data.id == value) {
                selectedPlanName = data.name
            }
        })
        delete errors[name]
        this.setState({
            [name]: value,
            errors,
            selectedPlanName
        })
    }

    handleDialogChange = () => {
        this.setState({
            dialogOpen: false
        })
    }

    render() {
        let { selectedTimetableId } = this.props
        let { standardList, sectionList, selectedStandard, selectedSection, errors, isPeriodPlanOpen, periodPlanList,
            selectedPlan, disableSubmit, isStandardPlanNotSet, errorContent, dialogOpen
        } = this.state;
        let dateRangeDialog = (<Dialog
            buttonid="dateDialog"
            open={dialogOpen}
            onClose={this.handleDialogChange}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">{`Select ${alias_names['standard']} and ${alias_names['section']}`}</DialogTitle>
            <DialogContent>
                <Grid container direction="column" spacing={2} alignItems="center">
                    <Grid item xs={12}>
                        <Dropdown
                            data={standardList}
                            name="standardList"
                            value={selectedStandard}
                            onChange={(e) => this.standardChange(e)}
                            label={`Select ${alias_names['standard']}`}
                            required="true"
                            error={errors['selectedStandard']}
                            hideSelect={true}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Dropdown 
                            data={sectionList}
                            name="sectionList"
                            value={selectedSection}
                            onChange={(e) => this.sectionChange(e)}
                            label={`Select ${alias_names['section']}`}
                            required="true"
                            error={errors['selectedSection']}
                            hideSelect={true}
                        />
                    </Grid>
                    {isPeriodPlanOpen &&
                        <Grid item xs={12}>
                            <Dropdown
                                data={periodPlanList}
                                name="selectedPlan"
                                value={selectedPlan}
                                onChange={(e) => this.handleSelectedPlan(e)}
                                label="Period Plan"
                                required="true"
                                error={errors['selectedPlan']}
                                hideSelect
                            />
                        </Grid>
                    }

                </Grid>
                {isStandardPlanNotSet &&
                    <Box className='action-error-content flex-justify-center margin-top-10'>
                        {errorContent}
                    </Box>
                }
            </DialogContent>
            <DialogActions style={{ 'justifyContent': 'center', 'marginBottom': '20px' }}>
                <Button variant="contained" mappedid="dateDialog"
                    disabled={disableSubmit || isStandardPlanNotSet}
                    onClick={(e) => { this.redirectToTimetableForCreation(e) }}
                    color="primary">Go to Timetable Creation</Button>
            </DialogActions>
        </Dialog>);
        return (
            dateRangeDialog
        )
    }
}

export default withStyles(Styles)(StandardSectionDialog);
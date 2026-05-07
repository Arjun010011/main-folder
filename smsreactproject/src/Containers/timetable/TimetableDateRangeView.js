import React, { useEffect, useRef } from 'react'
import classNames from 'classnames';
import { isUserHasPermission } from 'Includes/functions';
import {
    Box, Grid, Icon, Accordion, AccordionDetails, AccordionSummary,
    Button,
    Typography
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import VisibilityIcon from '@material-ui/icons/Visibility';
import Tooltip from '@material-ui/core/Tooltip';
import './styles.scss';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import moment from 'moment';
import StandardSectionDialog from './TimetableStandardSectionDialog';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const TimetableDateRangeView = React.forwardRef((props, ref) => {
    const { year, passToTimetableComponent, year_name } = props;
    const retrievedTimetableData = [...props.retrievedTimetableData];
    const [dialogOpen, setDialogOpen] = React.useState(null);
    const [selectedTimetableId, setTimetableId] = React.useState(null);
    const [expanded, setExpanded] = React.useState('panel+0');

    const dialogOpenRef = useRef(null);


    const handleChange = (panel) => (event, isExpanded) => {
        let temp = isExpanded ? panel : false
        setExpanded(()=>temp)
    };

    useEffect(() => {
        returnSelectedList();
        setExpanded(()=>'panel+0')
    }, []);

    const returnSelectedList = () => {
        if (!props.selectedTimeTableId) {
            setExpanded('panel' + 0);
        } else {
            retrievedTimetableData.map((data, index) => {
                if (data.id == props.selectedTimeTableId) {
                    setExpanded('panel' + index)
                }
            });
        }
    }

    const handleDialogChange = React.useCallback((event, timetableId) => {
        retrievedTimetableData.map((data) => {
            if (data.id == timetableId) {
                dialogOpenRef.current.handleOpen(data.assigned_classes)
            }
        });
        setTimetableId(timetableId);
        setDialogOpen(() => !dialogOpen);
    });

    const editTimetable = (selectedPlan, time_table_schedule_parent, standardId, sectionId, standardSectionId, timetableId, standard_name, section_name, timetable_name) => {
        const { year, passToTimetableComponent, year_name } = props;
        let currentSelectedList = {
            'academic_year': year,
            'year_name': year_name,
            'timetable_id': timetableId,
            'standard': standardId,
            'section': sectionId,
            'standard_section_id': standardSectionId,
            'standardName': standard_name,
            'sectionName': section_name,
            'timetableName': timetable_name,
            'time_table_schedule_parent': time_table_schedule_parent,
            'selectedPlan': selectedPlan,
        };
        passToTimetableComponent(currentSelectedList, 'edit');
    }

    const viewTimetable = (selectedPlan, time_table_schedule_parent, standardId, sectionId, standardSectionId, timetableId, standard_name, section_name, timetable_name) => {
        const { year, passToTimetableComponent, year_name } = props;
        let currentSelectedList = {
            'academic_year': year,
            'year_name': year_name,
            'timetable_id': timetableId,
            'standard': standardId,
            'section': sectionId,
            'standard_section_id': standardSectionId,
            'standardName': standard_name,
            'sectionName': section_name,
            'timetableName': timetable_name,
            'time_table_schedule_parent': time_table_schedule_parent,
            'selectedPlan': selectedPlan,
        };
        passToTimetableComponent(currentSelectedList, 'view');
    }

    return (
        <div>
            {retrievedTimetableData && retrievedTimetableData.map((timetable, index) => {
                return  <Accordion expanded={expanded === `panel+${index}`} onChange={handleChange(`panel+${index}`)}>
                    <StandardSectionDialog ref={dialogOpenRef} year={year} year_name={year_name}
                        selectedTimetableId={selectedTimetableId}
                        passToTimetableComponent={passToTimetableComponent} assigned_classes={timetable.assigned_classes}
                        timetableName={moment(timetable.start_date).format('Do MMM YYYY') + ' - ' + moment(timetable.end_date).format('Do MMM  YYYY')} />
                    <AccordionSummary
                        // expandIcon={<ExpandMoreIcon />}
                        className='pannel-summary'>
                        <Box className='md-down-justify-center even-flex-prop' width='100%'>
                            <Icon className={classNames(expanded === `panel${index}` ? 'fa fa-play-circle play-Icon play-fee-icon fa-rotate-90' : 'fa fa-play-circle play-Icon play-fee-icon')} />
                            <Box className={'enroll-custom-card-header'}>{timetable.name}</Box>
                            <Box className='enrollment-row-total-section' display="flex" flexWrap="wrap">
                                <Typography variant="subtitle2" component='span'>
                                    {moment(timetable.start_date).format('Do MMM YYYY') + ' - ' + moment(timetable.end_date).format('Do MMM  YYYY')}
                                </Typography>
                            </Box>
                        </Box>
                    </AccordionSummary> 
                    <AccordionDetails className='pannel-details'>
                        {
                            (timetable.assigned_classes && timetable.assigned_classes.length) ? (
                                <Box className='panel-details-row'>
                                    {timetable.assigned_classes.map((data, i) => {
                                        const standard_name = data.standard_name;
                                        return <Box key={data.id + i} className='card-box'>
                                            <Box className={'enrollment-section-card'} pb={3}>
                                                <Box borderRadius={3}>
                                                    <Box className='enrollment-section-card-head'> {standard_name} </Box>
                                                    {data.section_list.length !== 0 &&
                                                        <Box pt={1} pb={3} className={'card-data-body'}>
                                                            {data.section_list.map((section, index) => {
                                                                return <Box key={index}>
                                                                    <Grid container alignItems="center" textAlign="center"
                                                                        className={data.section_list.length === index + 1 ?
                                                                            'custom-card-body-data-no-bottom-line action' : 'custom-card-body-data action'}>
                                                                        <Grid item md={8} style={{ 'font-weight': '500', 'font-size': '20px' }}>{section.section_name}</Grid>
                                                                        {isUserHasPermission('assign_timetable', 'update') &&
                                                                            <Grid item md={2} className='editIcon'>
                                                                                <Tooltip title="edit" aria-label="text"><Box className={'pointer'} size='small'
                                                                                    onClick={() => editTimetable(section.time_table_schedule_parent__period_plan, section.time_table_schedule_parent, data.standard, section.standard_section, section.standard_section, timetable.id, standard_name, section.section_name, moment(timetable.start_date).format('Do MMM YYYY') + ' - ' + moment(timetable.end_date).format('Do MMM  YYYY'))} >
                                                                                    <EditIcon />
                                                                                </Box></Tooltip>
                                                                            </Grid>
                                                                        }
                                                                        {isUserHasPermission('timetable_view', 'view') &&
                                                                            <Grid item md={2} className='editIcon'>
                                                                                <Tooltip title="view" aria-label="text"><Box className={'pointer'} size='small'
                                                                                    onClick={() => viewTimetable(section.time_table_schedule_parent__period_plan, section.time_table_schedule_parent, data.standard, section.standard_section, section.standard_section, timetable.id, standard_name, section.section_name, moment(timetable.start_date).format('Do MMM YYYY') + ' - ' + moment(timetable.end_date).format('Do MMM  YYYY'))} >
                                                                                    <VisibilityIcon />
                                                                                </Box></Tooltip>
                                                                            </Grid>
                                                                        }
                                                                    </Grid>
                                                                </Box>
                                                            })}
                                                        </Box>
                                                    }
                                                </Box>
                                            </Box>
                                        </Box>
                                    })}
                                </Box>
                            ) : (
                                <Box textAlign="center" width="100%" className="fs-18">
                                    No Timetables Available for this Time period
                                </Box>
                            )}
                        {isUserHasPermission('assign_timetable', 'create') &&
                            <div className="alignEnd">
                                <Button
                                    variant="contained"
                                    className='editbutton-view'
                                    onClick={(e) => { handleDialogChange(e, timetable.id) }}
                                >
                                    <AddCircleOutlineOutlinedIcon className='visibility-icon' />
                                    {`Add ${alias_names['standard']}/${alias_names['section']}`}
                                </Button>
                            </div>
                        }
                    </AccordionDetails>
                </Accordion>
            })
            }

        </div>
    );
}
)

export default TimetableDateRangeView
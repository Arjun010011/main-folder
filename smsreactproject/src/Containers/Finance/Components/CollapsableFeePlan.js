import React from 'react';
import { Fab, Box, Button, Grid, ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Icon from '@material-ui/core/Icon';
import CheckCircleOutlinedIcon from '@material-ui/icons/CheckCircleOutlined';
import classNames from "classnames";

import { BUTTONCOLOR } from 'Constants/styleVariable';
import bgImage from 'images/backgroundSchoolView.png';
import './../styles.scss';
import { SUCCESS_MSG_PROPS, APPROVAL_STATUS } from 'Constants';
import { isUserHasPermission, numberWithCommas, getSettingValue } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from '../messages';
import commonMessages from 'Constants/messages';

const useStyles = makeStyles(theme => ({
    root: {
        width: '100%',
    },

    background: {
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "106%"
    },
    addmore: {
        color: "white",
        margin: 15,
        padding: "5px 10px",
        background: BUTTONCOLOR,
        '&:hover': {
            background: BUTTONCOLOR
        }
    },
    custom_card: {
        background: "#F7F9FE",
        boxShadow: "0px 15px 35px rgba(49, 69, 244, 0.1), 0px 4px 16px rgba(0, 0, 0, 0.25)",
        borderRadius: "20px",
        position: "relative",
        minHeight: "41vh"
    },
    rowHeader: {
        borderRadius: "22px 22px 0 0",
        background: "#4986FF",
        color: "white",
        padding: 15,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "900",
        fontSize: "22px",


    },
    rowData: {
        borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
        color: "#000000",
        padding: 9,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: "16px",
    },
    rowWithNoBottom: {
        borderBottom: "none",
        color: "#000000",
        padding: 9,
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: "16px",
    },
    fab: {
        margin: 0,
        padding: 0,
        background: "#FFFFFF",
        color: "#A5A5A5",
        boxShadow: "none",
        // visibility:"hidden",
        '&:hover': {
            background: "white",
        }

    },
    moreButton: {
        background: "#DEDEDF",
        boxShadow: "none",
        color: "white"
    },
    actionFab: {
        background: "none",
        boxShadow: "none",
        color: "#A5A5A5",

        '&:hover': {
            background: "#F3F3F3"
        }
    },
    actionBox: {
        display: "flex",
        background: "#FEFEFE",
        // margin: "0 45px",

        boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.110823)",
        borderRadius: "30px",
        padding: "10px 20px",
        justifyContent: "space-around"
    }
}));

const isResidential = parseInt(getSettingValue('is_residential'));


const getStudentType = (type) => {
    let studentTypeDesigns = {
        'Both': <Tooltip className="pointer" title="Both Residential and Day Scholar" placement="top-start" arrow>
            <span className='fs-12 vertical-align-super' style={{ marginTop: '-24px' }}> B </span>
        </Tooltip>,
        'Residential': <Tooltip className="pointer" title="Residential" placement="top-start" arrow>
            <span className='fs-12 vertical-align-super' style={{ marginTop: '-24px' }}> R </span>
        </Tooltip>,
        'Day Scholar': <Tooltip className="pointer" title="Day Scholar" placement="top-start" arrow>
            <span className='fs-12 vertical-align-super' style={{ marginTop: '-24px' }}> D </span>
        </Tooltip>
    }
    if (type in studentTypeDesigns) {
        return studentTypeDesigns[type]
    }
    return ''
}
export default function CollapsableFeePlan(props) {
    const { data, approveAction, year, yearName } = props;

    const classes = useStyles();
    const [expanded, setExpanded] = React.useState(false);

    const handleChange = (event, isExpanded, data) => {
        if (data.totalAmount > 0) {
            let searchState = { year: props.year, standard: data.id }
            let searchParam = "?" + new URLSearchParams(searchState).toString()
            props.history.push({
                pathname: `/finance/feesplan/create/`,
                search: searchParam,
                //   state: searchState,
            });
        }
    };

    const approve = (e, id, index) => {
        e.stopPropagation();
        approveAction(id, index)

    }
    return (
        <div className={classes.root}>
            {
                data.map((standard, index) => {
                    const isFeesNotSet = standard.totalAmount !== 0 ? false : true;
                    const is_approved = standard.fee_types.length > 0 && standard.fee_types[0].is_approved === APPROVAL_STATUS.approved;
                    return <>
                        {index == 0 &&
                            <Box className='total-view-fee-plan'>
                                <FormattedMessage {...commonMessages.total} />;
                            </Box>
                        }
                        <ExpansionPanel key={index + "a"} expanded={expanded === `panel${index}`}
                            onChange={(e) => handleChange(e, `panel${index}`, standard)}
                            className={'feeplan-row-outer-box'}>
                            <ExpansionPanelSummary
                                className={index % 2 === 0 ? 'even-row' : 'odd-row'}
                            >
                                <Box display='flex' flexWrap='wrap' alignItems='center' justifyContent='space-between' width="100%">
                                    <Box display='flex' flexWrap='wrap' alignItems='center'>
                                        <Icon className={classNames(classes.icon, expanded === `panel${index}` ? "fa fa-play-circle play-Icon play-fee-icon fa-rotate-90" : "fa fa-play-circle play-Icon play-fee-icon")} />
                                        <Box className='std-heading'>{standard.name}</Box>
                                        <Box className='border-right-line approve-border-line'></Box>
                                        {is_approved &&
                                            <Box mr={2} pl={1}>
                                                <Button
                                                    className='approved-button'
                                                    variant="outlined"
                                                    onClick={(e) => e.stopPropagation()
                                                    }>
                                                    <FormattedMessage {...commonMessages.approved} />;
                                                <CheckCircleOutlinedIcon />
                                                </Button>
                                            </Box>
                                        }
                                        {!is_approved && isUserHasPermission('approve_fee_plan', 'create') && standard.fee_types.length > 0 &&
                                            <Box pl={1}>
                                                <Button
                                                    className='approve-button-finance'
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={(e) => approve(e, standard.id, index)
                                                    }>
                                                        <FormattedMessage {...commonMessages.approve} />;
                                                    </Button>
                                            </Box>
                                        }
                                        {isFeesNotSet &&
                                            <Box ml={1} variant="outlined" color="secondary" className='red-box-outlined'>
                                                <FormattedMessage {...messages.viewFeeTermFeesNotSet} />;
                                        </Box>
                                        }
                                    </Box>
                                    <Box>
                                        {standard.totalAmount !== 0 && isResidential ?
                                            <Box>
                                                {standard.totResAmount === standard.totDaySchAmount ?
                                                    <Box fontWeight='bold' className='fs-18'>{numberWithCommas(standard.totDaySchAmount)}</Box>
                                                    :
                                                    <Box display="flex" fontWeight='bold' alignItems='center' className=''>
                                                        {standard.totResAmount ?
                                                            <Box className='fs-18'>{numberWithCommas(standard.totResAmount)} {getStudentType('Residential')}</Box> : <></>
                                                        }
                                                        {standard.totResAmount && standard.totDaySchAmount && standard.totDaySchAmount != '0' ?
                                                            <Box mr={2} ml={2} className='border-right-line approve-border-line'></Box> : <></>
                                                        }
                                                        {standard.totDaySchAmount && standard.totDaySchAmount != '0' ?
                                                            <Box className='fs-18'>{numberWithCommas(standard.totDaySchAmount)} {getStudentType('Day Scholar')}</Box> : <></>
                                                        }
                                                    </Box>
                                                }
                                            </Box> : <></>
                                        }
                                        {standard.totalAmount !== 0 && !isResidential ?
                                            <Box component="span" className='finance-total-amt' display='flex'>
                                                <div className='fee-plan-amount'>{numberWithCommas(standard.totalAmount)}</div>
                                            </Box> : <></>
                                        }
                                    </Box>
                                </Box>
                            </ExpansionPanelSummary>
                        </ExpansionPanel></>

                })
            }

        </div>
    );
}
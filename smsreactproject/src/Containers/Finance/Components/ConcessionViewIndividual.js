import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { getUrlParam, numberWithCommas, getSettingValue, dateFormat } from 'Includes/functions';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls';
import LoadingGif from 'Components/LoadingGif';
import { Box } from '@material-ui/core';
import { FormattedMessage } from 'react-intl';
import messages from '../messages';
import commonMessages from 'Constants/messages';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Toolbar from '@material-ui/core/Toolbar';
import Dialog from '@material-ui/core/Dialog';
import AppBar from '@material-ui/core/AppBar';
import { makeStyles } from '@material-ui/core/styles';
import Slide from '@material-ui/core/Slide';
import { Actions } from "Constants/permissions";
import { useHistory } from "react-router";
import '../styles.scss';
import { TRANSPORT_CODE } from "Constants";
// import { DrawerForFilter } from 'Components/DrawerForFilter' // please create it 
const isResidential = parseInt(getSettingValue('is_residential'));

const fee_config = JSON.parse(localStorage.getItem('fee_configurations')) ? JSON.parse(localStorage.getItem('fee_configurations')) : {}
const enableSequence = fee_config?.['hide_fee_standard_concession_sequence'] ? fee_config?.['hide_fee_standard_concession_sequence'] == 1 ? false : true : true

const useStyles = makeStyles(theme => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));


const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

function Row(props) {
    const { row, enableFine } = props;
    return (
        <>
            <TableRow>
                <TableCell className='noborder white-space pb-0 pt-0'>
                    <div className='display-flex margin-top-5 margin-left-5'>
                        <div className='fee-term-view-heading' style={{ minWidth: '215px' }}>
                            <FormattedMessage {...messages.viewFeeTermFeeType} /> : <b> {row['fee_type_name']} </b>
                        </div>
                        <div className='fee-term-view-heading'>
                            {row.codename === TRANSPORT_CODE ?
                                <><FormattedMessage {...messages.viewFeeTermTotalPercentage} /> : <b> {row['amount']} </b></>
                                : <><FormattedMessage {...messages.viewFeeTermTotalAmount} /> : <b> {numberWithCommas(row['amount'])} </b></>
                            }
                        </div>
                            <div className='fee-term-view-heading'>
                            <><FormattedMessage {...messages.concessionAmount} /> : <b> {numberWithCommas(row['concessionAmount'])} </b></>
                        </div>
                        <div className='fee-term-view-heading'>
                            <FormattedMessage {...messages.viewFeeTermTotalTerms} /> : <b> {row['standard_fee'].length} </b>
                        </div>
                    </div>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell className='noborder pt-0 pb-0 white-space' colSpan={6} >
                    <Box margin={1}>
                        <Table size="small" className='border'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>  <FormattedMessage {...messages.viewFeeTermTermName} /> </TableCell>
                                    <TableCell>
                                        {(row.codename === TRANSPORT_CODE) ?
                                            <FormattedMessage {...commonMessages.percentage} />
                                            :
                                            <FormattedMessage {...commonMessages.amount} />
                                        }
                                    </TableCell>
                                    <TableCell>  <FormattedMessage {...messages.concessionAmount} /> </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {row.standard_fee.map((term, index2) => (
                                    <TableRow key={index2}>
                                        <TableCell>{term.terms}</TableCell>
                                        <TableCell>
                                            {(row.codename === TRANSPORT_CODE) ?
                                                <>{term.amount}%</>
                                                :
                                                numberWithCommas(term.amount)
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Box>{numberWithCommas(term?.automatic_concession_data?.concession_fee_plan_mapping?.concession_amount ?? 0)}</Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </TableCell>
            </TableRow>
        </>
    );
}

export default function ConcessionViewIndividual(props) {
    const classes = useStyles();
    const history = useHistory();
    const [feeTermPlan, setFeeTermPlan] = React.useState([])
    const [loading, setLoading] = React.useState(true)
    const [open, setOpen] = React.useState(true);
    const [standard, setStandard] = React.useState('')
    const [standardName, setStandardName] = React.useState('');
    const [academicYearName, setAcademicYearName] = React.useState('');
    const [studentType, setStudentType] = React.useState('');
    const [enableFine, setEnableFine] = React.useState('');

    const getFeeTermPlan = () => {
        let { year, studentType, standardName, academicYearName, standard } = getUrlParam();
        if (!standard && !year) {
            handleClose()
        }
        setStandardName(standardName)
        setAcademicYearName(academicYearName)
        setStudentType(studentType)
        setStandard(standard)
        let params = { is_active: 1, academic_year: year, student_type: studentType, standard: standard }
        getRequest(GET_URL.feeplan.api, params, props).then((response) => {
            if (response && response.status === 200) {
                let enableFine = false
                response.data.data.plan.map((data) => {
                    data.concessionAmount=0
                    data.standard_fee.some((term) => {
                        if (term?.automatic_concession_data?.concession_fee_plan_mapping) {
                            data.concessionAmount+=term?.automatic_concession_data?.concession_fee_plan_mapping?.concession_amount
                        }
                    })
                })
                setEnableFine(() => enableFine)
                setFeeTermPlan(response.data.data.plan);
            }
            setLoading(false)
        });
    }

    const handleClose = () => {
        const searchParam = `?studentType=${studentType}`;
        setOpen(false)
        if (props.redirectOnClose) {
            history.push({ pathname: props.redirectOnClose, search: searchParam });
        } else {
            history.push({ pathname: Actions.fee_standard_concession.view.url, search: searchParam });
        }
    }

    React.useEffect(() => {
        getFeeTermPlan()
    }, [])

    return (
        <>
            <Dialog fullScreen open={open} TransitionComponent={Transition} onClose={() => handleClose('close')}>
                <AppBar className={classes.appBar} style={{ position: 'sticky' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" aria-label="close" onClick={() => handleClose('close')}>
                            <CloseIcon />
                        </IconButton>
                        <Box fontWeight='bold'>
                            <span className='margin-left-10 margin-right-10'><FormattedMessage {...messages.viewFeeTermHeading} /></span>
                            <span className='margin-left-10 margin-right-10'>  {academicYearName}  </span>
                            <span className='margin-left-10 margin-right-10'>  {standardName} </span>
                            {!!isResidential &&
                                <span className='margin-left-10 margin-right-10'>
                                    {studentType === 'D' ? 'Day Scholar' : 'Residential'}
                                </span>
                            }
                        </Box>
                    </Toolbar>
                </AppBar>
                {loading ?
                    <LoadingGif /> :
                    <div className='white-background-shadow margin-top-5 pb-30'>
                        <Table className='w-auto'>
                            <TableBody>
                                {feeTermPlan.map((data) => {
                                    return <Row row={data} enableFine={enableFine} />
                                })}
                            </TableBody>
                        </Table>
                    </div>
                }
            </Dialog>
        </>
    )
}